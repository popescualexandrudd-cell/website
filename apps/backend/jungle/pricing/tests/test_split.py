"""The website's "Împarte ora" simulator (§9.2.11): the court at the club's rates (R-051) and the
kiosk's own split (R-060, R-061). Nothing is booked or stored."""

from __future__ import annotations

from typing import Any

import pytest

from jungle.audit.models import AuditLog
from jungle.bookings.models import Booking
from jungle.configuration.models import Marker
from jungle.conftest import Api, error_code, set_config
from jungle.core.errors import DomainError, ErrorCode
from jungle.locations.models import ResourceKind
from jungle.pricing import split
from jungle.pricing.models import PriceRate, Product

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    ("band", "minutes", "players", "total", "shares"),
    [
        ("peak", 60, 4, 12000, [3000, 3000, 3000, 3000]),
        ("peak", 90, 4, 18000, [4500, 4500, 4500, 4500]),
        ("semi_peak", 60, 3, 10000, [3334, 3333, 3333]),  # the first pays the leftover ban
        ("off_peak", 120, 2, 16000, [8000, 8000]),
        ("peak", 180, 1, 36000, [36000]),  # the organiser pays the whole hour
    ],
)
def test_r060_r061_the_court_shared_between_the_players(
    club: Any, band: str, minutes: int, players: int, total: int, shares: list[int]
) -> None:
    shown = split.split(club.location, band, minutes, players)
    assert (shown.total, shown.shares) == (total, shares)
    assert sum(shown.shares) == shown.total
    assert shown.provisional is True  # the demo rates are DE_STABILIT (Q21)


def test_r050_q3_the_hours_of_each_band_within_the_opening_hours() -> None:
    assert split.band_hours("peak") == {
        "weekday": [("17:00", "22:00")],
        "weekend": [("17:00", "22:00")],
    }
    assert split.band_hours("semi_peak")["weekday"] == [("08:00", "12:00"), ("15:00", "17:00")]
    # 00:00–08:00 is outside the opening hours; 22:00–24:00 ends at closing, 23:00.
    assert split.band_hours("off_peak")["weekday"] == [("12:00", "15:00"), ("22:00", "23:00")]


def test_q3_neighbouring_intervals_of_a_band_are_joined(club: Any) -> None:
    rows = [
        ["00:00", "08:00", "off_peak"],
        ["08:00", "12:00", "semi_peak"],
        ["12:00", "15:00", "semi_peak"],
        ["15:00", "24:00", "peak"],
    ]
    set_config("pricing.time_bands", {"weekday": rows, "weekend": rows})
    assert split.band_hours("semi_peak")["weekend"] == [("08:00", "15:00")]


def test_a_confirmed_rate_is_not_provisional(club: Any) -> None:
    PriceRate.objects.filter(resource_kind=ResourceKind.PADEL_COURT, product=Product.RENTAL).update(
        marker=Marker.CONFIRMED
    )
    assert split.split(club.location, "peak", 60, 4).provisional is False


@pytest.mark.parametrize(("minutes", "players"), [(45, 4), (240, 4), (60, 0), (60, 5)])
def test_what_cannot_be_booked_is_refused(club: Any, minutes: int, players: int) -> None:
    with pytest.raises(DomainError) as exc:
        split.split(club.location, "peak", minutes, players)
    assert exc.value.code is ErrorCode.VALIDATION_INVALID and exc.value.status == 422


def test_without_a_rate_the_price_is_missing(club: Any) -> None:
    PriceRate.objects.filter(
        resource_kind=ResourceKind.PADEL_COURT, product=Product.RENTAL
    ).delete()
    with pytest.raises(DomainError) as exc:
        split.split(club.location, "peak", 60, 4)
    assert exc.value.code is ErrorCode.PRICING_RATE_MISSING


def test_the_public_endpoint_books_and_stores_nothing(api: Api, club: Any) -> None:
    response = api.get(
        "/pricing/jungle-padel/split",
        data={"band": "semi_peak", "duration_minutes": 90, "players": 4},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 15000 and body["shares"] == [3750, 3750, 3750, 3750]
    assert body["band"] == "semi_peak" and body["duration_minutes"] == 90
    assert body["durations_minutes"] == [60, 90, 120, 150, 180]
    assert body["hours"]["weekday"] == [["08:00", "12:00"], ["15:00", "17:00"]]
    assert body["provisional"] is True
    assert not Booking.objects.exists() and not AuditLog.objects.exists()
    bad = api.get("/pricing/jungle-padel/split", data={"band": "night", "duration_minutes": 90})
    assert bad.status_code == 422
    odd = api.get("/pricing/jungle-padel/split", data={"band": "peak", "duration_minutes": 45})
    assert odd.status_code == 422 and error_code(odd) == "validation.invalid"
    assert (
        api.get("/pricing/nowhere/split", data={"band": "peak", "duration_minutes": 60}).status_code
        == 404
    )
