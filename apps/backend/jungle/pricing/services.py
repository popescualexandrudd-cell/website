"""Quoting a booking (R-051, R-052).

A booking is split into 30-minute segments. Each segment is priced with the rate of its own
band (from the club-time clock at the segment's start) and season, so a booking that crosses
bands is charged proportionally and the change of the clock (DST) never shifts the price.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from typing import Any

from django.db import transaction
from django.http import HttpRequest

from jungle.accounts.services.authz import authorize
from jungle.audit import services as audit
from jungle.configuration.models import Marker
from jungle.configuration.services import get_config
from jungle.core.ai_origin import refuse_ai
from jungle.core.clock import BUSINESS_TZ
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.locations.models import Location
from jungle.pricing.models import Band, CustomerType, PriceRate, Product, Season

SEGMENT = timedelta(minutes=30)


@dataclass(frozen=True)
class Segment:
    starts_at: datetime
    band: str
    season: str
    amount: int  # bani
    marker: str


@dataclass(frozen=True)
class Quote:
    total: int  # bani
    segments: tuple[Segment, ...]
    provisional: bool  # at least one rate is not decided yet (DE_STABILIT)

    def as_dict(self) -> dict[str, Any]:
        return {
            "total": self.total,
            "provisional": self.provisional,
            "segments": [
                {
                    "starts_at": s.starts_at.isoformat(),
                    "band": s.band,
                    "season": s.season,
                    "amount": s.amount,
                }
                for s in self.segments
            ],
        }


def band_at(moment: datetime) -> str:
    """R-050: the price band of the club-time clock at `moment`."""
    local = moment.astimezone(BUSINESS_TZ)
    rows = get_config("pricing.time_bands")["weekend" if local.weekday() >= 5 else "weekday"]
    clock_text = local.strftime("%H:%M")
    for start, end, band in rows:
        if start <= clock_text < end:
            return str(band)
    return Band.OFF_PEAK  # unreachable with a valid configuration (bands cover 00:00–24:00)


def season_on(day: date) -> str:
    """R-051: summer from `summer_start` (inclusive) until `winter_start`, else winter."""
    config = get_config("pricing.seasons")
    mmdd = day.strftime("%m-%d")
    summer, winter = config["summer_start"], config["winter_start"]
    # A summer that starts later in the year than winter wraps around New Year.
    in_summer = summer <= mmdd < winter if summer < winter else not winter <= mmdd < summer
    return Season.SUMMER if in_summer else Season.WINTER


def rate_for(
    location: Location, kind: str, product: str, season: str, band: str, customer: str
) -> PriceRate:
    """R-051: this season's rate for the customer, else the all-year one, else the standard."""
    candidates = PriceRate.objects.filter(
        location=location, resource_kind=kind, product=product, band=band
    )
    for s in (season, Season.ALL):
        for c in (customer, CustomerType.STANDARD):
            rate = candidates.filter(season=s, customer_type=c).first()
            if rate is not None:
                return rate
    raise DomainError(
        ErrorCode.PRICING_RATE_MISSING,
        status=409,
        params={"kind": kind, "product": product, "band": band, "season": season},
    )


def quote(
    location: Location,
    resource_kind: str,
    product: str,
    starts_at: datetime,
    ends_at: datetime,
    customer_type: str = CustomerType.STANDARD,
) -> Quote:
    """R-052: sum of the 30-minute segments, each at its own band and season."""
    segments: list[Segment] = []
    moment = starts_at.astimezone(UTC)  # real-time steps, also across DST (ADR-0010)
    while moment < ends_at:
        band = band_at(moment)
        season = season_on(moment.astimezone(BUSINESS_TZ).date())
        rate = rate_for(location, resource_kind, product, season, band, customer_type)
        segments.append(Segment(moment, band, season, rate.amount_per_half_hour, rate.marker))
        moment += SEGMENT
    return Quote(
        total=sum(s.amount for s in segments),
        segments=tuple(segments),
        provisional=any(s.marker == Marker.TO_SET for s in segments),
    )


def public_rates(location: Location) -> list[PriceRate]:
    """R-053: the rules are shown openly (site, front desk); demo rates are flagged."""
    return list(PriceRate.objects.filter(location=location))


@dataclass(frozen=True)
class RateData:
    resource_kind: str
    product: str
    season: str
    band: str
    customer_type: str
    amount_per_half_hour: int
    confirmed: bool
    note: str = ""


def set_rate(request: HttpRequest, location: Location, data: RateData) -> PriceRate:
    """Creates or changes a rate (audited). `confirmed` = the owner decided this price."""
    refuse_ai("prices")  # ADR-0019, the second barrier
    authorize(request, Action.PRICING_MANAGE, location.pk)
    if data.product not in Product.values or data.band not in Band.values:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "product/band"})
    with transaction.atomic():
        rate, created = PriceRate.objects.select_for_update().get_or_create(
            location=location,
            resource_kind=data.resource_kind,
            product=data.product,
            season=data.season,
            band=data.band,
            customer_type=data.customer_type,
            defaults={"amount_per_half_hour": data.amount_per_half_hour},
        )
        before = None if created else audit.snapshot(rate)
        rate.amount_per_half_hour = data.amount_per_half_hour
        rate.marker = Marker.CONFIRMED if data.confirmed else Marker.TO_SET
        rate.note = data.note
        rate.save()
        audit.record(
            audit.actor_from_request(request),
            "pricing.rate_set",
            target=rate,
            before=before,
            after=audit.snapshot(rate),
        )
    return rate


def day_bounds(day: date) -> tuple[datetime, datetime]:
    """Start and end of a club-time day as aware datetimes (23 or 25 hours on DST days)."""
    start = datetime.combine(day, time(0), tzinfo=BUSINESS_TZ)
    end = datetime.combine(day + timedelta(days=1), time(0), tzinfo=BUSINESS_TZ)
    return start, end
