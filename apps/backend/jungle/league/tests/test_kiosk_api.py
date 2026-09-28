"""The League Kiosk over HTTP (§8.2, Stage 7): an enrolled device, on the club's network,
identified by its token; the player identified by the card the scanner read."""

from __future__ import annotations

import base64
import json
from collections.abc import Callable
from datetime import date
from typing import Any

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from django.core import mail
from django.test import Client

from jungle.accounts.models import User
from jungle.attendance.models import Scan, ScanKind
from jungle.audit.models import AuditLog
from jungle.audit.services import SYSTEM
from jungle.cards import services as cards
from jungle.conftest import error_code
from jungle.core import clock
from jungle.devices import auth, bridge
from jungle.devices.models import Device, DeviceKind
from jungle.devices.tests.test_device_auth import raw_key, scan_payload, signed
from jungle.league import tournaments
from jungle.league.models import (
    Challenge,
    ChallengeStatus,
    Fixture,
    FixtureStatus,
    LeagueMatch,
    LeagueSeason,
    LevelQuestionnaire,
    MatchStatus,
)
from jungle.league.tests.conftest import WIN_A, placed, staff_request
from jungle.league.tests.test_challenges import Club
from jungle.league.tests.test_matches import Game
from jungle.league.tests.test_tournaments import Court, data, enter_pairs
from jungle.locations.models import Location, Resource, ResourceKind

pytestmark = pytest.mark.django_db

Join = Callable[..., User]
BASE = "/api/v1/kiosk/league"


class Terminal:
    """A kiosk's browser: the device token in every call, from an address on the club's
    network (or not)."""

    def __init__(self, device: Device, ip: str = "10.0.0.5"):
        secret = auth.new_secret()
        Device.objects.filter(pk=device.pk).update(token_hash=auth.hash_secret(secret))
        self.device = device
        self.token = f"{device.pk}.{secret}"
        self.ip = ip
        self.client = Client()

    def get(self, path: str, **params: Any) -> Any:
        return self.client.get(
            f"{BASE}{path}", params, HTTP_X_DEVICE_TOKEN=self.token, REMOTE_ADDR=self.ip
        )

    def post(self, path: str, body: Any) -> Any:
        return self.client.post(
            f"{BASE}{path}",
            json.dumps(body, default=str),
            content_type="application/json",
            HTTP_X_DEVICE_TOKEN=self.token,
            REMOTE_ADDR=self.ip,
        )


def card(token: str) -> dict[str, Any]:
    return {"token": token}


@pytest.fixture
def terminal(kiosk: Device) -> Terminal:
    return Terminal(kiosk)


@pytest.fixture
def court(location: Location) -> Resource:
    return Resource.objects.create(
        location=location, slug="teren-1", name="Teren 1", kind=ResourceKind.PADEL_COURT
    )


@pytest.fixture
def game(season: LeagueSeason, court: Resource, join: Join) -> Game:
    return Game(season, court, [join() for _ in range(4)])


# ---------------------------------------------------------------- who may call
def test_adr0012_only_an_enrolled_league_kiosk_on_the_clubs_network(
    kiosk: Device, location: Location, season: LeagueSeason
) -> None:
    assert Client().get(f"{BASE}/idle").status_code == 401  # the website, a phone
    assert Terminal(kiosk).get("/idle").status_code == 200
    outside = Terminal(kiosk, ip="8.8.8.8").get("/idle")
    assert (outside.status_code, error_code(outside)) == (403, "league.score_kiosk_only")
    screen = Device.objects.create(kind=DeviceKind.SCREEN, location=location, name="Ecran 1")
    refused = Terminal(screen).post("/session", {"card": card("X")})
    assert error_code(refused) == "league.score_kiosk_only"
    problems = [
        (a.after or {})["problem"] for a in AuditLog.objects.filter(action="league.score_refused")
    ]
    assert sorted(problems) == ["not_a_league_kiosk", "outside_club_network"]


