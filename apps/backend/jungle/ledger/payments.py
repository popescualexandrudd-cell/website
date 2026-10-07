"""Money for bookings, classes and subscriptions (R-060 … R-067, R-070 … R-072, Q10, Q14).

- A booking or class place becomes a debt of its organizer ("charge") when it is paid,
  played, missed (no-show) or cancelled late. The charge is posted once (idempotent).
- Anyone may pay towards it: the hour is split between the players (R-060, R-061), each
  paying their share in cash (with change) or from their credit in the account.
- A free cancellation undoes the charge and gives every payer their money back as credit
  in the account (Q14 default), never silently.
Card payments wait for the payment processor and the POS adapter (Q9, R-062).
"""

from __future__ import annotations

import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from functools import partial
from typing import Any

from django.db import models, transaction
from django.db.models import Q, QuerySet, Sum
from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.accounts.services.authz import authorize, current_user
from jungle.audit import services as audit
from jungle.bookings.models import (
    Booking,
    BookingStatus,
    CancellationOutcome,
    ClassEnrollment,
    EnrollmentStatus,
    SessionType,
)
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.ledger import fiscal
from jungle.ledger.models import (
    AccountKind,
    LedgerAccount,
    LedgerEntry,
    LedgerTransaction,
    Payment,
    PaymentMethod,
    RevenueCategory,
    TransactionKind,
)
from jungle.ledger.services import (
    account,
    claim,
    customer_credit,
    existing,
    post,
    request_hash,
    reverse_as,
)
from jungle.locations.models import Location, ResourceKind
from jungle.subscriptions.models import SubscriptionUse

# Called after a payment is committed (the league validates a score waiting for it, §6.9).
_paid_listeners: list[Callable[[Due], None]] = []


def on_paid(listener: Callable[[Due], None]) -> None:
    if listener not in _paid_listeners:
        _paid_listeners.append(listener)


PURPOSE_CHARGE = "charge"
PURPOSE_PAYMENT = "payment"
PURPOSE_REFUND = "refund"


@dataclass(frozen=True)
class Due:
    """Something a customer pays for: a booking, a class place or a subscription."""

    key: str  # also the `subject` of every ledger transaction about it
    customer: User
    location: Location
    amount: int
    category: str
    description: str
    lock_on: tuple[type[models.Model], Any] = field(compare=False)
    active: bool = True  # still to be paid if not charged yet (not cancelled)
    late_cancelled: bool = False  # R-071: cancelled late, still paid
    debtor_category: str = ""  # "corporate:<id>": the company owes it (R-088)
    booking: Booking | None = None
    enrollment: ClassEnrollment | None = None

    def transactions(self) -> QuerySet[LedgerTransaction]:
        return LedgerTransaction.objects.filter(subject=self.key)

    def receivable(self) -> LedgerAccount:
        if self.debtor_category:
            return account(
                AccountKind.RECEIVABLE, location=self.location, category=self.debtor_category
            )
        return account(AccountKind.RECEIVABLE, user=self.customer, location=self.location)

    @property
    def booking_id(self) -> uuid.UUID | None:
        return self.booking.pk if self.booking is not None else None

    @property
    def enrollment_id(self) -> uuid.UUID | None:
        return self.enrollment.pk if self.enrollment is not None else None


def booking_category(booking: Booking) -> str:
    if booking.session_type == SessionType.EVENT:
        return RevenueCategory.EVENTS
    if booking.session_type == SessionType.LESSON:
        return RevenueCategory.LESSONS
    if booking.resource.kind == ResourceKind.TENNIS_COURT:
        return RevenueCategory.TENNIS
    return RevenueCategory.PADEL


def due_for_booking(booking: Booking) -> Due:
    covered = SubscriptionUse.objects.filter(booking=booking).exists()  # R-083
    return Due(
        key=f"booking:{booking.pk}",
        customer=booking.organizer,
        location=booking.location,
        amount=0 if covered else booking.price_total,
        category=booking_category(booking),
        description=f"{booking.resource.name} {clock.local(booking.starts_at):%Y-%m-%d %H:%M}",
        active=booking.status != BookingStatus.CANCELLED,
        late_cancelled=booking.cancellation_outcome == CancellationOutcome.CHARGED,
        lock_on=(Booking, booking.pk),
        booking=booking,
    )


def due_for_enrollment(enrollment: ClassEnrollment) -> Due:
    session = enrollment.session
    covered = SubscriptionUse.objects.filter(enrollment=enrollment).exists()  # R-083
    return Due(
        key=f"enrollment:{enrollment.pk}",
        customer=enrollment.user,
        location=session.location,
        amount=0 if covered else session.price_total,
        category=RevenueCategory.PILATES,
        description=f"Pilates {clock.local(session.starts_at):%Y-%m-%d %H:%M}",
        active=enrollment.status not in (EnrollmentStatus.CANCELLED, EnrollmentStatus.WAITLISTED),
        late_cancelled=enrollment.cancellation_outcome == CancellationOutcome.CHARGED,
        lock_on=(ClassEnrollment, enrollment.pk),
        enrollment=enrollment,
    )


