"""League tournaments (§6.14, LG-141, LG-142, Q28): registration, entry fee, draws, the kiosk
flow for tournament matches, progress through every format and the phase bonuses."""

from __future__ import annotations

import uuid
from collections.abc import Callable
from typing import Any

import pytest
from django.test import Client

from jungle.accounts.models import User
from jungle.audit.services import SYSTEM
from jungle.bookings.models import SessionType
from jungle.cards import services as cards
from jungle.conftest import Api, error_code, grant, login_as
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Role
from jungle.devices.models import Device
from jungle.league import matches, store, tournaments
from jungle.league.models import (
    EntryStatus,
    EventKind,
    Fixture,
    FixtureStatus,
    LeagueEvent,
    LeagueMatch,
    LeagueSeason,
    MatchKind,
    MatchStatus,
    Tournament,
    TournamentEntry,
    TournamentStatus,
)
from jungle.league.tests.conftest import at, placed, staff_request
from jungle.league.tests.test_matches import book, kiosk_call, scan
from jungle.ledger import payments
from jungle.ledger.models import PaymentMethod
from jungle.locations.models import Location, Resource, ResourceKind

pytestmark = pytest.mark.django_db

Join = Callable[..., User]
FEE = 5000
WIN_A = {"sets": [{"a": 6, "b": 3}, {"a": 6, "b": 4}]}


def refused(exc: pytest.ExceptionInfo[DomainError]) -> tuple[str, int]:
    return exc.value.code.value, exc.value.status


def data(location: Location, **changes: Any) -> tournaments.TournamentData:
    values: dict[str, Any] = {
        "location_id": location.id,
        "name": "Cupa Junglei",
        "format": "knockout",
        "team_size": 2,
        "starts_at": at("2027-04-10 10:00"),
        "registration_closes_at": at("2027-04-09 20:00"),
        "entry_fee": FEE,
        "max_entries": 16,
        **changes,
    }
    return tournaments.TournamentData(**values)


def as_player(user: User) -> Any:
    return staff_request(user)  # a logged-in person (the role decides what they may do)


def enter_pairs(tournament: Tournament, people: list[User]) -> list[TournamentEntry]:
    return [
        tournaments.register(as_player(people[i]), tournament.pk, people[i + 1].pk)
        for i in range(0, len(people), 2)
    ]


def enter_alone(tournament: Tournament, people: list[User]) -> list[TournamentEntry]:
    return [tournaments.register(as_player(p), tournament.pk) for p in people]


def pay(entry: TournamentEntry) -> None:
    payments.pay(
        SYSTEM,
        tournaments.due_for_entry(entry),
        payments.PaymentData(
            payer_id=entry.player_a_id,
            amount=FEE,
            method=PaymentMethod.CASH,
            tendered=FEE,
            idempotency_key=f"fee-{entry.pk}",
        ),
    )


def result(fixture: Fixture, winner: str = "a") -> None:
    """A result straight into the draw (the kiosk flow is tested separately)."""
    score = WIN_A if winner == "a" else {"sets": [{"a": 3, "b": 6}, {"a": 4, "b": 6}]}
    tournaments.record_result(fixture, winner, score)


def play_round(tournament: Tournament, **kwargs: Any) -> None:
    for fixture in Fixture.objects.filter(
        tournament=tournament, status=FixtureStatus.READY, **kwargs
    ):
        result(fixture)


@pytest.fixture
def eight(season: LeagueSeason, join: Join, now: Any) -> list[User]:
    """Eight ranked players (two groups after placement), two days before the tournament."""
    players = [*placed(season, join), *placed(season, join)]
    now.move_to("2027-04-08T12:00:00+03:00")
    return players


@pytest.fixture
def cup(
    season: LeagueSeason, manager: User, location: Location, now: Any
) -> Callable[..., Tournament]:
    def factory(**changes: Any) -> Tournament:
        return tournaments.create(staff_request(manager), data(location, **changes))

    return factory


