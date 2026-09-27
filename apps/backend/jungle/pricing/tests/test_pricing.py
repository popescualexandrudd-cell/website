"""Price bands, seasons and quotes (R-050 … R-053), including the DST day (ADR-0010)."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

import pytest

from jungle.audit.models import AuditLog
from jungle.configuration.models import Marker
from jungle.conftest import Api, error_code, set_config
from jungle.core.clock import BUSINESS_TZ
from jungle.core.errors import DomainError
from jungle.core.permissions import Role
from jungle.locations.models import ResourceKind
from jungle.pricing.models import Band, CustomerType, PriceRate, Product, Season
from jungle.pricing.services import band_at, day_bounds, quote, season_on

pytestmark = pytest.mark.django_db


def local(text: str) -> datetime:
    return datetime.fromisoformat(text).replace(tzinfo=BUSINESS_TZ)


@pytest.mark.parametrize(
    ("moment", "band"),
    [
        ("2027-03-16 07:30", Band.OFF_PEAK),
        ("2027-03-16 08:00", Band.SEMI_PEAK),
        ("2027-03-16 11:30", Band.SEMI_PEAK),
        ("2027-03-16 12:00", Band.OFF_PEAK),
        ("2027-03-16 15:00", Band.PEAK),
        ("2027-03-16 21:30", Band.PEAK),
        ("2027-03-16 22:00", Band.OFF_PEAK),
        ("2027-03-20 16:00", Band.PEAK),  # Saturday: weekend table
    ],
)
def test_r050_band_follows_club_clock(moment: str, band: str) -> None:
    assert band_at(local(moment)) == band


def test_r050_band_is_read_in_club_time_not_utc() -> None:
    """15:00 in Bucharest is 13:00 UTC: the band is peak, not off-peak."""
    assert band_at(datetime.fromisoformat("2027-03-16T13:00:00+00:00")) == Band.PEAK


@pytest.mark.parametrize(
    ("day", "season"),
    [
        (date(2027, 3, 31), Season.WINTER),
        (date(2027, 4, 1), Season.SUMMER),
        (date(2027, 9, 30), Season.SUMMER),
        (date(2027, 10, 1), Season.WINTER),
    ],
)
def test_r051_season_boundaries(day: date, season: str) -> None:
    assert season_on(day) == season


def test_r051_season_that_wraps_around_new_year(db: None) -> None:
    set_config("pricing.seasons", {"summer_start": "11-01", "winter_start": "03-01"})
    assert season_on(date(2027, 12, 15)) == Season.SUMMER
    assert season_on(date(2027, 2, 28)) == Season.SUMMER
    assert season_on(date(2027, 6, 1)) == Season.WINTER


def test_r052_quote_crossing_bands_is_proportional(club: Any) -> None:
    """14:30–16:00: 30 min off-peak (40 RON) + 60 min peak (2 × 60 RON)."""
    q = quote(
        club.location,
        ResourceKind.PADEL_COURT,
        Product.RENTAL,
        local("2027-03-16 14:30"),
        local("2027-03-16 16:00"),
    )
    assert q.total == 4000 + 6000 + 6000
    assert [s.band for s in q.segments] == [Band.OFF_PEAK, Band.PEAK, Band.PEAK]
    assert q.provisional is True  # demo rates are DE_STABILIT
    assert q.as_dict()["segments"][0]["amount"] == 4000


def test_r052_dst_day_quote_and_day_length(club: Any) -> None:
    """ADR-0010: on 28.03.2027 the clock jumps 03:00 → 04:00; a 90-minute evening booking
    still has 3 half-hours, and the club day is 23 hours long (25 on 31.10.2027)."""
    start, end = local("2027-03-28 20:00"), local("2027-03-28 21:30")
    q = quote(club.location, ResourceKind.PADEL_COURT, Product.RENTAL, start, end)
    assert len(q.segments) == 3 and q.total == 3 * 6000
    first, last = day_bounds(date(2027, 3, 28))
    assert (last.astimezone(UTC) - first.astimezone(UTC)).total_seconds() == 23 * 3600
    first, last = day_bounds(date(2027, 10, 31))
    assert (last.astimezone(UTC) - first.astimezone(UTC)).total_seconds() == 25 * 3600
    # Across the jump itself: 02:30 → 04:30 local is one real hour, 2 half-hours.
    q = quote(
        club.location,
        ResourceKind.PADEL_COURT,
        Product.RENTAL,
        local("2027-03-28 02:30"),
        local("2027-03-28 04:30"),
    )
    assert len(q.segments) == 2


def test_r051_tennis_known_price_is_confirmed(club: Any) -> None:
    q = quote(
        club.location,
        ResourceKind.TENNIS_COURT,
        Product.RENTAL,
        local("2027-03-16 10:00"),
        local("2027-03-16 11:00"),
    )
    assert q.total == 12000 and q.provisional is False


def test_r051_rate_fallbacks_and_missing_rate(club: Any) -> None:
    """Season-specific before 'all year'; member rate falls back to the standard one."""
    PriceRate.objects.create(
        location=club.location,
        resource_kind=ResourceKind.PADEL_COURT,
        product=Product.RENTAL,
        season=Season.WINTER,
        band=Band.SEMI_PEAK,
        customer_type=CustomerType.MEMBER,
        amount_per_half_hour=3000,
        marker=Marker.CONFIRMED,
    )
    start, end = local("2027-03-16 10:00"), local("2027-03-16 10:30")
    member = quote(
        club.location, ResourceKind.PADEL_COURT, Product.RENTAL, start, end, CustomerType.MEMBER
    )
    corporate = quote(
        club.location, ResourceKind.PADEL_COURT, Product.RENTAL, start, end, CustomerType.CORPORATE
    )
    assert (member.total, member.provisional) == (3000, False)
    assert corporate.total == 5000
    with pytest.raises(DomainError) as exc:
        quote(club.location, ResourceKind.TENNIS_COURT, Product.LESSON, start, end)
    assert exc.value.code.value == "pricing.rate_missing" and exc.value.status == 409


def test_r053_public_rates_listed_with_marker(api: Api, club: Any) -> None:
    response = api.get(f"/pricing/{club.location.slug}/rates")
    assert response.status_code == 200
    rows = response.json()
    assert {r["marker"] for r in rows} == {Marker.TO_SET, Marker.CONFIRMED}
    assert all(isinstance(r["amount_per_half_hour"], int) for r in rows)


def test_set_rate_needs_manager_and_is_audited(api: Api, club: Any, staff: Any) -> None:
    body = {
        "location_id": str(club.location.id),
        "resource_kind": "padel_court",
        "product": "rental",
        "band": "peak",
        "amount_per_half_hour": 7000,
        "confirmed": True,
    }
    staff(Role.RECEPTION, club.location)
    response = api.put("/staff/pricing/rates", body)
    assert response.status_code == 403 and error_code(response) == "auth.forbidden"

    staff(Role.MANAGER, club.location)
    response = api.put("/staff/pricing/rates", body)
    assert response.status_code == 200, response.json()
    assert response.json()["marker"] == Marker.CONFIRMED
    rate = PriceRate.objects.get(pk=response.json()["id"])
    assert rate.amount_per_half_hour == 7000
    log = AuditLog.objects.filter(action="pricing.rate_set").first()
    assert log is not None and log.before is not None and log.after is not None
    assert log.before["amount_per_half_hour"] == 6000 and log.after["amount_per_half_hour"] == 7000

    new = api.put(
        "/staff/pricing/rates", {**body, "customer_type": "corporate", "confirmed": False}
    )
    assert new.status_code == 200 and new.json()["marker"] == Marker.TO_SET

    missing = api.put(
        "/staff/pricing/rates", {**body, "location_id": "00000000-0000-0000-0000-000000000000"}
    )
    assert missing.status_code == 404
    negative = api.put("/staff/pricing/rates", {**body, "amount_per_half_hour": -1})
    assert negative.status_code == 422
