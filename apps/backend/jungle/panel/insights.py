"""The panel's reports, staff overview and system status (§8.6).

Reports cover a period of club days (Europe/Bucharest, ADR-0010): revenue per category from the
ledger (ADR-0009 §3), discounts, cash taken, bookings by type, cancellations and no-shows, the
occupancy of each court, classes and their attendance, new accounts. The CSV exports (for the
accountant: the ledger entries; for the manager: the bookings) are audited, and every text cell
is guarded against spreadsheet formulas. Only the owner's side sees them (`reports.view`).
"""

from __future__ import annotations

import csv
import io
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.db.models import Count, Q
from django.http import HttpRequest

from jungle.accounts.models import User, UserRole
from jungle.accounts.services.authz import authorize
from jungle.audit import services as audit
from jungle.bookings.models import Booking, BookingStatus, ClassEnrollment, EnrollmentStatus
from jungle.configuration.services import pending_decisions
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import ROLE_ACTIONS, Action, Role
from jungle.devices.models import Device
from jungle.ledger.models import AccountKind, LedgerEntry
from jungle.locations.models import Location, Resource
from jungle.panel.services import COURT_KINDS, LIVE, TAKINGS, opening_hours
from jungle.waitlist.services import csv_safe

MAX_DAYS = 366
ONLINE_MINUTES = 5


def _bounds(first: date, last: date) -> tuple[datetime, datetime]:
    """[first 00:00, the day after last 00:00) in club time; at most a year."""
    if last < first or (last - first).days >= MAX_DAYS:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "period"})
    start = datetime.combine(first, time(), clock.BUSINESS_TZ)
    return start, datetime.combine(last + timedelta(days=1), time(), clock.BUSINESS_TZ)


def _open_minutes(first: date, last: date) -> int:
    total = 0
    day = first
    while day <= last:
        opens, closes = opening_hours(day)
        total += (int(closes[:2]) * 60 + int(closes[3:])) - (int(opens[:2]) * 60 + int(opens[3:]))
        day += timedelta(days=1)
    return total


@dataclass(frozen=True)
class CourtUse:
    name: str
    booked_minutes: int
    open_minutes: int
    percent: int


@dataclass
class Report:
    first: date
    last: date
    revenue_total: int = 0
    revenue: dict[str, int] = field(default_factory=dict)
    discounts: int = 0
    cash_taken: int = 0
    bookings: dict[str, int] = field(default_factory=dict)
    cancelled: int = 0
    no_shows: int = 0
    courts: list[CourtUse] = field(default_factory=list)
    class_places: int = 0
    class_attended: int = 0
    new_accounts: int = 0


def report(request: HttpRequest, location_id: uuid.UUID, first: date, last: date) -> Report:
    authorize(request, Action.REPORTS_VIEW, location_id)
    start, end = _bounds(first, last)
    result = Report(first, last)
    entries = LedgerEntry.objects.filter(
        transaction__location_id=location_id,
        transaction__created_at__gte=start,
        transaction__created_at__lt=end,
    ).select_related("account")
    revenue: dict[str, int] = defaultdict(int)
    for e in entries.filter(account__kind=AccountKind.REVENUE):
        revenue[e.account.category or "other"] -= e.amount  # revenue is credited (negative)
    result.revenue = dict(sorted(revenue.items()))
    result.revenue_total = sum(revenue.values())
    result.discounts = sum(e.amount for e in entries.filter(account__kind=AccountKind.DISCOUNTS))
    result.cash_taken = sum(
        e.amount
        for e in entries.filter(
            account__kind=AccountKind.CASH, transaction__kind__in=TAKINGS, amount__gt=0
        )
    )
    bookings = Booking.objects.filter(
        location_id=location_id, starts_at__gte=start, starts_at__lt=end
    )
    by_type = bookings.exclude(status=BookingStatus.CANCELLED).values("session_type")
    result.bookings = {
        row["session_type"]: row["n"] for row in by_type.annotate(n=Count("id")).order_by()
    }
    result.cancelled = bookings.filter(status=BookingStatus.CANCELLED).count()
    result.no_shows = bookings.filter(status=BookingStatus.NO_SHOW).count()
    open_minutes = _open_minutes(first, last)
    courts = Resource.objects.filter(location_id=location_id, kind__in=COURT_KINDS)
    for court in courts.order_by("sort_order", "name"):
        booked = sum(
            int((b.ends_at - b.starts_at).total_seconds() // 60)
            for b in bookings.filter(resource=court, status__in=LIVE)
        )
        result.courts.append(
            CourtUse(
                name=court.name,
                booked_minutes=booked,
                open_minutes=open_minutes,
                percent=(200 * booked + open_minutes) // (2 * open_minutes),  # rounded half up
            )
        )
    enrollments = ClassEnrollment.objects.filter(
        session__location_id=location_id,
        session__starts_at__gte=start,
        session__starts_at__lt=end,
    )
    result.class_places = enrollments.filter(
        status__in=(EnrollmentStatus.ENROLLED, EnrollmentStatus.ATTENDED, EnrollmentStatus.NO_SHOW)
    ).count()
    result.class_attended = enrollments.filter(status=EnrollmentStatus.ATTENDED).count()
    result.new_accounts = User.objects.filter(created_at__gte=start, created_at__lt=end).count()
    return result


EXPORTS = ("transactions", "bookings")


def _lei(bani: int) -> str:
    sign = "-" if bani < 0 else ""
    return f"{sign}{abs(bani) // 100}.{abs(bani) % 100:02d}"


def export_csv(
    request: HttpRequest, location_id: uuid.UUID, kind: str, first: date, last: date
) -> str:
    """The ledger entries (for the accountant) or the bookings of the period, as CSV."""
    authorize(request, Action.REPORTS_VIEW, location_id)
    if kind not in EXPORTS:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "kind"})
    start, end = _bounds(first, last)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    rows = 0
    if kind == "transactions":
        writer.writerow(
            ("date", "time", "kind", "description", "account", "amount_ron", "reason", "actor")
        )
        entries = (
            LedgerEntry.objects.filter(
                transaction__location_id=location_id,
                transaction__created_at__gte=start,
                transaction__created_at__lt=end,
            )
            .select_related("transaction", "account")
            .order_by("transaction__created_at", "id")
        )
        for e in entries:
            at = clock.local(e.transaction.created_at)
            writer.writerow(
                (
                    at.date().isoformat(),
                    at.strftime("%H:%M"),
                    e.transaction.kind,
                    csv_safe(e.transaction.description),
                    csv_safe(e.account.code),
                    _lei(e.amount),
                    csv_safe(e.transaction.reason),
                    csv_safe(str(e.transaction.actor.get("label", ""))),
                )
            )
            rows += 1
    else:
        writer.writerow(
            ("date", "start", "end", "resource", "type", "status", "organizer", "price_ron")
        )
        bookings = (
            Booking.objects.filter(location_id=location_id, starts_at__gte=start, starts_at__lt=end)
            .select_related("resource", "organizer")
            .order_by("starts_at")
        )
        for b in bookings:
            begins, ends = clock.local(b.starts_at), clock.local(b.ends_at)
            writer.writerow(
                (
                    begins.date().isoformat(),
                    begins.strftime("%H:%M"),
                    ends.strftime("%H:%M"),
                    csv_safe(b.resource.name),
                    b.session_type,
                    b.status,
                    csv_safe(f"{b.organizer.first_name} {b.organizer.last_name}".strip()),
                    _lei(b.price_total),
                )
            )
            rows += 1
    audit.record(
        audit.actor_from_request(request),
        "reports.exported",
        target_type="locations.location",
        target_id=str(location_id),
        after={"kind": kind, "from": first.isoformat(), "to": last.isoformat(), "rows": rows},
    )
    return buffer.getvalue()


