"""LG-050 … LG-058, LG-043, LG-106, LG-107: ranks, LP movement, placement rank and decay."""

import pytest
from jungle_league import DEFAULT_CONFIG as C
from jungle_league import LeagueConfig, RankChange, RankState
from jungle_league.ranks import apply_decay, apply_lp, decay_due, decay_warning_due, placement_rank


def test_lg_050_names_and_divisions():
    assert (RankState(0, 0).tier, RankState(0, 0).division) == ("bronze", "IV")
    assert (RankState(7, 0).tier, RankState(7, 0).division) == ("silver", "I")
    assert (RankState(19, 0).tier, RankState(19, 0).division) == ("diamond", "I")
    assert (RankState(20, 0).tier, RankState(20, 0).division) == ("master", None)


@pytest.mark.parametrize(
    "kwargs", [{"index": -1, "lp": 0}, {"index": 21, "lp": 0}, {"index": 3, "lp": -1}]
)
def test_invalid_rank_state_is_refused(kwargs):
    with pytest.raises(ValueError, match="rank index|LP cannot"):
        RankState(**kwargs)


def test_lg_052_total_lp():
    assert RankState(0, 0).total_lp(C) == 0
    assert RankState(19, 0).total_lp(C) == 1900
    assert RankState(20, 250).total_lp(C) == 2250


def test_lg_053_promotion_keeps_the_surplus_and_starts_protection():
    assert apply_lp(RankState(4, 90), 25, C) == (RankState(5, 15, 3), RankChange.PROMOTED)


def test_lg_053_diamond_i_to_master_with_surplus():
    assert apply_lp(RankState(19, 95), 30, C) == (RankState(20, 25, 3), RankChange.PROMOTED)


def test_lg_058_a_single_match_never_promotes_twice():
    state, change = apply_lp(RankState(4, 99), 250, C)
    assert (state.index, state.lp, change) == (5, 99, RankChange.PROMOTED)


def test_lg_051_master_lp_is_unlimited():
    assert apply_lp(RankState(20, 900), 60, C) == (RankState(20, 960, 0), RankChange.NONE)


def test_lg_054_protection_prevents_demotion_and_counts_down():
    state, change = apply_lp(RankState(5, 10, 3), -40, C)
    assert (state, change) == (RankState(5, 0, 2), RankChange.NONE)
    state, _ = apply_lp(state, -10, C)
    state, _ = apply_lp(state, 5, C)
    assert state.protection == 0
    assert apply_lp(state, -20, C) == (RankState(4, 75, 0), RankChange.DEMOTED)


def test_lg_055_demotion_to_75_lp():
    assert apply_lp(RankState(9, 5), -12, C) == (RankState(8, 75, 0), RankChange.DEMOTED)


def test_lg_056_bronze_iv_floor_and_master_to_diamond_i():
    assert apply_lp(RankState(0, 5), -30, C) == (RankState(0, 0, 0), RankChange.NONE)
    assert apply_lp(RankState(20, 5), -30, C) == (RankState(19, 75, 0), RankChange.DEMOTED)


@pytest.mark.parametrize(
    ("mu", "cap", "index"), [(25, 12, 10), (10, 12, 0), (40, 12, 12), (40, 20, 20), (32.5, 20, 15)]
)
def test_lg_043_placement_rank_from_mmr_capped(mu, cap, index):
    spec = LeagueConfig(expected_lp_level_floor=1.0, expected_lp_level_master=7.0)
    assert placement_rank(mu, cap, spec) == RankState(index, 0)


def test_lg_106_decay_only_for_diamond_and_master_after_14_days():
    assert decay_due(RankState(15, 50), 30, C) == 0
    assert decay_due(RankState(16, 50), 14, C) == 0
    assert decay_due(RankState(16, 50), 15, C) == 5
    assert decay_due(RankState(20, 50), 15, C) == 10


def test_lg_106_decay_may_demote_but_not_below_diamond_iv():
    assert apply_decay(RankState(17, 3), 5, C) == (RankState(16, 75), RankChange.DEMOTED)
    assert apply_decay(RankState(16, 3), 5, C) == (RankState(16, 0), RankChange.NONE)
    assert apply_decay(RankState(20, 5), 10, C) == (RankState(19, 75), RankChange.DEMOTED)
    assert apply_decay(RankState(18, 40, 2), 5, C) == (RankState(18, 35, 2), RankChange.NONE)


def test_lg_107_warning_three_days_before_decay():
    assert decay_warning_due(RankState(16, 0), 12, C)
    assert not decay_warning_due(RankState(16, 0), 11, C)
    assert not decay_warning_due(RankState(15, 0), 12, C)
