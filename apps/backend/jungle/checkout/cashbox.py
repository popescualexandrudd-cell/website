"""The Payments Kiosk's cash box, in staff mode (§8.3): card + PIN, then refill the change,
empty the cassette, count, and close the day with the register's Z report.

Every operation runs on a command the server signs for this kiosk's Hardware Bridge; the
bridge reports back what it did, signed, and only that is posted: a refill moves money from
the safe into the kiosk's cash box, emptying moves it back, a count is compared with the
ledger (a difference is reported to the manager, R-064).
"""

from __future__ import annotations

import re
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from itertools import pairwise
from typing import Any

from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache
from django.db import transaction
from django.db.models import Q, Sum
from django.http import HttpRequest

from jungle.accounts.models import User, UserRole
from jungle.accounts.services.authz import current_user, mfa_verified
from jungle.audit import services as audit
from jungle.audit.models import ActorKind
from jungle.checkout.models import CashEvent, CashEventKind, CashOperation, KioskPin, OperationKind
from jungle.checkout.services import cash_box, guard, notify, safe
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import ROLE_ACTIONS, Action, Role
from jungle.devices import commands
from jungle.devices.kiosk_session import CardIn, person
from jungle.devices.models import Device
from jungle.ledger.models import LedgerEntry, TransactionKind
from jungle.ledger.services import balance, post

STAFF_SESSION_SECONDS = 300
PIN = re.compile(r"^\d{6}$")
# The notes the recycler gives as change (a demo set until the model is chosen, Q23).
REFILL_VALUES = (100, 500, 1000, 5000)
MAX_REFILL_NOTES = 500
OPERATION_EVENTS = {
    OperationKind.REFILL: CashEventKind.REFILLED,
    OperationKind.EMPTY: CashEventKind.EMPTIED,
    OperationKind.COUNT: CashEventKind.COUNTED,
    OperationKind.DAY_CLOSE: CashEventKind.Z_REPORT,
}
COMMANDS = {
    OperationKind.REFILL: "cash.refill",
    OperationKind.EMPTY: "cash.empty",
    OperationKind.COUNT: "cash.count",
    OperationKind.DAY_CLOSE: "fiscal.z",
}


def handles_cash(user: User, location_id: uuid.UUID | None) -> bool:
    return any(
        Action.CASH_MANAGE in ROLE_ACTIONS[Role(r.role)]
        and (r.location_id is None or location_id is None or r.location_id == location_id)
        for r in UserRole.objects.filter(user=user)
    )


# ---------------------------------------------------------------- the PIN
def _weak(pin: str) -> bool:
    digits = [int(c) for c in pin]
    steps = {b - a for a, b in pairwise(digits)}
    return len(set(digits)) == 1 or steps in ({1}, {-1})


def set_pin(request: HttpRequest, pin: str) -> None:
    """A staff member who handles cash sets their own PIN, logged in with 2FA."""
    user = current_user(request)
    if not handles_cash(user, None) or not mfa_verified(request):
        raise DomainError(ErrorCode.CHECKOUT_STAFF_ONLY, status=403)
    if not PIN.match(pin) or _weak(pin):
        raise DomainError(ErrorCode.CHECKOUT_PIN_FORMAT)
    KioskPin.objects.update_or_create(
        user=user,
        defaults={
            "pin_hash": make_password(pin),
            "failures": 0,
            "locked_until": None,
            "updated_at": clock.now(),
        },
    )
    audit.record(audit.actor_from_request(request), "checkout.pin_set", target=user)


