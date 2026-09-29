"""What the court and lobby screens show (§8.5): the session on court with only the public
fields of R-012, the teams, the next booking, the league, events, announcements, the café
orders ready; only enrolled screens of the club, on its network (ADR-0012)."""

from __future__ import annotations

from collections.abc import Callable
from datetime import timedelta
from typing import Any

import pytest
from django.conf import settings

from jungle.accounts.models import User
from jungle.audit.models import AuditLog
from jungle.audit.services import SYSTEM
from jungle.bookings.models import BookingStatus, SessionType
from jungle.cafe.models import CafeOrder, OrderStatus
from jungle.conftest import error_code, set_config
from jungle.core import clock
from jungle.devices.models import Device, DeviceKind
from jungle.league.models import (
    Challenge,
    ChallengeStatus,
    Fixture,
    LeagueMatch,
    LeaguePlayer,
    LeagueSeason,
    MatchOfTheDay,
    MatchStatus,
    PlayerStatus,
    Standing,
    Tournament,
    TournamentStatus,
)
from jungle.league.tests.conftest import at, placed
from jungle.ledger.models import LedgerTransaction
from jungle.locations.models import Location, Resource, ResourceKind
from jungle.privacy import services as privacy
from jungle.screens import views
from jungle.screens.models import NameObjection
from jungle.screens.tests.conftest import Screen, book, enter

pytestmark = pytest.mark.django_db
Join = Callable[..., User]
PLAYER_FIELDS = {"name", "in_league", "tier", "division", "lp", "level", "position"}


def names(team: list[dict[str, Any]]) -> list[str]:
    return [p["name"] for p in team]


def full(user: User) -> str:
    return f"{user.last_name} {user.first_name}"


def test_r012_the_court_screen_shows_the_match_and_only_public_fields(
    season: LeagueSeason, join: Join, court: Resource, court_screen: Screen
) -> None:
    a, b, c, d = placed(season, join)
    match = book(court, a, at("2027-04-05 08:30"))
    enter(match, a, b, c, d)
    book(court, c, at("2027-04-05 10:00"), 60, SessionType.TRAINING)
    state = court_screen.state()
    assert state["kind"] == "court" and state["location_name"] == "Jungle Padel"
    assert state["server_time"].startswith("2027-04-05T06:00:00")
    current = state["court"]["current"]
    assert state["court"]["name"] == "Teren 4"
    assert (current["minutes"], current["session_type"]) == (90, "official_match")
    assert current["match_of_the_day"] is True  # §6.15: the only league match today wins
    assert [names(t) for t in current["teams"]] == [[full(a), full(b)], [full(c), full(d)]]
    for player in current["teams"][0] + current["teams"][1]:
        assert set(player) == PLAYER_FIELDS  # R-012: nothing else leaves the server
        assert player["tier"] and player["division"] and player["position"] is not None
        assert player["in_league"] is True
    row = Standing.objects.get(season=season, ladder="doubles", competitor_id=str(a.pk))
    assert current["teams"][0][0]["lp"] == row.lp
    assert state["court"]["next"]["session_type"] == "training"
    assert state["court"]["next"]["starts_at"].startswith("2027-04-05T07:00:00")
    assert state["qr_url"] == f"{settings.WEB_BASE_URL}/ro/liga"
    assert state["qr_svg"].startswith("<svg") and 'stroke="currentColor"' in state["qr_svg"]
    assert state["courts"] == [] and state["cafe_ready"] == []