# ---------------------------------------------------------------- staff and roles (§8.1)
@dataclass(frozen=True)
class StaffRole:
    id: int
    role: str
    location: str


@dataclass(frozen=True)
class StaffMember:
    id: uuid.UUID
    name: str
    email: str
    mfa_enabled: bool
    is_active: bool
    roles: list[StaffRole] = field(default_factory=list)


@dataclass(frozen=True)
class StaffOverview:
    matrix: dict[str, list[str]]
    people: list[StaffMember] = field(default_factory=list)


def staff_overview(request: HttpRequest, location_id: uuid.UUID) -> StaffOverview:
    """Who holds a staff role here (or everywhere), and what each role may do."""
    authorize(request, Action.USERS_VIEW, location_id)
    roles = (
        UserRole.objects.filter(Q(location_id=location_id) | Q(location__isnull=True))
        .select_related("user", "location")
        .order_by("user__last_name", "user__first_name", "role")
    )
    people: dict[uuid.UUID, StaffMember] = {}
    for r in roles:
        user = r.user
        member = people.setdefault(
            user.pk,
            StaffMember(
                id=user.pk,
                name=f"{user.last_name} {user.first_name}".strip(),
                email=user.email or "",
                mfa_enabled=user.totp_confirmed_at is not None,
                is_active=user.is_active,
            ),
        )
        member.roles.append(StaffRole(r.pk, r.role, r.location.name if r.location else ""))
    matrix = {role.value: sorted(a.value for a in ROLE_ACTIONS[role]) for role in Role}
    return StaffOverview(matrix=matrix, people=list(people.values()))


# ---------------------------------------------------------------- system status
@dataclass(frozen=True)
class DeviceHealth:
    id: uuid.UUID
    name: str
    kind: str
    is_active: bool
    enrolled: bool
    online: bool
    last_seen_at: datetime | None


@dataclass(frozen=True)
class SystemStatus:
    version: str
    server_time: datetime
    time_zone: str
    database: bool
    cache: bool
    pending_decisions: int
    devices: list[DeviceHealth] = field(default_factory=list)


def _database() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:  # pragma: no cover - the request itself needs the database
        return False
    return True


def _cache() -> bool:
    try:
        cache.set("panel:ping", "ok", 10)
        return bool(cache.get("panel:ping") == "ok")
    except Exception:  # the cache (Redis) unreachable: report it, do not crash
        return False


def system_status(request: HttpRequest, location_id: uuid.UUID) -> SystemStatus:
    authorize(request, Action.CONFIG_VIEW, location_id)
    if not Location.objects.filter(pk=location_id).exists():
        raise DomainError(ErrorCode.LOCATIONS_NOT_FOUND, status=404)
    now = clock.now()
    devices = [
        DeviceHealth(
            id=d.pk,
            name=d.name,
            kind=d.kind,
            is_active=d.is_active,
            enrolled=d.enrolled_at is not None,
            online=bool(
                d.last_seen_at and now - d.last_seen_at <= timedelta(minutes=ONLINE_MINUTES)
            ),
            last_seen_at=d.last_seen_at,
        )
        for d in Device.objects.filter(location_id=location_id).order_by("kind", "name")
    ]
    return SystemStatus(
        version=settings.APP_VERSION,
        server_time=now,
        time_zone=str(clock.BUSINESS_TZ),
        database=_database(),
        cache=_cache(),
        pending_decisions=len(pending_decisions()),
        devices=devices,
    )
