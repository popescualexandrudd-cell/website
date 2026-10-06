"""Vouchers, "Bring a friend" (R-120, Q32) and rewards (R-121).

- A voucher belongs to one person and is used once, towards a booking or a subscription.
  Its value enters the ledger when it is used (a discount), never when it is issued.
- "Bring a friend": a new member enters a friend's code; when the new member's first
  subscription is paid, both receive a free padel hour (R-120).
- Season rewards (Stage 6) and manual vouchers use the same `issue_voucher`.
"""

from __future__ import annotations

import secrets
import uuid
from dataclasses import dataclass
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import QuerySet
from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.accounts.services.authz import authorize, current_user
from jungle.audit import services as audit
from jungle.bookings.models import SessionType
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.ai_origin import refuse_ai
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.ledger.models import AccountKind, Payment, PaymentMethod
from jungle.ledger.payments import Due, PaymentData, Subject, money_status, pay_for, resolve_due
from jungle.ledger.services import account
from jungle.locations.models import ResourceKind
from jungle.notifications import services as notifications
from jungle.rewards.models import (
    Referral,
    ReferralCode,
    ReferralStatus,
    Voucher,
    VoucherKind,
    VoucherSource,
    VoucherStatus,
    VoucherTarget,
)

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I: codes are read aloud and typed


def new_code(length: int = 10) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))


# ---------------------------------------------------------------- issuing
@dataclass(frozen=True)
class VoucherData:
    kind: str
    value: int
    target: str
    valid_days: int
    reason: str
    allowed_bands: tuple[str, ...] = ()


def issue_voucher(actor: audit.Actor, holder: User, data: VoucherData, source: str) -> Voucher:
    refuse_ai("vouchers")  # ADR-0019, the second barrier
    if data.kind == VoucherKind.PERCENT and not 1 <= data.value <= 100:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "value"})
    if data.value < 1 or data.valid_days < 1 or not data.reason.strip():
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "voucher"})
    today = clock.today_local()
    for _ in range(5):  # pragma: no branch - a clash of random codes is astronomically rare
        try:
            with transaction.atomic():
                voucher = Voucher.objects.create(
                    code=new_code(),
                    holder=holder,
                    kind=data.kind,
                    value=data.value,
                    target=data.target,
                    allowed_bands=list(data.allowed_bands),
                    valid_from=today,
                    valid_until=today + timedelta(days=data.valid_days - 1),
                    source=source,
                    reason=data.reason[:250],
                    issued_at=clock.now(),
                )
            break
        except IntegrityError:  # pragma: no cover - a duplicate random code
            continue
    audit.record(
        actor,
        "vouchers.issued",
        target=voucher,
        after={"holder": str(holder.pk), "kind": data.kind, "value": data.value, "source": source},
        reason=data.reason,
    )
    language = "en" if holder.preferred_language == "en" else "ro"
    notifications.notify(  # §11 "voucher primit"
        holder,
        "voucher.received",
        {
            "what": voucher_words(voucher, language),
            "until": notifications.day(voucher.valid_until),
            "url": notifications.account_path(language, "payments"),
        },
        subject=str(voucher.pk),
    )
    return voucher


def voucher_words(voucher: Voucher, language: str) -> str:
    """What the voucher is worth, as the holder reads it."""
    if voucher.kind == VoucherKind.HOUR:  # the value is in minutes
        if language == "en":
            return f"{voucher.value} free minutes of padel"
        of = " de" if voucher.value % 100 >= 20 or voucher.value % 100 == 0 else ""
        return f"{voucher.value}{of} minute gratuite de padel"
    if voucher.kind == VoucherKind.AMOUNT:
        return notifications.lei(voucher.value)
    return f"{voucher.value}% reducere" if language == "ro" else f"{voucher.value}% off"


def issue_manual(
    request: HttpRequest, location_id: uuid.UUID, holder_id: uuid.UUID, data: VoucherData
) -> Voucher:
    """A manager's voucher (goodwill, a season reward before Stage 6), always with a reason."""
    authorize(request, Action.VOUCHERS_MANAGE, location_id)
    holder = User.objects.filter(pk=holder_id, is_active=True).first()
    if holder is None:
        raise DomainError(ErrorCode.ACCOUNTS_NOT_FOUND, status=404)
    return issue_voucher(audit.actor_from_request(request), holder, data, VoucherSource.MANUAL)


