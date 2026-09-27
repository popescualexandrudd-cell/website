"""Standings for reading, rewritten from the engine state after every change.

Positions are computed by the engine (LG-057: LP, then μ, then matches, then who got there
first) and then renumbered without the players who left the league or deleted their
account: they are not shown (R-012, §12.2), and nobody keeps a gap in their place.
"""

from __future__ import annotations

import math
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Q
from jungle_league.config import LeagueConfig
from jungle_league.engine import Ladder, LeagueState
from jungle_league.leaderboard import standings
from jungle_league.levels import level_from_mu

from jungle.core import clock
from jungle.league.models import LeaguePlayer, LeagueSeason, PlayerStatus, SeasonStatus, Standing


def round_level(level: float) -> float:
    """The level is shown with one decimal (§6.3), .05 rounded up (not to even)."""
    return float(Decimal(repr(level)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def full_weeks_elapsed(season: LeagueSeason) -> int:
    """§6.10: complete weeks since the season started (for the live eligibility)."""
    elapsed = (min(clock.now(), season.ends_at) - season.starts_at).total_seconds()
    return max(0, math.floor(elapsed / (7 * 24 * 3600)))


def _members(competitor_id: str) -> tuple[str, str | None]:
    if "+" in competitor_id:
        first, second = competitor_id.split("+", 1)
        return first, second
    return competitor_id, None


def visible_players() -> set[str]:
    """Players shown in the standings: in the league, account not deleted."""
    return {
        str(pk)
        for pk in LeaguePlayer.objects.filter(
            status=PlayerStatus.ACTIVE, user__deleted_at__isnull=True
        )
        .filter(Q(user__is_active=True))
        .values_list("user_id", flat=True)
    }


def rebuild(season: LeagueSeason, state: LeagueState, config: LeagueConfig) -> None:
    weeks = full_weeks_elapsed(season) if season.status == SeasonStatus.ACTIVE else None
    visible = visible_players()
    rows: list[Standing] = []
    for ladder in Ladder:
        ranked = {s.competitor_id: s for s in standings(state, ladder, config, weeks)}
        position = 0
        ordered = sorted(
            state.competitors[ladder].items(),
            key=lambda item: (ranked[item[0]].position if item[0] in ranked else math.inf, item[0]),
        )
        for competitor_id, competitor in ordered:
            first, second = _members(competitor_id)
            shown = first in visible and (second is None or second in visible)
            standing = ranked.get(competitor_id)
            if standing is not None and shown:
                position += 1
            rank = competitor.rank
            rows.append(
                Standing(
                    season=season,
                    ladder=ladder.value,
                    competitor_id=competitor_id,
                    player_a_id=first,
                    player_b_id=second,
                    mu=competitor.rating.mu,
                    sigma=competitor.rating.sigma,
                    level=level_from_mu(competitor.rating.mu, config),
                    rank_index=rank.index if rank else None,
                    tier=rank.tier if rank else "",
                    division=(rank.division or "") if rank else "",
                    lp=rank.lp if rank else 0,
                    total_lp=rank.total_lp(config) if rank else 0,
                    placement_left=competitor.placement_left,
                    matches_played=competitor.matches_played,
                    position=position if standing is not None and shown else None,
                    eligible=bool(standing and standing.eligible),
                    last_match_at=competitor.last_match_at,
                )
            )
    Standing.objects.filter(season=season).delete()
    Standing.objects.bulk_create(rows)
