"""League tournaments (§6.14, LG-141, LG-142, Q28).

- The manager creates the tournament (format, players per team, entry fee DE_STABILIT, phase
  bonuses fixed at creation). Players register from their account or at the reception: as a
  pair, or alone for Americano and Mexicano; everyone must be in the league.
- The draw is made by the system: seeded by rank (LP) or drawn at random with a stored seed
  (the same seed gives the same draw). Formats: knockout, groups + knockout, round robin,
  Americano, Mexicano, King of the Court.
- The admin puts each match on a court (a "tournament" booking). When it ends, a player or
  the director marks it finished at the League Kiosk (or the director from the admin), the
  score is entered and confirmed at the kiosk (§6.9) and it counts only when every player's
  entry fee is paid. LP × 1.5 in the engine (tournament matches are not limited per day and
  have no diminishing returns, DE_CONFIRMAT).
- At the end, the phase bonuses (winner, finalist, semi-finalists, quarter-finalists; for the
  formats with a points table, places 1, 2, 3–4 and 5–8) are added to each ranked player's
  LP as bonus events (a player still in placement gets none, LG-141).
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from django.db import transaction
from django.db.models import Q, QuerySet
from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.accounts.services.authz import authorize, current_user
from jungle.audit import services as audit
from jungle.bookings.models import Booking, BookingStatus, SessionType
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.league import draws, services, store
from jungle.league.models import (
    INDIVIDUAL_FORMATS,
    EntryStatus,
    EventKind,
    Fixture,
    FixtureStatus,
    Ladder,
    Seeding,
    Standing,
    Tournament,
    TournamentEntry,
    TournamentFormat,
    TournamentStatus,
)
from jungle.ledger import payments
from jungle.ledger.models import RevenueCategory
from jungle.locations.models import Location

PHASE_OF_POSITION = ((1, "winner"), (2, "finalist"), (4, "semifinal"), (8, "quarterfinal"))


# ---------------------------------------------------------------- money: the entry fee
def get_entry(entry_id: uuid.UUID) -> TournamentEntry:
    entry = (
        TournamentEntry.objects.select_related("tournament__location", "player_a")
        .filter(pk=entry_id)
        .first()
    )
    if entry is None:
        raise DomainError(ErrorCode.LEAGUE_TOURNAMENT_NOT_FOUND, status=404)
    return entry


def due_for_entry(entry: TournamentEntry) -> payments.Due:
    tournament = entry.tournament
    return payments.Due(
        key=f"tournament_entry:{entry.pk}",
        customer=entry.player_a,
        location=tournament.location,
        amount=tournament.entry_fee,
        category=RevenueCategory.TOURNAMENTS,
        description=f"Taxă de participare: {tournament.name}",
        active=entry.status == EntryStatus.REGISTERED
        and tournament.status != TournamentStatus.CANCELLED,
        lock_on=(TournamentEntry, entry.pk),
    )


def entry_of(tournament: Tournament, player_id: str) -> TournamentEntry | None:
    return (
        tournament.entries.filter(status=EntryStatus.REGISTERED)
        .filter(Q(player_a_id=player_id) | Q(player_b_id=player_id))
        .first()
    )


def fixture_payment(fixture: Fixture) -> dict[str, int]:
    """LG-096 for tournaments: every player's entry fee is paid."""
    tournament = fixture.tournament
    entries = {
        e.pk: e for p in [*fixture.team_a, *fixture.team_b] if (e := entry_of(tournament, p))
    }
    statuses = [payments.money_status(due_for_entry(e)) for e in entries.values()]
    return {
        "price": sum(s.price for s in statuses),
        "paid": sum(s.paid for s in statuses),
        "to_pay": sum(s.to_pay for s in statuses),
    }


# ---------------------------------------------------------------- creating and registering
@dataclass(frozen=True)
class TournamentData:
    location_id: uuid.UUID
    name: str
    format: str
    team_size: int
    starts_at: datetime
    registration_closes_at: datetime
    entry_fee: int
    max_entries: int
    seeding: str = Seeding.RANK
    group_size: int = 4
    advance: int = 2
    rounds: int = 5