def my_vouchers(request: HttpRequest) -> QuerySet[Voucher]:
    return Voucher.objects.filter(holder=current_user(request))


# ---------------------------------------------------------------- using a voucher
def _hour_value(due: Due, voucher: Voucher) -> int:
    """R-120: a free padel hour — the price of the first 60 minutes of a padel booking,
    only in the allowed bands (Q32)."""
    booking = due.booking
    if (
        booking is None
        or booking.resource.kind != ResourceKind.PADEL_COURT
        or booking.session_type
        in (
            SessionType.LESSON,
            SessionType.EVENT,
        )
    ):
        raise DomainError(ErrorCode.VOUCHERS_WRONG_TARGET)
    segments = booking.price_breakdown.get("segments", [])[: voucher.value // 30]
    if voucher.allowed_bands and any(s["band"] not in voucher.allowed_bands for s in segments):
        raise DomainError(
            ErrorCode.VOUCHERS_BAND_NOT_ALLOWED, params={"bands": ", ".join(voucher.allowed_bands)}
        )
    return sum(int(s["amount"]) for s in segments)


def voucher_value(voucher: Voucher, due: Due, to_pay: int) -> int:
    if voucher.target == VoucherTarget.BOOKING and due.booking is None:
        raise DomainError(ErrorCode.VOUCHERS_WRONG_TARGET)
    if voucher.target == VoucherTarget.SUBSCRIPTION and not due.key.startswith("subscription:"):
        raise DomainError(ErrorCode.VOUCHERS_WRONG_TARGET)
    if voucher.kind == VoucherKind.HOUR:
        value = _hour_value(due, voucher)
    elif voucher.kind == VoucherKind.AMOUNT:
        value = voucher.value
    else:
        value = (to_pay * voucher.value + 50) // 100  # percent, rounded to the nearest ban
    return min(value, to_pay)


def redeem(request: HttpRequest, code: str, subject: Subject) -> Payment:
    """The holder uses a voucher towards a booking or a subscription (theirs or a
    partner's booking). Used once; the discount is posted in the ledger (R-121)."""
    refuse_ai("vouchers")  # ADR-0019, the second barrier
    user = current_user(request)
    with transaction.atomic():
        voucher = (
            Voucher.objects.select_for_update()
            .filter(code=code.strip().upper(), holder=user)
            .first()
        )
        if voucher is None:
            raise DomainError(ErrorCode.VOUCHERS_NOT_FOUND, status=404)
        today = clock.today_local()
        if (
            voucher.status != VoucherStatus.ACTIVE
            or not voucher.valid_from <= today <= voucher.valid_until
        ):
            raise DomainError(ErrorCode.VOUCHERS_NOT_VALID, status=409)
        due = resolve_due(subject)
        to_pay = money_status(due).to_pay
        if to_pay == 0:
            raise DomainError(ErrorCode.PAYMENTS_NOTHING_DUE, status=409)
        amount = voucher_value(voucher, due, to_pay)
        payment = pay_for(
            audit.actor_from_request(request),
            subject,
            due,
            PaymentData(
                payer_id=user.pk,
                amount=amount,
                method=PaymentMethod.VOUCHER,
                idempotency_key=f"voucher:{voucher.pk}:{due.key}",
                voucher_id=str(voucher.pk),
                reason=f"Voucher {voucher.code}: {voucher.reason}",
            ),
            voucher_account=account(
                AccountKind.DISCOUNTS, location=due.location, category="vouchers"
            ),
        )
        voucher.status = VoucherStatus.REDEEMED
        voucher.redeemed_at = clock.now()
        voucher.redeemed_subject = due.key
        voucher.save(update_fields=["status", "redeemed_at", "redeemed_subject"])
    return payment


def cancel_voucher(
    request: HttpRequest, voucher_id: uuid.UUID, location_id: uuid.UUID, reason: str
) -> Voucher:
    refuse_ai("vouchers")  # ADR-0019, the second barrier
    authorize(request, Action.VOUCHERS_MANAGE, location_id)
    if not reason.strip():
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "reason"})
    with transaction.atomic():
        voucher = Voucher.objects.select_for_update().filter(pk=voucher_id).first()
        if voucher is None:
            raise DomainError(ErrorCode.VOUCHERS_NOT_FOUND, status=404)
        if voucher.status != VoucherStatus.ACTIVE:
            raise DomainError(ErrorCode.VOUCHERS_NOT_VALID, status=409)
        voucher.status = VoucherStatus.CANCELLED
        voucher.save(update_fields=["status"])
        audit.record(
            audit.actor_from_request(request), "vouchers.cancelled", target=voucher, reason=reason
        )
    return voucher


