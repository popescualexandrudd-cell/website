"""LP for one official match (§6.6)."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from .config import LeagueConfig
from .levels import expected_total_lp
from .rounding import round_half_away


class MatchType(StrEnum):
    """LG-140: the only types that reach the engine.

    Training and lessons change neither MMR nor LP.
    """

    OFFICIAL = "official"
    TOURNAMENT = "tournament"
    CHALLENGE = "challenge"


@dataclass(frozen=True, slots=True)
class LpInput:
    outcome: float  # S: 1 win, 0 loss, 0.5 draw
    win_probability: float  # p of the player's team, before the update
    level: float  # the player's displayed level, before the update
    total_lp: int  # the player's total LP, before the update
    match_type: MatchType
    completion_weight: float  # w (§6.8)
    repetition_multiplier: float  # m_rep (§6.10)


def momentum_factor(outcome: float, level: float, total_lp: int, config: LeagueConfig) -> float:
    """LG-062: g. An MMR above the rank climbs faster and loses less; below, the reverse."""
    if outcome == 0.5:
        return 1.0
    gap = expected_total_lp(level, config) - total_lp
    raw = 1 + gap / config.g_divisor if outcome == 1.0 else 1 - gap / config.g_divisor
    return min(config.g_max, max(config.g_min, raw))


def type_multiplier(match_type: MatchType, config: LeagueConfig) -> float:
    """LG-063: m_type — official 1.0, tournament 1.5, challenge 1.0 (its bonus is separate)."""
    if match_type is MatchType.TOURNAMENT:
        return config.tournament_multiplier
    if match_type is MatchType.CHALLENGE:
        return config.challenge_multiplier
    return 1.0


def lp_delta(data: LpInput, config: LeagueConfig) -> int:
    """LG-060 … LG-066: ΔLP = round(K(S − p) × g × m_type × w × m_rep), then clamped.

    A win is always in [+3, +60], a loss in [−60, −3], a draw in [−20, +20]. Bonuses
    (challenge, tournament phase) are added by the caller after the clamp, so they are never lost.
    """
    if data.outcome not in (0.0, 0.5, 1.0):
        raise ValueError("outcome must be 0, 0.5 or 1")
    raw = (
        config.k_factor
        * (data.outcome - data.win_probability)
        * momentum_factor(data.outcome, data.level, data.total_lp, config)
        * type_multiplier(data.match_type, config)
        * data.completion_weight
        * data.repetition_multiplier
    )
    value = round_half_away(raw)
    if data.outcome == 1.0:
        return min(config.win_lp_max, max(config.win_lp_min, value))
    if data.outcome == 0.0:
        return min(-config.win_lp_min, max(-config.win_lp_max, value))
    return min(config.draw_lp_limit, max(-config.draw_lp_limit, value))
