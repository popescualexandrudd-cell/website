"""Ranks, divisions and LP movement (§6.5), placement rank (§6.4) and inactivity decay (§6.10)."""

from __future__ import annotations

import math
from dataclasses import dataclass, replace
from enum import StrEnum

from .config import MASTER_INDEX, LeagueConfig
from .levels import expected_total_lp, level_from_mu

TIERS = ("bronze", "silver", "gold", "platinum", "diamond")
DIVISIONS = ("IV", "III", "II", "I")
DIAMOND_IV_INDEX = 16


class RankChange(StrEnum):
    NONE = "none"
    PROMOTED = "promoted"
    DEMOTED = "demoted"


@dataclass(frozen=True, slots=True)
class RankState:
    """`index`: Bronze IV = 0 … Diamond I = 19, Master = 20.

    `protection`: matches left without demotion.
    """

    index: int
    lp: int
    protection: int = 0

    def __post_init__(self) -> None:
        if not 0 <= self.index <= MASTER_INDEX:
            raise ValueError("rank index out of range")
        if self.lp < 0:
            raise ValueError("LP cannot be negative")

    @property
    def tier(self) -> str:
        return "master" if self.index == MASTER_INDEX else TIERS[self.index // 4]

    @property
    def division(self) -> str | None:
        return None if self.index == MASTER_INDEX else DIVISIONS[self.index % 4]

    def total_lp(self, config: LeagueConfig) -> int:
        """LG-052: division index × 100 + LP.

        Bronze IV = 0 … Diamond I = 1900; Master = 2000 + LP.
        """
        return self.index * config.lp_per_division + self.lp


def apply_lp(state: RankState, delta: int, config: LeagueConfig) -> tuple[RankState, RankChange]:
    """LG-053 … LG-056: promotion with surplus, protection, demotion to 75 LP, Bronze IV floor.

    At most one promotion per match (LG-058): below Master the surplus is capped at 99 LP.
    Every match uses up one protected match, including the one that triggers a promotion's reset.
    """
    per = config.lp_per_division
    protection = max(0, state.protection - 1)
    lp = state.lp + delta
    if lp >= per and state.index < MASTER_INDEX:
        index = state.index + 1
        rest = lp - per
        rest = rest if index == MASTER_INDEX else min(rest, per - 1)
        return RankState(index, rest, config.promotion_protection_matches), RankChange.PROMOTED
    if lp >= 0:
        return RankState(state.index, lp, protection), RankChange.NONE
    if state.protection > 0 or state.index == 0:
        return RankState(state.index, 0, protection), RankChange.NONE
    return RankState(state.index - 1, config.demotion_lp, protection), RankChange.DEMOTED


def placement_rank(mu: float, cap_index: int, config: LeagueConfig) -> RankState:
    """LG-043 / LG-133: after placement, the rank matching the MMR, capped; LP starts at 0."""
    expected = expected_total_lp(level_from_mu(mu, config), config)
    index = min(math.floor(expected / config.lp_per_division), cap_index, MASTER_INDEX)
    return RankState(max(0, index), 0)


def decay_due(state: RankState, days_inactive: int, config: LeagueConfig) -> int:
    """LG-106: LP lost today after `days_inactive` days without an official match (0 if none)."""
    if state.index < DIAMOND_IV_INDEX or days_inactive <= config.decay_grace_days:
        return 0
    if state.index == MASTER_INDEX:
        return config.decay_master_lp_per_day
    return config.decay_diamond_lp_per_day


def decay_warning_due(state: RankState, days_inactive: int, config: LeagueConfig) -> bool:
    """LG-107: notify `decay_warning_days` days before the first decay day."""
    first_decay_day = config.decay_grace_days + 1
    return (
        state.index >= DIAMOND_IV_INDEX
        and days_inactive == first_decay_day - config.decay_warning_days
    )


def apply_decay(
    state: RankState, amount: int, config: LeagueConfig
) -> tuple[RankState, RankChange]:
    """LG-106: decay may demote (to 75 LP) but never below Diamond IV; protection does not apply."""
    lp = state.lp - amount
    if lp >= 0:
        return replace(state, lp=lp), RankChange.NONE
    if state.index == DIAMOND_IV_INDEX:
        return replace(state, lp=0), RankChange.NONE
    return replace(state, index=state.index - 1, lp=config.demotion_lp), RankChange.DEMOTED
