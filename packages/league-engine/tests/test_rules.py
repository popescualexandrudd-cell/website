"""LG-100 … LG-113: eligibility, anti-abuse and challenges."""

from datetime import UTC, datetime, timedelta

from jungle_league import DEFAULT_CONFIG as C
from jungle_league import LeagueConfig, ThirdRefusal
from jungle_league.antiabuse import (
    counts_despite_level_gap,
    final_eligible,
    live_eligible,
    repetition_multiplier,
    within_daily_limit,
)
from jungle_league.challenges import (
    RefusalOutcome,
    can_challenge,
    refusal_outcome,
    response_deadline,
    schedule_deadline,
)


def test_lg_100_final_ranking_needs_12_matches():
    assert final_eligible(12, 12) and not final_eligible(11, 12)


def test_lg_101_live_eligibility_grows_with_the_weeks():
    assert live_eligible(0, 0, 12)
    assert live_eligible(3, 3, 12) and not live_eligible(2, 3, 12)
    assert live_eligible(12, 20, 12) and not live_eligible(11, 20, 12)
    assert live_eligible(0, -1, 12)


def test_lg_102_diminishing_returns_for_the_same_group():
    assert [repetition_multiplier(n, C) for n in range(5)] == [1.0, 1.0, 0.5, 0.25, 0.25]


def test_lg_103_three_official_matches_per_day():
    assert within_daily_limit(2, C) and not within_daily_limit(3, C)


def test_lg_104_level_gap_limit_disabled_by_default():
    assert counts_despite_level_gap(1.0, 7.0, C)
    limited = LeagueConfig(level_gap_limit=1.5)
    assert counts_despite_level_gap(3.0, 4.5, limited)
    assert not counts_despite_level_gap(3.0, 4.6, limited)


def test_lg_110_challenge_at_most_one_division_above():
    assert can_challenge(5, 5, C) and can_challenge(5, 6, C)
    assert not can_challenge(5, 7, C) and not can_challenge(5, 4, C)


def test_lg_111_lg_112_deadlines():
    now = datetime(2027, 3, 28, 10, tzinfo=UTC)
    assert response_deadline(now, C) - now == timedelta(hours=72)
    assert schedule_deadline(now, C) - now == timedelta(days=7)


def test_lg_111_refusals():
    assert refusal_outcome(0, C) is RefusalOutcome.ALLOWED
    assert refusal_outcome(1, C) is RefusalOutcome.ALLOWED
    assert refusal_outcome(2, C) is RefusalOutcome.RECORDED
    strict = LeagueConfig(challenge_third_refusal=ThirdRefusal.TECHNICAL_LOSS)
    assert refusal_outcome(2, strict) is RefusalOutcome.TECHNICAL_LOSS
