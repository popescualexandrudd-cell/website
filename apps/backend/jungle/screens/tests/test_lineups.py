"""Q55 (the owner's answer, 29.09.2026): the players choose their teams at the League Kiosk;
by default the court screen pairs them by the order of their scans."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest

from jungle.accounts.models import User
from jungle.audit.models import AuditLog
from jungle.audit.services import SYSTEM
from jungle.bookings.models import SessionType
from jungle.cards import services as cards
from jungle.conftest import error_code
from jungle.devices.models import Device
from jungle.league.models import LeagueMatch, LeagueSeason, MatchStatus
from jungle.league.tests.conftest import at
from jungle.league.tests.test_kiosk_api import Terminal, card
from jungle.locations.models import Location, Resource
from jungle.screens.models import CourtLineup
from jungle.screens.tests.conftest import Screen, book, enter

pytestmark = pytest.mark.django_db
Join = Callable[..., User]


def full(user: User) -> str:
    return f"{user.last_name} {user.first_name}"


def names(state: dict[str, Any]) -> list[list[str]]:
    return [[p["name"] for p in team] for team in state["court"]["current"]["teams"]]


def token(user: User) -> dict[str, Any]:
    return card(cards.issue_card(SYSTEM, user).token)


@pytest.fixture
def terminal(kiosk: Device) -> Terminal:
    return Terminal(kiosk)


def test_q55_a_player_chooses_the_partner_the_screen_follows(
    season: LeagueSeason, join: Join, court: Resource, court_screen: Screen, terminal: Terminal
) -> None:
    a, b, c, d = (join() for _ in range(4))
    booking = book(court, a, at("2027-04-05 08:30"), 90, SessionType.FREE_RENTAL)
    enter(booking, a, b, c, d)
    assert names(court_screen.state()) == [[full(a), full(b)], [full(c), full(d)]]  # scans
    ticket = token(c)
    offered = terminal.post("/lineups", {"card": ticket}).json()
    assert [(x["court"], len(x["players"])) for x in offered] == [("Teren 4", 4)]
    assert offered[0]["teams"] == [[str(a.pk), str(b.pk)], [str(c.pk), str(d.pk)]]
    chosen = terminal.post(
        f"/lineups/{booking.pk}", {"card": ticket, "partner_id": str(a.pk)}
    ).json()
    assert chosen["teams"] == [[str(c.pk), str(a.pk)], [str(b.pk), str(d.pk)]]
    assert names(court_screen.state()) == [[full(c), full(a)], [full(b), full(d)]]
    assert AuditLog.objects.filter(action="screens.lineup_chosen").count() == 1
    # Someone else changes it again: the last choice counts.
    again = terminal.post(f"/lineups/{booking.pk}", {"card": token(d), "partner_id": str(c.pk)})
    assert again.json()["teams"] == [[str(d.pk), str(c.pk)], [str(a.pk), str(b.pk)]]
    lineup = CourtLineup.objects.get()
    assert lineup.set_by == d and str(lineup) == str(booking.pk)
    # A fifth player checks in: the chosen teams no longer fit, the scans count again.
    e = join()
    enter(booking, e)
    assert len(names(court_screen.state())[0]) == 5
    assert terminal.post("/lineups", {"card": ticket}).json() == []


def test_q55_what_cannot_be_chosen(
    season: LeagueSeason,
    join: Join,
    location: Location,
    court: Resource,
    court_screen: Screen,
    terminal: Terminal,
) -> None:
    a, b, c, d, stranger = (join() for _ in range(5))
    booking = book(court, a, at("2027-04-05 08:30"), 90, SessionType.OFFICIAL_MATCH)
    enter(booking, a, b, c, d)
    ticket = token(a)
    # Not with oneself, not with someone who is not on the court.
    for partner in (a, stranger):
        refused = terminal.post(
            f"/lineups/{booking.pk}", {"card": ticket, "partner_id": str(partner.pk)}
        )
        assert error_code(refused) == "validation.invalid"
    # Not for someone who is not on that court.
    outsider = terminal.post(
        f"/lineups/{booking.pk}", {"card": token(stranger), "partner_id": str(a.pk)}
    )
    assert (outsider.status_code, error_code(outsider)) == (404, "screens.not_on_court")
    # Once the match is entered at the kiosk, its teams are the teams.
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
    for player, side in ((a, "a"), (c, "a"), (b, "b"), (d, "b")):
        match.players.create(user=player, side=side)
    fixed = terminal.post(f"/lineups/{booking.pk}", {"card": ticket, "partner_id": str(b.pk)})
    assert (fixed.status_code, error_code(fixed)) == (409, "screens.teams_fixed")
    assert terminal.post("/lineups", {"card": ticket}).json() == []
    assert names(court_screen.state()) == [[full(a), full(c)], [full(b), full(d)]]
    # A challenge keeps the challenge's teams; a booking later today is not offered yet.
    later = book(court, a, at("2027-04-05 18:00"), 60, SessionType.FREE_RENTAL)
    enter(later, a, b, c, d)
    challenge = book(
        Resource.objects.create(location=location, slug="t2", name="Teren 2", kind="padel_court"),
        a,
        at("2027-04-05 08:30"),
        60,
        SessionType.CHALLENGE,
    )
    enter(challenge, a, b, c, d)
    assert terminal.post("/lineups", {"card": ticket}).json() == []
    # Only at a League Kiosk of the club.
    outside = Terminal(terminal.device, ip="8.8.8.8").post("/lineups", {"card": ticket})
    assert error_code(outside) == "league.score_kiosk_only"


def test_q55_two_players_have_nothing_to_choose(
    season: LeagueSeason, join: Join, court: Resource, terminal: Terminal
) -> None:
    a, b = join(), join()
    enter(book(court, a, at("2027-04-05 08:30"), 60, SessionType.FREE_RENTAL), a, b)
    assert terminal.post("/lineups", {"card": token(a)}).json() == []