def create(request: HttpRequest, data: TournamentData) -> Tournament:
    authorize(request, Action.LEAGUE_MANAGE, data.location_id)
    location = Location.objects.filter(pk=data.location_id).first()
    if location is None:
        raise DomainError(ErrorCode.LOCATIONS_NOT_FOUND, status=404)
    season = services.active_season(location)
    if (
        data.format not in TournamentFormat.values
        or data.team_size not in (1, 2)
        or (data.format in INDIVIDUAL_FORMATS and data.team_size != 2)
        or data.registration_closes_at > data.starts_at
        or data.starts_at <= clock.now()
        or data.entry_fee < 0
        or not 2 <= data.max_entries <= 128
        or not 1 <= data.advance < data.group_size
    ):
        raise DomainError(ErrorCode.LEAGUE_TOURNAMENT_INVALID)
    tournament = Tournament.objects.create(
        season=season,
        location=location,
        name=data.name,
        format=data.format,
        team_size=data.team_size,
        starts_at=data.starts_at,
        registration_closes_at=data.registration_closes_at,
        entry_fee=data.entry_fee,
        max_entries=data.max_entries,
        seeding=data.seeding,
        group_size=data.group_size,
        advance=data.advance,
        rounds=data.rounds,
        phase_bonuses=dict(get_config("league.tournament_bonuses")),
        created_at=clock.now(),
    )
    audit.record(audit.actor_from_request(request), "league.tournament_created", target=tournament)
    return tournament


def _tournament(tournament_id: uuid.UUID, lock: bool = False) -> Tournament:
    rows = Tournament.objects.select_for_update() if lock else Tournament.objects
    tournament = rows.filter(pk=tournament_id).first()
    if tournament is None:
        raise DomainError(ErrorCode.LEAGUE_TOURNAMENT_NOT_FOUND, status=404)
    return tournament


def register(
    request: HttpRequest, tournament_id: uuid.UUID, partner_id: uuid.UUID | None = None
) -> TournamentEntry:
    """From the player's account (a tournament entry is like a booking: it does not change
    the league) or at the reception."""
    user = current_user(request)
    with transaction.atomic():
        tournament = _tournament(tournament_id, lock=True)
        if (
            tournament.status != TournamentStatus.REGISTRATION
            or clock.now() >= tournament.registration_closes_at
        ):
            raise DomainError(ErrorCode.LEAGUE_TOURNAMENT_CLOSED, status=409)
        if (partner_id is None) != (tournament.individual or tournament.team_size == 1):
            raise DomainError(ErrorCode.LEAGUE_TOURNAMENT_PARTNER)
        people = [user]
        if partner_id is not None:
            partner = User.objects.filter(pk=partner_id, is_active=True).first()
            if partner is None or partner == user:
                raise DomainError(ErrorCode.LEAGUE_UNKNOWN_PLAYER, status=404)
            people.append(partner)
        for person in people:
            name = f"{person.first_name} {person.last_name}"
            if not services.is_playing(person):
                raise DomainError(
                    ErrorCode.LEAGUE_PLAYER_NOT_IN_LEAGUE, status=403, params={"name": name}
                )
            if entry_of(tournament, str(person.pk)) is not None:
                raise DomainError(
                    ErrorCode.LEAGUE_TOURNAMENT_ALREADY_ENTERED, status=409, params={"name": name}
                )
        if (
            tournament.entries.filter(status=EntryStatus.REGISTERED).count()
            >= tournament.max_entries
        ):
            raise DomainError(ErrorCode.LEAGUE_TOURNAMENT_FULL, status=409)
        entry = TournamentEntry.objects.create(
            tournament=tournament,
            player_a=people[0],
            player_b=people[1] if len(people) == 2 else None,
            registered_at=clock.now(),
        )
        audit.record(audit.actor_from_request(request), "league.tournament_entered", target=entry)
    return entry


