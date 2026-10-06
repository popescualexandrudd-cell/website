"""§11 league reminders from the daily job and the partner suggestions (§10 matchmaking):
a long pause with players of the same level, the matches still needed for the final standings,
the Match of the day for its players. Deterministic, R-012 data only, once per thing and person."""

from __future__ import annotations

from collections.abc import Callable
from datetime import date, datetime
from typing import Any

import pytest
from django.core import mail

from jungle.accounts.models import User
from jungle.core import clock
from jungle.league import daily, matchmaking, reminders, spotlight, weekly
from jungle.league.models import (
    LeaguePlayer,
    LeagueSeason,
    PlayerStatus,
    Standing,
)
from jungle.league.tests.conftest import at, placed, play, staff_request
from jungle.league.tests.test_matches import book
from jungle.locations.models import Location, Resource, ResourceKind
from jungle.notifications.models import Notification, PushSubscription

pytestmark = pytest.mark.django_db

Join = Callable[..., User]


def standing(user: User, season: LeagueSeason, level: float, last: datetime) -> None:
    Standing.objects.filter(season=season, ladder="doubles", competitor_id=str(user.pk)).update(
        level=level, last_match_at=last
    )


def subscribe(user: User) -> None:
    PushSubscription.objects.create(
        user=user,
        endpoint=f"https://push.example.test/{user.pk}",
        p256dh="BAAA",
        auth="AAAA",
        created_at=clock.now(),
    )


@pytest.fixture
def vapid(settings: Any) -> None:
    settings.VAPID_PUBLIC_KEY = "public"
    settings.VAPID_PRIVATE_KEY = "private"
    settings.VAPID_SUBJECT = "mailto:club@example.test"


@pytest.fixture
def court(location: Location) -> Resource:
    return Resource.objects.create(
        location=location, slug="teren-1", name="Teren 1", kind=ResourceKind.PADEL_COURT
    )


def test_matchmaking_the_closest_level_then_the_latest_match_then_the_name(
    season: LeagueSeason, join: Join
) -> None:
    me, b, c, d = placed(season, join)
    e, f, g, h = placed(season, join)
    standing(me, season, 3.0, at("2027-04-06 12:00"))
    standing(d, season, 3.1, at("2027-04-01 12:00"))  # the closest level
    standing(b, season, 3.3, at("2027-04-06 12:00"))
    standing(c, season, 2.7, at("2027-04-06 13:00"))  # as close as b, played later
    standing(g, season, 3.5, at("2027-04-06 12:00"))  # close enough, but the fourth
    standing(e, season, 3.9, at("2027-04-06 12:00"))  # too far
    standing(f, season, 3.2, at("2027-02-01 12:00"))  # not played in the last 30 days
    standing(h, season, 3.0, at("2027-04-06 12:00"))
    User.objects.filter(pk=h.pk).update(deleted_at=clock.now())  # not shown any more
    found = matchmaking.partners_for(me, season)
    assert [p.name for p in found] == [d.full_name, c.full_name, b.full_name]
    assert [p.level for p in found] == [3.1, 2.7, 3.3]
    assert matchmaking.partners_text(found[:1], "ro") == (
        f"Jucători de nivelul tău care au jucat în ultima vreme: {d.full_name} (3,1)."
    )
    assert matchmaking.partners_text(found[:1], "en") == (
        f"Players of your level who played lately: {d.full_name} (3.1)."
    )
    assert matchmaking.partners_text([], "ro").startswith("Spune-ne la recepție")
    outsider = join()  # in the league, no match yet: no doubles row
    Standing.objects.filter(competitor_id=str(outsider.pk)).delete()
    assert matchmaking.partners_for(outsider, season) == []


def test_s11_after_a_long_pause_once_with_players_of_the_same_level(
    season: LeagueSeason, join: Join, django_capture_on_commit_callbacks: Any
) -> None:
    a, b, c, d = placed(season, join)  # the last match on 06.04
    with django_capture_on_commit_callbacks(execute=True):
        assert reminders.remind_inactive(season, date(2027, 4, 26)) == 0  # 20 days
    assert mail.outbox == []
    with django_capture_on_commit_callbacks(execute=True):
        assert reminders.remind_inactive(season, date(2027, 4, 27)) == 4
    [message] = [m for m in mail.outbox if m.to == [a.email]]
    assert message.subject == "Hai înapoi pe teren"
    assert "N-ai mai jucat de 21 zile." in message.body
    assert "Jucători de nivelul tău care au jucat în ultima vreme:" in message.body
    assert all(p.full_name in message.body for p in (b, c, d))
    with django_capture_on_commit_callbacks(execute=True):
        assert reminders.remind_inactive(season, date(2027, 4, 28)) == 0  # the same pause
    assert len(mail.outbox) == 4


