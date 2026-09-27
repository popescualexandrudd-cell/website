"""The league as a pure function: (state, match, configuration) → (new state, rating event).

§6.16: every applied match produces an immutable event with the values before and after for
each player and pair. Matches are applied in chronological order of their end; re-applying the
last match is a no-op (idempotent) and an older match needs a replay (`replay`), whose result
is identical to a computation from zero. No database, no clock, no network (ADR-0008).
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field, replace
from datetime import date, datetime, timedelta
from enum import StrEnum
from zoneinfo import ZoneInfo

from .antiabuse import counts_despite_level_gap, repetition_multiplier, within_daily_limit
from .config import LeagueConfig
from .levels import level_from_mu, mu_from_level
from .lp import LpInput, MatchType, lp_delta
from .ranks import (
    RankChange,
    RankState,
    apply_decay,
    apply_lp,
    decay_due,
    decay_warning_due,
    placement_rank,
)
from .rating import Rating, rate, win_probability
from .score import MatchScore, Side, validate_score

CLUB_TZ = ZoneInfo("Europe/Bucharest")  # invariant 6: one time zone for every "day" rule


class Ladder(StrEnum):
    """LG-001: three separate ladders, each with its own MMR, LP and rank."""

    DOUBLES = "doubles"  # individual rating from doubles matches (main ladder)
    SINGLES = "singles"
    PAIRS = "pairs"  # an unordered pair of players, updated only when they play together


class LeagueError(ValueError):
    """Stable error codes, translated in packages/i18n (`errors.league.*`)."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


@dataclass(frozen=True, slots=True)
class Competitor:
    rating: Rating
    rank: RankState | None  # None while in (re-)placement: the rank is hidden
    placement_left: int
    placement_cap: int
    matches_played: int = 0  # official matches this season (placement included)
    reached_at: datetime | None = None  # when the current total LP was reached (tie-break)
    last_match_at: datetime | None = None
    decayed_through: date | None = None


@dataclass(frozen=True, slots=True)
class LeagueState:
    competitors: Mapping[Ladder, Mapping[str, Competitor]] = field(
        default_factory=lambda: {ladder: {} for ladder in Ladder}
    )
    # Per player: recent official matches (end time, the exact group of players), for §6.10.
    recent: Mapping[str, tuple[tuple[datetime, frozenset[str]], ...]] = field(default_factory=dict)
    last_key: tuple[datetime, str] | None = None  # (end time, match id) of the last applied match
    season: int = 1

    def competitor(self, ladder: Ladder, competitor_id: str) -> Competitor:
        try:
            return self.competitors[ladder][competitor_id]
        except KeyError:
            raise LeagueError("league.unknown_player") from None


@dataclass(frozen=True, slots=True)
class MatchInput:
    match_id: str
    team_a: tuple[str, ...]
    team_b: tuple[str, ...]
    score: MatchScore
    finished_at: datetime  # timezone-aware
    match_type: MatchType = MatchType.OFFICIAL
    challenger: Side | None = None  # for challenges: the side that issued it (LG-113)


@dataclass(frozen=True, slots=True)
class CompetitorUpdate:
    ladder: Ladder
    competitor_id: str
    before: Competitor
    after: Competitor
    lp_delta: int  # 0 during placement
    change: RankChange


@dataclass(frozen=True, slots=True)
class RatingEvent:
    match_id: str
    finished_at: datetime
    config_version: int
    counted: bool  # False: no complete set or excluded by the level-gap rule (becomes training)
    winner: Side | None
    completion_weight: float
    repetition_multiplier: float
    updates: tuple[CompetitorUpdate, ...]


def pair_id(first: str, second: str) -> str:
    """LG-003: an unordered pair has one identity whatever the order of its players."""
    low, high = sorted((first, second))
    return f"{low}+{high}"


