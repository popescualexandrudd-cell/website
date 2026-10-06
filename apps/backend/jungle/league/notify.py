"""The league's messages (§11, R-140): through the club's notifications (email and push, in the
person's language, with a link to their account), called after the change is committed."""

from __future__ import annotations

from typing import Any

from jungle_league.ranks import RankState

from jungle.accounts.models import User
from jungle.core import clock
from jungle.league.models import EventKind, LeagueEvent, LeagueSeason
from jungle.notifications import services as notifications
from jungle.notifications.services import account_path

LADDER_WORDS = {
    "ro": {"doubles": "dublu", "singles": "simplu", "pairs": "perechi"},
    "en": {"doubles": "doubles", "singles": "singles", "pairs": "pairs"},
}
TIER_WORDS = {
    "ro": {
        "bronze": "Bronz",
        "silver": "Argint",
        "gold": "Aur",
        "platinum": "Platină",
        "diamond": "Diamant",
        "master": "Maestru",
    },
    "en": {
        "bronze": "Bronze",
        "silver": "Silver",
        "gold": "Gold",
        "platinum": "Platinum",
        "diamond": "Diamond",
        "master": "Master",
    },
}


def send(
    event: str, user: User, context: dict[str, Any], subject: str, page: str = "league"
) -> None:
    """`event` from the catalog (`league.*`); `subject` makes it once per thing and person."""
    url = account_path(user.preferred_language, page)
    notifications.notify(user, event, {**context, "url": url}, subject=subject)


def language_of(user: User) -> str:
    return "en" if user.preferred_language == "en" else "ro"


def score_text(score: dict[str, Any]) -> str:
    """{"sets": [{"a": 6, "b": 3}, …]} → "6-3 4-6 10-8"."""
    return " ".join(f"{s['a']}-{s['b']}" for s in score.get("sets", []))


def rank_text(rank: list[int], language: str) -> str:
    """A rank as stored in the state ([index, lp, protection]) → "Aur II", "Maestru"."""
    state = RankState(rank[0], rank[1], rank[2])
    return f"{TIER_WORDS[language][state.tier]} {state.division or ''}".strip()


def after_applied(season: LeagueSeason, event: LeagueEvent, outcome: dict[str, Any]) -> None:
    """An `on_applied` listener (runs after the commit): §11 "meci validat" with each player's LP
    and "schimbare de rang" (a promotion, a demotion, the first rank after placement). A match
    validated late replays the season: its values are read from the new computation."""
    if event.kind != EventKind.MATCH:
        return
    if outcome.get("replayed"):
        outcome = event.records.get(computation=outcome["computation"]).payload
    if not outcome.get("counted"):
        return
    ids = list(event.payload["team_a"]) + list(event.payload["team_b"])
    users = {str(u.pk): u for u in User.objects.filter(pk__in=ids)}
    when = event.at.astimezone(clock.BUSINESS_TZ).strftime("%d.%m.%Y %H:%M")
    score = score_text(event.payload["score"])
    for update in outcome["updates"]:
        before, after = update["before"]["rank"], update["after"]["rank"]
        ranked_now = after is not None and (before is None or update["change"] != "none")
        for player_id in update["competitor"].split("+"):
            user = users[player_id]
            language = language_of(user)
            if update["ladder"] != "pairs" and after is not None:  # not during placement
                lp = int(update["lp_delta"])
                send(
                    "league.score_validated",
                    user,
                    {"when": when, "score": score, "lp": f"{lp:+d}"},
                    subject=f"{event.ref}:{update['ladder']}",
                )
            if ranked_now:
                send(
                    "league.rank_changed",
                    user,
                    {
                        "rank": rank_text(after, language),
                        "ladder": LADDER_WORDS[language][update["ladder"]],
                    },
                    subject=f"{event.ref}:{update['ladder']}",
                )
