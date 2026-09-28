"""The Match of the day (§6.15): deterministic stake score, the admin's choice, R-012 output."""

from __future__ import annotations

import uuid
from collections.abc import Callable
from typing import Any

import pytest

from jungle.accounts.models import User
from jungle.audit.services import SYSTEM
from jungle.bookings.models import SessionType
from jungle.cards import services as cards
from jungle.conftest import Api, error_code
from jungle.core.errors import DomainError
from jungle.core.permissions import Role
from jungle.devices.models import Device
from jungle.league import challenges, spotlight
from jungle.league.models import (
    LeagueMatch,
    LeagueSeason,
    MatchOfTheDay,
    MatchPlayer,
    MatchStatus,
    SeasonStatus,
    Standing,
)
from jungle.league.tests.conftest import at, placed, staff_request
from jungle.league.tests.test_matches import book, kiosk_call, scan
from jungle.locations.models import Location, Resource, ResourceKind

pytestmark = pytest.mark.django_db

Join = Callable[..., User]
PUBLIC = {"first_name", "last_name", "tier", "division", "level", "lp", "position"}


@pytest.fixture
def courts(location: Location) -> tuple[Resource, Resource]:
    return tuple(  # type: ignore[return-value]
        Resource.objects.create(
            location=location, slug=f"teren-{n}", name=f"Teren {n}", kind=ResourceKind.PADEL_COURT
        )
        for n in (1, 2)
    )


def test_no_season_or_no_match_means_no_match_of_the_day(
    api: Api, location: Location, season: LeagueSeason
) -> None:
    assert api.get(f"/league/match-of-the-day?location={location.slug}").json() == {
        "found": False,
        "players": [],
        "reasons": [],
        "chosen_by_admin": False,
    }
    LeagueSeason.objects.filter(pk=season.pk).update(status=SeasonStatus.CLOSED)
    assert spotlight.match_of_the_day(location) is None


def test_lg150_the_biggest_stake_wins_deterministically(
    api: Api,
    season: LeagueSeason,
    join: Join,
    courts: tuple[Resource, Resource],
    location: Location,
    now: Any,
) -> None:
    a, b, c, d = placed(season, join)  # ranked 1–4 after placement
    newcomer = join(level="5.00")  # in placement, a level gap with the others
    quiet = book(courts[0], newcomer, "2027-04-05 17:00", "2027-04-05 18:30")
    duel = book(courts[1], a, "2027-04-05 19:00", "2027-04-05 20:30")
    for player in (a, b, c, d):
        scan(duel, player)
    book(courts[0], newcomer, "2027-04-05 21:00", "2027-04-05 22:30")  # later, no stake
    found = spotlight.match_of_the_day(location)
    assert found is not None and found.booking == duel
    assert found.reasons == ["top10_duel"] and found.stake == 3
    assert [r.player_a for r in found.players] == sorted(
        (a, b, c, d),
        key=lambda p: (
            Standing.objects.get(season=season, ladder="doubles", competitor_id=str(p.pk)).position
            or 0
        ),
    )
    points, reasons, rows = spotlight.stake(quiet, season)
    assert (points, reasons, [r.player_a for r in rows]) == (0, [], [newcomer])

    # A rivalry (met twice in 30 days), a promotion within reach and a level gap add up.
    for n in range(2):
        match = LeagueMatch.objects.create(
            season=season,
            location=location,
            status=MatchStatus.APPLIED,
            score={},
            finished_at=at(f"2027-04-0{n + 1} 10:00"),
            window_closes_at=at(f"2027-04-0{n + 1} 10:30"),
            proposed_by=a,
            proposed_at=at(f"2027-04-0{n + 1} 10:05"),
        )
        MatchPlayer.objects.create(match=match, user=a, side="a")
        MatchPlayer.objects.create(match=match, user=c, side="b")
    Standing.objects.filter(season=season, ladder="doubles", competitor_id=str(b.pk)).update(
        lp=85, level=6.0
    )
    points, reasons, _ = spotlight.stake(duel, season)
    assert reasons == ["promotion", "top10_duel", "rivalry", "level_gap"] and points == 9

    public = api.get(f"/league/match-of-the-day?location={location.slug}").json()
    assert public["found"] is True and public["chosen_by_admin"] is False
    assert all(set(p) == PUBLIC for p in public["players"])  # R-012: no court, no time


def test_challenge_players_are_known_before_they_scan_in(
    season: LeagueSeason,
    join: Join,
    courts: tuple[Resource, Resource],
    kiosk: Device,
    now: Any,
) -> None:
    a, b, _c, _d = placed(season, join)
    e, f, g, _h = placed(season, join)
    tokens = {p.pk: cards.issue_card(SYSTEM, p).token for p in (a, e)}
    challenge = challenges.issue(
        kiosk_call(),
        kiosk,
        challenges.ChallengeData((tokens[e.pk], cards.issue_card(SYSTEM, f).token), (a.pk, b.pk)),
    )
    challenges.answer(kiosk_call(), kiosk, challenge.pk, tokens[a.pk], True)
    booking = book(
        courts[0], e, "2027-04-05 20:00", "2027-04-05 21:30", session_type=SessionType.CHALLENGE
    )
    assert set(spotlight.known_players(booking, season)) == {a.pk, b.pk, e.pk, f.pk}
    _, reasons, _ = spotlight.stake(booking, season)
    assert "challenge" in reasons
    lonely = book(
        courts[1], g, "2027-04-05 20:00", "2027-04-05 21:30", session_type=SessionType.CHALLENGE
    )
    assert spotlight.known_players(lonely, season) == [g.pk]  # no accepted challenge


def test_the_admin_chooses_with_a_reason(
    api: Api,
    staff: Callable[..., User],
    season: LeagueSeason,
    join: Join,
    courts: tuple[Resource, Resource],
    location: Location,
    manager: User,
    now: Any,
) -> None:
    a, _b, c, _d = placed(season, join)
    first = book(courts[0], a, "2027-04-05 17:00", "2027-04-05 18:30")
    second = book(courts[1], c, "2027-04-05 19:00", "2027-04-05 20:30")
    tomorrow = book(courts[0], a, "2027-04-06 17:00", "2027-04-06 18:30")
    with pytest.raises(DomainError) as exc:
        spotlight.choose(staff_request(manager), location.id, second.pk, "  ")
    assert exc.value.code.value == "league.reason_required"
    for booking_id in (tomorrow.pk, uuid.uuid4()):
        with pytest.raises(DomainError) as exc:
            spotlight.choose(staff_request(manager), location.id, booking_id, "Derby")
        assert exc.value.code.value == "league.not_a_match_today"

    staff(Role.MANAGER, location)
    body = {"location_id": str(location.id), "booking_id": str(second.pk), "reason": "Derby"}
    chosen = api.post("/staff/league/match-of-the-day", body).json()
    assert chosen["found"] is True and chosen["chosen_by_admin"] is True
    found = spotlight.match_of_the_day(location)
    assert found is not None and found.booking == second and found.booking != first
    assert str(MatchOfTheDay.objects.get()).startswith("2027-04-05")
    again = api.post(
        "/staff/league/match-of-the-day", {**body, "booking_id": str(first.pk), "reason": "Alt"}
    )
    assert again.status_code == 200
    found = spotlight.match_of_the_day(location)
    assert found is not None and found.booking == first  # the choice is replaced
    staff(Role.COACH, location)
    assert error_code(api.post("/staff/league/match-of-the-day", body)) == "auth.forbidden"