def register_player(
    state: LeagueState,
    player_id: str,
    questionnaire_level: float,
    config: LeagueConfig,
    sigma: float | None = None,
) -> LeagueState:
    """LG-040 … LG-042: a new player from the (coach-validated) questionnaire level, with a high σ.

    Registering again before any match replaces the entry (the coach adjusted L0 or σ).
    """
    if "+" in player_id or not player_id:
        raise LeagueError("league.invalid_player_id")
    for ladder in (Ladder.DOUBLES, Ladder.SINGLES):
        existing = state.competitors[ladder].get(player_id)
        if existing is not None and existing.matches_played > 0:
            raise LeagueError("league.already_playing")
    rating = Rating(
        mu_from_level(questionnaire_level, config), sigma if sigma is not None else config.sigma0
    )
    entry = Competitor(rating, None, config.placement_matches, config.placement_cap_index)
    competitors = dict(state.competitors)
    for ladder in (Ladder.DOUBLES, Ladder.SINGLES):
        competitors[ladder] = {**state.competitors[ladder], player_id: entry}
    return replace(state, competitors=competitors)


def _local_day(moment: datetime) -> date:
    return moment.astimezone(CLUB_TZ).date()


def _check_teams(match: MatchInput, state: LeagueState) -> Ladder:
    size = len(match.team_a)
    if size not in (1, 2) or len(match.team_b) != size:
        raise LeagueError("league.team_size")
    players = match.team_a + match.team_b
    if len(set(players)) != len(players):
        raise LeagueError("league.duplicate_player")
    ladder = Ladder.SINGLES if size == 1 else Ladder.DOUBLES
    for player in players:
        state.competitor(ladder, player)
    return ladder


def _pair(
    state: LeagueState, team: tuple[str, ...], config: LeagueConfig
) -> tuple[str, Competitor]:
    """LG-004: a new pair starts at the mean doubles μ of its players, with σ0 and placement."""
    key = pair_id(team[0], team[1])
    existing = state.competitors[Ladder.PAIRS].get(key)
    if existing is not None:
        return key, existing
    mu = sum(state.competitors[Ladder.DOUBLES][p].rating.mu for p in team) / 2
    return key, Competitor(
        Rating(mu, config.sigma0), None, config.placement_matches, config.placement_cap_index
    )


def _settle(
    ladder: Ladder,
    competitor_id: str,
    before: Competitor,
    new_rating: Rating,
    lp_data: LpInput | None,
    bonus: int,
    finished_at: datetime,
    config: LeagueConfig,
) -> CompetitorUpdate:
    """Applies the new rating and, outside placement, the LP of one competitor."""
    base = replace(
        before,
        rating=new_rating,
        matches_played=before.matches_played + 1,
        last_match_at=finished_at,
    )
    if before.rank is None:
        left = before.placement_left - 1
        if left > 0:
            return CompetitorUpdate(
                ladder,
                competitor_id,
                before,
                replace(base, placement_left=left),
                0,
                RankChange.NONE,
            )
        rank = placement_rank(new_rating.mu, before.placement_cap, config)
        after = replace(base, placement_left=0, rank=rank, reached_at=finished_at)
        return CompetitorUpdate(ladder, competitor_id, before, after, 0, RankChange.NONE)
    if lp_data is None:
        raise AssertionError("unreachable")  # ranked competitors always receive LP data
    delta = lp_delta(lp_data, config) + bonus
    rank, change = apply_lp(before.rank, delta, config)
    moved = rank.total_lp(config) != before.rank.total_lp(config)
    after = replace(base, rank=rank, reached_at=finished_at if moved else before.reached_at)
    return CompetitorUpdate(ladder, competitor_id, before, after, delta, change)