# ---------------------------------------------------------------- creating and registering
def test_lg142_creating_a_tournament(
    cup: Callable[..., Tournament],
    manager: User,
    location: Location,
    make_user: Callable[..., User],
) -> None:
    tournament = cup()
    assert tournament.status == TournamentStatus.REGISTRATION and tournament.fee_provisional
    assert tournament.phase_bonuses == {
        "winner": 30,
        "finalist": 20,
        "semifinal": 10,
        "quarterfinal": 5,
    }
    for changes in (
        {"format": "bingo"},
        {"format": "americano", "team_size": 1},
        {"registration_closes_at": at("2027-04-11 10:00")},
        {"starts_at": at("2027-04-01 10:00"), "registration_closes_at": at("2027-03-31 10:00")},
        {"max_entries": 1},
        {"advance": 4},
    ):
        with pytest.raises(DomainError) as exc:
            tournaments.create(staff_request(manager), data(location, **changes))
        assert refused(exc) == ("league.tournament_invalid", 400)
    coach = make_user()
    grant(coach, Role.COACH, location)
    with pytest.raises(DomainError) as exc:
        tournaments.create(staff_request(coach), data(location))
    assert refused(exc)[1] == 403
    admin = make_user()
    grant(admin, Role.ADMIN)
    with pytest.raises(DomainError) as exc:
        tournaments.create(staff_request(admin), data(location, location_id=uuid.uuid4()))
    assert refused(exc) == ("locations.not_found", 404)
    assert str(tournament) == "Cupa Junglei"


def test_registration_rules(
    cup: Callable[..., Tournament], eight: list[User], make_user: Callable[..., User], now: Any
) -> None:
    a, b, c, d, e, f, g, h = eight
    tournament = cup(max_entries=2)
    entry = tournaments.register(as_player(a), tournament.pk, b.pk)
    assert entry.players == [a.pk, b.pk] and str(entry)
    outsider = make_user(first_name="Ion", last_name="Străin")
    attempts = [
        (c, None, ("league.tournament_partner", 400)),
        (c, c.pk, ("league.unknown_player", 404)),
        (c, uuid.uuid4(), ("league.unknown_player", 404)),
        (c, outsider.pk, ("league.player_not_in_league", 403)),
        (c, a.pk, ("league.tournament_already_entered", 409)),
    ]
    for who, partner, expected in attempts:
        with pytest.raises(DomainError) as exc:
            tournaments.register(as_player(who), tournament.pk, partner)
        assert refused(exc) == expected
    tournaments.register(as_player(c), tournament.pk, d.pk)
    with pytest.raises(DomainError) as exc:
        tournaments.register(as_player(e), tournament.pk, f.pk)
    assert refused(exc) == ("league.tournament_full", 409)
    solo = cup(format="americano")
    with pytest.raises(DomainError) as exc:
        tournaments.register(as_player(g), solo.pk, h.pk)
    assert refused(exc) == ("league.tournament_partner", 400)
    now.move_to("2027-04-09T20:00:00+03:00")
    with pytest.raises(DomainError) as exc:
        tournaments.register(as_player(g), solo.pk)
    assert refused(exc) == ("league.tournament_closed", 409)
    with pytest.raises(DomainError) as exc:
        tournaments.register(as_player(g), uuid.uuid4())
    assert refused(exc) == ("league.tournament_not_found", 404)


def test_q14_withdrawing_and_cancelling_give_the_fee_back_as_credit(
    cup: Callable[..., Tournament], eight: list[User], manager: User
) -> None:
    from jungle.ledger.services import customer_credit

    a, b, c, d, *_ = eight
    tournament = cup()
    first, second = enter_pairs(tournament, [a, b, c, d])
    pay(first)
    with pytest.raises(DomainError) as exc:
        tournaments.withdraw(as_player(c), first.pk)
    assert refused(exc) == ("league.not_a_player", 403)
    tournaments.withdraw(as_player(b), first.pk)
    assert customer_credit(a) == FEE
    with pytest.raises(DomainError) as exc:
        tournaments.withdraw(as_player(a), first.pk)
    assert refused(exc) == ("league.tournament_closed", 409)
    pay(second)
    with pytest.raises(DomainError) as exc:
        tournaments.cancel(staff_request(manager), tournament.pk, "  ")
    assert refused(exc) == ("league.reason_required", 400)
    tournaments.cancel(staff_request(manager), tournament.pk, "Ploaie de înscrieri, nu de jucători")
    assert customer_credit(c) == FEE
    with pytest.raises(DomainError) as exc:
        tournaments.cancel(staff_request(manager), tournament.pk, "din nou")
    assert refused(exc) == ("league.tournament_closed", 409)
    status = payments.money_status(tournaments.due_for_entry(second))
    assert status.to_pay == 0


