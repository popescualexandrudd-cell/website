"""Demand and price suggestions for the owner's side of the panel (§10 "sugestii de prețuri
dinamice și previziuni", Stage 12F).

For the padel courts: how full each price band was in the last weeks (`panel.demand.weeks`), with
a suggestion when a band is very full (raise it by `step_percent`) or very empty (lower it), and
how full the next seven days are already. Computed here on the 30-minute grid of the bookings;
a suggestion is only a proposal: prices change only when a person sets them in the Pricing module
(`pricing.services.set_rate`, which the AI may never call). Read-only, `reports.view`.
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Any

from django.http import HttpRequest

from jungle.accounts.services.authz import authorize
from jungle.bookings.models import Booking
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.permissions import Action
from jungle.locations.models import Resource, ResourceKind
from jungle.panel.services import LIVE, opening_hours
from jungle.pricing.models import Band
from jungle.pricing.services import band_at

SLOT = timedelta(minutes=30)
OUTLOOK_DAYS = 7


@dataclass(frozen=True)
class BandUse:
    band: str
    booked_minutes: int
    open_minutes: int
    percent: int
    suggestion: str  # "raise", "lower" or "" (none)
    step_percent: int


@dataclass(frozen=True)
class DayOutlook:
    day: date
    booked_minutes: int
    open_minutes: int
    percent: int


@dataclass(frozen=True)
class Demand:
    first: date
    last: date
    bands: list[BandUse]
    outlook: list[DayOutlook]


def _percent(booked: int, available: int) -> int:
    return (200 * booked + available) // (2 * available) if available else 0  # half up


def _minutes(clock_text: str) -> int:
    return int(clock_text[:2]) * 60 + int(clock_text[3:])  # "24:00" is the end of the day


def _slots(day: date) -> list[datetime]:
    """The half hours the club is open on `day`, on the wall clock (opening is after any change
    of the clock at 03:00/04:00, ADR-0010)."""
    opens, closes = (_minutes(t) for t in opening_hours(day))
    midnight = datetime.combine(day, time(), clock.BUSINESS_TZ)
    return [midnight + timedelta(minutes=m) for m in range(opens, closes, 30)]


def _busy(courts: list[Resource], first: date, last: date) -> set[tuple[uuid.UUID, datetime]]:
    """(court, slot start) for every half hour a live booking holds."""
    start = datetime.combine(first, time(), clock.BUSINESS_TZ)
    end = datetime.combine(last + timedelta(days=1), time(), clock.BUSINESS_TZ)
    held: set[tuple[uuid.UUID, datetime]] = set()
    bookings = Booking.objects.filter(
        resource__in=courts, status__in=LIVE, starts_at__lt=end, ends_at__gt=start
    )
    for booking in bookings:
        moment = booking.starts_at
        while moment < booking.ends_at:
            held.add((booking.resource_id, moment))
            moment += SLOT
    return held


def demand(request: HttpRequest, location_id: uuid.UUID) -> Demand:
    authorize(request, Action.REPORTS_VIEW, location_id)
    rules: dict[str, Any] = dict(get_config("panel.demand"))
    today = clock.today_local()
    first = today - timedelta(weeks=int(rules["weeks"]))
    last = today - timedelta(days=1)
    horizon = today + timedelta(days=OUTLOOK_DAYS - 1)
    courts = list(
        Resource.objects.filter(
            location_id=location_id, kind=ResourceKind.PADEL_COURT, is_active=True
        )
    )
    held = _busy(courts, first, horizon)

    def booked_at(slot: datetime) -> int:
        return sum(30 for court in courts if (court.pk, slot) in held)

    opened: dict[str, int] = defaultdict(int)
    booked: dict[str, int] = defaultdict(int)
    day = first
    while day <= last:
        for slot in _slots(day):
            band = band_at(slot)
            opened[band] += 30 * len(courts)
            booked[band] += booked_at(slot)
        day += timedelta(days=1)
    bands = []
    for band in Band.values:
        percent = _percent(booked[band], opened[band])
        suggestion = ""
        if opened[band] and percent >= int(rules["high_percent"]):
            suggestion = "raise"
        elif opened[band] and percent <= int(rules["low_percent"]):
            suggestion = "lower"
        bands.append(
            BandUse(
                band, booked[band], opened[band], percent, suggestion, int(rules["step_percent"])
            )
        )
    outlook = []
    for offset in range(OUTLOOK_DAYS):
        day = today + timedelta(days=offset)
        slots = _slots(day)
        taken = sum(booked_at(slot) for slot in slots)
        available = 30 * len(courts) * len(slots)
        outlook.append(DayOutlook(day, taken, available, _percent(taken, available)))
    return Demand(first, last, bands, outlook)