def withdraw(request: HttpRequest, entry_id: uuid.UUID) -> TournamentEntry:
    """Before the draw; a paid fee comes back as credit in the account (Q14 default)."""
    user = current_user(request)
    entry = get_entry(entry_id)
    if user.pk not in entry.players:
        raise DomainError(ErrorCode.LEAGUE_NOT_A_PLAYER, status=403)
    with transaction.atomic():
        tournament = _tournament(entry.tournament_id, lock=True)
        if (
            tournament.status != TournamentStatus.REGISTRATION
            or entry.status != EntryStatus.REGISTERED
        ):
            raise DomainError(ErrorCode.LEAGUE_TOURNAMENT_CLOSED, status=409)
        entry.status = EntryStatus.WITHDRAWN
        entry.save(update_fields=["status"])
        payments.refund_as_credit(due_for_entry(entry))
        audit.record(audit.actor_from_request(request), "league.tournament_withdrawn", target=entry)
    return entry


def cancel(request: HttpRequest, tournament_id: uuid.UUID, reason: str) -> Tournament:
    tournament = _tournament(tournament_id)
    authorize(request, Action.LEAGUE_MANAGE, tournament.location_id)
    if not reason.strip():
        raise DomainError(ErrorCode.LEAGUE_REASON_REQUIRED)
    with transaction.atomic():
        tournament = _tournament(tournament_id, lock=True)
        if tournament.status in (TournamentStatus.FINISHED, TournamentStatus.CANCELLED):
            raise DomainError(ErrorCode.LEAGUE_TOURNAMENT_CLOSED, status=409)
        tournament.status = TournamentStatus.CANCELLED
        tournament.save(update_fields=["status"])
        for entry in tournament.entries.filter(status=EntryStatus.REGISTERED):
            payments.refund_as_credit(due_for_entry(entry))
        audit.record(
            audit.actor_from_request(request),
            "league.tournament_cancelled",
            target=tournament,
            reason=reason,
        )
    return tournament


# ---------------------------------------------------------------- the draw (LG-142)
def _strength(entry: TournamentEntry, ladder: str, tournament: Tournament) -> float:
    rows = Standing.objects.filter(
        season=tournament.season, ladder=ladder, competitor_id__in=[str(p) for p in entry.players]
    )
    values = [r.total_lp + r.mu / 1000 for r in rows]
    return sum(values) / len(values) if values else 0.0


def _seeded(tournament: Tournament) -> list[TournamentEntry]:
    entries = list(
        tournament.entries.filter(status=EntryStatus.REGISTERED).order_by("registered_at")
    )
    if tournament.seeding == Seeding.RANDOM:
        tournament.draw_seed = uuid.uuid4().hex
        return draws.shuffled(entries, tournament.draw_seed)
    ladder = Ladder.DOUBLES if tournament.team_size == 2 else Ladder.SINGLES
    return sorted(entries, key=lambda e: -_strength(e, ladder, tournament))


def _team(entry: TournamentEntry | None) -> list[str]:
    return [str(p) for p in entry.players] if entry is not None else []


Side = TournamentEntry | list[str] | None  # an entry, the players of a rotating team, or unknown


def _side(side: Side) -> tuple[TournamentEntry | None, list[str]]:
    if isinstance(side, TournamentEntry):
        return side, _team(side)
    return None, list(side or [])


def _fixture(
    tournament: Tournament, phase: str, round_: int, slot: int, a: Side, b: Side
) -> Fixture:
    entry_a, team_a = _side(a)
    entry_b, team_b = _side(b)
    return Fixture.objects.create(
        tournament=tournament,
        phase=phase,
        round=round_,
        slot=slot,
        entry_a=entry_a,
        entry_b=entry_b,
        team_a=team_a,
        team_b=team_b,
        status=FixtureStatus.READY if team_a and team_b else FixtureStatus.WAITING,
    )