# ---------------------------------------------------------------- the draw (LG-142)
def test_lg142_draw_by_rank_with_byes(
    cup: Callable[..., Tournament], eight: list[User], manager: User, season: LeagueSeason
) -> None:
    a, b, c, d, e, f, g, h = eight
    tournament = cup()
    enter_pairs(tournament, [c, d, a, b, g, h])  # (a, b) is ranked higher than (c, d)
    drawn = tournaments.draw(staff_request(manager), tournament.pk)
    assert drawn.status == TournamentStatus.IN_PROGRESS and drawn.draw_seed == ""
    seeds = {e.seed: e.players for e in drawn.entries.all()}
    assert set(seeds[1]) in ({a.pk, b.pk}, {e.pk, f.pk}) and len(seeds) == 3
    first = Fixture.objects.filter(tournament=drawn, round=1).order_by("slot")
    assert [f.status for f in first] == [FixtureStatus.BYE, FixtureStatus.READY]
    final = Fixture.objects.get(tournament=drawn, phase="final")
    assert final.team_a == [str(p) for p in seeds[1]] and final.status == FixtureStatus.WAITING
    with pytest.raises(DomainError) as exc:
        tournaments.draw(staff_request(manager), tournament.pk)
    assert refused(exc) == ("league.tournament_closed", 409)


def test_lg142_a_random_draw_keeps_its_seed(
    cup: Callable[..., Tournament], eight: list[User], manager: User
) -> None:
    tournament = cup(seeding="random", format="round_robin")
    enter_pairs(tournament, eight[:6])
    drawn = tournaments.draw(staff_request(manager), tournament.pk)
    assert len(drawn.draw_seed) == 32
    assert Fixture.objects.filter(tournament=drawn).count() == 3  # 3 pairs: 3 matches


def test_lg142_too_few_entries_for_the_format(
    cup: Callable[..., Tournament], eight: list[User], manager: User
) -> None:
    americano = cup(format="americano")
    enter_alone(americano, eight[:6])  # not a multiple of 4
    king = cup(format="king_of_the_court", name="King")
    enter_pairs(king, eight[:6])  # three pairs: one court would be empty
    lonely = cup(name="Singur")
    enter_pairs(lonely, eight[:2])
    for tournament, count in ((americano, 6), (king, 3), (lonely, 1)):
        with pytest.raises(DomainError) as exc:
            tournaments.draw(staff_request(manager), tournament.pk)
        assert refused(exc) == ("league.tournament_too_few", 409)
        assert exc.value.params == {"count": count}


# ---------------------------------------------------------------- every format to the end
def test_lg141_knockout_to_the_end_with_phase_bonuses(
    cup: Callable[..., Tournament], eight: list[User], manager: User, season: LeagueSeason
) -> None:
    tournament = cup()
    entries = enter_pairs(tournament, eight)
    tournaments.draw(staff_request(manager), tournament.pk)
    play_round(tournament, phase="semifinal")
    play_round(tournament, phase="final")
    tournament.refresh_from_db()
    assert tournament.status == TournamentStatus.FINISHED
    places = sorted(
        (e.position, e.bonus_lp)
        for e in TournamentEntry.objects.filter(pk__in=[x.pk for x in entries])
    )
    assert places == [(1, 30), (2, 20), (3, 10), (3, 10)]
    bonuses = LeagueEvent.objects.filter(kind=EventKind.BONUS)
    assert bonuses.count() == 8 and {e.payload["ladder"] for e in bonuses} == {"doubles"}