# ---------------------------------------------------------------- "Bring a friend" (R-120)
def my_referral_code(request: HttpRequest) -> str:
    user = current_user(request)
    existing = ReferralCode.objects.filter(user=user).first()
    if existing is not None:
        return existing.code
    for _ in range(5):
        try:
            with transaction.atomic():
                return ReferralCode.objects.create(
                    user=user, code=new_code(8), created_at=clock.now()
                ).code
        except IntegrityError:  # pragma: no cover - a duplicate random code or a double click
            existing = ReferralCode.objects.filter(user=user).first()
            if existing is not None:
                return existing.code
    raise RuntimeError("could not create a referral code")  # pragma: no cover


def _is_new_person(user: User) -> bool:
    """R-120: once per new person, checked by account, email and phone."""
    if user.subscriptions.filter(activated_at__isnull=False).exists():
        return False
    window = timedelta(days=int(get_config("referrals.claim_window_days")))
    if clock.now() - user.created_at > window:
        return False
    if user.phone:
        same_phone = User.objects.filter(phone=user.phone).exclude(pk=user.pk)
        if same_phone.filter(subscriptions__activated_at__isnull=False).exists():
            return False
        if Referral.objects.filter(referred__in=same_phone).exists():
            return False
    return True


def claim_referral(request: HttpRequest, code: str) -> Referral:
    refuse_ai("vouchers")  # ADR-0019, the second barrier
    user = current_user(request)
    owner = ReferralCode.objects.select_related("user").filter(code=code.strip().upper()).first()
    if owner is None:
        raise DomainError(ErrorCode.REFERRALS_INVALID_CODE, status=404)
    referrer = owner.user
    if referrer.pk == user.pk or (user.phone and user.phone == referrer.phone):
        raise DomainError(ErrorCode.REFERRALS_SELF)
    if Referral.objects.filter(referred=user).exists():
        raise DomainError(ErrorCode.REFERRALS_ALREADY_CLAIMED, status=409)
    if not _is_new_person(user):
        raise DomainError(ErrorCode.REFERRALS_NOT_NEW)
    try:
        with transaction.atomic():
            referral = Referral.objects.create(
                referrer=referrer, referred=user, created_at=clock.now()
            )
    except IntegrityError as exc:  # pragma: no cover - two claims at the same moment
        raise DomainError(ErrorCode.REFERRALS_ALREADY_CLAIMED, status=409) from exc
    audit.record(audit.actor_from_request(request), "referrals.claimed", target=referral)
    return referral


def on_subscription_activated(user: User) -> list[Voucher]:
    """R-120: after the new member's first subscription is paid, both get a free padel hour."""
    referral = (
        Referral.objects.select_for_update()
        .filter(referred=user, status=ReferralStatus.PENDING)
        .first()
    )
    if referral is None:
        return []
    data = VoucherData(
        kind=VoucherKind.HOUR,
        value=60,
        target=VoucherTarget.BOOKING,
        valid_days=int(get_config("referrals.voucher_valid_days")),
        reason="Adu un prieten (R-120)",
        allowed_bands=tuple(get_config("referrals.voucher_bands")),
    )
    vouchers = [
        issue_voucher(audit.SYSTEM, referral.referrer, data, VoucherSource.REFERRAL),
        issue_voucher(audit.SYSTEM, referral.referred, data, VoucherSource.REFERRAL),
    ]
    referral.status = ReferralStatus.REWARDED
    referral.rewarded_at = clock.now()
    referral.save(update_fields=["status", "rewarded_at"])
    return vouchers
