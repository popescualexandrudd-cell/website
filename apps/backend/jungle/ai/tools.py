"""The club's AI tools (registered at start-up, `AIConfig.ready`), each through the services
people use, with the same checks.

- for everyone: the club's facts, free courts, the price of a court hour, the week's classes;
- for a signed-in client: their bookings, and *preparing* a booking that the person confirms with a
  button under the answer (POST /api/v1/bookings, as on the booking page). The AI never books by
  itself and never touches money: the payment stays at the Payments Kiosk (R-063).
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta
from typing import Any

from jungle.accounts.models import User
from jungle.ai.models import Context
from jungle.ai.registry import Call, Tool, register
from jungle.bookings.classes import enrolled_count, upcoming_classes
from jungle.bookings.models import Booking, BookingStatus, SessionType
from jungle.bookings.services import (
    BookingData,
    busy_intervals,
    check_can_book_online,
    check_duration,
    product_for,
    validate_slot,
)
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.locations.models import Resource, ResourceKind
from jungle.locations.services import active_resources
from jungle.notifications import services as notifications
from jungle.pricing.services import day_bounds, quote

ALL = frozenset(Context)
CLIENTS = frozenset({Context.PUBLIC, Context.MEMBER})
MEMBER = frozenset({Context.MEMBER})
NO_INPUT: dict[str, Any] = {
    "type": "object",
    "properties": {},
    "required": [],
    "additionalProperties": False,
}


def club_info(call: Call, _: dict[str, Any]) -> dict[str, Any]:
    """Public facts only: the club's name, address, opening hours and public contact."""
    company = dict(get_config("club.company"))
    hours = dict(get_config("bookings.opening_hours"))
    return {
        "club": call.location.name,
        "address": ", ".join(p for p in (call.location.address, call.location.city) if p),
        "opening_hours": {
            "monday_to_friday": "–".join(hours["weekday"]),
            "weekend": "–".join(hours["weekend"]),
            "time_zone": "Europe/Bucharest",
        },
        "phone": company.get("phone") or None,
        "email": company.get("privacy_contact_email") or None,
    }


# The assistant (12D): reads availability, quotes and the class schedule for everyone; for a
# signed-in client it lists their bookings and PREPARES a booking, which the person confirms with
# a button (POST /api/v1/bookings, as on the booking page): the AI never books by itself, and the
# payment stays at the Payments Kiosk (R-063).

DAYS_AHEAD = 30
COURT_KINDS = (ResourceKind.PADEL_COURT, ResourceKind.TENNIS_COURT)


def _day(value: Any) -> date:
    try:
        day = date.fromisoformat(str(value))
    except ValueError as exc:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "date"}) from exc
    today = clock.today_local()
    if not today <= day <= today + timedelta(days=DAYS_AHEAD):
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "date"})
    return day


def _duration(value: Any) -> int:
    minutes = int(value)
    check_duration(minutes)
    return minutes


def _local(moment: datetime) -> str:
    return clock.local(moment).strftime("%Y-%m-%d %H:%M")


def _member(call: Call) -> User:
    if call.user is None:  # the member tools are registered for the member context only
        raise DomainError(ErrorCode.AUTH_REQUIRED, status=401)
    return call.user


def _courts(call: Call) -> list[Resource]:
    return [r for r in active_resources(call.location) if r.kind in COURT_KINDS]


def _free_starts(
    day: date, minutes: int, courts: list[Resource]
) -> dict[uuid.UUID, list[datetime]]:
    hours = get_config("bookings.opening_hours")["weekend" if day.weekday() >= 5 else "weekday"]
    opens = datetime.combine(day, time.fromisoformat(hours[0]), clock.BUSINESS_TZ)
    closes = datetime.combine(day, time.fromisoformat(hours[1]), clock.BUSINESS_TZ)
    start, end = day_bounds(day)
    busy = busy_intervals([c.pk for c in courts], start, end)
    length = timedelta(minutes=minutes)
    now = clock.now()
    free: dict[uuid.UUID, list[datetime]] = {}
    for court in courts:
        moment, slots = opens, []
        while moment + length <= closes:
            if moment > now and all(
                not (s < moment + length and moment < e) for s, e in busy[court.pk]
            ):
                slots.append(moment)
            moment += timedelta(minutes=30)
        free[court.pk] = slots
    return free


def court_availability(call: Call, data: dict[str, Any]) -> dict[str, Any]:
    day, minutes = _day(data["date"]), _duration(data["duration_minutes"])
    courts = _courts(call)
    free = _free_starts(day, minutes, courts)
    return {
        "date": day.isoformat(),
        "duration_minutes": minutes,
        "time_zone": "Europe/Bucharest",
        "courts": [
            {
                "court_id": str(c.pk),
                "name": c.name,
                "sport": c.kind,
                "free_starts": [clock.local(m).strftime("%H:%M") for m in free[c.pk]],
            }
            for c in courts
        ],
    }


def _slot(call: Call, data: dict[str, Any]) -> tuple[Resource, BookingData, datetime]:
    """A court, a club-time start ("2027-03-16 18:00") and a duration, checked like a booking."""
    court = next((c for c in _courts(call) if str(c.pk) == str(data["court_id"])), None)
    if court is None:
        raise DomainError(ErrorCode.BOOKING_RESOURCE_NOT_BOOKABLE)
    try:
        starts_at = datetime.strptime(str(data["starts_at"]), "%Y-%m-%d %H:%M").replace(
            tzinfo=clock.BUSINESS_TZ
        )
    except ValueError as exc:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "starts_at"}) from exc
    _day(starts_at.date())
    booking = BookingData(
        resource_id=court.pk,
        starts_at=starts_at,
        duration_minutes=_duration(data["duration_minutes"]),
        session_type=SessionType.FREE_RENTAL,
    )
    return court, booking, validate_slot(court, booking)