# ---------------------------------------------------------------- status
@dataclass(frozen=True)
class MoneyStatus:
    price: int
    charged: int  # the debt recorded for it (0 before it is due)
    paid: int  # paid towards it, net of corrections
    refunded: int  # returned as credit after a free cancellation
    to_pay: int  # what is still to be paid


def _receivable_sum(due: Due, purpose: str) -> int:
    entries = LedgerEntry.objects.filter(
        transaction__in=due.transactions(),
        account__kind=AccountKind.RECEIVABLE,
        transaction__metadata__purpose=purpose,
    )
    return int(entries.aggregate(total=Sum("amount"))["total"] or 0)


def money_status(due: Due) -> MoneyStatus:
    charged = _receivable_sum(due, PURPOSE_CHARGE)
    paid = -_receivable_sum(due, PURPOSE_PAYMENT)
    refunded = _receivable_sum(due, PURPOSE_REFUND)
    if charged:
        to_pay = max(0, charged - paid)
    elif due.active or due.late_cancelled:
        to_pay = max(0, due.amount - paid)
    else:
        to_pay = 0
    return MoneyStatus(due.amount, charged, paid, refunded, to_pay)


# ---------------------------------------------------------------- charging
def charge(due: Due, actor: audit.Actor = audit.SYSTEM) -> LedgerTransaction | None:
    """Records the debt once (R-065). Free items (price 0) record nothing."""
    if due.amount <= 0:
        return None
    key = f"{due.key}:charge"
    earlier = LedgerTransaction.objects.filter(idempotency_key=key).first()
    if earlier is not None:
        return earlier
    return post(
        TransactionKind.CHARGE,
        [
            (due.receivable(), due.amount),
            (
                account(AccountKind.REVENUE, location=due.location, category=due.category),
                -due.amount,
            ),
        ],
        description=due.description,
        actor=actor,
        idempotency_key=key,
        location=due.location,
        metadata={"purpose": PURPOSE_CHARGE},
        booking_id=due.booking_id,
        enrollment_id=due.enrollment_id,
        subject=due.key,
    )


# ---------------------------------------------------------------- paying
@dataclass(frozen=True)
class PaymentData:
    payer_id: uuid.UUID
    amount: int
    method: str
    tendered: int = 0
    idempotency_key: str = ""
    reason: str = ""
    voucher_id: str = ""  # set when a voucher pays (R-121)


