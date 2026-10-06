"""Partner suggestions (§10 matchmaking, §11 "inactivitate și propuneri de parteneri").

A deterministic score, computed here and never by the AI (ADR-0019, point 6): the players of
the doubles ladder whose level is within `league.partners.level_gap_levels` of yours and who
played an official match in the last `recent_days` days; the closest level first, then the most
recent match, then the name. Only R-012 public data is used (name and level), only for players
shown in the standings (in the league, account not deleted).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from jungle.accounts.models import User
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.league import projection
from jungle.league.models import Ladder, LeagueSeason, Standing


@dataclass(frozen=True)
class Partner:
    name: str
    level: float


def partners_for(user: User, season: LeagueSeason) -> list[Partner]:
    rule: dict[str, Any] = dict(get_config("league.partners"))
    rows = Standing.objects.filter(season=season, ladder=Ladder.DOUBLES)
    mine = rows.filter(competitor_id=str(user.pk)).first()
    if mine is None:
        return []
    since = clock.now() - timedelta(days=int(rule["recent_days"]))
    gap = float(rule["level_gap_levels"])
    visible = projection.visible_players() - {str(user.pk)}
    found = list(
        rows.filter(
            competitor_id__in=visible,
            last_match_at__gte=since,
            level__gte=mine.level - gap,
            level__lte=mine.level + gap,
        ).select_related("player_a")
    )
    found.sort(
        key=lambda r: (
            round(abs(r.level - mine.level), 6),
            -r.last_match_at.timestamp(),  # type: ignore[union-attr]
            r.player_a.full_name,
            r.competitor_id,
        )
    )
    return [
        Partner(r.player_a.full_name, round(r.level, 1)) for r in found[: int(rule["suggestions"])]
    ]


SENTENCES = {
    "ro": (
        "Jucători de nivelul tău care au jucat în ultima vreme: {names}.",
        "Spune-ne la recepție și te ajutăm să găsești parteneri de nivelul tău.",
    ),
    "en": (
        "Players of your level who played lately: {names}.",
        "Tell us at reception and we will help you find partners of your level.",
    ),
}


def partners_text(partners: list[Partner], language: str) -> str:
    """ "…: Ana Pop (3,2), Dan Ionescu (3,0)." (a decimal point in English), or, with nobody
    to suggest, an offer of help."""
    found, nobody = SENTENCES[language]
    if not partners:
        return nobody
    point = "." if language == "en" else ","
    names = ", ".join(f"{p.name} ({f'{p.level:.1f}'.replace('.', point)})" for p in partners)
    return found.format(names=names)