def test_lg142_groups_then_knockout(
    cup: Callable[..., Tournament], eight: list[User], manager: User, join: Join
) -> None:
    tournament = cup(format="groups_knockout", group_size=2, advance=1)
    extra = [join(), join()]  # still in placement: no bonus for them (LG-141)
    enter_pairs(tournament, [*eight, *extra])
    tournaments.draw(staff_request(manager), tournament.pk)
    groups = sorted({f.phase for f in Fixture.objects.filter(tournament=tournament)})
    assert groups == ["group:A", "group:B"]  # 5 pairs in groups of at least 2
    play_round(tournament, phase__startswith="group:")
    knockout = Fixture.objects.filter(tournament=tournament).exclude(phase__startswith="group:")
    assert knockout.exists()
    while Tournament.objects.get(pk=tournament.pk).status == TournamentStatus.IN_PROGRESS:
        play_round(tournament)
    positions = TournamentEntry.objects.filter(tournament=tournament, position__isnull=False)
    assert sorted(e.position or 0 for e in positions)[:2] == [1, 2]


def test_lg142_round_robin_americano_mexicano_king_of_the_court(
    cup: Callable[..., Tournament], eight: list[User], manager: User
) -> None:
    rr = cup(format="round_robin")
    enter_pairs(rr, eight[:6])
    tournaments.draw(staff_request(manager), rr.pk)
    play_round(rr)
    rr.refresh_from_db()
    assert rr.status == TournamentStatus.FINISHED
    assert sorted(e.position or 0 for e in rr.entries.all()) == [1, 2, 3]

    americano = cup(format="americano", name="Americano")
    enter_alone(americano, eight)
    tournaments.draw(staff_request(manager), americano.pk)
    assert Fixture.objects.filter(tournament=americano).count() == 14  # 7 rounds × 2 courts
    play_round(americano)
    americano.refresh_from_db()
    assert americano.status == TournamentStatus.FINISHED
    assert sorted(e.position or 0 for e in americano.entries.all()) == list(range(1, 9))

    mexicano = cup(format="mexicano", name="Mexicano", rounds=2)
    enter_alone(mexicano, eight)
    tournaments.draw(staff_request(manager), mexicano.pk)
    play_round(mexicano, round=1)
    assert Fixture.objects.filter(tournament=mexicano, round=2).count() == 2
    play_round(mexicano, round=2)
    mexicano.refresh_from_db()
    assert mexicano.status == TournamentStatus.FINISHED

    king = cup(format="king_of_the_court", name="King", rounds=2)
    entries = enter_pairs(king, eight)
    tournaments.draw(staff_request(manager), king.pk)
    play_round(king, round=1)
    second = Fixture.objects.filter(tournament=king, round=2).order_by("slot")
    top = second.first()
    assert top is not None and {top.entry_a_id, top.entry_b_id} <= {e.pk for e in entries}
    play_round(king, round=2)
    king.refresh_from_db()
    assert king.status == TournamentStatus.FINISHED
    assert sorted(e.position or 0 for e in king.entries.all()) == [1, 2, 3, 4]


# ---------------------------------------------------------------- the kiosk flow (Q28)
class Court:
    def __init__(self, location: Location, tournament: Tournament, players: list[User]):
        court = Resource.objects.create(
            location=location,
            slug=f"t-{uuid.uuid4().hex[:6]}",
            name="Teren T",
            kind=ResourceKind.PADEL_COURT,
        )
        self.booking = book(
            court,
            players[0],
            "2027-04-10 10:00",
            "2027-04-10 13:00",  # R-041: at most 3 hours; a longer day is several bookings
            session_type=SessionType.TOURNAMENT,
            price_total=0,
        )
        for player in players:
            scan(self.booking, player)
        self.cards = {p.pk: cards.issue_card(SYSTEM, p).token for p in players}