def pay(
    actor: audit.Actor,
    due: Due,
    data: PaymentData,
    *,
    device_id: uuid.UUID | None = None,
    voucher_account: LedgerAccount | None = None,
    cash_account: LedgerAccount | None = None,
    fiscal_receipt: str | None = None,
    extra: dict[str, Any] | None = None,
) -> Payment:
    """One person pays (part of) a booking or class (R-060, R-062, R-067).

    At the Payments Kiosk the cash goes into that kiosk's own cash box (`cash_account`) and
    the fiscal receipt is printed by the kiosk's register through its Hardware Bridge, for the
    whole purchase (`fiscal_receipt=""`: none here; see `jungle.checkout`)."""
    if not data.idempotency_key:
        raise DomainError(ErrorCode.PAYMENTS_IDEMPOTENCY_REQUIRED)
    fingerprint = request_hash(
        {
            "due": due.key,
            "payer": data.payer_id,
            "amount": data.amount,
            "method": data.method,
            "tendered": data.tendered,
        }
    )
    with transaction.atomic():
        claim(data.idempotency_key)  # the same payment sent twice at once is taken once
        earlier = existing(data.idempotency_key, fingerprint)
        if earlier is not None:
            return Payment.objects.get(transaction=earlier)
        payer = User.objects.filter(pk=data.payer_id, is_active=True).first()
        if payer is None:
            raise DomainError(ErrorCode.ACCOUNTS_NOT_FOUND, status=404)
        _lock(due)
        status = money_status(due)
        if data.amount <= 0:
            raise DomainError(ErrorCode.PAYMENTS_INVALID_AMOUNT)
        if status.to_pay == 0:
            raise DomainError(ErrorCode.PAYMENTS_NOTHING_DUE, status=409)
        if data.amount > status.to_pay:
            raise DomainError(ErrorCode.PAYMENTS_OVERPAY, params={"due": status.to_pay})
        charge(due, actor)
        tendered, change = 0, 0
        receipt = ""
        if data.method == PaymentMethod.CASH:
            if data.tendered < data.amount:
                raise DomainError(ErrorCode.PAYMENTS_INSUFFICIENT_CASH)
            tendered, change = data.tendered, data.tendered - data.amount
            source = cash_account or account(AccountKind.CASH, location=due.location)
            receipt = (
                fiscal_receipt
                if fiscal_receipt is not None
                else fiscal.printer().print_receipt(
                    [fiscal.ReceiptLine(due.description, data.amount)], tendered
                )
            )
        elif data.method == PaymentMethod.BALANCE:
            source = account(AccountKind.CUSTOMER_BALANCE, user=payer)
            # One spend of the same credit at a time: two kiosks cannot both use it.
            LedgerAccount.objects.select_for_update().get(pk=source.pk)
            if customer_credit(payer) < data.amount:
                raise DomainError(ErrorCode.PAYMENTS_INSUFFICIENT_BALANCE)
        elif data.method == PaymentMethod.VOUCHER and voucher_account is not None:
            source = voucher_account  # R-121: the discount is recorded when the voucher is used
        else:
            raise DomainError(ErrorCode.PAYMENTS_METHOD_UNAVAILABLE, params={"method": data.method})
        tx = post(
            TransactionKind.PAYMENT,
            [
                (source, data.amount),
                (due.receivable(), -data.amount),
            ],
            description=due.description,
            actor=actor,
            reason=data.reason,
            idempotency_key=data.idempotency_key,
            fingerprint=fingerprint,
            location=due.location,
            metadata={
                **(extra or {}),
                "purpose": PURPOSE_PAYMENT,
                "payer": str(payer.pk),
                **({"voucher": data.voucher_id} if data.voucher_id else {}),
            },
            booking_id=due.booking_id,
            enrollment_id=due.enrollment_id,
            subject=due.key,
        )
        payment = Payment.objects.create(
            transaction=tx,
            payer=payer,
            method=data.method,
            amount=data.amount,
            tendered=tendered,
            change=change,
            fiscal_receipt=receipt,
            device_id=device_id,
            created_at=clock.now(),
        )
        audit.record(
            actor,
            "payments.received",
            target=payment,
            after={"due": due.key, "amount": data.amount, "method": data.method, "change": change},
            reason=data.reason,
        )
        for listener in _paid_listeners:  # never undoes the payment: runs after the commit
            transaction.on_commit(partial(listener, due))
    return payment


def _lock(due: Due) -> None:
    """Payments for the same item are taken one at a time (no double counting)."""
    model, pk = due.lock_on
    model._default_manager.select_for_update().filter(pk=pk).first()


# ---------------------------------------------------------------- settling
def settle(due: Due) -> None:
    """Called whenever a booking or class place changes state (cancellation, no-show,
    completion). Posts what that state means for money; safe to call more than once."""
    item = due.booking if due.booking is not None else due.enrollment
    outcome = getattr(item, "cancellation_outcome", "")
    status_value = getattr(item, "status", "")
    if outcome == CancellationOutcome.CHARGED or status_value in (
        BookingStatus.NO_SHOW,
        BookingStatus.COMPLETED,
        EnrollmentStatus.ATTENDED,
    ):
        charge(due)  # R-071, R-072: late cancellation and no-show are paid
    elif outcome in (CancellationOutcome.FREE, CancellationOutcome.WAIVED):
        refund_as_credit(due)


def refund_as_credit(due: Due) -> list[LedgerTransaction]:
    """Undo the charge (if any) and return each payer's money as credit (Q14)."""
    posted: list[LedgerTransaction] = []
    with transaction.atomic():
        _lock(due)
        charge_tx = LedgerTransaction.objects.filter(idempotency_key=f"{due.key}:charge").first()
        if (
            charge_tx is not None
            and not LedgerTransaction.objects.filter(reverses=charge_tx).exists()
        ):
            posted.append(reverse_as(audit.SYSTEM, charge_tx, "Anulare gratuită (R-070)"))
        posted.extend(_restore_vouchers(due))
        for payer_id, amount in _paid_by_payer(due).items():
            if amount <= 0:
                continue
            payer = User.objects.get(pk=payer_id)
            posted.append(
                post(
                    TransactionKind.CREDIT,
                    [
                        (due.receivable(), amount),
                        (account(AccountKind.CUSTOMER_BALANCE, user=payer), -amount),
                    ],
                    description=f"Credit în cont: {due.description}",
                    actor=audit.SYSTEM,
                    reason="Anulare gratuită: suma plătită devine credit în cont (Q14)",
                    idempotency_key=f"{due.key}:refund:{payer_id}",
                    location=due.location,
                    metadata={"purpose": PURPOSE_REFUND, "payer": str(payer_id)},
                    booking_id=due.booking_id,
                    enrollment_id=due.enrollment_id,
                    subject=due.key,
                )
            )
    return posted