# ---------------------------------------------------------------- the idle screen, standings
def test_s8_2_idle_screen_and_standings_search(
    terminal: Terminal, season: LeagueSeason, join: Join
) -> None:
    empty = terminal.get("/idle").json()
    assert empty["doubles"] == [] and empty["match_of_the_day"]["found"] is False
    a = placed(season, join)[0]
    idle = terminal.get("/idle").json()
    assert len(idle["doubles"]) == 4 and len(idle["pairs"]) == 2
    assert idle["kings"] == [] and idle["challenges"] == []
    assert set(idle["doubles"][0]["players"][0]) == {"id", "first_name", "last_name"}
    found = terminal.get("/standings", search=a.last_name.upper()).json()
    assert [s["players"][0]["last_name"] for s in found] == [a.last_name]
    pairs = terminal.get("/standings", ladder="pairs").json()
    assert len(pairs) == 2
    assert terminal.get("/standings", ladder="nu").status_code == 422


def test_s8_2_idle_without_a_season(terminal: Terminal) -> None:
    idle = terminal.get("/idle").json()
    assert idle["doubles"] == idle["singles"] == idle["kings"] == []
    assert terminal.get("/standings").json() == []


# ---------------------------------------------------------------- the player's session
def test_s8_2_a_new_player_signs_the_consent_at_the_kiosk(
    terminal: Terminal, make_user: Callable[..., User], league_text: None, now: Any
) -> None:
    newcomer = make_user()
    token = cards.issue_card(SYSTEM, newcomer).token
    view = terminal.post("/session", {"card": card(token)}).json()
    assert view["player"]["first_name"] == newcomer.first_name
    assert (view["adult"], view["consent_signed"], view["in_league"]) == (True, False, False)
    assert view["questionnaire"] == "none" and view["ladders"] == []

    text = terminal.get("/consent", language="en").json()
    assert (text["language"], text["version"]) == ("en", 1)
    assert terminal.get("/consent", language="xx").json()["language"] == "ro"
    unticked = {"card": card(token), "language": "ro", "accepted": False}
    assert error_code(terminal.post("/consent", unticked)) == "validation.invalid"
    signed_now = terminal.post("/consent", {**unticked, "accepted": True}).json()
    assert signed_now == {"signed": True, "version": 1}
    view = terminal.post("/session", {"card": card(token)}).json()
    assert view["consent_signed"] is True and view["consent_outdated"] is False

    LevelQuestionnaire.objects.create(
        user=newcomer,
        answers={},
        estimated_level="3.00",
        submitted_at=clock.now(),
    )
    assert terminal.post("/session", {"card": card(token)}).json()["questionnaire"] == "pending"


def test_r006_minors_cannot_sign(
    terminal: Terminal, make_user: Callable[..., User], league_text: None, now: Any
) -> None:
    minor = make_user(date_of_birth=date(2012, 1, 1))
    token = cards.issue_card(SYSTEM, minor).token
    assert terminal.post("/session", {"card": card(token)}).json()["adult"] is False
    body = {"card": card(token), "language": "ro", "accepted": True}
    assert error_code(terminal.post("/consent", body)) == "league.adults_only"


def test_unknown_cards_and_missing_codes(terminal: Terminal, season: LeagueSeason) -> None:
    assert error_code(terminal.post("/session", {"card": card("nimic")})) == "cards.invalid"
    assert error_code(terminal.post("/session", {"card": {}})) == "cards.invalid"


# ---------------------------------------------------------------- scores (§8.2 actions 2, 3)
def test_s8_2_score_entered_and_confirmed_at_the_kiosk(
    terminal: Terminal, game: Game, now: Any, django_capture_on_commit_callbacks: Any
) -> None:
    now.move_to("2027-04-05T11:35:00+03:00", tick=False)
    view = terminal.post("/session", {"card": card(game.token(game.a))}).json()
    assert view["in_league"] is True
    (chance,) = view["score_chances"]
    assert chance["booking_id"] == str(game.booking.pk) and chance["court"] == "Teren 1"
    assert {p["id"] for p in chance["players"]} == {str(p.pk) for p in game.players}

    body = {
        "card": card(game.token(game.a)),
        "booking_id": str(game.booking.pk),
        "team_a": [str(game.a.pk), str(game.b.pk)],
        "team_b": [str(game.c.pk), str(game.d.pk)],
        "score": WIN_A,
    }
    with django_capture_on_commit_callbacks(execute=True):
        proposed = terminal.post("/matches", body)
    assert proposed.status_code == 201
    match_id = proposed.json()["id"]
    after = terminal.post("/session", {"card": card(game.token(game.a))}).json()
    assert after["score_chances"] == [] and after["to_confirm"] == []
    waiting = terminal.post("/session", {"card": card(game.token(game.b))}).json()["to_confirm"]
    assert [w["match_id"] for w in waiting] == [match_id]
    assert [(s["a"], s["b"]) for s in waiting[0]["score"]["sets"]] == [(6, 3), (6, 4)]

    for player in (game.b, game.c, game.d):
        answer = {"card": card(game.token(player)), "accept": True}
        assert terminal.post(f"/matches/{match_id}/respond", answer).status_code == 200
    assert LeagueMatch.objects.get(pk=match_id).status == MatchStatus.AWAITING_PAYMENT
    director = terminal.post(f"/matches/{match_id}/director", {"card": card(game.token(game.a))})
    assert error_code(director) == "auth.forbidden"  # only the tournament director (Q28)