def test_q28_a_tournament_match_at_the_kiosk(
    cup: Callable[..., Tournament],
    eight: list[User],
    manager: User,
    kiosk: Device,
    location: Location,
    now: Any,
    django_capture_on_commit_callbacks: Any,
) -> None:
    a, b, c, d = eight[:4]
    tournament = cup()
    first, second = enter_pairs(tournament, [a, b, c, d])
    tournaments.draw(staff_request(manager), tournament.pk)
    court = Court(location, tournament, [a, b, c, d])
    final = Fixture.objects.get(tournament=tournament, phase="final")
    now.move_to("2027-04-10T11:00:00+03:00")

    with pytest.raises(DomainError) as exc:  # not on a court yet
        matches.finish_fixture(kiosk_call(), kiosk, final.pk, court.cards[a.pk])
    assert refused(exc) == ("league.fixture_not_scheduled", 409)
    wrong = book(
        Resource.objects.get(pk=court.booking.resource_id),
        a,
        "2027-04-10 19:00",
        "2027-04-10 20:00",
    )
    with pytest.raises(DomainError) as exc:
        tournaments.schedule(staff_request(manager), final.pk, wrong.pk)
    assert refused(exc) == ("league.booking_not_eligible", 400)
    tournaments.schedule(staff_request(manager), final.pk, court.booking.pk)
    with pytest.raises(DomainError) as exc:  # not finished yet: no score
        matches.propose_fixture(
            kiosk_call(), kiosk, matches.FixtureScore(final.pk, court.cards[a.pk], WIN_A)
        )
    assert refused(exc) == ("league.fixture_not_ready", 409)
    matches.finish_fixture(kiosk_call(), kiosk, final.pk, court.cards[a.pk])
    with pytest.raises(DomainError) as exc:
        tournaments.schedule(staff_request(manager), final.pk, court.booking.pk)
    assert refused(exc) == ("league.fixture_not_ready", 409)

    match = matches.propose_fixture(
        kiosk_call(), kiosk, matches.FixtureScore(final.pk, court.cards[a.pk], WIN_A)
    )
    assert match.kind == MatchKind.TOURNAMENT and match.fixture == final and match.booking is None
    with pytest.raises(DomainError) as exc:
        matches.propose_fixture(
            kiosk_call(), kiosk, matches.FixtureScore(final.pk, court.cards[c.pk], WIN_A)
        )
    assert refused(exc) == ("league.score_already_proposed", 409)
    for player in (b, c, d):
        matches.respond(kiosk_call(), kiosk, match.pk, court.cards[player.pk], True)
    match.refresh_from_db()
    assert match.status == MatchStatus.AWAITING_PAYMENT  # entry fees not paid
    assert match.transitions.get(status="awaiting_payment").checks["payment"]["to_pay"] == 2 * FEE
    with django_capture_on_commit_callbacks(execute=True):
        pay(first)
    match.refresh_from_db()
    assert match.status == MatchStatus.AWAITING_PAYMENT
    with django_capture_on_commit_callbacks(execute=True):
        pay(second)
    match.refresh_from_db()
    assert match.status == MatchStatus.APPLIED
    assert match.event is not None and match.event.payload["match_type"] == "tournament"
    final.refresh_from_db()
    assert final.status == FixtureStatus.DONE and final.winner == "a"
    assert (final.games_a, final.games_b) == (12, 7)
    tournament.refresh_from_db()
    assert tournament.status == TournamentStatus.FINISHED
    with pytest.raises(DomainError) as exc:  # the draw used it: final
        matches.resolve(staff_request(manager), match.pk, matches.Resolution.CANCEL, "Greșit")
    assert refused(exc) == ("league.match_state_invalid", 409)


def test_q28_the_director_enters_and_validates(
    cup: Callable[..., Tournament],
    eight: list[User],
    manager: User,
    kiosk: Device,
    location: Location,
    now: Any,
) -> None:
    tournament = cup()
    entries = enter_pairs(tournament, eight)
    for entry in entries:
        pay(entry)
    tournaments.draw(staff_request(manager), tournament.pk)
    court = Court(location, tournament, eight)
    director_card = cards.issue_card(SYSTEM, manager).token
    semis = list(Fixture.objects.filter(tournament=tournament, phase="semifinal").order_by("slot"))
    for fixture in semis:
        tournaments.schedule(staff_request(manager), fixture.pk, court.booking.pk)
    now.move_to("2027-04-10T11:00:00+03:00")
    tournaments.mark_finished_by_staff(staff_request(manager), semis[0].pk)
    by_director = matches.propose_fixture(
        kiosk_call(), kiosk, matches.FixtureScore(semis[0].pk, director_card, WIN_A)
    )
    by_director.refresh_from_db()
    assert by_director.status == MatchStatus.APPLIED
    assert by_director.transitions.first().checks["director"] is True  # type: ignore[union-attr]

    matches.finish_fixture(kiosk_call(), kiosk, semis[1].pk, director_card)
    players = semis[1].team_a
    proposer = next(p for p in eight if str(p.pk) == players[0])
    match = matches.propose_fixture(
        kiosk_call(), kiosk, matches.FixtureScore(semis[1].pk, court.cards[proposer.pk], WIN_A)
    )
    with pytest.raises(DomainError) as exc:
        matches.director_confirm(kiosk_call(), kiosk, match.pk, court.cards[proposer.pk])
    assert refused(exc) == ("auth.forbidden", 403)
    matches.director_confirm(kiosk_call(), kiosk, match.pk, director_card)
    match.refresh_from_db()
    assert match.status == MatchStatus.APPLIED
    with pytest.raises(DomainError) as exc:
        matches.director_confirm(kiosk_call(), kiosk, match.pk, director_card)
    assert refused(exc) == ("league.match_not_open", 409)
    with pytest.raises(DomainError) as exc:
        matches.director_confirm(kiosk_call(), kiosk, uuid.uuid4(), director_card)
    assert refused(exc) == ("league.match_not_found", 404)
    final = Fixture.objects.get(tournament=tournament, phase="final")
    assert final.status == FixtureStatus.READY  # both semi-final winners are in