def _price(court: Resource, booking: BookingData, ends_at: datetime) -> dict[str, Any]:
    priced = quote(
        court.location, court.kind, product_for(booking.session_type), booking.starts_at, ends_at
    )
    return {"total": notifications.lei(priced.total), "provisional": priced.provisional}


def court_quote(call: Call, data: dict[str, Any]) -> dict[str, Any]:
    court, booking, ends_at = _slot(call, data)
    return {"court": court.name, "starts_at": _local(booking.starts_at)} | _price(
        court, booking, ends_at
    )


def class_schedule(call: Call, _: dict[str, Any]) -> dict[str, Any]:
    until = clock.now() + timedelta(days=7)
    classes = [s for s in upcoming_classes(call.location.pk) if s.starts_at < until]
    return {
        "classes": [
            {
                "kind": s.kind,
                "starts_at": _local(s.starts_at),
                "ends_at": _local(s.ends_at)[-5:],
                "places_left": max(0, s.capacity - enrolled_count(s)),
            }
            for s in classes
        ]
    }


def my_bookings(call: Call, _: dict[str, Any]) -> dict[str, Any]:
    """Only the signed-in client's own bookings (never anyone else's)."""
    user = _member(call)
    rows = (
        Booking.objects.filter(
            organizer=user, status=BookingStatus.CONFIRMED, ends_at__gt=clock.now()
        )
        .select_related("resource")
        .order_by("starts_at")[:10]
    )
    return {
        "bookings": [
            {
                "court": b.resource.name,
                "starts_at": _local(b.starts_at),
                "ends_at": _local(b.ends_at)[-5:],
            }
            for b in rows
        ]
    }


def propose_booking(call: Call, data: dict[str, Any]) -> dict[str, Any]:
    """Checks everything a booking checks, then hands the person a button: they book, not the AI."""
    check_can_book_online(_member(call))
    court, booking, ends_at = _slot(call, data)
    start, end = day_bounds(clock.local(booking.starts_at).date())
    taken = busy_intervals([court.pk], start, end)[court.pk]
    if any(s < ends_at and booking.starts_at < e for s, e in taken):
        raise DomainError(ErrorCode.BOOKING_SLOT_TAKEN, status=409)
    price = _price(court, booking, ends_at)
    call.proposals.append(
        {
            "resource_id": court.pk,
            "resource_name": court.name,
            "starts_at": booking.starts_at,
            "duration_minutes": booking.duration_minutes,
            "session_type": booking.session_type,
            "total": price["total"],
            "provisional": price["provisional"],
        }
    )
    return {
        "proposal": len(call.proposals),
        "court": court.name,
        "starts_at": _local(booking.starts_at),
        **price,
        "next": "The person confirms it with the button under your answer; payment is at the "
        "Payments Kiosk in the club.",
    }


DATE = {
    "type": "string",
    "description": "The day, YYYY-MM-DD (club time), today up to 30 days ahead.",
}
DURATION = {"type": "integer", "description": "Minutes: 60, 90 or 120."}
SLOT: dict[str, Any] = {
    "type": "object",
    "properties": {
        "court_id": {"type": "string", "description": "A court_id from court_availability."},
        "starts_at": {"type": "string", "description": "The start, YYYY-MM-DD HH:MM (club time)."},
        "duration_minutes": DURATION,
    },
    "required": ["court_id", "starts_at", "duration_minutes"],
    "additionalProperties": False,
}

for tool in (
    Tool(
        "club_info",
        "The club's name, address, opening hours (Romanian time) and public contact. Use it for "
        "any question about where the club is, when it is open or how to reach it.",
        NO_INPUT,
        ALL,
        club_info,
    ),
    Tool(
        "court_availability",
        "The free start times of every court on a day, for a duration. Use it before suggesting "
        "a time; never guess availability.",
        {
            "type": "object",
            "properties": {"date": DATE, "duration_minutes": DURATION},
            "required": ["date", "duration_minutes"],
            "additionalProperties": False,
        },
        ALL,
        court_availability,
    ),
    Tool(
        "court_quote",
        "What a court costs for a start and a duration, in lei. When `provisional` is true, the "
        "club has not fixed that price yet: say it is indicative.",
        SLOT,
        ALL,
        court_quote,
    ),
    Tool(
        "class_schedule",
        "The Pilates Reformer and group classes of the coming 7 days, with the places left.",
        NO_INPUT,
        CLIENTS,
        class_schedule,
    ),
    Tool(
        "my_bookings",
        "The signed-in client's own coming bookings (never anyone else's).",
        NO_INPUT,
        MEMBER,
        my_bookings,
    ),
    Tool(
        "propose_booking",
        "Prepares a court booking for the signed-in client, after they said which court, day, "
        "time and duration they want. It does not book: the client confirms it with the button "
        "under your answer, and pays at the Payments Kiosk in the club.",
        SLOT,
        MEMBER,
        propose_booking,
    ),
):
    register(tool)