def test_q55_everyone_by_name_league_players_marked(
    season: LeagueSeason,
    join: Join,
    make_user: Callable[..., User],
    court: Resource,
    court_screen: Screen,
) -> None:
    """Q55 (the owner's answer, 29.09.2026): everyone on the court appears by name; players in
    the league are marked (the "Ligă" badge) and only they show rank, LP and level (R-012). A
    player who withdrew from the league appears by name, unmarked; an erased account appears
    as "Jucător" (an empty name)."""
    member, guest, gone, erased, objected = join(), make_user(), join(), make_user(), join()
    match = book(court, member, at("2027-04-05 08:30"), session_type=SessionType.FREE_RENTAL)
    enter(match, member, guest, gone, erased, objected)
    # GDPR art. 21: someone who objected appears as "Jucător", league or not.
    objection = NameObjection.objects.create(user=objected, note="cerere la recepție")
    assert str(objection) == str(objected.pk)
    LeaguePlayer.objects.filter(user=gone).update(status=PlayerStatus.WITHDRAWN)
    User.objects.filter(pk=erased.pk).update(deleted_at=clock.now())
    set_config("screens.pairs_from_scan_order", False)
    shown = court_screen.state()["court"]["current"]["teams"][0]
    assert shown[0]["name"] == full(member) and shown[0]["in_league"] is True
    assert shown[0]["tier"] == "" and shown[0]["lp"] is None  # joined, not placed yet
    plain = {"tier": "", "division": "", "lp": None, "level": None, "position": None}
    assert shown[1] == {"name": full(guest), "in_league": False, **plain}
    assert shown[2] == {"name": full(gone), "in_league": False, **plain}
    assert shown[3] == {"name": "", "in_league": False, **plain}
    assert shown[4] == {"name": "", "in_league": False, **plain}


def test_q55_teams_from_the_scans_or_as_they_come(
    season: LeagueSeason, join: Join, court: Resource, court_screen: Screen
) -> None:
    a, b, c, d = placed(season, join)
    match = book(court, a, at("2027-04-05 08:30"))
    enter(match, c, a, d, b)
    assert [names(t) for t in court_screen.state()["court"]["current"]["teams"]] == [
        [full(c), full(a)],
        [full(d), full(b)],
    ]
    set_config("screens.pairs_from_scan_order", False)
    teams = court_screen.state()["court"]["current"]["teams"]
    assert [names(t) for t in teams] == [[full(c), full(a), full(d), full(b)]]


def test_singles_two_players_face_each_other(
    season: LeagueSeason, join: Join, court: Resource, court_screen: Screen
) -> None:
    a, b = join(), join()
    enter(book(court, a, at("2027-04-05 08:30"), 60, SessionType.FREE_RENTAL), a, b)
    assert [names(t) for t in court_screen.state()["court"]["current"]["teams"]] == [
        [full(a)],
        [full(b)],
    ]


def test_the_match_entered_at_the_kiosk_decides_the_teams(
    season: LeagueSeason, join: Join, location: Location, court: Resource, court_screen: Screen
) -> None:
    a, b, c, d = placed(season, join)
    booking = book(court, a, at("2027-04-05 08:30"))
    enter(booking, a, c, b, d)  # the scans would pair them wrongly
    match = LeagueMatch.objects.create(
        season=season,
        location=location,
        booking=booking,
        status=MatchStatus.PROPOSED,
        score={},
        finished_at=at("2027-04-05 10:00"),
        window_closes_at=at("2027-04-05 10:30"),
        proposed_by=a,
        proposed_at=at("2027-04-05 08:40"),
    )
    for player, side in ((a, "a"), (b, "a"), (c, "b"), (d, "b")):
        match.players.create(user=player, side=side)
    assert [names(t) for t in court_screen.state()["court"]["current"]["teams"]] == [
        [full(a), full(b)],
        [full(c), full(d)],
    ]


def test_a_tournament_fixture_and_an_accepted_challenge_give_the_teams(
    season: LeagueSeason, join: Join, location: Location, court: Resource, court_screen: Screen
) -> None:
    a, b, c, d = placed(season, join)
    cup = Tournament.objects.create(
        season=season,
        location=location,
        name="Cupa Junglei",
        format="knockout",
        team_size=2,
        starts_at=at("2027-04-05 08:00"),
        registration_closes_at=at("2027-04-04 20:00"),
        entry_fee=0,
        max_entries=8,
        created_at=clock.now(),
    )
    fixture = Fixture.objects.create(tournament=cup, phase="final", round=1, slot=1)
    booking = book(court, a, at("2027-04-05 08:30"), session_type=SessionType.TOURNAMENT)
    Fixture.objects.filter(pk=fixture.pk).update(booking=booking)
    # The draw has no teams yet: who checked in, as they came.
    enter(booking, a, b)
    assert [names(t) for t in court_screen.state()["court"]["current"]["teams"]] == [
        [full(a)],
        [full(b)],
    ]
    Fixture.objects.filter(pk=fixture.pk).update(
        team_a=[str(d.pk), str(c.pk)], team_b=[str(b.pk), str(a.pk)]
    )
    assert [names(t) for t in court_screen.state()["court"]["current"]["teams"]] == [
        [full(d), full(c)],
        [full(b), full(a)],
    ]

    booking.status = BookingStatus.CANCELLED
    booking.save(update_fields=["status"])
    challenge = book(court, c, at("2027-04-05 08:30"), session_type=SessionType.CHALLENGE)
    assert names(court_screen.state()["court"]["current"]["teams"][0]) == [full(c)]
    Challenge.objects.create(
        season=season,
        location=location,
        ladder="doubles",
        challenger_a=a,
        challenger_b=b,
        target_a=c,
        target_b=d,
        challenger_rank=3,
        target_rank=4,
        status=ChallengeStatus.ACCEPTED,
        created_at=at("2027-04-01 10:00"),
        respond_by=at("2027-04-03 10:00"),
        responded_at=at("2027-04-02 10:00"),
        play_by=at("2027-04-08 10:00"),
    )
    teams = court_screen.state()["court"]["current"]["teams"]
    assert [names(t) for t in teams] == [[full(a), full(b)], [full(c), full(d)]]
    assert views.teams_of(challenge, None) == [[c.pk]]  # no season: only the organizer