def test_q28_tournament_errors_expiry_and_reopening(
    cup: Callable[..., Tournament],
    eight: list[User],
    manager: User,
    kiosk: Device,
    location: Location,
    now: Any,
    make_user: Callable[..., User],
) -> None:
    a, b, c, d = eight[:4]
    tournament = cup()
    enter_pairs(tournament, [a, b, c, d])
    tournaments.draw(staff_request(manager), tournament.pk)
    court = Court(location, tournament, [a, b, c, d])
    final = Fixture.objects.get(tournament=tournament, phase="final")
    tournaments.schedule(staff_request(manager), final.pk, court.booking.pk)
    stranger = cards.issue_card(SYSTEM, make_user()).token
    now.move_to("2027-04-10T11:00:00+03:00")
    with pytest.raises(DomainError) as exc:
        matches.finish_fixture(kiosk_call(), kiosk, final.pk, stranger)
    assert refused(exc) == ("league.not_a_player", 403)
    for call in (
        lambda: matches.finish_fixture(kiosk_call(), kiosk, uuid.uuid4(), stranger),
        lambda: matches.propose_fixture(
            kiosk_call(), kiosk, matches.FixtureScore(uuid.uuid4(), stranger, WIN_A)
        ),
        lambda: tournaments.schedule(staff_request(manager), uuid.uuid4(), court.booking.pk),
    ):
        with pytest.raises(DomainError) as exc:
            call()
        assert refused(exc) == ("league.fixture_not_found", 404)
    matches.finish_fixture(kiosk_call(), kiosk, final.pk, court.cards[a.pk])
    with pytest.raises(DomainError) as exc:
        matches.propose_fixture(
            kiosk_call(), kiosk, matches.FixtureScore(final.pk, stranger, WIN_A)
        )
    assert refused(exc) == ("league.not_a_player", 403)
    match = matches.propose_fixture(
        kiosk_call(), kiosk, matches.FixtureScore(final.pk, court.cards[a.pk], WIN_A)
    )
    now.move_to("2027-04-10T11:31:00+03:00")  # nobody confirmed in 30 minutes
    assert matches.expire_matches().unconfirmed == 1
    final.refresh_from_db()
    assert final.status == FixtureStatus.READY  # to be finished and scored again
    with pytest.raises(DomainError) as exc:
        matches.propose_fixture(
            kiosk_call(), kiosk, matches.FixtureScore(final.pk, court.cards[a.pk], WIN_A)
        )
    assert refused(exc) == ("league.fixture_not_ready", 409)
    matches.finish_fixture(kiosk_call(), kiosk, final.pk, court.cards[b.pk])
    now.move_to("2027-04-10T12:05:00+03:00")
    with pytest.raises(DomainError) as exc:
        matches.propose_fixture(
            kiosk_call(), kiosk, matches.FixtureScore(final.pk, court.cards[a.pk], WIN_A)
        )
    assert refused(exc) == ("league.window_closed", 409)
    matches.resolve(staff_request(manager), match.pk, matches.Resolution.REOPEN, "Scor greșit")
    final.refresh_from_db()
    assert final.status == FixtureStatus.READY
    matches.finish_fixture(kiosk_call(), kiosk, final.pk, court.cards[c.pk])
    again = matches.propose_fixture(
        kiosk_call(), kiosk, matches.FixtureScore(final.pk, court.cards[c.pk], WIN_A)
    )
    matches.respond(kiosk_call(), kiosk, again.pk, court.cards[d.pk], False)  # disputed
    matches.resolve(staff_request(manager), again.pk, matches.Resolution.CANCEL, "Anulat")
    final.refresh_from_db()
    assert final.status == FixtureStatus.READY
    assert LeagueMatch.objects.filter(fixture=final).count() == 2


