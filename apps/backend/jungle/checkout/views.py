"""What the Payments Kiosk shows after a card is scanned (§8.3): the customer's credit, what
they have to pay (debts first), today's bookings they played in (to pay their share, R-060),
subscriptions and vouchers. Reading only; paying goes through `checkout.services`.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from django.db.models import Q

from jungle.accounts.models import User
from jungle.attendance.models import Scan, ScanKind
from jungle.bookings.models import Booking, BookingStatus, CancellationOutcome, ClassEnrollment
from jungle.checkout.models import ItemKind
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.devices.models import Device
from jungle.ledger import payments
from jungle.ledger.services import customer_credit, split_amount
from jungle.rewards.models import Voucher, VoucherStatus
from jungle.subscriptions.models import Subscription, SubscriptionStatus

LOOK_BACK = timedelta(days=90)
LOOK_AHEAD = timedelta(days=30)


@dataclass(frozen=True)
class Payable:
    kind: str
    subject_id: uuid.UUID
    description: str
    price: int
    to_pay: int
    debt: bool  # past or charged: a debt (late cancellation, no-show, unpaid session)
    starts_at: datetime | None = None
    organizer: str = ""


@dataclass(frozen=True)
class VoucherView:
    code: str
    kind: str
    value: int
    target: str
    valid_until: str


@dataclass
class Session:
    first_name: str
    last_name: str
    language: str
    credit: int
    payables: list[Payable] = field(default_factory=list)
    shared: list[Payable] = field(default_factory=list)
    vouchers: list[VoucherView] = field(default_factory=list)
    subscriptions: list[dict[str, object]] = field(default_factory=list)


def _payable(
    kind: str,
    subject_id: uuid.UUID,
    due: payments.Due,
    starts_at: datetime | None,
    organizer: str = "",
) -> Payable | None:
    status = payments.money_status(due)
    if status.to_pay == 0:
        return None
    debt = (
        status.charged > 0
        or due.late_cancelled
        or (starts_at is not None and starts_at < clock.now())
    )
    return Payable(
        kind, subject_id, due.description, due.amount, status.to_pay, debt, starts_at, organizer
    )


def payables(user: User, device: Device) -> list[Payable]:
    """Everything the customer owes at this club, debts first."""
    now = clock.now()
    window = Q(starts_at__gte=now - LOOK_BACK, starts_at__lte=now + LOOK_AHEAD)
    rows: list[Payable | None] = []
    bookings = (
        Booking.objects.filter(window, organizer=user, location_id=device.location_id)
        .exclude(
            Q(status=BookingStatus.CANCELLED) & ~Q(cancellation_outcome=CancellationOutcome.CHARGED)
        )
        .select_related("resource", "location", "organizer")
    )
    rows += [
        _payable(ItemKind.BOOKING, b.pk, payments.due_for_booking(b), b.starts_at) for b in bookings
    ]
    enrollments = ClassEnrollment.objects.filter(
        user=user,
        session__location_id=device.location_id,
        session__starts_at__gte=now - LOOK_BACK,
        session__starts_at__lte=now + LOOK_AHEAD,
    ).select_related("session", "session__location", "user")
    rows += [
        _payable(ItemKind.ENROLLMENT, e.pk, payments.due_for_enrollment(e), e.session.starts_at)
        for e in enrollments
    ]
    from jungle.subscriptions.services import due_for_subscription

    pending = Subscription.objects.filter(
        user=user, location_id=device.location_id, status=SubscriptionStatus.PENDING_PAYMENT
    ).select_related("user", "location")
    rows += [_payable(ItemKind.SUBSCRIPTION, s.pk, due_for_subscription(s), None) for s in pending]
    from jungle.league.models import EntryStatus, TournamentEntry
    from jungle.league.tournaments import due_for_entry

    entries = TournamentEntry.objects.filter(
        Q(player_a=user) | Q(player_b=user),
        status=EntryStatus.REGISTERED,
        tournament__location_id=device.location_id,
    ).select_related("tournament", "tournament__location", "player_a")
    rows += [
        _payable(ItemKind.TOURNAMENT_ENTRY, e.pk, due_for_entry(e), e.tournament.starts_at)
        for e in entries
    ]
    found = [r for r in rows if r is not None]
    return sorted(found, key=lambda p: (not p.debt, p.starts_at or now))


def shared(user: User, device: Device) -> list[Payable]:
    """Today's bookings the customer played in but did not organize: they pay their share
    here (R-060) — the booking is found from their scan at the court entrance."""
    today = clock.today_local()
    start = datetime.combine(today, datetime.min.time(), clock.BUSINESS_TZ)
    ids = Scan.objects.filter(
        user=user,
        kind=ScanKind.COURT_ENTRY,
        location_id=device.location_id,
        scanned_at__gte=start,
        booking__isnull=False,
    ).values_list("booking_id", flat=True)
    bookings = (
        Booking.objects.filter(pk__in=ids)
        .exclude(organizer=user)
        .select_related("resource", "location", "organizer")
    )
    rows = [
        _payable(
            ItemKind.BOOKING,
            b.pk,
            payments.due_for_booking(b),
            b.starts_at,
            f"{b.organizer.first_name} {b.organizer.last_name}",
        )
        for b in bookings
    ]
    return [r for r in rows if r is not None]


def session(user: User, device: Device) -> Session:
    from jungle.subscriptions.services import due_for_subscription

    today = clock.today_local()
    vouchers = Voucher.objects.filter(
        holder=user, status=VoucherStatus.ACTIVE, valid_from__lte=today, valid_until__gte=today
    )
    active = Subscription.objects.filter(
        user=user, location_id=device.location_id, status=SubscriptionStatus.ACTIVE
    )
    return Session(
        first_name=user.first_name,
        last_name=user.last_name,
        language=user.preferred_language,
        credit=customer_credit(user),
        payables=payables(user, device),
        shared=shared(user, device),
        vouchers=[
            VoucherView(v.code, v.kind, v.value, v.target, v.valid_until.isoformat())
            for v in vouchers
        ],
        subscriptions=[
            {
                "id": str(s.pk),
                "description": due_for_subscription(s).description,
                "ends_on": s.ends_on.isoformat(),
            }
            for s in active
        ],
    )


@dataclass(frozen=True)
class Split:
    price: int
    paid: int
    to_pay: int
    shares: list[int]


def split(booking_id: uuid.UUID, parts: int, device: Device) -> Split:
    """R-060, R-061: the hour split between the players, in whole bani (the first share takes
    the leftover bani); the kiosk shows live what is still to pay."""
    booking = (
        Booking.objects.select_related("resource", "location", "organizer")
        .filter(pk=booking_id, location_id=device.location_id)
        .first()
    )
    if booking is None:
        raise DomainError(ErrorCode.BOOKING_NOT_FOUND, status=404)
    if not 1 <= parts <= 8:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "parts"})
    status = payments.money_status(payments.due_for_booking(booking))
    return Split(status.price, status.paid, status.to_pay, split_amount(status.price, parts))
