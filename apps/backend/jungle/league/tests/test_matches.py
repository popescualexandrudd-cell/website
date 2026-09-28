"""The match flow at the League Kiosk (§6.9, LG-090 … LG-098, LG-161, LG-162) and
invariant 1: scores only at the registered League Kiosk, checked on the server."""

from __future__ import annotations

import threading
import uuid
from collections.abc import Callable
from datetime import datetime, timedelta
from typing import Any

import pytest
from django.db import connection
from django.test import Client, RequestFactory

from jungle.accounts.models import User
from jungle.attendance.models import Scan, ScanKind, StaffNotice
from jungle.audit.models import AuditLog
from jungle.audit.services import SYSTEM
from jungle.bookings.models import Booking, BookingStatus, SessionType
from jungle.cards import services as cards
from jungle.conftest import Api, error_code, login_as
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Role
from jungle.devices.models import Device, DeviceKind
from jungle.league import kiosk as kiosk_guard
from jungle.league import matches, store
from jungle.league.models import (
    EventKind,
    LeagueEvent,
    LeagueMatch,
    LeagueSeason,
    MatchStatus,
    MatchTransition,
    Response,
    Standing,
)
from jungle.league.tests.conftest import WIN_A, at, play, staff_request
from jungle.ledger import payments
from jungle.ledger.models import PaymentMethod
from jungle.locations.models import Location, Resource, ResourceKind

pytestmark = pytest.mark.django_db

Join = Callable[..., User]
PRICE = 24000  # 240 RON for 90 minutes (demo value)


def kiosk_call(ip: str = "10.0.0.5") -> Any:
    return RequestFactory().post("/", REMOTE_ADDR=ip)


@pytest.fixture
def court(location: Location) -> Resource:
    return Resource.objects.create(
        location=location, slug="teren-1", name="Teren 1", kind=ResourceKind.PADEL_COURT
    )


class Game:
    """Four players in the league, a 10:00–11:30 official-match booking, all scanned in."""

    def __init__(self, season: LeagueSeason, court: Resource, players: list[User]):
        self.season = season
        self.players = players
        self.a, self.b, self.c, self.d = players
        self.cards = {p.pk: cards.issue_card(SYSTEM, p).token for p in players}
        self.booking = book(court, self.a, "2027-04-05 10:00", "2027-04-05 11:30")
        for player in players:
            scan(self.booking, player)

    def token(self, player: User) -> str:
        return self.cards[player.pk]

    def proposal(self, by: User | None = None, **changes: Any) -> matches.Proposal:
        fields: dict[str, Any] = {
            "booking_id": self.booking.pk,
            "card_token": self.token(by or self.a),
            "team_a": (self.a.pk, self.b.pk),
            "team_b": (self.c.pk, self.d.pk),
            "score": WIN_A,
        }
        fields.update(changes)
        return matches.Proposal(**fields)

    def pay(self, amount: int = PRICE, key: str = "") -> None:
        payments.pay(
            SYSTEM,
            payments.due_for_booking(self.booking),
            payments.PaymentData(
                payer_id=self.a.pk,
                amount=amount,
                method=PaymentMethod.CASH,
                tendered=amount,
                idempotency_key=key or f"pay-{uuid.uuid4()}",
            ),
        )


def book(court: Resource, organizer: User, start: str, end: str, **fields: Any) -> Booking:
    values: dict[str, Any] = {
        "location": court.location,
        "resource": court,
        "organizer": organizer,
        "created_by": organizer,
        "starts_at": at(start),
        "ends_at": at(end),
        "session_type": SessionType.OFFICIAL_MATCH,
        "price_total": PRICE,
        **fields,
    }
    return Booking.objects.create(**values)


def scan(booking: Booking, player: User) -> Scan:
    return Scan.objects.create(
        user=player,
        location=booking.location,
        kind=ScanKind.COURT_ENTRY,
        resource=booking.resource,
        booking=booking,
        scanned_at=booking.starts_at,
    )


@pytest.fixture
def game(season: LeagueSeason, court: Resource, join: Join) -> Game:
    return Game(season, court, [join() for _ in range(4)])