def test_lg103_tournament_matches_are_not_counted_in_the_daily_limit(
    eight: list[User], season: LeagueSeason, location: Location
) -> None:
    player = eight[0]
    when = at("2027-04-10 12:00")

    def played(kind: str) -> None:
        match = LeagueMatch.objects.create(
            season=season,
            location=location,
            kind=kind,
            status=MatchStatus.APPLIED,
            score={},
            finished_at=when,
            window_closes_at=when,
            proposed_by=player,
            proposed_at=when,
        )
        match.players.create(user=player, side="a")

    played(MatchKind.TOURNAMENT)
    matches.check_daily_limit([player], when, 1)  # a tournament match does not count
    played(MatchKind.OFFICIAL)
    with pytest.raises(DomainError) as exc:
        matches.check_daily_limit([player], when, 1)
    assert refused(exc) == ("league.daily_limit", 409)


# ---------------------------------------------------------------- money and the API
def test_entry_fees_through_the_payments_api(
    api: Api,
    staff: Callable[..., User],
    cup: Callable[..., Tournament],
    eight: list[User],
    client: Client,
    location: Location,
) -> None:
    a, b, *_ = eight
    tournament = cup()
    (entry,) = enter_pairs(tournament, [a, b])
    login_as(client, a, mfa=False)
    status = api.get(f"/account/payment-status?tournament_entry_id={entry.pk}").json()
    assert status["to_pay"] == FEE
    staff(Role.MANAGER, location)  # an exception recorded by staff (Q10), with a reason
    paid = api.post(
        "/staff/payments",
        {
            "tournament_entry_id": str(entry.pk),
            "payer_id": str(b.pk),
            "amount": FEE,
            "method": "cash",
            "tendered": FEE,
            "reason": "Taxă plătită la recepție",
        },
        HTTP_IDEMPOTENCY_KEY="fee-1",
    )
    assert paid.status_code == 201
    assert payments.money_status(tournaments.due_for_entry(entry)).to_pay == 0
    missing = api.post(
        "/staff/payments",
        {
            "tournament_entry_id": str(uuid.uuid4()),
            "payer_id": str(b.pk),
            "amount": FEE,
            "method": "cash",
            "tendered": FEE,
            "reason": "x",
        },
        HTTP_IDEMPOTENCY_KEY="fee-2",
    )
    assert error_code(missing) == "league.tournament_not_found"


