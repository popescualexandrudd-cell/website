"""The website's level simulator (§9.2.6): the official questionnaire's estimate (R-003, Q47) of
answers given on pills, and a recommendation. Nothing is stored."""

from __future__ import annotations

from collections.abc import Callable
from decimal import Decimal
from typing import Any

import pytest
from django.test import Client

from jungle.accounts.models import User
from jungle.audit.models import AuditLog
from jungle.conftest import Api, error_code, login_as
from jungle.core.errors import DomainError, ErrorCode
from jungle.league import level_guess
from jungle.league.models import LevelQuestionnaire

pytestmark = pytest.mark.django_db

PLAYED: dict[str, Any] = {
    "padel": "one_to_three",
    "skill": "walls",
    "tournaments": "none",
    "racket": "none",
    "frequency": "weekly",
    "goal": "play",
}


@pytest.mark.parametrize(
    ("answers", "band", "years", "level"),
    [
        # at least a year of padel, weekly or more: the upper of the skill's two bands
        (PLAYED, "3.5", 1, "3.75"),
        ({**PLAYED, "frequency": "several"}, "3.5", 1, "3.75"),
        # rarely or monthly, or under a year of padel: the lower band
        ({**PLAYED, "frequency": "monthly"}, "3.0", 1, "3.25"),
        ({**PLAYED, "padel": "under_year", "frequency": "several"}, "3.0", 0, "3.00"),
        (
            {**PLAYED, "padel": "over_three", "skill": "first", "frequency": "rarely"},
            "1.0",
            3,
            "1.25",
        ),
        ({**PLAYED, "padel": "over_three", "skill": "rallies"}, "2.5", 3, "2.75"),
        ({**PLAYED, "skill": "tactics", "racket": "competitive"}, "4.5", 1, "5.00"),
        ({**PLAYED, "skill": "competition", "tournaments": "club"}, "5.5", 1, "5.75"),
        # the last band is a single one (6.0–7.0), and the estimate never leaves it
        (
            {
                **PLAYED,
                "skill": "elite",
                "racket": "competitive",
                "tournaments": "regional_national",
            },
            "6.0",
            1,
            "7.00",
        ),
        ({**PLAYED, "skill": "elite", "frequency": "rarely"}, "6.0", 1, "6.50"),
    ],
)
def test_r003_q47_the_simulator_fills_the_official_questionnaire(
    answers: dict[str, Any], band: str, years: int, level: str
) -> None:
    shown = level_guess.guess(**answers)
    assert shown.questionnaire == {
        "band": band,
        "years_playing": years,
        "racket_background": answers["racket"],
        "tournaments": answers["tournaments"],
    }
    assert str(shown.level) == level


@pytest.mark.parametrize(("racket", "level"), [("none", "1.00"), ("competitive", "1.25")])
def test_r003_never_played_starts_in_the_first_band_whatever_else_was_sent(
    racket: Any, level: str
) -> None:
    shown = level_guess.guess(
        "never", racket, "play", skill="elite", tournaments="regional_national", frequency="several"
    )
    assert shown.questionnaire == {
        "band": "1.0",
        "years_playing": 0,
        "racket_background": racket,
        "tournaments": "none",
    }
    assert str(shown.level) == level


@pytest.mark.parametrize("missing", ["skill", "tournaments", "frequency"])
def test_r003_someone_who_played_answers_the_questions_about_their_game(missing: str) -> None:
    with pytest.raises(DomainError) as exc:
        level_guess.guess(**{k: v for k, v in PLAYED.items() if k != missing})
    assert exc.value.code is ErrorCode.LEAGUE_QUESTIONNAIRE_INVALID


@pytest.mark.parametrize(
    ("padel", "level", "goal", "recommendations"),
    [
        ("never", "1.25", "learn", ["intro_lesson"]),
        ("never", "1.25", "play", ["intro_lesson", "open_matches"]),
        ("never", "1.25", "compete", ["intro_lesson", "league"]),
        ("under_year", "1.99", "learn", ["intro_lesson"]),
        ("under_year", "2.00", "learn", ["coaching"]),
        ("one_to_three", "3.75", "play", ["open_matches"]),
        ("over_three", "5.75", "compete", ["league"]),
    ],
)
def test_the_recommendation_starts_beginners_with_an_introductory_lesson(
    padel: Any, level: str, goal: Any, recommendations: list[str]
) -> None:
    assert level_guess.recommend(padel, Decimal(level), goal) == recommendations


def test_r003_the_public_endpoint_stores_nothing_and_matches_the_official_questionnaire(
    api: Api, client: Client, make_user: Callable[..., User]
) -> None:
    response = api.get("/league/level-guess", data={**PLAYED, "goal": "compete"})
    assert response.status_code == 200
    body = response.json()
    assert body == {
        "level": "3.75",
        "questionnaire": {
            "band": "3.5",
            "years_playing": 1,
            "racket_background": "none",
            "tournaments": "none",
        },
        "recommendations": ["league"],
    }
    assert not LevelQuestionnaire.objects.exists() and not AuditLog.objects.exists()

    # the questionnaire pre-filled from the simulator gives the same estimate (R-003)
    login_as(client, make_user(), mfa=False)
    official = api.post("/league/questionnaire", body["questionnaire"])
    assert official.status_code == 201 and official.json()["estimated_level"] == body["level"]


def test_the_public_endpoint_needs_the_game_questions_and_known_answers(api: Api) -> None:
    answers = {"padel": "never", "racket": "none", "goal": "learn"}
    never = api.get("/league/level-guess", data=answers)
    assert never.status_code == 200
    assert never.json()["level"] == "1.00" and never.json()["recommendations"] == ["intro_lesson"]

    partial = api.get("/league/level-guess", data={**PLAYED, "skill": ""})
    assert partial.status_code == 422
    missing = {k: v for k, v in PLAYED.items() if k != "frequency"}
    response = api.get("/league/level-guess", data=missing)
    assert response.status_code == 400
    assert error_code(response) == "league.questionnaire_invalid"
    assert api.get("/league/level-guess", data={**PLAYED, "goal": "win"}).status_code == 422