@pytest.fixture
def after_game(now: Any) -> Any:
    now.move_to("2027-04-05T11:35:00+03:00", tick=False)
    return now


def refused(exc: pytest.ExceptionInfo[DomainError]) -> tuple[str, int]:
    return exc.value.code.value, exc.value.status


def statuses(match: LeagueMatch) -> list[str]:
    return list(match.transitions.values_list("status", flat=True))


# ---------------------------------------------------------------- the whole flow
def test_lg090_a_paid_match_is_confirmed_by_all_and_applied(
    game: Game, kiosk: Device, after_game: Any
) -> None:
    game.pay()
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    assert match.status == MatchStatus.PROPOSED and match.finished_at == game.booking.ends_at
    assert match.window_closes_at == at("2027-04-05 12:00")
    first = match.transitions.get()
    assert first.device == kiosk and first.checks["scanned"] and first.checks["booking"]
    responses = dict(match.players.values_list("user_id", "response"))
    assert responses[game.a.pk] == Response.CONFIRMED
    assert [r for u, r in responses.items() if u != game.a.pk] == [Response.PENDING] * 3

    for player in (game.b, game.c):
        matches.respond(kiosk_call(), kiosk, match.pk, game.token(player), True)
    match.refresh_from_db()
    assert match.status == MatchStatus.PROPOSED  # d has not confirmed yet
    matches.respond(kiosk_call(), kiosk, match.pk, game.token(game.d), True)
    match.refresh_from_db()
    assert match.status == MatchStatus.APPLIED and match.event is not None
    assert statuses(match) == ["proposed", "confirmed", "validated", "applied"]
    assert match.transitions.get(status="validated").checks["payment"]["to_pay"] == 0
    assert match.event.at == game.booking.ends_at and match.event.ref == match.ref
    row = Standing.objects.get(season=game.season, ladder="doubles", competitor_id=str(game.a.pk))
    assert row.matches_played == 1
    actions = set(AuditLog.objects.values_list("action", flat=True))
    assert {"league.score_proposed", "league.score_confirmed", "league.match_applied"} <= actions


