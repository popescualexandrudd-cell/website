"""LG-060 … LG-067: LP of one official match, with the examples of §6.6."""

import pytest
from jungle_league import DEFAULT_CONFIG, LeagueConfig, MatchType, lp_delta
from jungle_league.levels import expected_total_lp
from jungle_league.lp import LpInput, momentum_factor, type_multiplier

# The formulas exactly as written in §6.6 (expected LP from 1.0 to 7.0), for the worked examples.
C = LeagueConfig(expected_lp_level_floor=1.0, expected_lp_level_master=7.0)


def lp(outcome, p, level=4.0, total=1000, match_type=MatchType.OFFICIAL, w=1.0, rep=1.0):
    return lp_delta(LpInput(outcome, p, level, total, match_type, w, rep), C)


@pytest.mark.parametrize(
    ("outcome", "p", "expected"),
    [(1, 0.5, 20), (0, 0.5, -20), (1, 0.24, 30), (0, 0.76, -30), (1, 0.76, 10), (0, 0.24, -10)],
)
def test_lg_060_examples_from_the_specification(outcome, p, expected):
    """Equal teams ±20; the underdog (p = 0.24) wins +30/−30;
    the favourite (p = 0.76) wins +10/−10."""
    assert lp(outcome, p) == expected


def test_lg_062_momentum_factor():
    # MMR above the rank (level 5.5 expects 1500 LP, the player has 1000):
    # climbs faster, loses less.
    assert momentum_factor(1.0, 5.5, 1000, C) == 1.5
    assert momentum_factor(0.0, 5.5, 1000, C) == 0.75
    assert momentum_factor(1.0, 4.0, 1200, C) == pytest.approx(0.8)
    assert momentum_factor(0.0, 4.0, 1200, C) == pytest.approx(1.2)
    assert momentum_factor(0.5, 7.0, 0, C) == 1.0


def test_lg_063_type_multipliers():
    assert type_multiplier(MatchType.OFFICIAL, C) == 1.0
    assert type_multiplier(MatchType.TOURNAMENT, C) == 1.5
    assert type_multiplier(MatchType.CHALLENGE, C) == 1.0
    assert lp(1, 0.5, match_type=MatchType.TOURNAMENT) == 30


def test_lg_064_lg_065_completion_and_repetition_reduce_lp():
    assert lp(1, 0.5, w=0.5) == 10
    assert lp(1, 0.5, w=0.75) == 15
    assert lp(1, 0.5, rep=0.25) == 5


def test_lg_067_clamps():
    assert lp(1, 0.99) == 3
    assert lp(0, 0.01) == -3
    assert lp(1, 0.0, level=7.0, total=0, match_type=MatchType.TOURNAMENT) == 60
    assert lp(0, 1.0, level=1.0, total=2000, match_type=MatchType.TOURNAMENT) == -60
    assert lp(0.5, 0.1, match_type=MatchType.TOURNAMENT) == 20
    assert lp(0.5, 0.9, match_type=MatchType.TOURNAMENT) == -20
    assert lp(0.5, 0.5) == 0


def test_lg_066_half_rounds_away_from_zero():
    # 40 × (1 − 0.6875) = 12.5 → 13; the loss side: −12.5 → −13
    assert lp(1, 0.6875) == 13
    assert lp(0, 0.3125) == -13


def test_invalid_outcome_is_refused():
    with pytest.raises(ValueError, match="outcome"):
        lp(0.7, 0.5)


def test_lg_061_calibrated_default_keeps_g_at_1_on_the_expected_rank():
    total = round(expected_total_lp(4.0, DEFAULT_CONFIG))
    assert momentum_factor(1.0, 4.0, total, DEFAULT_CONFIG) == pytest.approx(1.0, abs=1e-3)