def test_s11_matches_still_needed_before_the_season_ends(
    season: LeagueSeason, join: Join, django_capture_on_commit_callbacks: Any
) -> None:
    a, *_ = placed(season, join)  # five matches each; twelve needed (LG-110)
    assert reminders.remind_matches_needed(season, date(2027, 6, 15)) == 0  # 15 days before
    assert reminders.remind_matches_needed(season, date(2027, 7, 1)) == 0  # after the end
    with django_capture_on_commit_callbacks(execute=True):
        assert reminders.remind_matches_needed(season, date(2027, 6, 16)) == 4
        assert reminders.remind_matches_needed(season, date(2027, 6, 20)) == 0  # once a season
    [message] = [m for m in mail.outbox if m.to == [a.email]]
    assert message.subject == "Încă 7 meciuri pentru clasamentul final"
    assert "până la finalul sezonului (30.06.2027)" in message.body
    Standing.objects.filter(season=season).update(matches_played=12)
    Notification.objects.all().delete()
    assert reminders.remind_matches_needed(season, date(2027, 6, 16)) == 0  # enough already


def test_s11_the_match_of_the_day_told_to_its_players(
    season: LeagueSeason,
    join: Join,
    court: Resource,
    location: Location,
    manager: User,
    vapid: None,
    now: Any,
) -> None:
    a, b, c, _d = placed(season, join)
    assert spotlight.announce(location, date(2027, 4, 5)) == 0  # no league match today
    first = book(court, a, "2027-04-05 17:00", "2027-04-05 18:30")
    for player in (a, c):
        subscribe(player)
    assert daily.run_daily(date(2027, 4, 5)).reminders == 1  # a, the organizer
    [push] = Notification.objects.filter(event="league.match_of_the_day")
    assert push.user == a and push.channel == "push"
    assert push.context["when"] == "17:00" and push.context["court"] == "Teren 1"
    assert spotlight.announce(location, date(2027, 4, 5)) == 0  # once a day
    # the admin picks another match: its organizer is told too
    second = book(court, c, "2027-04-05 19:00", "2027-04-05 20:30")
    spotlight.choose(staff_request(manager), location.id, second.pk, "Derby")
    told = Notification.objects.filter(event="league.match_of_the_day")
    assert sorted(n.user_id for n in told) == sorted([a.pk, c.pk])
    assert first.pk != second.pk and b.pk not in [n.user_id for n in told]


# ---------------------------------------------------------------- the Jungle Report
def test_jungle_report_every_monday_for_the_week_that_ended(
    season: LeagueSeason, join: Join, django_capture_on_commit_callbacks: Any
) -> None:
    a, b, c, d = placed(season, join)  # five matches on 05–06.04, a and b together, 3 won
    User.objects.filter(pk=c.pk).update(preferred_language="en")
    LeaguePlayer.objects.filter(user=d).update(status=PlayerStatus.WITHDRAWN)  # not shown
    assert weekly.week_before(date(2027, 4, 12)) == (date(2027, 4, 5), date(2027, 4, 11))
    with django_capture_on_commit_callbacks(execute=True):
        assert daily.run_daily(date(2027, 4, 11)).reminders == 0  # a Sunday
        assert daily.run_daily(date(2027, 4, 12)).reminders == 3  # a, b, c
        assert weekly.send(season, date(2027, 4, 12)) == 0  # once a week
    [ro] = [m for m in mail.outbox if m.to == [a.email]]
    assert ro.subject == "Jungle Report: săptămâna 05.04–11.04.2027"
    assert "meciuri de ligă: 5, câștigate: 3;" in ro.body
    assert f"cel mai des: {b.full_name}." in ro.body
    assert "încă 7 meciuri până la clasamentul final" in ro.body
    [en] = [m for m in mail.outbox if m.to == [c.email]]
    assert "league matches: 5, won: 2;" in en.body
    assert "the partner you played with most: —." in en.body  # d is no longer shown
    assert not [m for m in mail.outbox if m.to == [d.email]]
    # a match without a complete set is not counted (it becomes training): left out
    play(season, (a, b), (c, d), at("2027-04-07 10:00"), {"sets": [{"a": 3, "b": 2}], "unfinished": True})
    assert weekly.summaries(season, date(2027, 4, 5), date(2027, 4, 11))[str(a.pk)].matches == 5

def test_jungle_report_rank_and_goal_words(season: LeagueSeason) -> None:
    gold = Standing(rank_index=8, tier="gold", division="II", lp=70, matches_played=12)
    master = Standing(rank_index=24, tier="master", division="", lp=0, matches_played=30)
    assert weekly._rank(None, "en") == "in placement"
    assert weekly._rank(gold, "ro") == "Aur II" and weekly._rank(master, "en") == "Master"
    assert weekly._goal(None, season, "ro").endswith("încă 12 meciuri până la clasamentul final.")
    assert weekly._goal(gold, season, "en") == "This week's goal: 30 more LP to the next division."
    assert weekly._goal(master, season, "ro").startswith("Obiectivul săptămânii: păstrează")
