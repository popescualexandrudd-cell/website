"""The league's reminders from the daily job (§11):

- "n-ai mai jucat de X zile": after `notifications.inactive_days` days without an official match
  (doubles ladder), once per pause, with players of the same level (`matchmaking`);
- "îți mai trebuie N meciuri pentru clasamentul final": `notifications.matches_needed_days` days
  before the season ends, once per season, to those who played but are still under the minimum
  (`min_matches_per_season`, LG-110);
- "Meciul zilei": a push to the players of today's Match of the day (`spotlight.announce`).

Written once per thing and person (the notifications send them after the commit), only to
players shown in the standings (in the league, account kept).
"""

from __future__ import annotations

from datetime import date, timedelta

from jungle.accounts.models import User
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.league import matchmaking, notify, projection, spotlight, store
from jungle.league.models import Ladder, LeagueSeason, Standing


def _inactive_message(user: User, season: LeagueSeason, days: int, subject: str) -> bool:
    partners = matchmaking.partners_for(user, season)
    return notify.send(
        "league.inactive",
        user,
        {"days": days, "partners": matchmaking.partners_text(partners, notify.language_of(user))},
        subject=subject,
    )


def remind_inactive(season: LeagueSeason, today: date) -> int:
    after = int(get_config("notifications.inactive_days"))
    visible = projection.visible_players()
    rows = Standing.objects.filter(
        season=season,
        ladder=Ladder.DOUBLES,
        competitor_id__in=visible,
        last_match_at__isnull=False,
    ).select_related("player_a")
    sent = 0
    for row in rows:
        last = row.last_match_at.astimezone(clock.BUSINESS_TZ)  # type: ignore[union-attr]
        days = (today - last.date()).days
        if days < after:
            continue
        subject = f"{season.pk}:{last.isoformat()}"  # once per pause
        sent += _inactive_message(row.player_a, season, days, subject)
    return sent


def remind_matches_needed(season: LeagueSeason, today: date) -> int:
    last_day = (season.ends_at - timedelta(microseconds=1)).astimezone(clock.BUSINESS_TZ).date()
    before = int(get_config("notifications.matches_needed_days"))
    if not last_day - timedelta(days=before) <= today <= last_day:
        return 0
    needed = store.config_for(season).min_matches_per_season
    rows = Standing.objects.filter(
        season=season,
        ladder=Ladder.DOUBLES,
        competitor_id__in=projection.visible_players(),
        matches_played__gte=1,
        matches_played__lt=needed,
    ).select_related("player_a")
    until = last_day.strftime("%d.%m.%Y")
    sent = 0
    for row in rows:
        context = {"count": needed - row.matches_played, "until": until}
        sent += notify.send("league.matches_needed", row.player_a, context, subject=str(season.pk))
    return sent


def run(season: LeagueSeason, today: date) -> int:
    """The messages written today (each sent after the commit, by the notifications)."""
    return (
        remind_inactive(season, today)
        + remind_matches_needed(season, today)
        + spotlight.announce(season.location, today)
    )
