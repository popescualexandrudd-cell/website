"""The daily job: inactivity decay and its warnings (LG-106, LG-107)."""

from __future__ import annotations

from collections.abc import Callable
from datetime import date
from io import StringIO
from typing import Any

import pytest
from django.core import mail
from django.core.management import call_command

from jungle.accounts.models import User
from jungle.league import daily, store
from jungle.league.models import DecayWarning, EventKind, LeagueEvent, LeagueSeason, Standing
from jungle.league.tests.conftest import kiosk_request, placed
from jungle.privacy import league_consent

pytestmark = pytest.mark.django_db

Join = Callable[..., User]


@pytest.fixture
def masters(season: LeagueSeason, join: Join) -> tuple[User, ...]:
    """Four level-7 players placed at the top (the placement cap raised for the test)."""
    LeagueSeason.objects.filter(pk=season.pk).update(config={"placement_cap_index": 20})
    season.refresh_from_db()
    players = placed(season, lambda: join(level="7.00"))
    ranks = {r.tier for r in Standing.objects.filter(season=season, ladder="doubles")}
    assert ranks <= {"diamond", "master"}
    return players


def test_lg106_every_missed_day_is_decayed_once(season: LeagueSeason, join: Join) -> None:
    placed(season, join)
    report = daily.run_daily(date(2027, 4, 5))  # the season started on 01.04
    assert report == daily.DailyReport(days_decayed=4, lp_removed=0, warnings=0)
    refs = list(
        LeagueEvent.objects.filter(kind=EventKind.DECAY)
        .order_by("at")
        .values_list("ref", flat=True)
    )
    assert refs == ["2027-04-01", "2027-04-02", "2027-04-03", "2027-04-04"]
    assert daily.run_daily(date(2027, 4, 5)).days_decayed == 0  # the same night again
    assert daily.run_daily(date(2027, 4, 7)).days_decayed == 2


def test_lg106_inactive_diamonds_and_masters_lose_lp(
    season: LeagueSeason, masters: tuple[User, ...]
) -> None:
    before = {r.competitor_id: r.total_lp for r in Standing.objects.filter(season=season)}
    daily.run_daily(date(2027, 4, 20))  # last match on 06.04: day 14 is 20.04, no decay yet
    after = {r.competitor_id: r.total_lp for r in Standing.objects.filter(season=season)}
    assert after == before
    report = daily.run_daily(date(2027, 4, 23))  # 21 and 22.04 decay
    assert report.days_decayed == 3 and report.lp_removed > 0
    after = {r.competitor_id: r.total_lp for r in Standing.objects.filter(season=season)}
    assert all(after[c] <= before[c] for c in before) and after != before
    assert store.current_state(season) == store.rebuild(season)


def test_lg107_warned_three_days_before_once(
    season: LeagueSeason, masters: tuple[User, ...], django_capture_on_commit_callbacks: Any
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        report = daily.run_daily(date(2027, 4, 18))  # 12 days without a match
    # 4 players in doubles, 2 pairs of 2 players each
    assert report.warnings == 8 and DecayWarning.objects.count() == 6
    assert len(mail.outbox) == 8
    assert "21.04.2027" in mail.outbox[0].body and "dublu" in mail.outbox[0].body
    with django_capture_on_commit_callbacks(execute=True):
        assert daily.run_daily(date(2027, 4, 18)).warnings == 0
    assert len(mail.outbox) == 8
    assert str(DecayWarning.objects.first()).startswith("2027-04-18")


def test_lg107_english_and_departed_players(
    season: LeagueSeason, join: Join, django_capture_on_commit_callbacks: Any
) -> None:
    LeagueSeason.objects.filter(pk=season.pk).update(config={"placement_cap_index": 20})
    season.refresh_from_db()
    players = placed(season, lambda: join(level="7.00", preferred_language="en"))
    request = kiosk_request()
    request.user = players[0]
    league_consent.withdraw(request)  # left the league: no longer told anything
    with django_capture_on_commit_callbacks(execute=True):
        daily.run_daily(date(2027, 4, 18))
    assert mail.outbox and all("ladder" in m.body for m in mail.outbox)
    assert players[0].email not in {m.to[0] for m in mail.outbox}


def test_the_daily_command(season: LeagueSeason, now: Any) -> None:
    out = StringIO()
    call_command("league_daily", stdout=out)
    assert out.getvalue().strip() == "Decay: 4 zile, 0 LP scăzute; avertizări: 0; mementouri: 0."


def test_r140_league_emails_skip_accounts_without_email() -> None:
    from jungle.league import notify

    notify.send("league.decay_risk", User(first_name="Copil"), {}, subject="x")
    assert mail.outbox == []
