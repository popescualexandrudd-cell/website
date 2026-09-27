"""LG-025, LG-030, LG-040, LG-061, LG-066: configuration, rounding and levels."""

import pytest
from jungle_league import (
    DEFAULT_CONFIG,
    LeagueConfig,
    level_from_mu,
    mu_from_level,
    round_half_away,
)
from jungle_league.levels import expected_total_lp
from jungle_league.rounding import round_one_decimal


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (2.5, 3),
        (-2.5, -3),
        (0.5, 1),
        (-0.5, -1),
        (2.4999, 2),
        (-2.4999, -2),
        (9.6, 10),
        (0.0, 0),
        (1.5, 2),
    ],
)
def test_lg_066_rounding_half_away_from_zero(value, expected):
    assert round_half_away(value) == expected


def test_lg_066_python_round_would_be_wrong():
    assert round(2.5) == 2  # banker's rounding: the reason round() is never used for LP
    assert round_half_away(2.5) == 3


def test_lg_025_default_parameters_from_the_specification():
    c = DEFAULT_CONFIG
    assert (c.mu0, c.sigma0, c.beta, c.tau) == (25.0, 25 / 3, 25 / 6, 25 / 300)
    assert c.k_factor == 40 and c.placement_matches == 5 and c.placement_cap_index == 12


@pytest.mark.parametrize(
    "kwargs",
    [
        {"sigma0": 0},
        {"kappa": 1},
        {"g_min": 1.2},
        {"demotion_lp": 100},
        {"placement_cap_index": 21},
        {"weight_one_set": 0.9},
        {"expected_lp_level_floor": 7.0},
        {"repetition_later_multiplier": 0.7},
        {"season_compression": 1.1},
    ],
)
def test_invalid_configuration_is_refused(kwargs):
    with pytest.raises(ValueError, match="invalid league configuration"):
        LeagueConfig(**kwargs)


@pytest.mark.parametrize(
    ("mu", "level"),
    [
        (25, 4.0),
        (30, 5.0),
        (20, 3.0),
        (-100, 1.0),
        (100, 7.0),
        (27.25, 4.5),
        (26.75, 4.4),
        (25.0000001, 4.0),
    ],
)
def test_lg_030_level_from_mu(mu, level):
    assert level_from_mu(mu, DEFAULT_CONFIG) == level


def test_lg_030_level_is_rounded_half_away_from_zero_to_one_decimal():
    assert round_one_decimal(4.25) == 4.3
    assert round_one_decimal(4.35) == 4.4


@pytest.mark.parametrize(
    ("level", "mu"), [(4.0, 25.0), (1.0, 10.0), (7.0, 40.0), (5.5, 32.5), (9.0, 40.0), (0, 10.0)]
)
def test_lg_040_questionnaire_level_to_mu(level, mu):
    assert mu_from_level(level, DEFAULT_CONFIG) == mu


def test_lg_061_expected_lp_spans_bronze_iv_to_master():
    spec = LeagueConfig(expected_lp_level_floor=1.0, expected_lp_level_master=7.0)
    assert expected_total_lp(1.0, spec) == 0
    assert expected_total_lp(7.0, spec) == 2000
    assert expected_total_lp(4.0, spec) == 1000
    # Calibrated default (simulation report): Bronze IV at level 1.3, Master at level 5.9.
    assert expected_total_lp(1.3, DEFAULT_CONFIG) == 0
    assert expected_total_lp(5.9, DEFAULT_CONFIG) == pytest.approx(2000)


def test_lg_061_calibrated_anchors():
    calibrated = LeagueConfig(expected_lp_level_floor=2.0, expected_lp_level_master=6.0)
    assert expected_total_lp(6.0, calibrated) == 2000
    assert expected_total_lp(4.0, calibrated) == 1000