def test_lg096_a_score_waits_for_the_payment_then_counts(
    game: Game, kiosk: Device, after_game: Any, django_capture_on_commit_callbacks: Any
) -> None:
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    for player in (game.b, game.c, game.d):
        matches.respond(kiosk_call(), kiosk, match.pk, game.token(player), True)
    match.refresh_from_db()
    assert match.status == MatchStatus.AWAITING_PAYMENT
    assert match.payment_deadline == clock.now() + timedelta(hours=24)  # Q11
    waiting = match.transitions.get(status="awaiting_payment")
    assert waiting.checks["payment"]["to_pay"] == PRICE

    with django_capture_on_commit_callbacks(execute=True):
        game.pay(PRICE // 2)  # half of a split hour: still waiting
    match.refresh_from_db()
    assert match.status == MatchStatus.AWAITING_PAYMENT
    after_game.move_to("2027-04-05T18:00:00+03:00")
    with django_capture_on_commit_callbacks(execute=True):
        game.pay(PRICE // 2)  # paid in full later, at the Payments Kiosk: validated at once
    match.refresh_from_db()
    assert match.status == MatchStatus.APPLIED
    assert statuses(match)[-3:] == ["awaiting_payment", "validated", "applied"]
    validated = match.transitions.get(status="validated")
    assert validated.actor["kind"] == "system" and validated.checks["payment"]["to_pay"] == 0


def test_lg096_unpaid_at_the_deadline_expires(
    game: Game, kiosk: Device, after_game: Any, django_capture_on_commit_callbacks: Any
) -> None:
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    for player in (game.b, game.c, game.d):
        matches.respond(kiosk_call(), kiosk, match.pk, game.token(player), True)
    after_game.move_to("2027-04-06T11:36:00+03:00")  # 24 hours and a minute later
    with django_capture_on_commit_callbacks(execute=True):
        game.pay()  # too late: does not validate
    match.refresh_from_db()
    assert match.status == MatchStatus.AWAITING_PAYMENT
    assert matches.expire_matches() == matches.ExpiryReport(unconfirmed=0, unpaid=1)
    match.refresh_from_db()
    assert match.status == MatchStatus.EXPIRED and match.note == "Neplătit la termen (Q11)"
    assert not LeagueEvent.objects.filter(kind=EventKind.MATCH).exists()


def test_payments_without_a_waiting_match_change_nothing(
    game: Game, django_capture_on_commit_callbacks: Any
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        game.pay()
    matches.payment_received(
        payments.Due(
            key="x",
            customer=game.a,
            location=game.booking.location,
            amount=0,
            category="padel",
            description="",
            lock_on=(Booking, game.booking.pk),
        )
    )
    assert not LeagueMatch.objects.exists()
    payments.on_paid(matches.payment_received)  # registered once, from AppConfig.ready
    assert payments._paid_listeners.count(matches.payment_received) == 1


# ---------------------------------------------------------------- the score window (LG-093)
def test_lg093_the_window_opens_after_the_booking_for_30_minutes(
    game: Game, kiosk: Device, now: Any
) -> None:
    for moment in ("2027-04-05T09:30:00+03:00", "2027-04-05T11:29:00+03:00"):
        now.move_to(moment)
        with pytest.raises(DomainError) as exc:
            matches.propose(kiosk_call(), kiosk, game.proposal())
        assert refused(exc) == ("league.window_not_open", 409)
        assert exc.value.params == {"opens": "11:30", "closes": "12:00"}
    now.move_to("2027-04-05T12:00:00+03:00")
    with pytest.raises(DomainError) as exc:
        matches.propose(kiosk_call(), kiosk, game.proposal())
    assert exc.value.params == {"closes": "12:00"}

    now.move_to("2027-04-05T11:50:00+03:00")
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    matches.respond(kiosk_call(), kiosk, match.pk, game.token(game.b), True)
    now.move_to("2027-04-05T12:00:00+03:00")
    with pytest.raises(DomainError) as exc:
        matches.respond(kiosk_call(), kiosk, match.pk, game.token(game.c), True)
    assert refused(exc) == ("league.window_closed", 409)
    assert matches.expire_matches() == matches.ExpiryReport(unconfirmed=1, unpaid=0)
    match.refresh_from_db()
    assert match.status == MatchStatus.EXPIRED
    assert not matches._expire(match.pk, MatchStatus.PROPOSED, "window", "again")


def test_lg095_expiry_waits_for_the_end_of_the_window(
    game: Game, kiosk: Device, after_game: Any
) -> None:
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    assert not matches._expire(match.pk, MatchStatus.PROPOSED, "window", "too early")
    assert matches.expire_matches() == matches.ExpiryReport(unconfirmed=0, unpaid=0)


# ---------------------------------------------------------------- invariant 1 (ADR-0012)
@pytest.mark.parametrize(
    ("source", "problem"),
    [
        ("website", "no_device"),
        ("payments_kiosk", "not_a_league_kiosk"),
        ("screen", "not_a_league_kiosk"),
        ("inactive", "device_inactive"),
        ("other_club", "other_club"),
        ("outside", "outside_club_network"),
    ],
)
def test_invariant_1_scores_only_at_the_registered_league_kiosk(
    game: Game, kiosk: Device, after_game: Any, source: str, problem: str
) -> None:
    other = Location.objects.create(slug="alt-club", name="Alt club")
    ip = "8.8.8.8" if source == "outside" else "10.0.0.5"
    device: Device | None = {
        "website": None,
        "payments_kiosk": Device(kind=DeviceKind.PAYMENTS_KIOSK, location=kiosk.location),
        "screen": Device(kind=DeviceKind.SCREEN, location=kiosk.location),
        "inactive": kiosk,
        "other_club": Device(kind=DeviceKind.LEAGUE_KIOSK, location=other),
        "outside": kiosk,
    }[source]
    if device is not None and device._state.adding:
        device.name = source
        device.save()
    if source == "inactive":  # deactivated in the admin: counts at once
        Device.objects.filter(pk=kiosk.pk).update(is_active=False)
    with pytest.raises(DomainError) as exc:
        matches.propose(kiosk_call(ip), device, game.proposal())
    assert refused(exc) == ("league.score_kiosk_only", 403)
    log = AuditLog.objects.get(action="league.score_refused")
    assert log.after == {**(log.after or {}), "problem": problem, "action": "league.propose"}
    assert not LeagueMatch.objects.exists()


def test_invariant_1_club_network(db: None, settings: Any) -> None:
    assert kiosk_guard.in_club_network("192.168.10.20")
    assert not kiosk_guard.in_club_network("8.8.8.8")
    assert not kiosk_guard.in_club_network("nu-e-o-adresa")
    assert not kiosk_guard.in_club_network("127.0.0.1")
    settings.KIOSK_ALLOW_LOOPBACK = True  # development only
    assert kiosk_guard.in_club_network("127.0.0.1")
    assert not kiosk_guard.in_club_network("8.8.8.8")


def test_invariant_1_confirmations_only_at_the_kiosk(
    game: Game, kiosk: Device, after_game: Any, location: Location
) -> None:
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    screen = Device.objects.create(kind=DeviceKind.SCREEN, location=location, name="Ecran 1")
    for device in (None, screen):
        with pytest.raises(DomainError) as exc:
            matches.respond(kiosk_call(), device, match.pk, game.token(game.b), True)
        assert refused(exc) == ("league.score_kiosk_only", 403)
    assert AuditLog.objects.filter(action="league.score_refused").count() == 2
    assert match.players.get(user=game.b).response == Response.PENDING


def test_invariant_1_no_score_endpoint_outside_the_kiosk(api: Api) -> None:
    """The website, phones and the admin API can read matches but never enter or confirm a
    score: the only match action for staff is resolving (apply / reopen / cancel)."""
    schema = api.get("/openapi.json").json()
    kiosk = "/api/v1/kiosk/league/"
    writes = [
        (path, method)
        for path, operations in schema["paths"].items()
        for method in operations
        if method in {"post", "put", "patch"}
        and ("matches" in path or "score" in path)
        and not path.startswith(kiosk)
    ]
    assert writes == [("/api/v1/staff/league/matches/{match_id}/resolve", "post")]
    # The League Kiosk's own endpoints accept nothing but the device token (ADR-0012).
    at_kiosk = [ops for path, ops in schema["paths"].items() if path.startswith(kiosk)]
    assert at_kiosk and all(
        op["security"] == [{"DeviceAuth": []}] for ops in at_kiosk for op in ops.values()
    )


# ---------------------------------------------------------------- booking, scans, players
def test_lg091_only_official_matches_on_the_clubs_padel_courts(
    game: Game, kiosk: Device, court: Resource, after_game: Any, location: Location
) -> None:
    tennis = Resource.objects.create(
        location=location, slug="tenis", name="Tenis", kind=ResourceKind.TENNIS_COURT
    )
    cases = [
        book(court, game.a, "2027-04-05 08:00", "2027-04-05 09:00"),
        book(
            court,
            game.a,
            "2027-04-05 11:30",
            "2027-04-05 12:30",
            session_type=SessionType.TRAINING,
        ),
        book(tennis, game.a, "2027-04-05 10:00", "2027-04-05 11:30"),
    ]
    Booking.objects.filter(pk=cases[0].pk).update(status=BookingStatus.NO_SHOW)
    for booking in cases:
        with pytest.raises(DomainError) as exc:
            matches.propose(kiosk_call(), kiosk, game.proposal(booking_id=booking.pk))
        assert refused(exc) == ("league.booking_not_eligible", 400)
    with pytest.raises(DomainError) as exc:
        matches.propose(kiosk_call(), kiosk, game.proposal(booking_id=uuid.uuid4()))
    assert refused(exc) == ("booking.not_found", 404)


def test_lg092_every_player_scanned_in(game: Game, kiosk: Device, after_game: Any) -> None:
    Scan.objects.filter(user=game.d).delete()
    with pytest.raises(DomainError) as exc:
        matches.propose(kiosk_call(), kiosk, game.proposal())
    assert refused(exc) == ("league.players_not_scanned", 400)
    assert exc.value.params == {"missing": 1}


def test_players_must_be_in_the_league_and_in_the_match(
    game: Game, kiosk: Device, after_game: Any, make_user: Callable[..., User]
) -> None:
    outsider = make_user(first_name="Ion", last_name="Străin")
    scan(game.booking, outsider)
    outsider_card = cards.issue_card(SYSTEM, outsider).token
    attempts: list[tuple[dict[str, Any], tuple[str, int]]] = [
        ({"team_b": (game.c.pk, outsider.pk)}, ("league.player_not_in_league", 403)),
        ({"card_token": outsider_card}, ("league.not_a_player", 403)),
        ({"team_b": (game.c.pk,)}, ("league.team_size", 400)),
        (
            {"team_a": (game.a.pk, game.b.pk, game.d.pk), "team_b": (game.c.pk,)},
            ("league.team_size", 400),
        ),
        ({"team_b": (game.c.pk, game.a.pk)}, ("league.duplicate_player", 400)),
        ({"team_b": (game.c.pk, uuid.uuid4())}, ("league.unknown_player", 404)),
        ({"card_token": "nu-exista"}, ("cards.invalid", 404)),
        ({"score": {"sets": [{"a": 6, "b": 6}]}}, ("score", 400)),
        ({"score": {"sets": "6-3"}}, ("validation.invalid", 400)),
    ]
    for changes, (code, status) in attempts:
        with pytest.raises(DomainError) as exc:
            matches.propose(kiosk_call(), kiosk, game.proposal(**changes))
        assert refused(exc)[1] == status
        assert exc.value.code.value.startswith("league.score_" if code == "score" else code)
    with pytest.raises(DomainError) as exc:
        matches.propose(kiosk_call(), kiosk, game.proposal(team_b=(game.c.pk, outsider.pk)))
    assert exc.value.params == {"name": "Ion Străin"}
    assert not LeagueMatch.objects.exists()


def test_lg094_each_player_answers_once(
    game: Game, kiosk: Device, after_game: Any, make_user: Callable[..., User]
) -> None:
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    with pytest.raises(DomainError) as exc:
        matches.propose(kiosk_call(), kiosk, game.proposal(by=game.b))
    assert refused(exc) == ("league.score_already_proposed", 409)
    with pytest.raises(DomainError) as exc:
        matches.respond(kiosk_call(), kiosk, match.pk, game.token(game.a), True)
    assert refused(exc) == ("league.already_responded", 409)
    stranger = cards.issue_card(SYSTEM, make_user()).token
    with pytest.raises(DomainError) as exc:
        matches.respond(kiosk_call(), kiosk, match.pk, stranger, True)
    assert refused(exc) == ("league.not_a_player", 403)
    with pytest.raises(DomainError) as exc:
        matches.respond(kiosk_call(), kiosk, uuid.uuid4(), game.token(game.b), True)
    assert refused(exc) == ("league.match_not_found", 404)


def test_lg103_a_fourth_match_in_a_day_is_refused(
    game: Game, kiosk: Device, court: Resource, after_game: Any
) -> None:
    game.pay()
    first = matches.propose(kiosk_call(), kiosk, game.proposal())
    for player in (game.b, game.c, game.d):
        matches.respond(kiosk_call(), kiosk, first.pk, game.token(player), True)
    for start, end in (("12:00", "13:00"), ("13:00", "14:00"), ("14:00", "15:00")):
        booking = book(court, game.a, f"2027-04-05 {start}", f"2027-04-05 {end}")
        for player in game.players:
            scan(booking, player)
        hour, minute = end.split(":")
        after_game.move_to(f"2027-04-05T{hour}:{int(minute) + 5:02d}:00+03:00")
        attempt = game.proposal(booking_id=booking.pk)
        if start == "14:00":
            with pytest.raises(DomainError) as exc:
                matches.propose(kiosk_call(), kiosk, attempt)
            assert refused(exc) == ("league.daily_limit", 409)
        else:
            matches.propose(kiosk_call(), kiosk, attempt)  # waiting ones count too


def test_lg103_over_the_limit_at_application_becomes_training(
    game: Game, kiosk: Device, after_game: Any
) -> None:
    game.pay()
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    for hour in ("09:15", "10:15", "11:00"):  # counted directly, e.g. from a tournament day
        play(game.season, (game.a, game.c), (game.b, game.d), at(f"2027-04-05 {hour}"))
    for player in (game.b, game.c, game.d):
        matches.respond(kiosk_call(), kiosk, match.pk, game.token(player), True)
    match.refresh_from_db()
    assert match.status == MatchStatus.TRAINING and match.event is None
    assert match.note == "Limita zilnică de meciuri (LG-103)"


def test_lg_a_match_without_a_complete_set_becomes_training(
    game: Game, kiosk: Device, after_game: Any
) -> None:
    game.pay()
    unfinished = {"sets": [{"a": 4, "b": 3}], "unfinished": True}
    match = matches.propose(kiosk_call(), kiosk, game.proposal(score=unfinished))
    for player in (game.b, game.c, game.d):
        matches.respond(kiosk_call(), kiosk, match.pk, game.token(player), True)
    match.refresh_from_db()
    assert match.status == MatchStatus.TRAINING and match.note == "Niciun set complet (§6.8)"
    assert match.event is not None  # recorded, with no effect on ratings
    row = Standing.objects.get(season=game.season, ladder="doubles", competitor_id=str(game.a.pk))
    assert row.matches_played == 0


# ---------------------------------------------------------------- disputes and the admin
def test_lg095_a_dispute_goes_to_the_admin(
    game: Game, kiosk: Device, after_game: Any, manager: User
) -> None:
    game.pay()
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    matches.respond(kiosk_call(), kiosk, match.pk, game.token(game.c), False)
    match.refresh_from_db()
    assert match.status == MatchStatus.DISPUTED
    notice = StaffNotice.objects.get(kind=matches.NOTICE_DISPUTE)
    assert notice.recipient_role == Role.MANAGER and notice.payload["court"] == "Teren 1"
    with pytest.raises(DomainError) as exc:
        matches.respond(kiosk_call(), kiosk, match.pk, game.token(game.d), True)
    assert refused(exc) == ("league.match_not_open", 409)

    request = staff_request(manager)
    with pytest.raises(DomainError) as exc:
        matches.resolve(request, match.pk, matches.Resolution.APPLY, "   ")
    assert refused(exc) == ("league.reason_required", 400)
    matches.resolve(request, match.pk, matches.Resolution.APPLY, "Filmare verificată: 6-3 6-4")
    match.refresh_from_db()
    assert match.status == MatchStatus.APPLIED
    assert statuses(match) == [
        "proposed",
        "disputed",
        "resolved",
        "confirmed",
        "validated",
        "applied",
    ]
    log = AuditLog.objects.get(action="league.match_resolved")
    assert log.reason == "Filmare verificată: 6-3 6-4"
    assert (log.before or {}).get("status") == "disputed"


def test_lg095_the_admin_reopens_the_window_for_a_new_score(
    game: Game, kiosk: Device, after_game: Any, manager: User
) -> None:
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    matches.respond(kiosk_call(), kiosk, match.pk, game.token(game.c), False)
    after_game.move_to("2027-04-05T19:00:00+03:00")
    matches.resolve(staff_request(manager), match.pk, matches.Resolution.REOPEN, "Scor greșit")
    match.refresh_from_db()
    assert (match.status, match.reopened_until) == (
        MatchStatus.CANCELLED,
        at("2027-04-05 19:30"),
    )
    assert matches.score_window(game.booking) == (at("2027-04-05 19:00"), at("2027-04-05 19:30"))
    again = matches.propose(kiosk_call(), kiosk, game.proposal(by=game.c))
    assert again.window_closes_at == at("2027-04-05 19:30") and again.pk != match.pk


def test_lg161_cancelling_an_applied_match_recomputes_the_league(
    game: Game, kiosk: Device, after_game: Any, manager: User
) -> None:
    game.pay()
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    for player in (game.b, game.c, game.d):
        matches.respond(kiosk_call(), kiosk, match.pk, game.token(player), True)
    request = staff_request(manager)
    for action in (matches.Resolution.APPLY, matches.Resolution.REOPEN):
        with pytest.raises(DomainError) as exc:
            matches.resolve(request, match.pk, action, "nu se poate")
        assert refused(exc) == ("league.match_state_invalid", 409)
    matches.resolve(request, match.pk, matches.Resolution.CANCEL, "Jucător greșit înregistrat")
    match.refresh_from_db()
    assert match.status == MatchStatus.CANCELLED
    assert LeagueEvent.objects.filter(kind=EventKind.CANCEL, ref=match.ref).exists()
    row = Standing.objects.get(season=game.season, ladder="doubles", competitor_id=str(game.a.pk))
    assert row.matches_played == 0
    with pytest.raises(DomainError) as exc:
        matches.resolve(request, match.pk, matches.Resolution.CANCEL, "din nou")
    assert refused(exc) == ("league.match_state_invalid", 409)
    with pytest.raises(DomainError) as exc:
        matches.resolve(request, uuid.uuid4(), matches.Resolution.CANCEL, "x")
    assert refused(exc) == ("league.match_not_found", 404)


def test_lg134_a_closed_season_is_final(
    game: Game, kiosk: Device, after_game: Any, manager: User
) -> None:
    game.pay()
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    for player in (game.b, game.c, game.d):
        matches.respond(kiosk_call(), kiosk, match.pk, game.token(player), True)
    LeagueSeason.objects.filter(pk=game.season.pk).update(status="closed")
    with pytest.raises(DomainError) as exc:
        matches.resolve(staff_request(manager), match.pk, matches.Resolution.CANCEL, "prea târziu")
    assert refused(exc) == ("league.match_state_invalid", 409)


def test_an_unconfirmed_match_can_be_cancelled_without_touching_the_league(
    game: Game, kiosk: Device, after_game: Any, manager: User
) -> None:
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    matches.resolve(staff_request(manager), match.pk, matches.Resolution.CANCEL, "Test greșit")
    assert not LeagueEvent.objects.filter(kind=EventKind.CANCEL).exists()


# ---------------------------------------------------------------- the API (read-only + admin)
def test_players_see_their_matches_and_staff_resolve(
    api: Api,
    client: Client,
    game: Game,
    kiosk: Device,
    after_game: Any,
    staff: Callable[..., User],
    location: Location,
) -> None:
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    matches.respond(kiosk_call(), kiosk, match.pk, game.token(game.b), False)
    login_as(client, game.b, mfa=False)
    mine = api.get("/league/me/matches").json()
    assert [(m["status"], len(m["players"])) for m in mine] == [("disputed", 4)]
    assert {p["response"] for p in mine[0]["players"]} == {"confirmed", "disputed", "pending"}
    assert set(mine[0]["players"][0]) == {"first_name", "last_name", "side", "response"}

    staff(Role.COACH, location)
    url = f"/staff/league/matches?location_id={location.id}"
    assert api.get(url).status_code == 403  # coaches validate levels, not matches
    staff(Role.MANAGER, location)
    listed = api.get(f"{url}&status=disputed").json()
    assert [m["court"] for m in listed] == ["Teren 1"]
    assert [t["status"] for t in listed[0]["transitions"]] == ["proposed", "disputed"]
    assert api.get(f"{url}&status=applied").json() == []
    resolved = api.post(
        f"/staff/league/matches/{match.pk}/resolve", {"action": "cancel", "reason": "Test"}
    )
    assert resolved.status_code == 200 and resolved.json()["status"] == "cancelled"
    bad = api.post(f"/staff/league/matches/{match.pk}/resolve", {"action": "edit", "reason": "x"})
    assert bad.status_code == 422
    assert (
        error_code(
            api.post(
                f"/staff/league/matches/{match.pk}/resolve", {"action": "apply", "reason": "x"}
            )
        )
        == "league.match_state_invalid"
    )


# ---------------------------------------------------------------- concurrency (LG-162)
@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("same_player", [False, True])
def test_lg162_simultaneous_confirmations_apply_the_match_once(
    game: Game, kiosk: Device, after_game: Any, same_player: bool
) -> None:
    game.pay()
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    matches.respond(kiosk_call(), kiosk, match.pk, game.token(game.b), True)
    last = [game.d, game.d] if same_player else [game.c, game.d]
    if same_player:
        matches.respond(kiosk_call(), kiosk, match.pk, game.token(game.c), True)
    results: list[str] = []
    barrier = threading.Barrier(2)

    def confirm(player: User) -> None:
        try:
            barrier.wait()
            matches.respond(kiosk_call(), kiosk, match.pk, game.token(player), True)
            results.append("ok")
        except DomainError as exc:
            results.append(exc.code.value)
        finally:
            connection.close()

    threads = [threading.Thread(target=confirm, args=(p,)) for p in last]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    expected = ["league.match_not_open", "ok"] if same_player else ["ok", "ok"]
    assert sorted(results) == expected
    assert LeagueEvent.objects.filter(kind=EventKind.MATCH).count() == 1
    match.refresh_from_db()
    assert match.status == MatchStatus.APPLIED
    assert MatchTransition.objects.filter(match=match, status="applied").count() == 1


def test_match_models_read_well(game: Game, kiosk: Device, after_game: Any) -> None:
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    texts = [str(match), str(match.players.first()), str(match.transitions.first())]
    assert texts[0].startswith("Scor propus 2027-04-05") and all(texts)
    assert isinstance(match.finished_at, datetime)


def test_a_failure_while_applying_keeps_the_match_waiting(
    game: Game, kiosk: Device, after_game: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    game.pay()
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    for player in (game.b, game.c):
        matches.respond(kiosk_call(), kiosk, match.pk, game.token(player), True)

    def broken(*args: Any, **kwargs: Any) -> None:
        raise DomainError(ErrorCode.LEAGUE_NO_ACTIVE_SEASON, status=409)

    monkeypatch.setattr(store, "record", broken)
    with pytest.raises(DomainError):
        matches.respond(kiosk_call(), kiosk, match.pk, game.token(game.d), True)
    match.refresh_from_db()
    assert match.status == MatchStatus.PROPOSED  # the whole step was rolled back
    assert match.players.get(user=game.d).response == Response.PENDING
    assert statuses(match) == ["proposed"]


def test_the_expiry_command_and_the_admin_views(
    game: Game, kiosk: Device, after_game: Any, api: Api, staff: Callable[..., User]
) -> None:
    from io import StringIO

    from django.core.management import call_command

    from jungle.core.admin_site import emergency_admin_site
    from jungle.league.admin import MatchPlayerInline

    matches.propose(kiosk_call(), kiosk, game.proposal())
    after_game.move_to("2027-04-05T12:05:00+03:00")
    out = StringIO()
    call_command("expire_league_matches", stdout=out)
    assert out.getvalue().strip() == (
        "Meciuri expirate: 1 neconfirmate, 0 neplătite. "
        "Provocări expirate: 0 fără răspuns, 0 nejucate."
    )
    inline = MatchPlayerInline(LeagueMatch, emergency_admin_site)
    assert inline.has_add_permission(RequestFactory().get("/")) is False
    staff(Role.MANAGER)
    everything = api.get(f"/staff/league/matches?location_id={game.booking.location_id}").json()
    assert [m["status"] for m in everything] == ["expired"]


def test_lg099_a_player_who_joined_after_the_match_cannot_make_it_count(
    season: LeagueSeason, court: Resource, join: Join, now: Any
) -> None:
    """A newcomer signs the consent at the kiosk right after playing: the match was played
    before they were in the league, so it is refused at once (not at the last confirmation)."""
    a, b, c = join(), join(), join()
    booking = book(court, a, "2027-04-05 10:00", "2027-04-05 11:30")
    now.move_to("2027-04-05T11:35:00+03:00", tick=False)
    d = join()
    for player in (a, b, c, d):
        scan(booking, player)
    card = cards.issue_card(SYSTEM, a).token
    proposal = matches.Proposal(booking.pk, card, (a.pk, b.pk), (c.pk, d.pk), WIN_A)
    with pytest.raises(DomainError) as exc:
        matches.propose(kiosk_call(), Device.objects.get(), proposal)
    assert refused(exc) == ("league.joined_after_match", 409)
    assert exc.value.params == {"name": f"{d.first_name} {d.last_name}"}