def apply_match(
    state: LeagueState, match: MatchInput, config: LeagueConfig
) -> tuple[LeagueState, RatingEvent | None]:
    """LG-160: applies one validated official match.

    Returns (state, None) when the match was already applied (idempotent).
    """
    if match.finished_at.tzinfo is None:
        raise LeagueError("league.naive_datetime")
    key = (match.finished_at, match.match_id)
    if state.last_key is not None:
        if key == state.last_key:
            return state, None
        if key < state.last_key:
            raise LeagueError("league.out_of_order")  # an older match: recompute with replay()
    ladder = _check_teams(match, state)
    players = match.team_a + match.team_b
    group = frozenset(players)
    day = _local_day(match.finished_at)
    window_start = match.finished_at - timedelta(days=config.repetition_window_days)
    for player in players:
        today = sum(1 for moment, _ in state.recent.get(player, ()) if _local_day(moment) == day)
        if not within_daily_limit(today, config):
            raise LeagueError("league.daily_limit")

    result = validate_score(
        match.score, config, tournament=match.match_type is MatchType.TOURNAMENT
    )
    individuals = state.competitors[ladder]
    team_a = tuple(individuals[p].rating for p in match.team_a)
    team_b = tuple(individuals[p].rating for p in match.team_b)
    level_a = sum(level_from_mu(r.mu, config) for r in team_a) / len(team_a)
    level_b = sum(level_from_mu(r.mu, config) for r in team_b) / len(team_b)
    previous = sum(
        1 for moment, g in state.recent.get(players[0], ()) if g == group and moment > window_start
    )
    m_rep = repetition_multiplier(previous, config)
    counted = result.counts and counts_despite_level_gap(level_a, level_b, config)
    new_key_state = replace(state, last_key=key)
    if not counted:
        event = RatingEvent(
            match.match_id,
            match.finished_at,
            config.version,
            False,
            result.winner,
            result.completion_weight,
            m_rep,
            (),
        )
        return new_key_state, event

    score_a = 1.0 if result.winner is Side.A else 0.0 if result.winner is Side.B else 0.5
    bonus_a = bonus_b = 0
    if (
        match.match_type is MatchType.CHALLENGE
        and match.challenger is not None
        and result.winner is match.challenger
    ):
        bonus_a, bonus_b = (
            (config.challenge_bonus, 0)
            if match.challenger is Side.A
            else (0, config.challenge_bonus)
        )

    sides: list[
        tuple[Ladder, tuple[tuple[str, Competitor], ...], tuple[tuple[str, Competitor], ...]]
    ] = [
        (
            ladder,
            tuple((p, individuals[p]) for p in match.team_a),
            tuple((p, individuals[p]) for p in match.team_b),
        )
    ]
    if ladder is Ladder.DOUBLES:
        sides.append(
            (
                Ladder.PAIRS,
                (_pair(state, match.team_a, config),),
                (_pair(state, match.team_b, config),),
            )
        )

    updates: list[CompetitorUpdate] = []
    competitors = dict(state.competitors)
    for this_ladder, side_a, side_b in sides:
        ratings_a = tuple(c.rating for _, c in side_a)
        ratings_b = tuple(c.rating for _, c in side_b)
        p_a = win_probability(ratings_a, ratings_b, config)
        new_a, new_b = rate(ratings_a, ratings_b, score_a, config, result.completion_weight)
        table = dict(competitors[this_ladder])
        for members, new_ratings, outcome, p, bonus in (
            (side_a, new_a, score_a, p_a, bonus_a),
            (side_b, new_b, 1.0 - score_a, 1.0 - p_a, bonus_b),
        ):
            for (competitor_id, before), new_rating in zip(members, new_ratings, strict=True):
                lp_data = None
                if before.rank is not None:
                    lp_data = LpInput(
                        outcome,
                        p,
                        level_from_mu(before.rating.mu, config),
                        before.rank.total_lp(config),
                        match.match_type,
                        result.completion_weight,
                        m_rep,
                    )
                update = _settle(
                    this_ladder,
                    competitor_id,
                    before,
                    new_rating,
                    lp_data,
                    bonus,
                    match.finished_at,
                    config,
                )
                table[competitor_id] = update.after
                updates.append(update)
        competitors[this_ladder] = table

    recent = dict(state.recent)
    for player in players:
        kept = tuple(item for item in recent.get(player, ()) if item[0] > window_start)
        recent[player] = (*kept, (match.finished_at, group))
    new_state = replace(new_key_state, competitors=competitors, recent=recent)
    event = RatingEvent(
        match.match_id,
        match.finished_at,
        config.version,
        True,
        result.winner,
        result.completion_weight,
        m_rep,
        tuple(updates),
    )
    return new_state, event


