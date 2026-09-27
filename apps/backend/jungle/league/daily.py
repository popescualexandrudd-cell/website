"""The league's daily job (run shortly after midnight, club time).

- LG-106: the inactivity decay of Diamond and Master, one event per day, for every day since
  the last one recorded (a missed night is caught up; the engine applies a day only once);
- LG-107: the warning three days before the decay starts, sent once per player and day.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from functools import partial

from django.db import IntegrityError, transaction
from jungle_league.engine import decay_warnings

from jungle.accounts.models import User
from jungle.audit.services import SYSTEM
from jungle.core import clock
from jungle.league import notify, services, store
from jungle.league.models import (
    DecayWarning,
    EventKind,
    Ladder,
    LeagueSeason,
    SeasonStatus,
)

LADDER_EN = {"doubles": "doubles", "singles": "singles", "pairs": "pairs"}


def _midnight_after(day: date) -> datetime:
    return datetime.combine(day + timedelta(days=1), time(), clock.BUSINESS_TZ)


def decay_days(season: LeagueSeason, today: date) -> list[date]:
    """The days still to decay: from the day after the last one recorded (or the season's
    first day) until yesterday."""
    last = (
        season.events.filter(kind=EventKind.DECAY).order_by("-at").values_list("ref", flat=True)
    ).first()
    start = (
        date.fromisoformat(last) + timedelta(days=1)
        if last
        else season.starts_at.astimezone(clock.BUSINESS_TZ).date()
    )
    return [start + timedelta(days=n) for n in range((today - start).days)]


def _warn_email(user: User, ladder: str, starts: date, lp_per_day: int) -> None:
    ro = user.preferred_language == "ro"
    notify.send(
        "league_decay_warning",
        user,
        {
            "ladder": Ladder(ladder).label.lower() if ro else LADDER_EN[ladder],
            "starts": starts,
            "lp_per_day": lp_per_day,
        },
        notify.ACCOUNT_LEAGUE_PATH,
    )


def warn(season: LeagueSeason, today: date) -> int:
    config = store.config_for(season)
    state = store.current_state(season)
    sent = 0
    for ladder, competitor_id in decay_warnings(state, today, config):
        rank = state.competitors[ladder][competitor_id].rank
        per_day = (
            config.decay_master_lp_per_day
            if rank is not None and rank.tier == "master"
            else config.decay_diamond_lp_per_day
        )
        try:
            with transaction.atomic():
                DecayWarning.objects.create(
                    season=season,
                    day=today,
                    ladder=ladder.value,
                    competitor_id=competitor_id,
                    sent_at=clock.now(),
                )
        except IntegrityError:
            continue  # already warned today
        starts = today + timedelta(days=config.decay_warning_days)
        for user in User.objects.filter(pk__in=competitor_id.split("+")):
            if services.is_playing(user):
                transaction.on_commit(partial(_warn_email, user, ladder.value, starts, per_day))
                sent += 1
    return sent


@dataclass(frozen=True)
class DailyReport:
    days_decayed: int
    lp_removed: int
    warnings: int


def run_daily(today: date | None = None) -> DailyReport:
    today = today or clock.today_local()
    days = lp = warnings = 0
    for season in LeagueSeason.objects.filter(status=SeasonStatus.ACTIVE):
        for day in decay_days(season, today):
            event = store.record(
                season,
                EventKind.DECAY,
                _midnight_after(day),
                day.isoformat(),
                {"day": day.isoformat()},
                SYSTEM,
            )
            days += 1
            record = event.records.order_by("-computation").first()
            lp -= sum(u["lp_delta"] for u in (record.payload.get("decay", []) if record else []))
        warnings += warn(season, today)
    return DailyReport(days_decayed=days, lp_removed=lp, warnings=warnings)
