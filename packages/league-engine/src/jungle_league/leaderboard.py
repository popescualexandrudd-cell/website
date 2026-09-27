"""Standings, tie-breaks (§6.5) and eligibility (§6.10)."""

from __future__ import annotations

from dataclasses import dataclass

from .antiabuse import final_eligible, live_eligible
from .config import MASTER_INDEX, LeagueConfig
from .engine import Competitor, Ladder, LeagueState
from .levels import level_from_mu
from .ranks import RankState

_FAR_FUTURE = "9999"  # sorts after any ISO timestamp: never reached comes last


@dataclass(frozen=True, slots=True)
class Standing:
    position: int
    competitor_id: str
    rank: RankState
    total_lp: int
    level: float
    matches_played: int
    eligible: (
        bool  # False: shown as "below the minimum of matches", excluded from the final ranking
    )


def standings(
    state: LeagueState,
    ladder: Ladder,
    config: LeagueConfig,
    full_weeks_elapsed: int | None = None,
) -> tuple[Standing, ...]:
    """LG-057: order by total LP, then μ, then official matches this season, then who reached
    that LP first, then the id (fully deterministic). Competitors still in placement are not ranked.

    `full_weeks_elapsed=None` gives the final ranking (LG-100); a number gives the live one
    (LG-101).
    """
    minimum = (
        config.min_matches_per_season_pairs
        if ladder is Ladder.PAIRS
        else config.min_matches_per_season
    )
    ranked = [
        (cid, c, c.rank) for cid, c in state.competitors[ladder].items() if c.rank is not None
    ]

    def key(item: tuple[str, Competitor, RankState]) -> tuple[int, float, int, str, str]:
        cid, c, rank = item
        reached = c.reached_at.isoformat() if c.reached_at else _FAR_FUTURE
        return (-rank.total_lp(config), -c.rating.mu, -c.matches_played, reached, cid)

    result = []
    for position, (cid, c, rank) in enumerate(sorted(ranked, key=key), start=1):
        eligible = (
            final_eligible(c.matches_played, minimum)
            if full_weeks_elapsed is None
            else live_eligible(c.matches_played, full_weeks_elapsed, minimum)
        )
        result.append(
            Standing(
                position,
                cid,
                rank,
                rank.total_lp(config),
                level_from_mu(c.rating.mu, config),
                c.matches_played,
                eligible,
            )
        )
    return tuple(result)


def kings_of_the_jungle(table: tuple[Standing, ...], count: int = 10) -> tuple[Standing, ...]:
    """LG-051: the title is computed, never stored: the top 10 eligible Masters by LP."""
    return tuple(s for s in table if s.eligible and s.rank.index == MASTER_INDEX)[:count]
