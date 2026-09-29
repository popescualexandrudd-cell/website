"""What the panel's money modules read (§8.6, ADR-0009): the day's ledger transactions with their
entries (every correction is a reverse entry, never an edit), the cash (each Payments Kiosk's box,
the safe, the staff operations and the day closes with the Z report, R-064), the vouchers issued
and the café's whole menu, unavailable products included. Only reads: every change goes through
the staff API of its domain (`ledger.payments`, `ledger.services.reverse`, `rewards`, `cafe`)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from typing import Any

from django.http import HttpRequest

from jungle.accounts.services.authz import authorize
from jungle.cafe.models import CafeCategory
from jungle.checkout import cashbox
from jungle.checkout.models import CashOperation
from jungle.checkout.services import cash_box, safe
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.devices.models import Device, DeviceKind
from jungle.ledger.models import LedgerTransaction
from jungle.ledger.services import balance
from jungle.locations.models import Location
from jungle.rewards.models import Voucher

LIST_LIMIT = 200
OPERATIONS = 30


@dataclass(frozen=True)
class EntryView:
    account: str
    kind: str
    amount: int


@dataclass(frozen=True)
class TransactionView:
    id: uuid.UUID
    kind: str
    description: str
    reason: str
    actor: str
    subject: str
    created_at: datetime
    reverses_id: uuid.UUID | None
    reversed: bool
    entries: list[EntryView] = field(default_factory=list)


def _actor(data: dict[str, Any]) -> str:
    return str(data.get("label") or data.get("kind") or "")


def transactions(request: HttpRequest, location_id: uuid.UUID, day: date) -> list[TransactionView]:
    """The transactions of a club day, the newest first (at most 200)."""
    authorize(request, Action.PAYMENTS_VIEW, location_id)
    start = datetime.combine(day, time(), clock.BUSINESS_TZ)
    found = (
        LedgerTransaction.objects.filter(
            location_id=location_id, created_at__gte=start, created_at__lt=start + timedelta(days=1)
        )
        .prefetch_related("entries__account")
        .select_related("reversed_by")
        .order_by("-created_at")
    )
    views = []
    for t in found[:LIST_LIMIT]:
        views.append(
            TransactionView(
                id=t.pk,
                kind=t.kind,
                description=t.description,
                reason=t.reason,
                actor=_actor(t.actor),
                subject=t.subject,
                created_at=t.created_at,
                reverses_id=t.reverses_id,
                reversed=hasattr(t, "reversed_by"),
                entries=[
                    EntryView(e.account.code, e.account.kind, e.amount) for e in t.entries.all()
                ],
            )
        )
    return views


@dataclass(frozen=True)
class KioskCash:
    device_id: uuid.UUID
    name: str
    is_active: bool
    in_box: int
    received_today: int
    change_given_today: int
    moved_today: int


@dataclass(frozen=True)
class OperationView:
    id: uuid.UUID
    device: str
    kind: str
    staff: str
    amount: int | None
    ledger_amount: int | None
    difference: int | None
    result: dict[str, Any]
    created_at: datetime
    completed_at: datetime | None


@dataclass(frozen=True)
class CashView:
    safe: int
    kiosks: list[KioskCash] = field(default_factory=list)
    operations: list[OperationView] = field(default_factory=list)


def cash(request: HttpRequest, location_id: uuid.UUID) -> CashView:
    """Each Payments Kiosk's cash box (what the ledger holds for it) and today's movements, the
    safe, and the latest staff operations: refills, emptying, counts, day closes (Z report)."""
    authorize(request, Action.PAYMENTS_VIEW, location_id)
    location = Location.objects.filter(pk=location_id).first()
    if location is None:
        raise DomainError(ErrorCode.LOCATIONS_NOT_FOUND, status=404)
    today = clock.today_local()
    kiosks = []
    devices = Device.objects.filter(location=location, kind=DeviceKind.PAYMENTS_KIOSK)
    for device in devices.order_by("name"):
        totals = cashbox.day_totals(device, today)
        kiosks.append(
            KioskCash(
                device_id=device.pk,
                name=device.name,
                is_active=device.is_active,
                in_box=balance(cash_box(device)),
                received_today=totals["received"],
                change_given_today=totals["change_given"],
                moved_today=totals["moved_to_or_from_safe"],
            )
        )
    operations = CashOperation.objects.filter(location=location).select_related("device", "staff")
    return CashView(
        safe=balance(safe(location)),
        kiosks=kiosks,
        operations=[
            OperationView(
                id=o.pk,
                device=o.device.name,
                kind=o.kind,
                staff=f"{o.staff.first_name} {o.staff.last_name}".strip(),
                amount=o.amount,
                ledger_amount=o.ledger_amount,
                difference=o.difference,
                result=o.result,
                created_at=o.created_at,
                completed_at=o.completed_at,
            )
            for o in operations.order_by("-created_at")[:OPERATIONS]
        ],
    )


@dataclass(frozen=True)
class VoucherView:
    id: uuid.UUID
    code: str
    holder_id: uuid.UUID
    holder: str
    kind: str
    value: int
    target: str
    valid_from: date
    valid_until: date
    source: str
    reason: str
    status: str
    issued_at: datetime
    redeemed_at: datetime | None


def vouchers(request: HttpRequest, location_id: uuid.UUID, status: str = "") -> list[VoucherView]:
    """The latest vouchers of the club (at most 200), optionally of one status."""
    authorize(request, Action.VOUCHERS_MANAGE, location_id)
    found = Voucher.objects.select_related("holder").order_by("-issued_at")
    if status:
        found = found.filter(status=status)
    return [
        VoucherView(
            id=v.pk,
            code=v.code,
            holder_id=v.holder_id,
            holder=f"{v.holder.last_name} {v.holder.first_name}".strip(),
            kind=v.kind,
            value=v.value,
            target=v.target,
            valid_from=v.valid_from,
            valid_until=v.valid_until,
            source=v.source,
            reason=v.reason,
            status=v.status,
            issued_at=v.issued_at,
            redeemed_at=v.redeemed_at,
        )
        for v in found[:LIST_LIMIT]
    ]


@dataclass(frozen=True)
class ProductView:
    id: uuid.UUID
    name_ro: str
    name_en: str
    price: int
    marker: str
    is_available: bool
    sort_order: int


@dataclass(frozen=True)
class CategoryView:
    id: uuid.UUID
    name_ro: str
    name_en: str
    sort_order: int
    products: list[ProductView] = field(default_factory=list)


def cafe_menu(request: HttpRequest, location_id: uuid.UUID) -> list[CategoryView]:
    """The whole menu, the products taken off the menu too (the public menu hides them)."""
    authorize(request, Action.CAFE_MANAGE, location_id)
    categories = CafeCategory.objects.filter(location_id=location_id).prefetch_related("products")
    return [
        CategoryView(
            id=c.pk,
            name_ro=c.name_ro,
            name_en=c.name_en,
            sort_order=c.sort_order,
            products=[
                ProductView(
                    id=p.pk,
                    name_ro=p.name_ro,
                    name_en=p.name_en,
                    price=p.price,
                    marker=p.marker,
                    is_available=p.is_available,
                    sort_order=p.sort_order,
                )
                for p in sorted(c.products.all(), key=lambda p: (p.sort_order, p.name_ro))
            ],
        )
        for c in categories.order_by("sort_order", "name_ro")
    ]