def test_invariant_1_the_same_score_from_outside_the_club_is_refused(
    kiosk: Device, game: Game, now: Any
) -> None:
    now.move_to("2027-04-05T11:35:00+03:00", tick=False)
    body = {
        "card": card(game.token(game.a)),
        "booking_id": str(game.booking.pk),
        "team_a": [str(game.a.pk), str(game.b.pk)],
        "team_b": [str(game.c.pk), str(game.d.pk)],
        "score": WIN_A,
    }
    refused = Terminal(kiosk, ip="8.8.8.8").post("/matches", body)
    assert (refused.status_code, error_code(refused)) == (403, "league.score_kiosk_only")
    website = Client().post(f"{BASE}/matches", body, content_type="application/json")
    assert website.status_code == 401
    assert not LeagueMatch.objects.exists()


# ---------------------------------------------------------------- signed scans (ADR-0013)
def test_adr0013_with_a_bridge_the_scan_must_be_signed(
    terminal: Terminal, game: Game, now: Any
) -> None:
    key = Ed25519PrivateKey.generate()
    Device.objects.filter(pk=terminal.device.pk).update(public_key=raw_key(key))
    token = game.token(game.a)
    plain = terminal.post("/session", {"card": card(token)})
    assert (plain.status_code, error_code(plain)) == (403, "devices.signature_invalid")
    message = signed(key, scan_payload(terminal.device, code=token))
    view = terminal.post("/session", {"card": {"signed": message}})
    assert view.status_code == 200 and view.json()["player"]["id"] == str(game.a.pk)
    replay = terminal.post("/session", {"card": {"signed": message}})
    assert error_code(replay) == "devices.signature_invalid"
    forged = dict(message, signature=base64.b64encode(b"0" * 64).decode())
    assert error_code(terminal.post("/session", {"card": {"signed": forged}})) == (
        "devices.signature_invalid"
    )
    assert bridge.canonical({"b": 1, "a": "ă"}) == '{"a":"ă","b":1}'.encode()


# ---------------------------------------------------------------- check-in (§8.2 action 5)
def test_r030_check_in_once_a_day(terminal: Terminal, game: Game, now: Any) -> None:
    first = terminal.post("/check-in", {"card": card(game.token(game.a))}).json()
    assert first["first_name"] == game.a.first_name
    again = terminal.post("/check-in", {"card": card(game.token(game.a))}).json()
    assert again == first
    scan = Scan.objects.get(user=game.a, kind=ScanKind.ARRIVAL)
    assert scan.device_id == terminal.device.pk
    logged = AuditLog.objects.filter(action="attendance.scan", actor_device_id=terminal.device.pk)
    assert logged.count() == 1
    now.move_to("2027-04-06T09:00:00+03:00", tick=False)
    terminal.post("/check-in", {"card": card(game.token(game.a))})
    assert Scan.objects.filter(user=game.a, kind=ScanKind.ARRIVAL).count() == 2


# ---------------------------------------------------------------- challenges (§8.2 action 4)
def test_q48_challenges_at_the_kiosk(
    terminal: Terminal, season: LeagueSeason, join: Join, now: Any
) -> None:
    club = Club(season, join)
    now.move_to("2027-04-06T13:00:00+03:00", tick=False)
    body = {
        "cards": [card(t) for t in club.tokens(club.e, club.f)],
        "targets": [str(club.a.pk), str(club.b.pk)],
    }
    issued = terminal.post("/challenges", body)
    assert issued.status_code == 201
    challenge_id = issued.json()["id"]
    mail.outbox.clear()
    target_view = terminal.post("/session", {"card": card(club.cards[club.a.pk])}).json()
    (waiting,) = target_view["challenges"]
    assert waiting["challenge_id"] == challenge_id and waiting["ladder"] == "pairs"
    assert {p["id"] for p in waiting["challengers"]} == {str(club.e.pk), str(club.f.pk)}
    (shown,) = terminal.get("/idle").json()["challenges"]
    assert len(shown["challengers"]) == len(shown["targets"]) == 2

    answer = {"card": card(club.cards[club.b.pk]), "accept": True}
    accepted = terminal.post(f"/challenges/{challenge_id}/answer", answer)
    assert accepted.status_code == 200
    assert Challenge.objects.get(pk=challenge_id).status == ChallengeStatus.ACCEPTED


