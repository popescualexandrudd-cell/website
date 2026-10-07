"""Data-subject rights (§12.2): a complete export of a person's data, and deleting the account.

Deleting does not remove the person's row: other players' league history and the accounting
records must stay correct. Instead every personal detail is removed ("Jucător retras"),
access is closed, cards are blocked, and what is only about the person (scans, waiting
lists, vouchers, referral code, phone registrations) is deleted. What the law requires us to
keep stays, without personal details: accounting entries and receipts, and the proof of
consents given.
"""

from __future__ import annotations

import uuid
from collections.abc import Callable
from datetime import date, datetime
from typing import Any

from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.db.models import Model, Q
from django.http import HttpRequest

from jungle.accounts.models import GuardianLink, MfaRecoveryCode, User
from jungle.accounts.services.authz import authorize, current_user
from jungle.attendance.models import Scan, StaffNotice
from jungle.audit import services as audit
from jungle.bookings.models import (
    Booking,
    BookingStatus,
    ClassEnrollment,
    EnrollmentStatus,
    EventRequest,
    SlotWaitlistEntry,
)
from jungle.cafe.models import CafeOrder
from jungle.cards.models import AppleDeviceRegistration, CardStatus, MemberCard
from jungle.cards.services import card_changed
from jungle.core import clock
from jungle.core.ai_origin import refuse_ai
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.feedback.models import Feedback
from jungle.ledger.models import AccountKind, LedgerEntry, Payment
from jungle.ledger.services import customer_credit, customer_debt
from jungle.legal.models import Consent
from jungle.notifications.models import Notification, Preference, PushSubscription
from jungle.rewards.models import Referral, ReferralCode, ReferralStatus, Voucher, VoucherStatus
from jungle.subscriptions.models import CorporateMember, Subscription

_erased_listeners: list[Callable[[User], None]] = []


def on_erased(listener: Callable[[User], None]) -> None:
    """The league registers here to stop showing the person (§12.2)."""
    if listener not in _erased_listeners:
        _erased_listeners.append(listener)


RETIRED_FIRST_NAME = "Jucător"
RETIRED_LAST_NAME = "retras"


# ---------------------------------------------------------------- export (access, portability)
def _value(value: Any) -> Any:
    if isinstance(value, datetime | date):
        return value.isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    return value


def _rows(queryset: Any, fields: list[str]) -> list[dict[str, Any]]:
    return [
        {f: _value(v) for f, v in zip(fields, row, strict=True)}
        for row in queryset.values_list(*fields)
    ]


def export_data(user: User) -> dict[str, Any]:
    """Everything the club holds about the person, in one JSON document (GDPR art. 15, 20)."""
    profile_fields = [
        "id",
        "email",
        "first_name",
        "last_name",
        "phone",
        "date_of_birth",
        "preferred_language",
        "account_type",
        "created_at",
        "email_verified_at",
    ]
    data: dict[str, Any] = {
        "exported_at": clock.now().isoformat(),
        "profile": {f: _value(getattr(user, f)) for f in profile_fields},
        "consents": _rows(
            Consent.objects.filter(user=user).order_by("occurred_at"),
            [
                "document__kind",
                "document__version",
                "action",
                "language",
                "occurred_at",
                "device_id",
            ],
        ),
        "cards": _rows(
            MemberCard.objects.filter(user=user), ["number", "status", "issued_at", "revoked_at"]
        ),
        "bookings": _rows(
            Booking.objects.filter(organizer=user),
            [
                "id",
                "resource__name",
                "starts_at",
                "ends_at",
                "session_type",
                "status",
                "price_total",
                "cancellation_outcome",
                "created_at",
            ],
        ),
        "class_enrollments": _rows(
            ClassEnrollment.objects.filter(user=user),
            [
                "id",
                "session__kind",
                "session__starts_at",
                "status",
                "cancellation_outcome",
                "created_at",
            ],
        ),
        "court_waiting_list": _rows(
            SlotWaitlistEntry.objects.filter(user=user),
            ["resource__name", "starts_at", "status", "created_at"],
        ),
        "event_requests": _rows(
            EventRequest.objects.filter(requester=user),
            ["starts_at", "ends_at", "guests", "message", "status"],
        ),
        "scans": _rows(Scan.objects.filter(user=user), ["kind", "scanned_at", "resource__name"]),
        "booking_blocks": _rows(
            user.booking_restrictions.all(), ["reason", "no_show_count", "created_at", "lifted_at"]
        ),
        "subscriptions": _rows(
            Subscription.objects.filter(user=user),
            ["id", "period", "starts_on", "ends_on", "status", "price_total", "created_at"],
        ),
        "vouchers": _rows(
            Voucher.objects.filter(holder=user),
            ["code", "kind", "value", "valid_until", "status", "reason", "redeemed_at"],
        ),
        "account_entries": _rows(
            LedgerEntry.objects.filter(
                account__user=user,
                account__kind__in=(AccountKind.CUSTOMER_BALANCE, AccountKind.RECEIVABLE),
            ).order_by("transaction__created_at"),
            [
                "transaction__created_at",
                "transaction__kind",
                "account__kind",
                "amount",
                "transaction__description",
            ],
        ),
        "payments": _rows(
            Payment.objects.filter(payer=user),
            ["created_at", "method", "amount", "tendered", "change", "fiscal_receipt"],
        ),
        "cafe_orders": _rows(
            CafeOrder.objects.filter(customer=user), ["day", "number", "total", "status"]
        ),
        "company_memberships": _rows(
            CorporateMember.objects.filter(user=user), ["account__name", "added_at", "removed_at"]
        ),
        "feedback": _rows(Feedback.objects.filter(user=user), ["asked_at", "score", "answered_at"]),
        "balance": {"credit": customer_credit(user), "debt": customer_debt(user)},
    }
    return data


