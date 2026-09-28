"""Badges (§6.15, LG-150) and the Diamond card offer at the first Diamond (R-024)."""

from __future__ import annotations

from collections.abc import Callable
from datetime import date
from typing import Any

import pytest
from django.test import Client

from jungle.accounts.models import User
from jungle.audit.services import SYSTEM
from jungle.cards import services as cards
from jungle.cards.models import PhysicalCardRequest, PrintReason
from jungle.configuration.models import Marker
from jungle.configuration.services import publish_config
from jungle.conftest import Api, grant, login_as
from jungle.core.permissions import Role
from jungle.league import badges, daily
from jungle.league.models import Badge, LeagueSeason
from jungle.league.tests.conftest import WIN_A, WIN_B, at, placed, play, staff_request

pytestmark = pytest.mark.django_db

Join = Callable[..., User]
DRAW = {"sets": [{"a": 6, "b": 4}, {"a": 4, "b": 6}], "unfinished": True}
NO_SET = {"sets": [{"a": 3, "b": 2}], "unfinished": True}


@pytest.fixture
def low_thresholds(make_user: Callable[..., User], now: Any) -> None:
    admin = make_user()
    grant(admin, Role.ADMIN)
    publish_config(
        staff_request(admin),
        "league.badges",
        {
            "giant_slayer_levels": 1.0,
            "win_streak": 3,
            "early_bird_before_hour": 10,
            "early_bird_matches": 2,
            "weekly_streak_weeks": 2,
        },
        Marker.TO_CONFIRM,
        "test",
    )


def codes(user: User) -> set[str]:
    return set(Badge.objects.filter(user=user).values_list("code", flat=True))


def test_lg150_giant_slayer_also_after_a_replay(
    season: LeagueSeason, join: Join, django_capture_on_commit_callbacks: Any
) -> None:
    a, b = join(level="3.00"), join(level="3.00")
    c, d = join(level="5.00"), join(level="5.00")
    with django_capture_on_commit_callbacks(execute=True):
        play(season, (a, b), (c, d), at("2027-04-06 10:00"), WIN_B)  # the favourites win
    assert "giant_slayer" not in codes(a)
    with django_capture_on_commit_callbacks(execute=True):
        play(season, (a, b), (c, d), at("2027-04-05 12:00"))  # late, replayed: the upset
    assert "giant_slayer" in codes(a) and "giant_slayer" in codes(b)
    assert "giant_slayer" not in codes(c)
    badge = Badge.objects.get(user=a, code="giant_slayer")
    assert badge.key == str(season.pk) and badge.details["levels"] >= 1.0
    assert str(badge).startswith("giant_slayer")


def test_lg150_streaks_early_birds_and_weeks(
    season: LeagueSeason, join: Join, low_thresholds: None, django_capture_on_commit_callbacks: Any
) -> None:
    a, b, c, d = (join() for _ in range(4))
    for when, score in (
        ("2027-04-05 09:30", WIN_A),
        ("2027-04-06 09:30", WIN_A),
        ("2027-04-12 11:00", WIN_A),
        ("2027-04-12 13:00", DRAW),  # no winner
        ("2027-04-12 15:00", NO_SET),  # training
    ):
        with django_capture_on_commit_callbacks(execute=True):  # each after its own commit
            play(season, (a, b), (c, d), at(when), score)
    assert codes(a) == {"win_streak", "early_bird", "weekly_streak"}
    assert codes(c) == {"early_bird", "weekly_streak"}
    assert Badge.objects.get(user=a, code="weekly_streak").details == {"weeks": 2}


def test_lg150_upset_of_the_week_on_mondays(
    season: LeagueSeason, join: Join, django_capture_on_commit_callbacks: Any
) -> None:
    a, b = join(level="3.00"), join(level="3.00")
    c, d = join(level="5.00"), join(level="5.00")
    play(season, (a, b), (c, d), at("2027-04-05 12:00"), WIN_B)  # expected
    play(season, (a, b), (c, d), at("2027-04-07 12:00"))  # the upset
    report = daily.run_daily(date(2027, 4, 12))
    assert report.badges == 2
    assert {b.user_id for b in Badge.objects.filter(code="upset_of_week")} == {a.pk, b.pk}
    assert Badge.objects.filter(code="upset_of_week").first().key == "2027-W14"  # type: ignore[union-attr]
    assert badges.upset_of_week(season, date(2027, 4, 5)) == 0  # already given
    assert badges.upset_of_week(season, date(2027, 4, 12)) == 0  # a week without matches


def test_r024_first_diamond_offers_the_card_and_promotions_count(
    season: LeagueSeason, join: Join, django_capture_on_commit_callbacks: Any
) -> None:
    LeagueSeason.objects.filter(pk=season.pk).update(config={"placement_cap_index": 20})
    season.refresh_from_db()

    def with_card() -> User:
        user = join(level="7.00")
        cards.issue_card(SYSTEM, user)
        return user

    with django_capture_on_commit_callbacks(execute=True):
        players = placed(season, with_card)
    diamonds = Badge.objects.filter(code="first_diamond", key="")
    assert diamonds.count() == 4
    assert PhysicalCardRequest.objects.filter(reason=PrintReason.DIAMOND).count() == 4

    event = play(season, players[:2], players[2:], at("2027-04-07 10:00"))
    outcome = dict(event.records.get().payload)
    outcome["updates"] = [{**u, "change": "promoted"} for u in outcome["updates"]]
    badges.after_match(season, event, outcome)
    assert Badge.objects.filter(code="promotion").count() == 4
    badges.after_match(season, event, outcome)  # once per season
    assert Badge.objects.filter(code="promotion").count() == 4
    assert PhysicalCardRequest.objects.filter(reason=PrintReason.DIAMOND).count() == 4


def test_badges_are_private_in_the_own_account(
    api: Api, client: Client, season: LeagueSeason, join: Join
) -> None:
    a, b, c, d = (join() for _ in range(4))
    badges.grant(a, "king", str(season.pk), season, {"position": 1})
    login_as(client, a, mfa=False)
    assert [x["code"] for x in api.get("/league/me").json()["badges"]] == ["king"]
    login_as(client, b, mfa=False)
    assert api.get("/league/me").json()["badges"] == []
    event = play(season, (a, b), (c, d), at("2027-04-05 10:00"))
    badges.after_match(season, event, {"cancelled": "x"})  # not a match outcome: nothing