# ---------------------------------------------------------------- tournaments (Q28)
def test_q28_tournament_matches_at_the_kiosk(
    terminal: Terminal,
    season: LeagueSeason,
    join: Join,
    manager: User,
    location: Location,
    now: Any,
) -> None:
    a, b, c, d = placed(season, join)
    now.move_to("2027-04-08T12:00:00+03:00")
    tournament = tournaments.create(staff_request(manager), data(location))
    enter_pairs(tournament, [a, b, c, d])
    tournaments.draw(staff_request(manager), tournament.pk)
    court = Court(location, tournament, [a, b, c, d])
    final = Fixture.objects.get(tournament=tournament, phase="final")
    tournaments.schedule(staff_request(manager), final.pk, court.booking.pk)
    now.move_to("2027-04-10T11:00:00+03:00")

    mine = terminal.post("/session", {"card": card(court.cards[a.pk])}).json()
    assert [f["fixture_id"] for f in mine["fixtures"]] == [str(final.pk)]
    assert mine["fixtures"][0]["status"] == FixtureStatus.READY and mine["director"] is False
    finished = terminal.post(f"/fixtures/{final.pk}/finished", {"card": card(court.cards[a.pk])})
    assert finished.json() == {"fixture_id": str(final.pk), "status": FixtureStatus.FINISHED}
    scored = terminal.post(
        f"/fixtures/{final.pk}/score", {"card": card(court.cards[a.pk]), "score": WIN_A}
    )
    assert scored.status_code == 201

    director_card = cards.issue_card(SYSTEM, manager).token
    as_director = terminal.post("/session", {"card": card(director_card)}).json()
    assert as_director["director"] is True and len(as_director["fixtures"]) == 1
    assert as_director["fixtures"][0]["match_id"] == scored.json()["id"]
    assert as_director["fixtures"][0]["score"]["sets"][0]["a"] == 6
    validated = terminal.post(
        f"/matches/{scored.json()['id']}/director", {"card": card(director_card)}
    )
    assert validated.status_code == 200
    assert validated.json()["status"] == MatchStatus.AWAITING_PAYMENT  # entry fees unpaid
    stranger = join()
    other = terminal.post("/session", {"card": card(cards.issue_card(SYSTEM, stranger).token)})
    assert other.json()["fixtures"] == []


# ---------------------------------------------------------------- the kiosk session (§8.2)
def test_s8_2_one_scan_opens_a_short_session_on_this_kiosk(
    terminal: Terminal, game: Game, location: Location, now: Any
) -> None:
    key = Ed25519PrivateKey.generate()
    Device.objects.filter(pk=terminal.device.pk).update(public_key=raw_key(key))
    message = signed(key, scan_payload(terminal.device, code=game.token(game.a)))
    opened = terminal.post("/session", {"card": {"signed": message}}).json()
    session = {"session": opened["session"]}
    assert len(opened["session"]) >= 30
    again = terminal.post("/session", {"card": session}).json()  # refreshed, same session
    assert again["session"] == opened["session"] and again["player"]["id"] == str(game.a.pk)
    assert terminal.post("/check-in", {"card": session}).json()["first_name"] == game.a.first_name

    other = Device.objects.create(kind=DeviceKind.LEAGUE_KIOSK, location=location, name="Chioșc 2")
    stolen = Terminal(other).post("/check-in", {"card": session})
    assert (stolen.status_code, error_code(stolen)) == (403, "devices.session_expired")

    assert terminal.post("/logout", {"session": opened["session"]}).status_code == 204
    ended = terminal.post("/check-in", {"card": session})
    assert error_code(ended) == "devices.session_expired"
    assert (
        Client()
        .post(f"{BASE}/logout", {"session": "x"}, content_type="application/json")
        .status_code
        == 401
    )
