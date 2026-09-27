"""LG-070 … LG-084: the score validator and unfinished matches."""

import pytest
from jungle_league import (
    DEFAULT_CONFIG,
    FinalSet,
    LeagueConfig,
    MatchScore,
    ScoreError,
    SetScore,
    Side,
)
from jungle_league import validate_score as _validate

SUPER = LeagueConfig(final_set=FinalSet.SUPER_TIEBREAK)


def validate(*sets, unfinished=False, config=DEFAULT_CONFIG, tournament=False):
    return _validate(MatchScore(tuple(sets), unfinished), config, tournament)


def code(*sets, **kwargs):
    with pytest.raises(ScoreError) as error:
        validate(*sets, **kwargs)
    return error.value.code


S = SetScore


@pytest.mark.parametrize(
    "sets",
    [
        (S(6, 0), S(6, 4)),
        (S(7, 5), S(4, 6), S(6, 3)),
        (S(7, 6, (7, 5)), S(6, 7, (10, 12)), S(7, 6, (9, 7))),
        (S(6, 4), S(7, 6, (8, 6))),
    ],
)
def test_lg_070_lg_071_valid_complete_matches(sets):
    result = validate(*sets)
    assert result.counts and result.completion_weight == 1.0 and result.winner in (Side.A, Side.B)


def test_lg_071_winner_is_the_side_with_two_sets():
    assert validate(S(4, 6), S(6, 2), S(5, 7)).winner is Side.B
    assert validate(S(6, 1), S(6, 1)).winner is Side.A


@pytest.mark.parametrize(
    ("sets", "error"),
    [
        ((S(6, 5), S(6, 0)), "league.score_set_not_finished"),
        ((S(8, 6), S(6, 0)), "league.score_impossible_set"),
        ((S(7, 3), S(6, 0)), "league.score_impossible_set"),
        ((S(7, 6), S(6, 0)), "league.score_tiebreak_missing"),
        ((S(7, 6, (6, 4)), S(6, 0)), "league.score_tiebreak_invalid"),
        ((S(7, 6, (9, 5)), S(6, 0)), "league.score_tiebreak_invalid"),
        ((S(7, 6, (5, 7)), S(6, 0)), "league.score_tiebreak_invalid"),
        ((S(7, 6, (-1, 7)), S(6, 0)), "league.score_tiebreak_invalid"),
        ((S(6, 4, (7, 5)), S(6, 0)), "league.score_impossible_set"),
        ((S(6, 6, (3, 2)), S(6, 0)), "league.score_impossible_set"),
        ((S(-1, 6), S(6, 0)), "league.score_negative"),
        ((S(6, 0), S(6, 0), S(6, 0)), "league.score_set_after_match_won"),
        ((S(6, 0), S(0, 6)), "league.score_match_not_finished"),
        ((S(6, 0),), "league.score_match_not_finished"),
        ((), "league.score_set_count"),
        ((S(6, 0), S(0, 6), S(6, 0), S(6, 0)), "league.score_set_count"),
        (
            (S(6, 0), S(0, 6), S(10, 8, super_tiebreak=True)),
            "league.score_super_tiebreak_not_allowed",
        ),
    ],
)
def test_lg_074_impossible_scores_are_refused(sets, error):
    assert code(*sets) == error


def test_lg_073_super_tiebreak_third_set():
    assert validate(S(6, 3), S(3, 6), S(10, 8, super_tiebreak=True), config=SUPER).winner is Side.A
    assert validate(S(6, 3), S(3, 6), S(11, 13, super_tiebreak=True), config=SUPER).winner is Side.B
    assert code(S(6, 3), S(3, 6), S(6, 3), config=SUPER) == "league.score_super_tiebreak_required"
    assert (
        code(S(6, 3), S(3, 6), S(14, 11, super_tiebreak=True), config=SUPER)
        == "league.score_impossible_set"
    )
    assert code(S(6, 3), S(3, 6), S(10, 8, (1, 0), super_tiebreak=True), config=SUPER) == (
        "league.score_impossible_set"
    )
    assert (
        code(S(10, 8, super_tiebreak=True), S(6, 0), config=SUPER)
        == "league.score_super_tiebreak_not_allowed"
    )


def test_lg_075_lg_082_unfinished_with_one_complete_set():
    result = validate(S(6, 4), S(3, 2), unfinished=True)
    assert (result.winner, result.complete_sets, result.counts, result.completion_weight) == (
        Side.A,
        1,
        True,
        0.5,
    )
    assert validate(S(6, 4), unfinished=True).completion_weight == 0.5


def test_lg_081_unfinished_winner_by_games_then_draw():
    assert validate(S(6, 4), S(4, 6), unfinished=True).winner is None  # 10–10 games: draw
    assert validate(S(6, 4), S(4, 6), S(2, 1), unfinished=True).winner is Side.A
    assert validate(S(6, 4), S(4, 6), S(1, 3), unfinished=True).winner is Side.B
    assert validate(S(6, 4), S(4, 6), S(2, 2), unfinished=True).completion_weight == 0.75
    assert (
        validate(
            S(6, 4), S(4, 6), S(12, 11, super_tiebreak=True), unfinished=True, config=SUPER
        ).winner
        is None
    )


def test_lg_081_super_tiebreak_counts_as_one_game_when_complete():
    # Sets 1–1 and games 10–10: a complete super tie-break decides the match.
    assert validate(S(6, 4), S(4, 6), S(10, 5, super_tiebreak=True), config=SUPER).winner is Side.A


def test_lg_083_no_complete_set_becomes_training():
    result = validate(S(4, 3), unfinished=True)
    assert (result.counts, result.completion_weight, result.winner) == (False, 0.0, None)


def test_lg_075_partial_set_only_when_marked_unfinished_and_last():
    assert code(S(3, 2), S(6, 4), unfinished=True) == "league.score_set_not_finished"
    assert code(S(6, 4), S(6, 3), unfinished=True) == "league.score_marked_unfinished_but_won"


def test_lg_084_tournament_matches_are_played_to_the_end():
    assert (
        code(S(6, 4), S(2, 1), unfinished=True, tournament=True)
        == "league.score_tournament_unfinished"
    )
    assert validate(S(6, 4), S(6, 1), tournament=True).completion_weight == 1.0
