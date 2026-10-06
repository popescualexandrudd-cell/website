"""Signals and demand for the owner's side (§10, Stage 12F): computed from the club's records,
with configurable thresholds (Q69); they point and suggest, never decide or change anything.
The club clock: Monday 15.03.2027, 09:00."""

from __future__ import annotations

from collections.abc import Callable
from datetime import timedelta
from typing import Any

import pytest

from jungle.accounts.models import User
from jungle.audit import services as audit
from jungle.audit.services import SYSTEM
from jungle.bookings.models import BookingStatus, CancellationOutcome
from jungle.checkout.models import CashOperation, OperationKind
from jungle.conftest import Api, error_code, set_config
from jungle.core import clock
from jungle.core.permissions import Role
from jungle.devices.models import Device, DeviceKind
from jungle.league.models import LeagueMatch, LeagueSeason, MatchPlayer, MatchStatus
from jungle.league.tests.conftest import staff_request
from jungle.ledger import services as ledger
from jungle.ledger.models import AccountKind, TransactionKind
from jungle.panel.tests.test_insights import book

pytestmark = pytest.mark.django_db
People = Callable[..., User]


def match(club: Any, season: LeagueSeason, players: list[User], status: str, days_ago: int) -> None:
    finished = clock.now() - timedelta(days=days_ago)
    played = LeagueMatch.objects.create(
        season=season, location=club.location, status=status, score={}, finished_at=finished,
        window_closes_at=finished, proposed_by=players[0], proposed_at=finished,
    )  # fmt: skip
    for n, player in enumerate(players):
        MatchPlayer.objects.create(match=played, user=player, side="a" if n < 2 else "b")


def test_signals_point_at_what_is_worth_a_look(
    api: Api, club: Any, staff: Callable[..., User], make_user: People
) -> None:
    manager = staff(Role.MANAGER, club.location)
    season = LeagueSeason.objects.create(
        location=club.location, number=1, name="Sezonul 1",
        starts_at=clock.now() - timedelta(days=30), ends_at=clock.now() + timedelta(days=60),
    )  # fmt: skip
    four = [make_user(first_name=n, last_name="Pop") for n in ("Ana", "Bia", "Cos", "Dan")]
    others = [make_user(first_name=n, last_name="Ion") for n in ("Eva", "Fil", "Gia", "Hor")]
    for days_ago in (1, 2, 3, 4):  # the same four, four times in a week
        match(club, season, four, MatchStatus.APPLIED, days_ago)
    for days_ago in (1, 10):  # three in a week only (one is older)
        match(club, season, others, MatchStatus.APPLIED, days_ago)
    match(club, season, others, MatchStatus.APPLIED, 2)
    match(club, season, others, MatchStatus.DISPUTED, 0)

    kiosk = Device.objects.create(
        kind=DeviceKind.PAYMENTS_KIOSK, location=club.location, name="Chioșc Plăți 1"
    )
    for difference in (-750, 200, 600, None):
        CashOperation.objects.create(
            device=kiosk, location=club.location, kind=OperationKind.COUNT, staff=manager,
            difference=difference, created_at=clock.now(), completed_at=clock.now(),
        )  # fmt: skip
    revenue = ledger.account(AccountKind.REVENUE, location=club.location, category="cafe")
    cash = ledger.account(AccountKind.CASH, location=club.location)
    actor = audit.actor_from_request(staff_request(manager))
    for _ in range(3):
        sale = ledger.post(
            TransactionKind.SALE, [(cash, 1000), (revenue, -1000)], description="Cafea",
            actor=SYSTEM, location=club.location,
        )  # fmt: skip
        ledger.reverse_as(actor, sale, "greșeală")

    late, absent = (
        make_user(first_name="Ion", last_name="Late"),
        make_user(first_name="Nu", last_name="Vine"),
    )
    for n in range(3):
        book(
            club, late, club.court1, f"2027-03-1{n + 1}T10:00:00+02:00", 60,
            status=BookingStatus.CANCELLED, cancellation_outcome=CancellationOutcome.CHARGED,
            cancelled_at=clock.now() - timedelta(days=n),
        )  # fmt: skip
    for n in range(2):
        book(
            club,
            absent,
            club.court2,
            f"2027-03-1{n + 1}T12:00:00+02:00",
            60,
            status=BookingStatus.NO_SHOW,
        )
    book(club, late, club.court2, "2027-03-14T18:00:00+02:00", 60, status=BookingStatus.NO_SHOW)

    found = api.get(f"/staff/panel/signals?location_id={club.location.pk}").json()
    kinds = [s["kind"] for s in found]
    assert kinds == [
        "league.disputed",
        "league.repeated",
        "cash.difference",
        "cash.difference",
        "money.corrections",
        "bookings.late_cancellations",
        "bookings.no_shows",
    ]
    assert found[0]["params"] == {"names": "Eva Ion, Fil Ion, Gia Ion, Hor Ion"}
    assert found[1]["params"] == {
        "names": "Ana Pop, Bia Pop, Cos Pop, Dan Pop",
        "count": 4,
        "days": 7,
    }
    assert [s["params"]["amount"] for s in found[2:4]] == ["−7,50 lei", "+6 lei"]
    assert found[2]["params"]["device"] == "Chioșc Plăți 1"
    assert found[4]["params"] == {"who": manager.email, "count": 3, "days": 30}
    assert found[5]["params"] == {"name": "Ion Late", "count": 3, "days": 30}
    assert found[6]["params"] == {"name": "Nu Vine", "count": 2, "days": 30}  # Ion Late: once

    set_config("panel.signals", {
        "window_days": 30, "repeat_matches": 9, "repeat_days": 7, "corrections": 9,
        "cash_difference_bani": 10000, "late_cancellations": 9, "no_shows": 9,
    })  # fmt: skip
    assert [
        s["kind"] for s in api.get(f"/staff/panel/signals?location_id={club.location.pk}").json()
    ] == ["league.disputed"]
    staff(Role.RECEPTION, club.location)
    assert (
        error_code(api.get(f"/staff/panel/signals?location_id={club.location.pk}"))
        == "auth.forbidden"
    )


