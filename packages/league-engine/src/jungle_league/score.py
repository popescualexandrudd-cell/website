"""Score validator (§6.7) and unfinished matches (§6.8).

Sets to 6 games, tie-break at 6–6 (to 7, 2 clear), best of 3 sets. The third set is a full set
or a super tie-break (to 10, 2 clear), per competition. An unfinished match may end with a
partial set, marked explicitly; it counts only with at least one complete set.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from .config import FinalSet, LeagueConfig


class Side(StrEnum):
    A = "a"
    B = "b"


class ScoreError(ValueError):
    """Stable error codes, translated in packages/i18n (`errors.league.*`)."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


@dataclass(frozen=True, slots=True)
class SetScore:
    a: int
    b: int
    tiebreak: tuple[int, int] | None = None  # points of the 6–6 tie-break (required for 7–6)
    super_tiebreak: bool = False  # the whole set is a super tie-break; a/b are its points


@dataclass(frozen=True, slots=True)
class MatchScore:
    sets: tuple[SetScore, ...]
    unfinished: bool = False


@dataclass(frozen=True, slots=True)
class ScoreResult:
    winner: Side | None  # None: a draw (only possible when unfinished)
    complete_sets: int
    counts: bool  # False: no complete set, the match becomes training (LG-083)
    completion_weight: float  # w: 1.0, 0.75, 0.5 or 0.0 (LG-082)


def _won_by(a: int, b: int, to: int) -> bool:
    """A race to `to` points, 2 clear, that ends as soon as it is won."""
    top, low = max(a, b), min(a, b)
    return top >= to and top - low >= 2 and (top == to or top - low == 2)


def _set_winner(s: SetScore) -> Side | None:
    """The winner of a complete set, None for a legal unfinished set.

    Raises ScoreError for impossible scores.
    """
    if s.a < 0 or s.b < 0:
        raise ScoreError("league.score_negative")
    a_leads = s.a > s.b
    if s.super_tiebreak:
        if s.tiebreak is not None:
            raise ScoreError("league.score_impossible_set")
        if _won_by(s.a, s.b, 10):
            return Side.A if a_leads else Side.B
        if max(s.a, s.b) < 10 or abs(s.a - s.b) < 2:
            return None
        raise ScoreError("league.score_impossible_set")
    top, low = max(s.a, s.b), min(s.a, s.b)
    if (top == 6 and low <= 4) or (top == 7 and low == 5):
        if s.tiebreak is not None:
            raise ScoreError("league.score_impossible_set")
        return Side.A if a_leads else Side.B
    if top == 7 and low == 6:
        if s.tiebreak is None:
            raise ScoreError("league.score_tiebreak_missing")
        ta, tb = s.tiebreak
        if ta < 0 or tb < 0 or not _won_by(ta, tb, 7) or (ta > tb) != a_leads:
            raise ScoreError("league.score_tiebreak_invalid")
        return Side.A if a_leads else Side.B
    if top <= 6 and s.tiebreak is None:
        return None  # e.g. 3–2, 6–5, 6–6: legal only as the unfinished last set
    raise ScoreError("league.score_impossible_set")


def validate_score(
    score: MatchScore, config: LeagueConfig, tournament: bool = False
) -> ScoreResult:
    """LG-070 … LG-083. Raises ScoreError with a stable code for any impossible score."""
    final_set = config.final_set
    if not 1 <= len(score.sets) <= 3:
        raise ScoreError("league.score_set_count")
    if tournament and score.unfinished:
        raise ScoreError(
            "league.score_tournament_unfinished"
        )  # LG-084: tournaments play to the end
    won = {Side.A: 0, Side.B: 0}
    games = {Side.A: 0, Side.B: 0}
    complete = 0
    for index, s in enumerate(score.sets):
        if s.super_tiebreak and not (index == 2 and final_set is FinalSet.SUPER_TIEBREAK):
            raise ScoreError("league.score_super_tiebreak_not_allowed")
        if index == 2 and final_set is FinalSet.SUPER_TIEBREAK and not s.super_tiebreak:
            raise ScoreError("league.score_super_tiebreak_required")
        if max(won.values()) == 2:
            raise ScoreError("league.score_set_after_match_won")
        winner = _set_winner(s)
        last = index == len(score.sets) - 1
        if winner is None:
            if not (score.unfinished and last):
                raise ScoreError("league.score_set_not_finished")
            if not s.super_tiebreak:
                games[Side.A] += s.a
                games[Side.B] += s.b
            continue
        complete += 1
        won[winner] += 1
        if s.super_tiebreak:
            games[winner] += 1  # a super tie-break counts as one game, as in the official notation
        else:
            games[Side.A] += s.a
            games[Side.B] += s.b

    decided = max(won.values()) == 2
    if not score.unfinished:
        if not decided:
            raise ScoreError("league.score_match_not_finished")
        return ScoreResult(Side.A if won[Side.A] == 2 else Side.B, complete, True, 1.0)
    if decided:
        raise ScoreError("league.score_marked_unfinished_but_won")
    if complete == 0:
        return ScoreResult(None, 0, False, 0.0)
    weight = config.weight_two_sets_tied if complete == 2 else config.weight_one_set
    if won[Side.A] != won[Side.B]:
        winner = Side.A if won[Side.A] > won[Side.B] else Side.B
    elif games[Side.A] != games[Side.B]:
        winner = Side.A if games[Side.A] > games[Side.B] else Side.B
    else:
        winner = None
    return ScoreResult(winner, complete, True, weight)