def test_a_free_court_shows_what_comes_next_today(
    season: LeagueSeason, join: Join, court: Resource, court_screen: Screen
) -> None:
    a = join()
    state = court_screen.state()
    assert state["court"]["current"] is None and state["court"]["next"] is None
    book(court, a, at("2027-04-06 10:00"))  # tomorrow: not on today's screen
    assert court_screen.state()["court"]["next"] is None
    book(court, a, at("2027-04-05 18:00"), 60, SessionType.FREE_RENTAL)
    upcoming = court_screen.state()["court"]["next"]
    assert upcoming["starts_at"].startswith("2027-04-05T15:00:00")
    # Organizer only, until someone checks in on court.
    book(court, a, at("2027-04-05 08:30"), 60, SessionType.FREE_RENTAL)
    assert names(court_screen.state()["court"]["current"]["teams"][0]) == [full(a)]


def test_the_lobby_screen_the_courts_league_events_and_cafe(
    season: LeagueSeason,
    join: Join,
    location: Location,
    court: Resource,
    lobby_screen: Screen,
    manager: User,
) -> None:
    a, b, c, d = placed(season, join)
    other = Resource.objects.create(
        location=location, slug="teren-1", name="Teren 1", kind=ResourceKind.PADEL_COURT
    )
    Resource.objects.create(
        location=location, slug="teren-9", name="Teren 9", kind="padel_court", is_active=False
    )
    match = book(court, a, at("2027-04-05 08:30"))
    enter(match, a, b, c, d)
    MatchOfTheDay.objects.create(
        location=location,
        day=clock.today_local(),
        booking=match,
        chosen_by=manager,
        reason="Derby",
        created_at=clock.now(),
    )
    Tournament.objects.create(
        season=season,
        location=location,
        name="Cupa Junglei",
        format="knockout",
        team_size=2,
        starts_at=at("2027-04-10 10:00"),
        registration_closes_at=at("2027-04-08 20:00"),
        entry_fee=0,
        max_entries=8,
        created_at=clock.now(),
    )
    Tournament.objects.create(
        season=season,
        location=location,
        name="Anulat",
        format="knockout",
        team_size=2,
        starts_at=at("2027-04-11 10:00"),
        registration_closes_at=at("2027-04-09 20:00"),
        entry_fee=0,
        max_entries=8,
        created_at=clock.now(),
        status=TournamentStatus.CANCELLED,
    )
    for number, status in ((7, OrderStatus.READY), (8, OrderStatus.PREPARING), (9, "ready")):
        CafeOrder.objects.create(
            location=location,
            day=clock.today_local(),
            number=number,
            status=status,
            total=1200,
            transaction=LedgerTransaction.objects.create(
                kind="sale", description="café", actor={}, created_at=clock.now()
            ),
            created_at=clock.now(),
            ready_at=clock.now() + timedelta(minutes=number) if status == "ready" else None,
        )
    set_config("screens.announcements", [{"ro": "Turneu sâmbătă", "en": "Saturday tournament"}])
    set_config("screens.qr_url", "https://junglepadel.ro/ro/liga")
    state = lobby_screen.state()
    assert state["kind"] == "lobby" and state["court"] is None
    assert [c["name"] for c in state["courts"]] == ["Teren 1", "Teren 4"]
    assert state["courts"][0]["id"] == str(other.pk) and state["courts"][0]["current"] is None
    assert state["courts"][1]["current"]["match_of_the_day"] is True
    league = state["league"]
    assert league["match_of_the_day_court"] == "Teren 4"
    assert [names(t) for t in league["match_of_the_day"]["teams"]] == [
        [full(a), full(b)],
        [full(c), full(d)],
    ]
    assert {n for row in league["doubles"] for n in row["names"]} == {full(p) for p in (a, b, c, d)}
    assert all(len(row["names"]) == 2 for row in league["pairs"])
    assert league["singles"] == [] and league["kings"] == []
    assert [e["title"] for e in state["events"]] == ["Cupa Junglei"]
    assert state["announcements"] == [{"ro": "Turneu sâmbătă", "en": "Saturday tournament"}]
    assert state["cafe_ready"] == [7, 9]
    assert state["qr_url"] == "https://junglepadel.ro/ro/liga"


