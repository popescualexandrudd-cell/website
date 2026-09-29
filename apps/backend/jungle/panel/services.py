"""What the admin panel (§8.6, Stage 10) reads across domains: who may do what where (the
panel shows only what the person may use; the server still checks every action), and the
live dashboard (occupancy, takings, alerts, the courts now)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta

from django.db.models import Sum
from django.http import HttpRequest

from jungle.accounts.models import User, UserRole
from jungle.accounts.services.authz import authorize, current_user, mfa_verified
from jungle.attendance.models import StaffNotice
from jungle.bookings.models import Booking, BookingStatus
from jungle.configuration.services import get_config, pending_decisions
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import ROLE_ACTIONS, Action, Role
from jungle.devices.models import Device
from jungle.ledger.models import AccountKind, LedgerEntry, TransactionKind
from jungle.locations.models import Location, Resource, ResourceKind

COURT_KINDS = (ResourceKind.PADEL_COURT, ResourceKind.TENNIS_COURT)
LIVE = (BookingStatus.CONFIRMED, BookingStatus.COMPLETED)
TAKINGS = (TransactionKind.PAYMENT, TransactionKind.SALE)


@dataclass(frozen=True)
class Scope:
    location_id: uuid.UUID
    location_name: str
    actions: list[str]


@dataclass(frozen=True)
class Permissions:
    user: User
    roles: list[str]
    scopes: list[Scope]


def permissions(request: HttpRequest) -> Permissions:
    """The staff member's actions, location by location (a role without a location counts
    everywhere). Only with two-factor authentication done (ADR-0011)."""
    user = current_user(request)
    roles = list(UserRole.objects.filter(user=user).select_related("location"))
    if not roles:
        raise DomainError(ErrorCode.AUTH_FORBIDDEN, status=403)
    if not mfa_verified(request):
        raise DomainError(ErrorCode.AUTH_MFA_REQUIRED, status=403)
    scopes = []
    for location in Location.objects.order_by("name"):
        actions: set[Action] = set()
        for role in roles:
            if role.location_id is None or role.location_id == location.pk:
                actions |= ROLE_ACTIONS[Role(role.role)]
        if actions:
            scopes.append(Scope(location.pk, location.name, sorted(a.value for a in actions)))
    return Permissions(user, sorted({r.role for r in roles}), scopes)


@dataclass(frozen=True)
class CourtNow:
    id: uuid.UUID
    name: str
    busy: bool
    until: datetime | None
    session_type: str
    booked_minutes_today: int
    open_minutes_today: int


@dataclass
class Dashboard:
    day: str
    bookings_today: int
    occupancy_percent: int
    cash_taken_today: int  # bani
    revenue_today: int  # bani
    unread_notices: int
    pending_decisions: int
    inactive_devices: int
    courts: list[CourtNow] = field(default_factory=list)


def _day_bounds() -> tuple[datetime, datetime]:
    day = clock.today_local()
    start = datetime.combine(day, time(), clock.BUSINESS_TZ)
    return start, start + timedelta(days=1)


def _open_minutes() -> int:
    """Today's opening hours (`bookings.opening_hours`, Q3), in minutes."""
    day = clock.today_local()
    open_at, close_at = get_config("bookings.opening_hours")[
        "weekend" if day.weekday() >= 5 else "weekday"
    ]
    minutes = [int(t[:2]) * 60 + int(t[3:]) for t in (open_at, close_at)]
    return minutes[1] - minutes[0]


def dashboard(request: HttpRequest, location_id: uuid.UUID) -> Dashboard:
    authorize(request, Action.BOOKINGS_VIEW, location_id)
    user = current_user(request)
    now = clock.now()
    start, end = _day_bounds()
    bookings = Booking.objects.filter(
        location_id=location_id, status__in=LIVE, starts_at__lt=end, ends_at__gt=start
    )
    courts = []
    total_booked = 0
    resources = Resource.objects.filter(
        location_id=location_id, kind__in=COURT_KINDS, is_active=True
    ).order_by("sort_order", "name")
    for resource in resources:
        mine = [b for b in bookings if b.resource_id == resource.pk]
        booked = sum(
            int((min(b.ends_at, end) - max(b.starts_at, start)).total_seconds() // 60) for b in mine
        )
        total_booked += booked
        current = next((b for b in mine if b.starts_at <= now < b.ends_at), None)
        courts.append(
            CourtNow(
                id=resource.pk,
                name=resource.name,
                busy=current is not None,
                until=current.ends_at if current else None,
                session_type=current.session_type if current else "",
                booked_minutes_today=booked,
                open_minutes_today=_open_minutes(),
            )
        )
    capacity = _open_minutes() * len(courts)  # the percentage is rounded half up
    entries = LedgerEntry.objects.filter(
        transaction__location_id=location_id,
        transaction__created_at__gte=start,
        transaction__created_at__lt=end,
    )
    cash = entries.filter(
        account__kind=AccountKind.CASH, transaction__kind__in=TAKINGS, amount__gt=0
    ).aggregate(total=Sum("amount"))["total"]
    revenue = entries.filter(account__kind=AccountKind.REVENUE).aggregate(total=Sum("amount"))[
        "total"
    ]
    notices = StaffNotice.objects.filter(location_id=location_id, read_at__isnull=True)
    roles = set(UserRole.objects.filter(user=user).values_list("role", flat=True))
    unread = (
        notices.filter(recipient=user).count()
        + notices.filter(recipient__isnull=True, recipient_role__in=roles).count()
    )
    return Dashboard(
        day=clock.today_local().isoformat(),
        bookings_today=bookings.filter(resource__kind__in=COURT_KINDS).count(),
        occupancy_percent=(200 * total_booked + capacity) // (2 * capacity) if capacity else 0,
        cash_taken_today=int(cash or 0),
        revenue_today=-int(revenue or 0),  # revenue is credited (negative entries)
        unread_notices=unread,
        pending_decisions=len(pending_decisions()),
        inactive_devices=Device.objects.filter(location_id=location_id, is_active=False).count(),
        courts=courts,
    )
