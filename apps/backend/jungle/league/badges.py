"""Badges (§6.15, LG-150). Private: shown in the player's own account.

- after an applied match (from the values before and after, LG-160): "giant slayer" (beat a
  side at least one level above, configurable), promotions, the first Diamond (which also
  offers the Diamond card, R-024), a streak of wins, "early bird" matches, weeks in a row;
- every Monday: "upset of the week" (the biggest win against the odds, by MMR);
- at the season's end: "king" (the top 3 Kings of the Jungle).
Thresholds are configurable (`league.badges`). A badge, once given, stays (even if a match is
later cancelled): it rewards what happened on the court.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Any

from django.db import IntegrityError, transaction
from jungle_league.levels import level_from_mu
from jungle_league.ranks import DIAMOND_IV_INDEX

from jungle.accounts.models import User
from jungle.cards import services as cards
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.league import store
from jungle.league.models import (
    Badge,
    EventKind,
    LeagueEvent,
    LeagueSeason,
    LeagueSnapshot,
    RatingRecord,
)

CODES = (
    "giant_slayer",
    "promotion",
    "first_diamond",
    "win_streak",
    "early_bird",
    "weekly_streak",
    "upset_of_week",
    "king",
)
INDIVIDUAL = ("doubles", "singles")


def grant(
    user: User, code: str, key: str, season: LeagueSeason | None, details: dict[str, Any]
) -> Badge | None:
    """Gives the badge once (per season, week or lifetime, by `key`); None if already had."""
    try:
        with transaction.atomic():
            return Badge.objects.create(
                user=user,
                code=code,
                key=key,
                season=season,
                awarded_at=clock.now(),
                details=details,
            )
    except IntegrityError:
        return None


def _history(season: LeagueSeason, player_id: str) -> list[tuple[datetime, bool]]:
    """(end time, won) of the player's counted matches in the current computation."""
    computation = LeagueSnapshot.objects.get(season=season).computation
    records = (
        RatingRecord.objects.filter(
            season=season,
            computation=computation,
            event__kind=EventKind.MATCH,
            payload__counted=True,
            payload__contains={"updates": [{"competitor": player_id}]},
        )
        .select_related("event")
        .order_by("event__at", "event_id")
    )
    return [
        (
            r.event.at,
            r.payload["winner"] == ("a" if player_id in r.event.payload["team_a"] else "b"),
        )
        for r in records
    ]


def _monday(moment: datetime) -> date:
    day = moment.astimezone(clock.BUSINESS_TZ).date()
    return day - timedelta(days=day.weekday())


def _streaks(season: LeagueSeason, user: User, limits: dict[str, Any]) -> None:
    history = _history(season, str(user.pk))
    key = str(season.pk)
    streak = int(limits["win_streak"])
    if len(history) >= streak and all(won for _, won in history[-streak:]):
        grant(user, "win_streak", key, season, {"wins": streak})
    before = int(limits["early_bird_before_hour"])
    early = [at for at, _ in history if at.astimezone(clock.BUSINESS_TZ).time() < time(hour=before)]
    if len(early) >= int(limits["early_bird_matches"]):
        grant(user, "early_bird", key, season, {"matches": len(early)})
    weeks = {_monday(at) for at, _ in history}
    run, week = 1, _monday(history[-1][0])
    while week - timedelta(days=7) in weeks:
        run, week = run + 1, week - timedelta(days=7)
    if run >= int(limits["weekly_streak_weeks"]):
        grant(user, "weekly_streak", key, season, {"weeks": run})


def _mean_level(ids: list[str], before: dict[str, float], season: LeagueSeason) -> float:
    config = store.config_for(season)
    return sum(level_from_mu(before[i], config) for i in ids) / len(ids)


def after_match(season: LeagueSeason, event: LeagueEvent, outcome: dict[str, Any]) -> None:
    """An `on_applied` listener (runs after the commit). A match validated late replays the
    season: its values are read from its record in the new computation."""
    if event.kind != EventKind.MATCH:
        return
    if outcome.get("replayed"):
        record = event.records.get(computation=outcome["computation"])
        outcome = record.payload
    if not outcome.get("counted"):
        return
    limits = dict(get_config("league.badges"))
    team_a, team_b = list(event.payload["team_a"]), list(event.payload["team_b"])
    users = {str(u.pk): u for u in User.objects.filter(pk__in=team_a + team_b)}
    key = str(season.pk)
    for update in outcome["updates"]:
        rank_before, rank_after = update["before"]["rank"], update["after"]["rank"]
        for player_id in update["competitor"].split("+"):
            user = users[player_id]
            if update["change"] == "promoted":
                grant(user, "promotion", key, season, {"ladder": update["ladder"]})
            reached = rank_after is not None and rank_after[0] >= DIAMOND_IV_INDEX
            was = rank_before is not None and rank_before[0] >= DIAMOND_IV_INDEX
            if reached and not was and grant(user, "first_diamond", "", None, {}):
                cards.offer_diamond_card(user, season.location)  # R-024, Q1: once in a lifetime
    for player_id in team_a + team_b:
        _streaks(season, users[player_id], limits)
    if outcome["winner"] is None:
        return
    winners, losers = (team_a, team_b) if outcome["winner"] == "a" else (team_b, team_a)
    before = {
        u["competitor"]: u["before"]["mu"] for u in outcome["updates"] if u["ladder"] in INDIVIDUAL
    }
    gap = _mean_level(losers, before, season) - _mean_level(winners, before, season)
    if gap >= float(limits["giant_slayer_levels"]):
        for player_id in winners:
            grant(users[player_id], "giant_slayer", key, season, {"levels": round(gap, 2)})


def upset_of_week(season: LeagueSeason, monday: date) -> int:
    """The biggest win against the odds of the week that starts on `monday` (by the mean μ
    before the match); its winners get the badge. Returns how many were given."""
    start = datetime.combine(monday, time(), clock.BUSINESS_TZ)
    end = start + timedelta(days=7)
    computation = LeagueSnapshot.objects.get(season=season).computation
    best: tuple[float, list[str]] | None = None
    for record in (
        RatingRecord.objects.filter(
            season=season,
            computation=computation,
            event__kind=EventKind.MATCH,
            event__at__gte=start,
            event__at__lt=end,
            payload__counted=True,
        )
        .exclude(payload__winner=None)
        .select_related("event")
        .order_by("event__at", "event_id")
    ):
        payload, teams = record.payload, record.event.payload
        mu = {
            u["competitor"]: u["before"]["mu"]
            for u in payload["updates"]
            if u["ladder"] in INDIVIDUAL
        }
        winners, losers = (
            (teams["team_a"], teams["team_b"])
            if payload["winner"] == "a"
            else (teams["team_b"], teams["team_a"])
        )
        upset = sum(mu[p] for p in losers) / len(losers) - sum(mu[p] for p in winners) / len(
            winners
        )
        if upset > 0 and (best is None or upset > best[0]):
            best = (upset, list(winners))
    if best is None:
        return 0
    week = monday.isocalendar()
    key = f"{week.year}-W{week.week:02d}"
    return sum(
        1
        for user in User.objects.filter(pk__in=best[1])
        if grant(user, "upset_of_week", key, season, {"mu": round(best[0], 2)})
    )


def mine(user: User) -> list[Badge]:
    return list(Badge.objects.filter(user=user))
