"""Anti-abuse and eligibility (§6.10)."""

from __future__ import annotations

from .config import LeagueConfig


def repetition_multiplier(previous_same_group: int, config: LeagueConfig) -> float:
    """LG-102: m_rep for a match of the exact same players, given how many such matches they
    already played in the last 7 days: matches 1–2 count 100%, the 3rd 50%, later ones 25%."""
    if previous_same_group < config.repetition_full_matches:
        return 1.0
    if previous_same_group == config.repetition_full_matches:
        return config.repetition_third_multiplier
    return config.repetition_later_multiplier


def within_daily_limit(matches_today: int, config: LeagueConfig) -> bool:
    """LG-103: at most 3 official matches per player per day (the new match included)."""
    return matches_today < config.max_official_matches_per_day


def live_eligible(matches_played: int, full_weeks_elapsed: int, minimum: int) -> bool:
    """LG-101: eligible for the live top (King of the Jungle included) with
    matches ≥ min(12, complete weeks elapsed in the season)."""
    return matches_played >= min(minimum, max(0, full_weeks_elapsed))


def final_eligible(matches_played: int, minimum: int) -> bool:
    """LG-100: the final ranking and rewards need 12 official matches (pairs: 6, Q31)."""
    return matches_played >= minimum


def counts_despite_level_gap(level_a: float, level_b: float, config: LeagueConfig) -> bool:
    """LG-104 (Q5): a level-gap limit, disabled by default: every match counts."""
    if config.level_gap_limit is None:
        return True
    return abs(level_a - level_b) <= config.level_gap_limit
