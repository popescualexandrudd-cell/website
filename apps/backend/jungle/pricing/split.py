"""The website's "Împarte ora" simulator (§9.2.11): what a padel court costs in a price band and
what each player pays when the hour is shared (R-060). The club's own rates (R-051: padel court,
rental, this season, standard customer) and the kiosk's own split (R-061: whole bani, the first
player pays the leftover). Nothing is booked, paid or stored.
"""

from __future__ import annotations

from dataclasses import dataclass

from jungle.configuration.models import Marker
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.ledger.services import split_amount
from jungle.locations.models import Location, ResourceKind
from jungle.pricing.models import CustomerType, Product
from jungle.pricing.services import rate_for, season_on

MAX_PLAYERS = 4  # a padel court: doubles; 1 = the organiser pays the whole hour (R-060)

Hours = dict[str, list[tuple[str, str]]]


@dataclass(frozen=True)
class Split:
    band: str
    season: str
    duration_minutes: int
    total: int
    shares: list[int]
    provisional: bool
    hours: Hours


def band_hours(band: str) -> Hours:
    """The club-time intervals of a band on weekdays and at weekends, within the opening hours
    (R-050, Q3); neighbouring intervals are joined."""
    rows = get_config("pricing.time_bands")
    opening = get_config("bookings.opening_hours")
    out: Hours = {}
    for day in ("weekday", "weekend"):
        opens, closes = opening[day]
        spans: list[tuple[str, str]] = []
        for start, end, name in rows[day]:
            start, end = max(start, opens), min(end, closes)
            if name != band or start >= end:
                continue
            if spans and spans[-1][1] == start:
                spans[-1] = (spans[-1][0], end)
            else:
                spans.append((start, end))
        out[day] = spans
    return out


def split(location: Location, band: str, duration_minutes: int, players: int) -> Split:
    """The price of the court for `duration_minutes` in `band` today's season, and each share."""
    if duration_minutes not in get_config("bookings.durations_minutes"):
        raise DomainError(ErrorCode.VALIDATION_INVALID, status=422, params={"field": "duration"})
    if not 1 <= players <= MAX_PLAYERS:
        raise DomainError(ErrorCode.VALIDATION_INVALID, status=422, params={"field": "players"})
    season = season_on(clock.today_local())
    rate = rate_for(
        location, ResourceKind.PADEL_COURT, Product.RENTAL, season, band, CustomerType.STANDARD
    )
    total = rate.amount_per_half_hour * (duration_minutes // 30)
    return Split(
        band=band,
        season=season,
        duration_minutes=duration_minutes,
        total=total,
        shares=split_amount(total, players),
        provisional=rate.marker == Marker.TO_SET,
        hours=band_hours(band),
    )