def test_the_kings_and_rows_of_players_who_left(
    season: LeagueSeason, join: Join, lobby_screen: Screen
) -> None:
    a, b, c, _ = placed(season, join)
    rows = Standing.objects.filter(season=season)
    before = {n for r in rows.filter(ladder="doubles") for n in (r.player_a_id, r.player_b_id)}
    privacy.erase(SYSTEM, b)
    rows.filter(ladder="doubles", competitor_id=str(a.pk)).update(
        tier="master", division="", eligible=True
    )
    # The pair row with b is still in the table (b is shown as "Jucător retras" on the
    # website): a screen never shows it at all.
    assert (
        rows.filter(ladder="pairs", player_b=b).exists()
        or rows.filter(ladder="pairs", player_a=b).exists()
    )
    assert b.pk in before
    # c withdrew from the league just now: the standings still hold c's rows until the next
    # change rewrites them; the screen already leaves them out.
    LeaguePlayer.objects.filter(user=c).update(status=PlayerStatus.WITHDRAWN)
    assert rows.filter(ladder="doubles", player_a=c, position__isnull=False).exists()
    league = lobby_screen.state()["league"]
    assert full(c) not in {n for row in league["doubles"] for n in row["names"]}
    assert [row["names"] for row in league["kings"]] == [[full(a)]]
    assert full(b) not in {n for row in league["doubles"] for n in row["names"]}
    assert all(full(b) not in row["names"] for row in league["pairs"])


def test_without_an_active_season(
    location: Location, join: Join, court: Resource, court_screen: Screen, now: Any
) -> None:
    a = join()
    enter(book(court, a, at("2027-04-05 08:30"), 60, SessionType.FREE_RENTAL), a)
    state = court_screen.state()
    player = state["court"]["current"]["teams"][0][0]
    assert player["name"] == full(a) and player["tier"] == "" and player["level"] is None
    assert state["league"]["doubles"] == [] and state["league"]["match_of_the_day"] is None


def test_adr0012_only_active_screens_on_the_club_network(
    location: Location, court_screen: Screen, lobby_screen: Screen, now: Any
) -> None:
    ticket = court_screen.post("/ticket").json()
    assert ticket["path"] == "/ws/screens/" and ticket["expires_in"] == 60
    assert len(ticket["ticket"]) >= 24
    outside = Screen(Device.objects.get(pk=court_screen.device.pk), ip="203.0.113.7")
    assert error_code(outside.get()) == "auth.forbidden"
    kiosk = Screen(
        Device.objects.create(kind=DeviceKind.PAYMENTS_KIOSK, location=location, name="Chioșc")
    )
    assert error_code(kiosk.get()) == "auth.forbidden"
    assert error_code(kiosk.post("/ticket")) == "auth.forbidden"
    refused = AuditLog.objects.filter(action="screens.refused")
    assert refused.count() == 3
    assert {(r.after or {})["ip"] for r in refused} == {"203.0.113.7", "10.0.0.20"}
    Device.objects.filter(pk=lobby_screen.device.pk).update(is_active=False)
    assert lobby_screen.get().status_code == 401
    assert Screen(court_screen.device).client.get("/api/v1/device/screen/state").status_code == 401