def replay(
    base: LeagueState, matches: Iterable[MatchInput], config: LeagueConfig
) -> tuple[LeagueState, tuple[RatingEvent, ...]]:
    """LG-161: applies matches in chronological order of their end (ties: match id).

    Cancelling a validated match = replaying the season without it; the result is identical
    to applying the remaining matches one by one from the start (tested).
    """
    state = base
    events: list[RatingEvent] = []
    for match in sorted(matches, key=lambda m: (m.finished_at, m.match_id)):
        state, event = apply_match(state, match, config)
        if event is not None:
            events.append(event)
    return state, tuple(events)


def award_bonus(
    state: LeagueState,
    ladder: Ladder,
    competitor_id: str,
    lp: int,
    at: datetime,
    config: LeagueConfig,
) -> tuple[LeagueState, CompetitorUpdate]:
    """LG-141: tournament phase bonus (winner, finalist …), added to a ranked competitor's LP."""
    before = state.competitor(ladder, competitor_id)
    if before.rank is None or lp <= 0:
        raise LeagueError("league.bonus_not_applicable")
    # A bonus is not a match: it must not use up a protected match (apply_lp counts one).
    rank, change = apply_lp(replace(before.rank, protection=before.rank.protection + 1), lp, config)
    after = replace(before, rank=rank, reached_at=at)
    competitors = dict(state.competitors)
    competitors[ladder] = {**state.competitors[ladder], competitor_id: after}
    return replace(state, competitors=competitors), CompetitorUpdate(
        ladder, competitor_id, before, after, lp, change
    )


def apply_daily_decay(
    state: LeagueState, day: date, config: LeagueConfig
) -> tuple[LeagueState, tuple[CompetitorUpdate, ...]]:
    """LG-106: the daily inactivity decay for Diamond and Master (idempotent per day)."""
    competitors = dict(state.competitors)
    updates: list[CompetitorUpdate] = []
    for ladder, table in state.competitors.items():
        changed = dict(table)
        for competitor_id, before in table.items():
            if before.rank is None or before.last_match_at is None:
                continue
            if before.decayed_through is not None and before.decayed_through >= day:
                continue
            amount = decay_due(before.rank, (day - _local_day(before.last_match_at)).days, config)
            if amount == 0:
                continue
            rank, change = apply_decay(before.rank, amount, config)
            after = replace(before, rank=rank, decayed_through=day)
            changed[competitor_id] = after
            updates.append(CompetitorUpdate(ladder, competitor_id, before, after, -amount, change))
        competitors[ladder] = changed
    return replace(state, competitors=competitors), tuple(updates)


def decay_warnings(
    state: LeagueState, day: date, config: LeagueConfig
) -> tuple[tuple[Ladder, str], ...]:
    """LG-107: who must be told today that decay starts in 3 days."""
    due = []
    for ladder, table in state.competitors.items():
        for competitor_id, c in table.items():
            if c.rank is not None and c.last_match_at is not None:
                days = (day - _local_day(c.last_match_at)).days
                if decay_warning_due(c.rank, days, config):
                    due.append((ladder, competitor_id))
    return tuple(sorted(due))


def start_new_season(state: LeagueState, config: LeagueConfig) -> LeagueState:
    """LG-130 … LG-133: LP to 0, MMR pulled towards the ladder mean, σ raised, 3 re-placement
    matches whose resulting rank is capped at the rank reached in the previous season."""
    competitors: dict[Ladder, Mapping[str, Competitor]] = {}
    for ladder, table in state.competitors.items():
        if not table:
            competitors[ladder] = {}
            continue
        mean = sum(c.rating.mu for c in table.values()) / len(table)
        reset: dict[str, Competitor] = {}
        for competitor_id, c in table.items():
            mu = mean + config.season_compression * (c.rating.mu - mean)
            sigma = min(config.sigma0, c.rating.sigma + config.season_sigma_increase)
            if c.rank is None:
                placement_left, cap = (
                    max(c.placement_left, config.replacement_matches),
                    c.placement_cap,
                )
            else:
                placement_left, cap = config.replacement_matches, c.rank.index
            reset[competitor_id] = Competitor(
                Rating(mu, sigma), None, placement_left, cap, last_match_at=c.last_match_at
            )
        competitors[ladder] = reset
    return replace(state, competitors=competitors, season=state.season + 1)