def test_demand_by_band_with_suggestions_and_the_week_ahead(
    api: Api, club: Any, staff: Callable[..., User], make_user: People
) -> None:
    staff(Role.MANAGER, club.location)
    person = make_user()
    # Every evening (peak, 17–22) on both courts in the last four weeks: full.
    day = clock.today_local() - timedelta(weeks=4)
    while day < clock.today_local():
        for court in (club.court1, club.court2):
            for start, minutes in (("17:00", 120), ("19:00", 90), ("20:30", 90)):
                book(club, person, court, f"{day.isoformat()}T{start}:00+02:00", minutes)
        day += timedelta(days=1)
    tomorrow = (clock.today_local() + timedelta(days=1)).isoformat()
    book(club, person, club.court1, f"{tomorrow}T08:00:00+02:00", 90)
    book(
        club, person, club.court2, f"{tomorrow}T10:00:00+02:00", 90, status=BookingStatus.CANCELLED
    )
    found = api.get(f"/staff/panel/demand?location_id={club.location.pk}").json()
    assert (found["first"], found["last"]) == ("2027-02-15", "2027-03-14")
    bands = {b["band"]: b for b in found["bands"]}
    assert bands["peak"]["percent"] == 100 and bands["peak"]["suggestion"] == "raise"
    assert bands["peak"]["step_percent"] == 10
    assert bands["off_peak"]["percent"] == 0 and bands["off_peak"]["suggestion"] == "lower"
    assert bands["semi_peak"]["suggestion"] == "lower"
    outlook = found["outlook"]
    assert [d["day"] for d in outlook][:2] == ["2027-03-15", "2027-03-16"]
    assert len(outlook) == 7 and outlook[1]["booked_minutes"] == 90
    assert outlook[1]["open_minutes"] == 2 * 15 * 60  # two courts, 08–23
    assert outlook[1]["percent"] == 5  # 90 / 1800, half up
    # A band between the two thresholds gets no suggestion.
    set_config(
        "panel.demand", {"weeks": 4, "high_percent": 101, "low_percent": 1, "step_percent": 5}
    )
    bands = {
        b["band"]: b
        for b in api.get(f"/staff/panel/demand?location_id={club.location.pk}").json()["bands"]
    }
    assert (bands["peak"]["suggestion"], bands["off_peak"]["suggestion"]) == ("", "lower")


def test_demand_without_courts(club: Any, staff: Callable[..., User]) -> None:
    from jungle.locations.models import Resource
    from jungle.panel import demand

    manager = staff(Role.MANAGER, club.location)
    Resource.objects.filter(location=club.location).update(is_active=False)
    found = demand.demand(staff_request(manager), club.location.id)
    assert all(b.percent == 0 and b.suggestion == "" for b in found.bands)
    assert all(d.percent == 0 and d.open_minutes == 0 for d in found.outlook)
