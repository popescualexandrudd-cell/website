"""The personal "Jungle Report" (§10, AI layer item 5), every Monday for the week that ended:
the league matches played and won, the LP won or lost, the rank now, the partner played with most
often, and a goal for the next week.

Every number is computed here from the league's events (the latest computation, so a late match
or a replay is counted as the standings count it); the text is the club's template (§11, editable
in the panel), so the report never says anything the league did not record (ADR-0019, point 6).
Only to players who played that week and are shown in the standings.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta

from jungle.accounts.models import User
from jungle.core import clock
from jungle.league import notify, projection, store
from jungle.league.models import EventKind, Ladder, LeagueSeason, Standing

INDIVIDUAL = ("doubles", "singles")
GOALS = {
    "ro": {
        "matches": "Obiectivul săptămânii: încă {n} meciuri până la clasamentul final.",
        "division": "Obiectivul săptămânii: încă {n} LP până la diviziunea următoare.",
        "keep": "Obiectivul săptămânii: păstrează ritmul, măcar un meci.",
    },
    "en": {
        "matches": "This week's goal: {n} more matches to reach the final standings.",
        "division": "This week's goal: {n} more LP to the next division.",
        "keep": "This week's goal: keep the pace, at least one match.",
    },
}
PLACEMENT = {"ro": "în plasament", "en": "in placement"}


@dataclass
class Week:
    matches: int = 0
    wins: int = 0
    lp: int = 0
    partners: Counter[str] = field(default_factory=Counter)


def week_before(today: date) -> tuple[date, date]:
    """The Monday and the Sunday of the week before `today`'s."""
    monday = today - timedelta(days=today.weekday() + 7)
    return monday, monday + timedelta(days=6)


def summaries(season: LeagueSeason, first: date, last: date) -> dict[str, Week]:
    start = datetime.combine(first, time(), clock.BUSINESS_TZ)
    end = datetime.combine(last + timedelta(days=1), time(), clock.BUSINESS_TZ)
    weeks: dict[str, Week] = {}
    events = season.events.filter(kind=EventKind.MATCH, at__gte=start, at__lt=end)
    for event in events.order_by("at", "id"):
        record = event.records.order_by("-computation").first()
        if record is None or not record.payload.get("counted"):
            continue
        outcome = record.payload
        deltas = {
            u["competitor"]: int(u["lp_delta"])
            for u in outcome.get("updates", [])
            if u["ladder"] in INDIVIDUAL
        }
        for side in ("a", "b"):
            team = [str(p) for p in event.payload[f"team_{side}"]]
            for player in team:
                week = weeks.setdefault(player, Week())
                week.matches += 1
                week.wins += outcome.get("winner") == side
                week.lp += deltas.get(player, 0)
                week.partners.update(mate for mate in team if mate != player)
    return weeks


def _goal(row: Standing | None, season: LeagueSeason, language: str) -> str:
    config = store.config_for(season)
    texts = GOALS[language]
    if row is None or row.matches_played < config.min_matches_per_season:
        played = row.matches_played if row is not None else 0
        return texts["matches"].format(n=config.min_matches_per_season - played)
    if row.rank_index is not None and row.tier != "master":
        return texts["division"].format(n=max(config.lp_per_division - row.lp, 1))
    return texts["keep"]


def _rank(row: Standing | None, language: str) -> str:
    if row is None or row.rank_index is None:
        return PLACEMENT[language]
    return f"{notify.TIER_WORDS[language][row.tier]} {row.division}".strip()


def send(season: LeagueSeason, today: date) -> int:
    """The reports for the week before `today`; how many were written now (once a week)."""
    first, last = week_before(today)
    visible = projection.visible_players()
    weeks = {pid: w for pid, w in summaries(season, first, last).items() if pid in visible}
    known = set(weeks).union(*(w.partners for w in weeks.values()))
    people = {str(u.pk): u for u in User.objects.filter(pk__in=list(known))}
    rows = {
        r.competitor_id: r
        for r in Standing.objects.filter(
            season=season, ladder=Ladder.DOUBLES, competitor_id__in=list(weeks)
        )
    }
    label = f"{first:%d.%m}–{last:%d.%m.%Y}"
    sent = 0
    for player, week in sorted(weeks.items()):
        user = people[player]
        language = notify.language_of(user)
        mates = [(n, p) for p, n in week.partners.items() if p in visible]
        best = min(mates, key=lambda m: (-m[0], people[m[1]].full_name, m[1]), default=None)
        context = {
            "week": label,
            "matches": week.matches,
            "wins": week.wins,
            "lp": f"{week.lp:+d}",
            "rank": _rank(rows.get(player), language),
            "partner": people[best[1]].full_name if best is not None else "—",
            "goal": _goal(rows.get(player), season, language),
        }
        sent += notify.send(
            "league.weekly_report", user, context, subject=f"{season.pk}:{first.isoformat()}"
        )
    return sent
