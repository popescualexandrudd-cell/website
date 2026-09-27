"""Money for bookings and classes (R-060 … R-067, R-070 … R-072, Q10, Q14).

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
from dataclasses import dataclass

from django.db import transaction
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
    customer_credit,
    existing,
    post,
    request_hash,
    reverse_as,
)
from jungle.locations.models import Location, ResourceKind

PURPOSE_CHARGE = "charge"
PURPOSE_PAYMENT = "payment"
PURPOSE_REFUND = "refund"


@dataclass(frozen=True)
class Due:
    """Something a customer pays for: a booking or a class place."""

    key: str
    customer: User
    location: Location
    amount: int
    category: str
    description: str
    booking: Booking | None = None
    enrollment: ClassEnrollment | None = None

    def transactions(self) -> QuerySet[LedgerTransaction]:
        if self.booking is not None:
            return LedgerTransaction.objects.filter(booking=self.booking)
        return LedgerTransaction.objects.filter(enrollment=self.enrollment)

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
    return Due(
        key=f"booking:{booking.pk}",
        customer=booking.organizer,
        location=booking.location,
        amount=booking.price_total,
        category=booking_category(booking),
        description=f"{booking.resource.name} {booking.starts_at:%Y-%m-%d %H:%M}",
        booking=booking,
    )


def due_for_enrollment(enrollment: ClassEnrollment) -> Due:
    session = enrollment.session
    return Due(
        key=f"enrollment:{enrollment.pk}",
        customer=enrollment.user,
        location=session.location,
        amount=session.price_total,
        category=RevenueCategory.PILATES,
        description=f"Pilates {session.starts_at:%Y-%m-%d %H:%M}",
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


def _is_active(due: Due) -> bool:
    if due.booking is not None:
        return due.booking.status != BookingStatus.CANCELLED
    return getattr(due.enrollment, "status", "") not in (
        EnrollmentStatus.CANCELLED,
        EnrollmentStatus.WAITLISTED,
    )


def _charged_cancellation(due: Due) -> bool:
    item = due.booking if due.booking is not None else due.enrollment
    return getattr(item, "cancellation_outcome", "") == CancellationOutcome.CHARGED


def money_status(due: Due) -> MoneyStatus:
    charged = _receivable_sum(due, PURPOSE_CHARGE)
    paid = -_receivable_sum(due, PURPOSE_PAYMENT)
    refunded = _receivable_sum(due, PURPOSE_REFUND)
    if charged:
        to_pay = max(0, charged - paid)
    elif _is_active(due) or _charged_cancellation(due):
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
            (account(AccountKind.RECEIVABLE, user=due.customer, location=due.location), due.amount),
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


def pay(
    actor: audit.Actor,
    due: Due,
    data: PaymentData,
    *,
    device_id: uuid.UUID | None = None,
) -> Payment:
    """One person pays (part of) a booking or class (R-060, R-062, R-067)."""
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
            source = account(AccountKind.CASH, location=due.location)
            receipt = fiscal.printer().print_receipt(
                [fiscal.ReceiptLine(due.description, data.amount)], tendered
            )
        elif data.method == PaymentMethod.BALANCE:
            source = account(AccountKind.CUSTOMER_BALANCE, user=payer)
            # One spend of the same credit at a time: two kiosks cannot both use it.
            LedgerAccount.objects.select_for_update().get(pk=source.pk)
            if customer_credit(payer) < data.amount:
                raise DomainError(ErrorCode.PAYMENTS_INSUFFICIENT_BALANCE)
        else:
            raise DomainError(ErrorCode.PAYMENTS_METHOD_UNAVAILABLE, params={"method": data.method})
        tx = post(
            TransactionKind.PAYMENT,
            [
                (source, data.amount),
                (
                    account(AccountKind.RECEIVABLE, user=due.customer, location=due.location),
                    -data.amount,
                ),
            ],
            description=due.description,
            actor=actor,
            reason=data.reason,
            idempotency_key=data.idempotency_key,
            fingerprint=fingerprint,
            location=due.location,
            metadata={"purpose": PURPOSE_PAYMENT, "payer": str(payer.pk)},
            booking_id=due.booking_id,
            enrollment_id=due.enrollment_id,
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
    return payment


def _lock(due: Due) -> None:
    """Payments for the same item are taken one at a time (no double counting)."""
    if due.booking is not None:
        Booking.objects.select_for_update().filter(pk=due.booking.pk).first()
    else:
        ClassEnrollment.objects.select_for_update().filter(pk=str(due.enrollment_id)).first()


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
        for payer_id, amount in _paid_by_payer(due).items():
            if amount <= 0:
                continue
            payer = User.objects.get(pk=payer_id)
            posted.append(
                post(
                    TransactionKind.CREDIT,
                    [
                        (
                            account(
                                AccountKind.RECEIVABLE, user=due.customer, location=due.location
                            ),
                            amount,
                        ),
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
                )
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
def resolve_due(booking_id: uuid.UUID | None, enrollment_id: uuid.UUID | None) -> Due:
    if (booking_id is None) == (enrollment_id is None):
        raise DomainError(
            ErrorCode.VALIDATION_INVALID, params={"field": "booking_id/enrollment_id"}
        )
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


def record_payment(
    request: HttpRequest,
    booking_id: uuid.UUID | None,
    enrollment_id: uuid.UUID | None,
    data: PaymentData,
) -> Payment:
    """Q10: payments are taken by the payments kiosk (Stage 8, same `pay`); staff record an
    exception, always with a reason (audited)."""
    due = resolve_due(booking_id, enrollment_id)
    authorize(request, Action.PAYMENTS_RECORD, due.location.pk)
    if not data.reason.strip():
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "reason"})
    return pay(audit.actor_from_request(request), due, data)


def status_for(
    request: HttpRequest, booking_id: uuid.UUID | None, enrollment_id: uuid.UUID | None
) -> MoneyStatus:
    """The organizer, or staff who may see payments."""
    due = resolve_due(booking_id, enrollment_id)
    user = current_user(request)
    if due.customer.pk != user.pk:
        authorize(request, Action.PAYMENTS_VIEW, due.location.pk)
    return money_status(due)
