"""The website's points simulator (§9.2.7): the LP one match would bring, computed by the league
engine itself (never a copy of the formula) with the values of the running season.

The visitor chooses the four levels, their own rank, the result and the kind of match. The engine
also needs each player's uncertainty σ: the simulator takes σ = 5 for all four, about what a player
has after a season's minimum of matches (docs/03-liga/simulari/CALIBRARE.md). A plain match: no
promotion protection, finished, not repeated. Nothing is read about any player and nothing is
stored.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from jungle_league.config import MASTER_INDEX, LeagueConfig
from jungle_league.levels import mu_from_level
from jungle_league.lp import LpInput, MatchType, lp_delta
from jungle_league.ranks import DIVISIONS, TIERS, RankChange, RankState, apply_lp, placement_rank
from jungle_league.rating import Rating, win_probability

from jungle.core.errors import DomainError, ErrorCode
from jungle.league import services, store
from jungle.league.models import LeagueSeason, SeasonStatus
from jungle.locations.models import Location

SIGMA = 5.0
MASTER_LP_MAX = 5000  # far above any real Master's LP; keeps the input bounded

Tier = Literal["bronze", "silver", "gold", "platinum", "diamond", "master"]
Division = Literal["IV", "III", "II", "I"]
Result = Literal["win", "loss"]
Kind = Literal["official", "tournament"]


@dataclass(frozen=True)
class Rank:
    tier: str
    division: str | None
    lp: int


@dataclass(frozen=True)
class Preview:
    win_probability: float
    lp: int
    before: Rank
    after: Rank
    change: RankChange
    towards: Rank


def config_now(location: Location) -> LeagueConfig:
    """The running season's values, fixed when it started; before the first season, the setting
    the next season will start with (``league.config``)."""
    season = LeagueSeason.objects.filter(location=location, status=SeasonStatus.ACTIVE).first()
    return store.config_for(season) if season else store.make_config(services.current_config())


def rank_state(tier: Tier, division: Division | None, lp: int) -> RankState:
    """A rank as the visitor chose it: a division below Master, LP 0–99 (100 is a promotion)."""
    if tier == "master":
        if division is not None or not 0 <= lp <= MASTER_LP_MAX:
            raise DomainError(ErrorCode.VALIDATION_INVALID, status=422)
        return RankState(MASTER_INDEX, lp)
    if division is None or not 0 <= lp < 100:
        raise DomainError(ErrorCode.VALIDATION_INVALID, status=422)
    return RankState(TIERS.index(tier) * len(DIVISIONS) + DIVISIONS.index(division), lp)


def rank_of(state: RankState) -> Rank:
    return Rank(state.tier, state.division, state.lp)


def preview(
    config: LeagueConfig,
    levels: tuple[float, float, float, float],
    state: RankState,
    result: Result,
    kind: Kind,
) -> Preview:
    """``levels``: you, your partner, then the two opponents (doubles, §6.2). ``towards`` is the
    rank the league pushes a player of your level to over time (LG-061, the placement rank)."""
    you, partner, rival_a, rival_b = (
        Rating(mu_from_level(level, config), SIGMA) for level in levels
    )
    chance = win_probability((you, partner), (rival_a, rival_b), config)
    delta = lp_delta(
        LpInput(
            outcome=1.0 if result == "win" else 0.0,
            win_probability=chance,
            level=levels[0],
            total_lp=state.total_lp(config),
            match_type=MatchType(kind),
            completion_weight=1.0,
            repetition_multiplier=1.0,
        ),
        config,
    )
    after, change = apply_lp(state, delta, config)
    towards = placement_rank(you.mu, MASTER_INDEX, config)
    return Preview(chance, delta, rank_of(state), rank_of(after), change, rank_of(towards))
