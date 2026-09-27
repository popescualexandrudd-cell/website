"""Jungle Padel league engine (§6, ADR-0008): pure Python, deterministic, fully tested."""

from .config import DEFAULT_CONFIG, MASTER_INDEX, DeuceRule, FinalSet, LeagueConfig, ThirdRefusal
from .engine import (
    CompetitorUpdate,
    Ladder,
    LeagueError,
    LeagueState,
    MatchInput,
    RatingEvent,
    apply_daily_decay,
    apply_match,
    award_bonus,
    decay_warnings,
    pair_id,
    register_player,
    replay,
    start_new_season,
)
from .leaderboard import Standing, kings_of_the_jungle, standings
from .levels import level_from_mu, mu_from_level
from .lp import MatchType, lp_delta
from .ranks import RankChange, RankState
from .rating import Rating, rate, win_probability
from .rounding import round_half_away
from .score import MatchScore, ScoreError, SetScore, Side, validate_score

__all__ = [
    "DEFAULT_CONFIG",
    "MASTER_INDEX",
    "CompetitorUpdate",
    "DeuceRule",
    "FinalSet",
    "Ladder",
    "LeagueConfig",
    "LeagueError",
    "LeagueState",
    "MatchInput",
    "MatchScore",
    "MatchType",
    "RankChange",
    "RankState",
    "Rating",
    "RatingEvent",
    "ScoreError",
    "SetScore",
    "Side",
    "Standing",
    "ThirdRefusal",
    "apply_daily_decay",
    "apply_match",
    "award_bonus",
    "decay_warnings",
    "kings_of_the_jungle",
    "level_from_mu",
    "lp_delta",
    "mu_from_level",
    "pair_id",
    "rate",
    "register_player",
    "replay",
    "round_half_away",
    "standings",
    "start_new_season",
    "validate_score",
    "win_probability",
]