def test_tournaments_on_the_website(
    api: Api,
    client: Client,
    staff: Callable[..., User],
    eight: list[User],
    location: Location,
    now: Any,
) -> None:
    a, b, c, d, *_ = eight
    staff(Role.MANAGER, location)
    body = {
        "location_id": str(location.id),
        "name": "Cupa de primăvară",
        "format": "knockout",
        "team_size": 2,
        "starts_at": at("2027-04-10 10:00").isoformat(),
        "registration_closes_at": at("2027-04-09 20:00").isoformat(),
        "entry_fee": FEE,
        "max_entries": 8,
    }
    created = api.post("/staff/league/tournaments", body)
    assert created.status_code == 201
    tournament_id = created.json()["id"]
    login_as(client, a, mfa=False)
    entered = api.post(f"/league/tournaments/{tournament_id}/entries", {"partner_id": str(b.pk)})
    assert entered.status_code == 201
    login_as(client, c, mfa=False)
    other = api.post(
        f"/league/tournaments/{tournament_id}/entries", {"partner_id": str(d.pk)}
    ).json()
    withdrawn = api.post(f"/league/tournament-entries/{other['id']}/withdraw")
    assert withdrawn.status_code == 200
    api.post(f"/league/tournaments/{tournament_id}/entries", {"partner_id": str(d.pk)})

    listed = api.get(f"/league/tournaments?location={location.slug}").json()
    assert [(t["name"], t["entries"]) for t in listed] == [("Cupa de primăvară", 2)]
    staff(Role.MANAGER, location)
    drawn = api.post(f"/staff/league/tournaments/{tournament_id}/draw").json()
    fixture = drawn["fixtures"][0]
    assert set(fixture) == {
        "id",
        "phase",
        "round",
        "slot",
        "team_a",
        "team_b",
        "status",
        "winner",
        "score",
    }
    assert set(fixture["team_a"][0]) == {"first_name", "last_name"}  # R-012: no court, no time
    detail = api.get(f"/league/tournaments/{tournament_id}").json()
    assert len(detail["entries_list"]) == 2 and detail["status"] == "in_progress"
    finished = api.post(f"/staff/league/fixtures/{fixture['id']}/finished")
    assert error_code(finished) == "league.fixture_not_scheduled"
    court = Resource.objects.create(
        location=location, slug="t-9", name="T9", kind=ResourceKind.PADEL_COURT
    )
    booking = book(
        court, a, "2027-04-10 10:00", "2027-04-10 12:00", session_type=SessionType.TOURNAMENT
    )
    scheduled = api.post(
        f"/staff/league/fixtures/{fixture['id']}/schedule", {"booking_id": str(booking.pk)}
    )
    assert scheduled.status_code == 200
    cancelled = api.post(f"/staff/league/tournaments/{tournament_id}/cancel", {"reason": "Test"})
    assert cancelled.json()["status"] == "cancelled"
    assert api.get(f"/league/tournaments/{tournament_id}").status_code == 404
    assert api.get(f"/league/tournaments?location={location.slug}").json() == []
    assert TournamentEntry.objects.filter(status=EntryStatus.WITHDRAWN).count() == 1


def test_lg141_bonus_rules_and_failures(
    cup: Callable[..., Tournament],
    eight: list[User],
    manager: User,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    rr = cup(format="round_robin")
    Tournament.objects.filter(pk=rr.pk).update(phase_bonuses={"winner": 30})
    enter_pairs(rr, eight[:6])
    tournaments.draw(staff_request(manager), rr.pk)
    fixture = Fixture.objects.filter(tournament=rr).first()
    assert fixture is not None and str(fixture).startswith("round 1.")
    with pytest.raises(DomainError) as exc:  # not on a court: cannot be marked finished
        tournaments.mark_finished_by_staff(staff_request(manager), fixture.pk)
    assert refused(exc) == ("league.fixture_not_scheduled", 409)
    result(fixture)
    with pytest.raises(DomainError) as exc:  # already played
        tournaments.mark_finished_by_staff(staff_request(manager), fixture.pk)
    assert refused(exc) == ("league.fixture_not_ready", 409)
    play_round(rr)
    bonuses = sorted(e.bonus_lp for e in TournamentEntry.objects.filter(tournament=rr))
    assert bonuses == [0, 0, 30]  # only the winner has a bonus in this tournament

    def refusing(code: ErrorCode) -> Callable[..., None]:
        def record(*args: Any, **kwargs: Any) -> None:
            raise DomainError(code, status=409)

        return record

    placement = cup(name="Plasare")  # a player still in placement gets no bonus (LG-141)
    enter_pairs(placement, eight[:4])
    tournaments.draw(staff_request(manager), placement.pk)
    monkeypatch.setattr(store, "record", refusing(ErrorCode.LEAGUE_BONUS_NOT_APPLICABLE))
    play_round(placement, phase="semifinal")
    play_round(placement, phase="final")
    assert {e.bonus_lp for e in TournamentEntry.objects.filter(tournament=placement)} == {0}

    broken = cup(name="Eroare")
    enter_pairs(broken, eight[4:])
    tournaments.draw(staff_request(manager), broken.pk)
    monkeypatch.setattr(store, "record", refusing(ErrorCode.LEAGUE_NO_ACTIVE_SEASON))
    play_round(broken, phase="semifinal")
    with pytest.raises(DomainError):  # any other refusal is not swallowed
        play_round(broken, phase="final")
