"""The website's level simulator (§9.2.6): a few answers on pills become the answers of the official
level questionnaire (R-003, Q47) and a recommendation. Nothing is stored and nobody is identified.

The level shown is the official estimate (``services.estimate_level``) of those answers, so the
questionnaire pre-filled from the simulator gives the same number; a coach still validates it
before the first league match (R-003). The mapping below was chosen in Stage 11 under the owner's
delegation (29.09.2026) and is described in docs/04-arhitectura/aplicatii/09-website-simulator.md.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal, TypedDict

from jungle.core.errors import DomainError, ErrorCode
from jungle.league.services import estimate_level

Padel = Literal["never", "under_year", "one_to_three", "over_three"]
Skill = Literal["first", "rallies", "walls", "tactics", "competition", "elite"]
Tournaments = Literal["none", "club", "regional_national"]
Racket = Literal["none", "recreational", "competitive"]
Frequency = Literal["rarely", "monthly", "weekly", "several"]
Goal = Literal["learn", "play", "compete"]
Recommendation = Literal["intro_lesson", "coaching", "open_matches", "league"]

# What the player already does on court → the two level bands it covers (docs/03-liga/NIVELURI.md).
SKILL_BANDS: dict[str, tuple[str, str]] = {
    "first": ("1.0", "1.5"),
    "rallies": ("2.0", "2.5"),
    "walls": ("3.0", "3.5"),
    "tactics": ("4.0", "4.5"),
    "competition": ("5.0", "5.5"),
    "elite": ("6.0", "6.0"),
}
# The questionnaire asks for whole years of padel: the lower end of each answer.
YEARS: dict[str, int] = {"never": 0, "under_year": 0, "one_to_three": 1, "over_three": 3}
REGULAR = ("weekly", "several")
BEGINNER = Decimal("2.0")
CENT = Decimal("0.01")  # shown like the stored questionnaire: two decimals


class Questionnaire(TypedDict):
    """The official questionnaire's answers (``api.QuestionnaireIn``)."""

    band: str
    years_playing: int
    racket_background: str
    tournaments: str


@dataclass(frozen=True)
class Guess:
    level: Decimal
    questionnaire: Questionnaire
    recommendations: list[Recommendation]


def guess(
    padel: Padel,
    racket: Racket,
    goal: Goal,
    skill: Skill | None = None,
    tournaments: Tournaments | None = None,
    frequency: Frequency | None = None,
) -> Guess:
    """Someone who never played starts in the first band, without tournaments (the questions about
    their game are not asked). Otherwise what they do on court picks two bands: the upper one after
    at least a year of padel played weekly or more often, the lower one otherwise."""
    if padel == "never":
        band, tournaments = SKILL_BANDS["first"][0], "none"
    elif skill is None or tournaments is None or frequency is None:
        raise DomainError(ErrorCode.LEAGUE_QUESTIONNAIRE_INVALID)
    else:
        lower, upper = SKILL_BANDS[skill]
        band = upper if YEARS[padel] >= 1 and frequency in REGULAR else lower
    questionnaire: Questionnaire = {
        "band": band,
        "years_playing": YEARS[padel],
        "racket_background": racket,
        "tournaments": tournaments,
    }
    level = estimate_level(dict(questionnaire)).quantize(CENT)
    return Guess(level, questionnaire, recommend(padel, level, goal))


def recommend(padel: Padel, level: Decimal, goal: Goal) -> list[Recommendation]:
    """A beginner (never played, or under 2.0) starts with an introductory lesson; then what the
    player wants: lessons with a coach, matches with players of a similar level, or the league."""
    first: list[Recommendation] = ["intro_lesson"] if padel == "never" or level < BEGINNER else []
    if goal == "compete":
        return [*first, "league"]
    if goal == "play":
        return [*first, "open_matches"]
    return first or ["coaching"]