def _knockout(tournament: Tournament, seeded: list[TournamentEntry], first_round: int) -> None:
    """The whole bracket, linked; byes go through at once."""
    pairs = draws.knockout(seeded)
    size = len(pairs) * 2
    current = [
        _fixture(tournament, draws.phase_name(size), first_round, slot, a, b)
        for slot, (a, b) in enumerate(pairs)
    ]
    round_ = first_round
    while len(current) > 1:
        round_ += 1
        size //= 2
        following = [
            _fixture(tournament, draws.phase_name(size), round_, slot, None, None)
            for slot in range(len(current) // 2)
        ]
        for index, fixture in enumerate(current):
            fixture.next_fixture = following[index // 2]
            fixture.next_side = "a" if index % 2 == 0 else "b"
            fixture.save(update_fields=["next_fixture", "next_side"])
        current = following
    for fixture in Fixture.objects.filter(tournament=tournament, round=first_round):
        if fixture.status == FixtureStatus.WAITING and (fixture.entry_a or fixture.entry_b):
            _bye(fixture)


def _bye(fixture: Fixture) -> None:
    fixture.status = FixtureStatus.BYE
    fixture.winner = "a" if fixture.team_a else "b"
    fixture.save(update_fields=["status", "winner"])
    _advance_winner(fixture)


def _round_robin(tournament: Tournament, entries: list[TournamentEntry], phase: str) -> None:
    for round_, games in enumerate(draws.round_robin(entries), start=1):
        for slot, (a, b) in enumerate(games):
            _fixture(tournament, phase, round_, slot, a, b)


def _doubles_round(
    tournament: Tournament, round_: int, games: list[tuple[tuple[str, str], tuple[str, str]]]
) -> None:
    for slot, (a, b) in enumerate(games):
        _fixture(tournament, "round", round_, slot, list(a), list(b))


def draw(request: HttpRequest, tournament_id: uuid.UUID) -> Tournament:
    tournament = _tournament(tournament_id)
    authorize(request, Action.LEAGUE_MANAGE, tournament.location_id)
    with transaction.atomic():
        tournament = _tournament(tournament_id, lock=True)
        if tournament.status != TournamentStatus.REGISTRATION:
            raise DomainError(ErrorCode.LEAGUE_TOURNAMENT_CLOSED, status=409)
        seeded = _seeded(tournament)
        count = len(seeded)
        if (
            count < 2
            or (tournament.individual and count % 4)
            or (tournament.format == TournamentFormat.KING_OF_THE_COURT and count % 2)
        ):
            raise DomainError(
                ErrorCode.LEAGUE_TOURNAMENT_TOO_FEW, status=409, params={"count": count}
            )
        for seed, entry in enumerate(seeded, start=1):
            entry.seed = seed
            entry.save(update_fields=["seed"])
        players = [str(e.player_a_id) for e in seeded]
        match tournament.format:
            case TournamentFormat.KNOCKOUT:
                _knockout(tournament, seeded, 1)
            case TournamentFormat.ROUND_ROBIN:
                _round_robin(tournament, seeded, "round")
            case TournamentFormat.GROUPS_KNOCKOUT:
                for letter, group in zip(
                    "ABCDEFGHIJKLMNOP",
                    draws.snake_groups(seeded, tournament.group_size),
                    strict=False,
                ):
                    _round_robin(tournament, group, f"group:{letter}")
            case TournamentFormat.AMERICANO:
                for round_, games in enumerate(draws.americano(players), start=1):
                    _doubles_round(tournament, round_, games)
            case TournamentFormat.MEXICANO:
                _doubles_round(tournament, 1, draws.mexicano_round(players))
            case _:  # King of the Court: pairs by seed, the best on the top court
                for slot in range(count // 2):
                    _fixture(tournament, "round", 1, slot, seeded[2 * slot], seeded[2 * slot + 1])
        tournament.status = TournamentStatus.IN_PROGRESS
        tournament.drawn_at = clock.now()
        tournament.save(update_fields=["status", "drawn_at", "draw_seed"])
        audit.record(
            audit.actor_from_request(request),
            "league.tournament_drawn",
            target=tournament,
            after={"entries": count, "seed": tournament.draw_seed},
        )
    return tournament


# ---------------------------------------------------------------- on court
def _get_fixture(fixture_id: uuid.UUID) -> Fixture:
    fixture = Fixture.objects.select_related("tournament").filter(pk=fixture_id).first()
    if fixture is None:
        raise DomainError(ErrorCode.LEAGUE_FIXTURE_NOT_FOUND, status=404)
    return fixture


def schedule(request: HttpRequest, fixture_id: uuid.UUID, booking_id: uuid.UUID) -> Fixture:
    """The admin puts the match on a court: a "tournament" booking of the club."""
    fixture = _get_fixture(fixture_id)
    authorize(request, Action.LEAGUE_MANAGE, fixture.tournament.location_id)
    booking = Booking.objects.filter(
        pk=booking_id,
        location_id=fixture.tournament.location_id,
        session_type=SessionType.TOURNAMENT,
        status__in=(BookingStatus.CONFIRMED, BookingStatus.COMPLETED),
    ).first()
    if booking is None:
        raise DomainError(ErrorCode.LEAGUE_BOOKING_NOT_ELIGIBLE)
    if fixture.status not in (FixtureStatus.WAITING, FixtureStatus.READY):
        raise DomainError(ErrorCode.LEAGUE_FIXTURE_NOT_READY, status=409)
    fixture.booking = booking
    fixture.save(update_fields=["booking"])
    audit.record(audit.actor_from_request(request), "league.fixture_scheduled", target=fixture)
    return fixture


def is_director(user: User, location_id: uuid.UUID) -> bool:
    """Q28: the tournament director is staff allowed to manage the league at the club."""
    from jungle.accounts.models import UserRole
    from jungle.core.permissions import ROLE_ACTIONS, Role

    return any(
        Action.LEAGUE_MANAGE in ROLE_ACTIONS[Role(r.role)]
        and (r.location_id is None or r.location_id == location_id)
        for r in UserRole.objects.filter(user=user)
    )


def mark_finished(fixture_id: uuid.UUID, person: User, actor: audit.Actor) -> Fixture:
    """Q28: a player of the match or the director marks it finished; the score window opens
    for 30 minutes (a tournament match is not limited by the booking's end, §6.8)."""
    with transaction.atomic():
        fixture = (
            Fixture.objects.select_for_update()
            .select_related("tournament")
            .get(pk=_get_fixture(fixture_id).pk)
        )
        if str(person.pk) not in fixture.team_a + fixture.team_b and not is_director(
            person, fixture.tournament.location_id
        ):
            raise DomainError(ErrorCode.LEAGUE_NOT_A_PLAYER, status=403)
        if (
            fixture.status != FixtureStatus.READY
            or fixture.tournament.status != TournamentStatus.IN_PROGRESS
        ):
            raise DomainError(ErrorCode.LEAGUE_FIXTURE_NOT_READY, status=409)
        if fixture.booking_id is None:
            raise DomainError(ErrorCode.LEAGUE_FIXTURE_NOT_SCHEDULED, status=409)
        fixture.status = FixtureStatus.FINISHED
        fixture.finished_at = clock.now()
        fixture.save(update_fields=["status", "finished_at"])
        audit.record(actor, "league.fixture_finished", target=fixture)
    return fixture


def mark_finished_by_staff(request: HttpRequest, fixture_id: uuid.UUID) -> Fixture:
    fixture = _get_fixture(fixture_id)
    user = authorize(request, Action.LEAGUE_MANAGE, fixture.tournament.location_id)
    return mark_finished(fixture_id, user, audit.actor_from_request(request))


def reopen(fixture: Fixture) -> None:
    """A score that expired or was cancelled: the match can be marked finished again."""
    Fixture.objects.filter(pk=fixture.pk, status=FixtureStatus.FINISHED).update(
        status=FixtureStatus.READY, finished_at=None
    )


# ---------------------------------------------------------------- results and progress
def _games(score: dict[str, Any]) -> tuple[int, int]:
    return (sum(int(s["a"]) for s in score["sets"]), sum(int(s["b"]) for s in score["sets"]))


def record_result(fixture: Fixture, winner: str, score: dict[str, Any]) -> None:
    """Called when the match is applied (§6.9 step 7); moves the tournament on."""
    with transaction.atomic():
        fixture = (
            Fixture.objects.select_for_update().select_related("tournament").get(pk=fixture.pk)
        )
        fixture.status = FixtureStatus.DONE
        fixture.winner = winner
        fixture.score = score
        fixture.games_a, fixture.games_b = _games(score)
        fixture.save(update_fields=["status", "winner", "score", "games_a", "games_b"])
        _advance_winner(fixture)
        _progress(Tournament.objects.select_for_update().get(pk=fixture.tournament_id))


def _advance_winner(fixture: Fixture) -> None:
    if fixture.next_fixture_id is None:
        return
    following = Fixture.objects.select_for_update().get(pk=fixture.next_fixture_id)
    entry = fixture.entry_a if fixture.winner == "a" else fixture.entry_b
    if fixture.next_side == "a":
        following.entry_a, following.team_a = entry, _team(entry)
    else:
        following.entry_b, following.team_b = entry, _team(entry)
    if following.team_a and following.team_b:
        following.status = FixtureStatus.READY
    following.save(update_fields=["entry_a", "team_a", "entry_b", "team_b", "status"])


def _round_done(tournament: Tournament, phase_prefix: str, round_: int | None = None) -> bool:
    rows = tournament.fixtures.filter(phase__startswith=phase_prefix)
    if round_ is not None:
        rows = rows.filter(round=round_)
    return (
        rows.exists()
        and not rows.exclude(status__in=(FixtureStatus.DONE, FixtureStatus.BYE)).exists()
    )


def _progress(tournament: Tournament) -> None:
    fixtures = tournament.fixtures
    last_round = max(f.round for f in fixtures.all())
    match tournament.format:
        case TournamentFormat.GROUPS_KNOCKOUT:
            knockout = fixtures.exclude(phase__startswith="group:")
            if not knockout.exists() and _round_done(tournament, "group:"):
                tables = [
                    [entry for entry, _ in _table(tournament, f"group:{letter}")]
                    for letter in sorted(
                        {f.phase[6:] for f in fixtures.filter(phase__startswith="group:")}
                    )
                ]
                _knockout(
                    tournament, draws.group_qualifiers(tables, tournament.advance), last_round + 1
                )
                return
            if knockout.exists() and _final_done(tournament):
                finish(tournament)
        case TournamentFormat.KNOCKOUT:
            if _final_done(tournament):
                finish(tournament)
        case TournamentFormat.MEXICANO | TournamentFormat.KING_OF_THE_COURT:
            if not _round_done(tournament, "round", last_round):
                return
            if last_round >= tournament.rounds:
                finish(tournament)
                return
            if tournament.format == TournamentFormat.MEXICANO:
                ranked = [player for player, _ in _player_table(tournament)]
                _doubles_round(tournament, last_round + 1, draws.mexicano_round(ranked))
            else:
                courts = list(fixtures.filter(round=last_round).order_by("slot"))
                results = [
                    (f.entry_a, f.entry_b) if f.winner == "a" else (f.entry_b, f.entry_a)
                    for f in courts
                ]
                for slot, (a, b) in enumerate(draws.king_of_the_court_next(results)):
                    _fixture(tournament, "round", last_round + 1, slot, a, b)
        case _:  # round robin and Americano: everything was drawn at the start
            if _round_done(tournament, "round"):
                finish(tournament)


def _final_done(tournament: Tournament) -> bool:
    final = tournament.fixtures.filter(phase="final").first()
    return final is not None and final.status == FixtureStatus.DONE


def _table(tournament: Tournament, phase: str) -> list[tuple[TournamentEntry, tuple[int, ...]]]:
    """Entries by wins, then game difference, then games won, then seed."""
    stats: dict[uuid.UUID, list[int]] = defaultdict(lambda: [0, 0, 0])
    entries: dict[uuid.UUID, TournamentEntry] = {}
    for f in tournament.fixtures.filter(phase=phase, status=FixtureStatus.DONE).select_related(
        "entry_a", "entry_b"
    ):
        for entry, won, mine, theirs in (
            (f.entry_a, f.winner == "a", f.games_a, f.games_b),
            (f.entry_b, f.winner == "b", f.games_b, f.games_a),
        ):
            if entry is None:  # pragma: no cover - group and round-robin matches have entries
                continue
            entries[entry.pk] = entry
            stats[entry.pk][0] += int(won)
            stats[entry.pk][1] += mine - theirs
            stats[entry.pk][2] += mine
    rows = [(entries[pk], (s[0], s[1], s[2], -(entries[pk].seed or 0))) for pk, s in stats.items()]
    return sorted(rows, key=lambda row: row[1], reverse=True)


def _player_table(tournament: Tournament) -> list[tuple[str, tuple[int, ...]]]:
    """Americano and Mexicano: players by games won, then wins, then seed."""
    seeds = {str(e.player_a_id): e.seed or 0 for e in tournament.entries.all()}
    stats: dict[str, list[int]] = {p: [0, 0] for p in seeds}
    for f in tournament.fixtures.filter(status=FixtureStatus.DONE):
        for team, won, games in (
            (f.team_a, f.winner == "a", f.games_a),
            (f.team_b, f.winner == "b", f.games_b),
        ):
            for player in team:
                stats[player][0] += games
                stats[player][1] += int(won)
    rows = [(p, (s[0], s[1], -seeds[p])) for p, s in stats.items() if seeds[p]]
    return sorted(rows, key=lambda row: row[1], reverse=True)


def _king_table(tournament: Tournament) -> list[tuple[TournamentEntry, tuple[int, ...]]]:
    """King of the Court: a win on court k (the top is 0) is worth (courts − k) points."""
    courts = tournament.fixtures.filter(round=1).count()
    points: dict[uuid.UUID | None, int] = defaultdict(int)
    entries = {e.pk: e for e in tournament.entries.filter(status=EntryStatus.REGISTERED)}
    for f in tournament.fixtures.filter(status=FixtureStatus.DONE):
        points[f.entry_a_id if f.winner == "a" else f.entry_b_id] += courts - f.slot
    rows = [(e, (points[pk], -(e.seed or 0))) for pk, e in entries.items()]
    return sorted(rows, key=lambda row: row[1], reverse=True)


def ranking(tournament: Tournament) -> list[tuple[int, list[str]]]:
    """(place, players): knockout places by the round lost (3–4, 5–8 shared); tables for the
    other formats."""
    if tournament.format in (TournamentFormat.KNOCKOUT, TournamentFormat.GROUPS_KNOCKOUT):
        final = tournament.fixtures.get(phase="final")
        places = [
            (1, final.team_a if final.winner == "a" else final.team_b),
            (2, final.team_b if final.winner == "a" else final.team_a),
        ]
        for phase, place in (("semifinal", 3), ("quarterfinal", 5)):
            for f in tournament.fixtures.filter(phase=phase, status=FixtureStatus.DONE):
                places.append((place, f.team_b if f.winner == "a" else f.team_a))
        return places
    if tournament.individual:
        return [(n, [player]) for n, (player, _) in enumerate(_player_table(tournament), start=1)]
    table = (
        _king_table(tournament)
        if tournament.format == TournamentFormat.KING_OF_THE_COURT
        else _table(tournament, "round")
    )
    return [(n, _team(entry)) for n, (entry, _) in enumerate(table, start=1)]


def phase_for(place: int) -> str | None:
    return next((phase for limit, phase in PHASE_OF_POSITION if place <= limit), None)


def finish(tournament: Tournament) -> None:
    """LG-141: phase bonuses as bonus events, on each player's individual ladder."""
    ladder = Ladder.DOUBLES if tournament.team_size == 2 else Ladder.SINGLES
    for place, players in ranking(tournament):
        phase = phase_for(place)
        for player in players:
            entry = entry_of(tournament, player)
            lp = int(tournament.phase_bonuses.get(phase, 0)) if phase else 0
            given = 0
            if lp > 0:
                try:
                    store.record(
                        tournament.season,
                        EventKind.BONUS,
                        clock.now(),
                        f"t:{tournament.pk.hex}:{uuid.UUID(player).hex}",  # fits ref (80)
                        {"ladder": ladder, "competitor": player, "lp": lp},
                        audit.SYSTEM,
                        f"{tournament.name}: {phase}",
                    )
                    given = lp
                except DomainError as exc:
                    if exc.code is not ErrorCode.LEAGUE_BONUS_NOT_APPLICABLE:
                        raise
            if entry is not None:  # pragma: no branch - every ranked player has an entry
                TournamentEntry.objects.filter(pk=entry.pk).update(
                    position=place,
                    bonus_lp=max(entry.bonus_lp, given),  # per player
                )
    tournament.status = TournamentStatus.FINISHED
    tournament.finished_at = clock.now()
    tournament.save(update_fields=["status", "finished_at"])
    audit.record(audit.SYSTEM, "league.tournament_finished", target=tournament)


def list_for(location: Location) -> QuerySet[Tournament]:
    return Tournament.objects.filter(location=location).exclude(status=TournamentStatus.CANCELLED)