def _check_pin(user: User, pin: str) -> None:
    with transaction.atomic():
        record = KioskPin.objects.select_for_update().filter(user=user).first()
        now = clock.now()
        if record is not None and record.locked_until and record.locked_until > now:
            minutes = int((record.locked_until - now).total_seconds() // 60) + 1
            raise DomainError(
                ErrorCode.CHECKOUT_PIN_LOCKED, status=403, params={"minutes": minutes}
            )
        if record is None or not check_password(pin, record.pin_hash):
            if record is not None:
                record.failures += 1
                if record.failures >= int(get_config("checkout.pin_max_failures")):
                    lock = int(get_config("checkout.pin_lock_minutes"))
                    record.locked_until = now + timedelta(minutes=lock)
                    record.failures = 0
                record.save(update_fields=["failures", "locked_until"])
            ok = False
        else:
            record.failures = 0
            record.locked_until = None
            record.save(update_fields=["failures", "locked_until"])
            ok = True
    if not ok:
        raise DomainError(ErrorCode.CHECKOUT_PIN_WRONG, status=403)


# ---------------------------------------------------------------- staff mode
def _key(device: Device, token: str) -> str:
    return f"kiosk-staff:{device.pk}:{token}"


def staff_login(request: HttpRequest, card: CardIn, pin: str) -> tuple[User, str]:
    """Card + PIN at this kiosk: a staff session of 5 minutes, bound to the kiosk."""
    device = guard(request)
    user = person(request, card)
    if not handles_cash(user, device.location_id):
        audit.record(
            audit.actor_from_request(request),
            "checkout.staff_refused",
            after={"user": str(user.pk), "problem": "no_role"},
        )
        raise DomainError(ErrorCode.CHECKOUT_STAFF_ONLY, status=403)
    try:
        _check_pin(user, pin)
    except DomainError:
        audit.record(
            audit.actor_from_request(request),
            "checkout.staff_refused",
            after={"user": str(user.pk), "problem": "pin"},
        )
        raise
    token = secrets.token_urlsafe(24)
    cache.set(_key(device, token), str(user.pk), STAFF_SESSION_SECONDS)
    audit.record(audit.actor_from_request(request), "checkout.staff_login", target=user)
    return user, token


def staff_of(request: HttpRequest, token: str) -> tuple[Device, User]:
    device = guard(request)
    user_id = cache.get(_key(device, token))
    user = User.objects.filter(pk=user_id, is_active=True).first() if user_id else None
    if user is None or not handles_cash(user, device.location_id):
        raise DomainError(ErrorCode.DEVICES_SESSION_EXPIRED, status=403)
    cache.touch(_key(device, token), STAFF_SESSION_SECONDS)
    return device, user


def staff_logout(request: HttpRequest, token: str) -> None:
    cache.delete(_key(guard(request), token))


# ---------------------------------------------------------------- operations
@dataclass(frozen=True)
class Started:
    operation: CashOperation
    command: dict[str, Any]


def start(
    request: HttpRequest, token: str, kind: str, notes: dict[str, int] | None = None
) -> Started:
    device, staff = staff_of(request, token)
    if kind not in OperationKind.values:
        raise DomainError(ErrorCode.CHECKOUT_OPERATION_INVALID)
    requested: dict[str, Any] = {}
    fields: dict[str, Any] = {}
    if kind == OperationKind.REFILL:
        counts = {int(k): v for k, v in (notes or {}).items() if str(k).isdigit()}
        if (
            not counts
            or len(counts) != len(notes or {})
            or any(v not in REFILL_VALUES for v in counts)
            or any(not isinstance(n, int) or not 0 < n <= MAX_REFILL_NOTES for n in counts.values())
        ):
            raise DomainError(ErrorCode.CHECKOUT_OPERATION_INVALID)
        requested = {"notes": {str(k): v for k, v in sorted(counts.items())}}
        fields = {"notes": requested["notes"]}
    operation = CashOperation.objects.create(
        device=device,
        location=device.location,
        kind=kind,
        staff=staff,
        requested=requested,
        created_at=clock.now(),
    )
    audit.record(
        audit.Actor(
            kind=ActorKind.DEVICE, user_id=staff.pk, device_id=device.pk, label=device.name
        ),
        "checkout.cash_operation",
        target=operation,
        after={"kind": kind, **requested},
    )
    command = commands.sign(device, COMMANDS[OperationKind(kind)], txn=str(operation.pk), **fields)
    return Started(operation, command)


def apply(operation: CashOperation, event: CashEvent, payload: dict[str, Any]) -> None:
    """What the bridge reports for a staff operation (called with the event just stored)."""
    if OPERATION_EVENTS[OperationKind(operation.kind)] != event.kind or operation.completed_at:
        notify(operation.location_id, "unexpected_operation_event", operation=operation.pk)
        return
    actor = audit.Actor(
        kind=ActorKind.DEVICE,
        user_id=operation.staff_id,
        device_id=operation.device_id,
        label=operation.device.name,
    )
    box, vault = cash_box(operation.device), safe(operation.location)
    result = {k: v for k, v in payload.items() if k not in ("nonce", "signature")}
    if event.kind in (CashEventKind.REFILLED, CashEventKind.EMPTIED) and event.amount:
        into_box = event.kind == CashEventKind.REFILLED
        sign = 1 if into_box else -1
        post(
            TransactionKind.TRANSFER,
            [(box, sign * event.amount), (vault, -sign * event.amount)],
            description="Rest alimentat din seif" if into_box else "Casetă golită în seif",
            actor=actor,
            idempotency_key=f"cash-operation:{operation.pk}",
            location=operation.location,
            metadata={"purpose": operation.kind, "operation": str(operation.pk)},
        )
    if event.kind == CashEventKind.COUNTED:
        ledger = balance(box)
        operation.ledger_amount = ledger
        operation.difference = event.amount - ledger
        if operation.difference:
            notify(
                operation.location_id,
                "count_difference",
                operation=operation.pk,
                counted=event.amount,
                ledger=ledger,
            )
    if event.kind == CashEventKind.Z_REPORT:
        result["day"] = day_totals(operation.device, clock.today_local())
    operation.amount = event.amount
    operation.result = result
    operation.completed_at = clock.now()
    operation.save(
        update_fields=["amount", "ledger_amount", "difference", "result", "completed_at"]
    )


def day_totals(device: Device, day: Any) -> dict[str, int]:
    """For the day close: the cash that came into and went out of this kiosk's box."""
    start = datetime.combine(day, time(), clock.BUSINESS_TZ)
    entries = LedgerEntry.objects.filter(
        account=cash_box(device), transaction__created_at__gte=start
    ).filter(transaction__created_at__lt=start + timedelta(days=1))
    cash_in = (
        entries.filter(amount__gt=0)
        .exclude(transaction__kind=TransactionKind.TRANSFER)
        .aggregate(total=Sum("amount"))["total"]
    )
    moved = entries.filter(transaction__kind=TransactionKind.TRANSFER).aggregate(
        total=Sum("amount")
    )["total"]
    change = (
        CashEvent.objects.filter(
            Q(device=device) & Q(kind=CashEventKind.DISPENSED) & Q(happened_at__gte=start)
        )
        .filter(happened_at__lt=start + timedelta(days=1))
        .aggregate(total=Sum("amount"))["total"]
    )
    return {
        "received": int(cash_in or 0),
        "change_given": int(change or 0),
        "moved_to_or_from_safe": int(moved or 0),
        "in_box": balance(cash_box(device)),
    }


def operations(request: HttpRequest, token: str) -> list[CashOperation]:
    device, _ = staff_of(request, token)
    return list(CashOperation.objects.filter(device=device).order_by("-created_at")[:20])