def _restore_vouchers(due: Due) -> list[LedgerTransaction]:
    """A voucher used for something cancelled in time becomes valid again; its value never
    turns into credit that could be spent on something else."""
    from jungle.rewards.models import Voucher, VoucherStatus

    posted = []
    used = due.transactions().filter(kind=TransactionKind.PAYMENT, metadata__has_key="voucher")
    for tx in used.exclude(
        pk__in=LedgerTransaction.objects.filter(reverses__isnull=False).values("reverses")
    ):
        posted.append(reverse_as(audit.SYSTEM, tx, "Anulare gratuită: voucherul redevine valabil"))
        Voucher.objects.filter(pk=tx.metadata["voucher"]).update(
            status=VoucherStatus.ACTIVE, redeemed_at=None, redeemed_subject=""
        )
    return posted


def _paid_by_payer(due: Due) -> dict[str, int]:
    """Net amount each person paid towards the item, after corrections and refunds."""
    result: dict[str, int] = {}
    rows = LedgerEntry.objects.filter(
        transaction__in=due.transactions(),
        account__kind=AccountKind.RECEIVABLE,
    ).filter(
        Q(transaction__metadata__purpose=PURPOSE_PAYMENT)
        | Q(transaction__metadata__purpose=PURPOSE_REFUND)
    )
    for entry in rows.select_related("transaction"):
        payer = str(entry.transaction.metadata.get("payer", ""))
        result[payer] = result.get(payer, 0) - entry.amount
    return result


# ---------------------------------------------------------------- entry points
@dataclass(frozen=True)
class Subject:
    """Which item a payment is for: exactly one of them."""

    booking_id: uuid.UUID | None = None
    enrollment_id: uuid.UUID | None = None
    subscription_id: uuid.UUID | None = None
    tournament_entry_id: uuid.UUID | None = None


def resolve_due(subject: Subject) -> Due:
    given = [
        v
        for v in (
            subject.booking_id,
            subject.enrollment_id,
            subject.subscription_id,
            subject.tournament_entry_id,
        )
        if v
    ]
    if len(given) != 1:
        raise DomainError(
            ErrorCode.VALIDATION_INVALID,
            params={"field": "booking_id/enrollment_id/subscription_id/tournament_entry_id"},
        )
    booking_id, enrollment_id = subject.booking_id, subject.enrollment_id
    if subject.tournament_entry_id is not None:  # §6.14: the entry fee of a league tournament
        from jungle.league.tournaments import due_for_entry, get_entry

        return due_for_entry(get_entry(subject.tournament_entry_id))
    if subject.subscription_id is not None:
        from jungle.subscriptions.services import due_for_subscription, get_subscription

        return due_for_subscription(get_subscription(subject.subscription_id))
    if booking_id is not None:
        booking = (
            Booking.objects.select_related("location", "resource", "organizer")
            .filter(pk=booking_id)
            .first()
        )
        if booking is None:
            raise DomainError(ErrorCode.BOOKING_NOT_FOUND, status=404)
        return due_for_booking(booking)
    enrollment = (
        ClassEnrollment.objects.select_related("session", "session__location", "user")
        .filter(pk=str(enrollment_id))
        .first()
    )
    if enrollment is None:
        raise DomainError(ErrorCode.CLASSES_NOT_FOUND, status=404)
    return due_for_enrollment(enrollment)


def record_payment(request: HttpRequest, subject: Subject, data: PaymentData) -> Payment:
    """Q10: payments are taken by the payments kiosk (Stage 8, same `pay_for`); staff record
    an exception, always with a reason (audited)."""
    due = resolve_due(subject)
    authorize(request, Action.PAYMENTS_RECORD, due.location.pk)
    if not data.reason.strip():
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "reason"})
    return pay_for(audit.actor_from_request(request), subject, due, data)


def pay_for(
    actor: audit.Actor,
    subject: Subject,
    due: Due,
    data: PaymentData,
    *,
    voucher_account: LedgerAccount | None = None,
    cash_account: LedgerAccount | None = None,
    fiscal_receipt: str | None = None,
    extra: dict[str, Any] | None = None,
    device_id: uuid.UUID | None = None,
) -> Payment:
    """`pay`, then what a full payment unlocks (a subscription becomes active)."""
    payment = pay(
        actor,
        due,
        data,
        voucher_account=voucher_account,
        cash_account=cash_account,
        fiscal_receipt=fiscal_receipt,
        extra=extra,
        device_id=device_id,
    )
    if subject.subscription_id is not None:
        from jungle.subscriptions.services import activate_if_paid

        activate_if_paid(subject.subscription_id)
    return payment


def status_for(request: HttpRequest, subject: Subject) -> MoneyStatus:
    """The organizer, or staff who may see payments."""
    due = resolve_due(subject)
    user = current_user(request)
    if due.customer.pk != user.pk:
        authorize(request, Action.PAYMENTS_VIEW, due.location.pk)
    return money_status(due)