def export_mine(request: HttpRequest) -> dict[str, Any]:
    user = current_user(request)
    audit.record(audit.actor_from_request(request), "privacy.exported", target=user)
    return export_data(user)


# ---------------------------------------------------------------- deleting the account
def _check_can_erase(user: User, forfeit_credit: bool) -> None:
    if user.deleted_at is not None:
        raise DomainError(ErrorCode.ACCOUNTS_NOT_FOUND, status=404)
    if user.roles.exists():
        raise DomainError(ErrorCode.PRIVACY_STAFF_ACCOUNT, status=409)
    if GuardianLink.objects.filter(guardian=user, child__deleted_at__isnull=True).exists():
        raise DomainError(ErrorCode.PRIVACY_HAS_CHILDREN, status=409)
    if customer_debt(user) > 0:
        raise DomainError(
            ErrorCode.PRIVACY_OUTSTANDING_DEBT, status=409, params={"debt": customer_debt(user)}
        )
    credit = customer_credit(user)
    if credit > 0 and not forfeit_credit:
        raise DomainError(ErrorCode.PRIVACY_CREDIT_LEFT, status=409, params={"credit": credit})
    if Booking.objects.filter(
        organizer=user, status=BookingStatus.CONFIRMED, ends_at__gt=clock.now()
    ).exists():
        raise DomainError(ErrorCode.PRIVACY_FUTURE_BOOKINGS, status=409)


def _anonymise(obj: Model, **fields: Any) -> None:
    for name, value in fields.items():
        setattr(obj, name, value)
    obj.save(update_fields=list(fields))


def erase(actor: audit.Actor, user: User, *, forfeit_credit: bool = False) -> User:
    """§12.2: the account becomes "Jucător retras"; nothing personal remains in use."""
    refuse_ai("privacy")  # ADR-0019, the second barrier
    with transaction.atomic():
        user = User.objects.select_for_update().get(pk=user.pk)
        _check_can_erase(user, forfeit_credit)
        now = clock.now()
        for card in MemberCard.objects.filter(user=user, status=CardStatus.ACTIVE):
            _anonymise(card, status=CardStatus.REVOKED, revoked_at=now, revoke_reason="Cont șters")
            card_changed(card)  # the Wallet passes become void on the phones
        AppleDeviceRegistration.objects.filter(card__user=user).delete()
        Scan.objects.filter(user=user).delete()
        SlotWaitlistEntry.objects.filter(user=user).delete()
        ReferralCode.objects.filter(user=user).delete()
        Voucher.objects.filter(holder=user, status=VoucherStatus.ACTIVE).update(
            status=VoucherStatus.CANCELLED
        )
        MfaRecoveryCode.objects.filter(user=user).delete()
        # No message reaches the person any more: the phones' push addresses, the messages still
        # waiting (their texts hold personal details) and the channel choices go.
        PushSubscription.objects.filter(user=user).delete()
        Notification.objects.filter(user=user).delete()
        Preference.objects.filter(user=user).delete()
        CorporateMember.objects.filter(user=user, removed_at__isnull=True).update(removed_at=now)
        EventRequest.objects.filter(requester=user).update(message="")
        ClassEnrollment.objects.filter(user=user, status=EnrollmentStatus.WAITLISTED).update(
            status=EnrollmentStatus.CANCELLED, cancelled_at=now
        )
        for notice in StaffNotice.objects.filter(payload__user_id=str(user.pk)):
            notice.payload = {**notice.payload, "name": f"{RETIRED_FIRST_NAME} {RETIRED_LAST_NAME}"}
            notice.save(update_fields=["payload"])
        # A pending "Bring a friend" involving this account is dropped: no vouchers for it.
        Referral.objects.filter(status=ReferralStatus.PENDING).filter(
            Q(referred=user) | Q(referrer=user)
        ).delete()
        _anonymise(
            user,
            email=None,
            first_name=RETIRED_FIRST_NAME,
            last_name=RETIRED_LAST_NAME,
            phone="",
            date_of_birth=None,
            is_active=False,
            email_verified_at=None,
            totp_secret="",
            totp_confirmed_at=None,
            totp_last_step=None,
            password=make_password(None),
            deleted_at=now,
        )
        audit.record(
            actor, "privacy.account_erased", target=user, after={"forfeited_credit": forfeit_credit}
        )
        for listener in _erased_listeners:
            listener(user)
    return user


def erase_mine(request: HttpRequest, password: str, forfeit_credit: bool) -> User:
    """The person deletes their own account; the password confirms it is really them."""
    user = current_user(request)
    if not user.check_password(password):
        raise DomainError(ErrorCode.PRIVACY_WRONG_PASSWORD, status=403)
    return erase(audit.actor_from_request(request), user, forfeit_credit=forfeit_credit)


def erase_by_staff(
    request: HttpRequest, user_id: uuid.UUID, reason: str, forfeit_credit: bool
) -> User:
    """A request received by email or at the front desk (identity checked by staff)."""
    authorize(request, Action.USERS_MANAGE)
    if not reason.strip():
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "reason"})
    user = User.objects.filter(pk=user_id).first()
    if user is None:
        raise DomainError(ErrorCode.ACCOUNTS_NOT_FOUND, status=404)
    audit.record(
        audit.actor_from_request(request), "privacy.erasure_requested", target=user, reason=reason
    )
    return erase(audit.actor_from_request(request), user, forfeit_credit=forfeit_credit)
