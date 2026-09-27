"""Displayed level 1.0–7.0 (§6.3) and the questionnaire entry point (§6.4)."""

from .config import LeagueConfig
from .rounding import round_one_decimal


def level_from_mu(mu: float, config: LeagueConfig) -> float:
    """LG-030: Level = clamp(4.0 + (μ − 25)/5, 1.0, 7.0), one decimal."""
    raw = config.level_center + (mu - config.mu0) / config.level_mu_per_point
    return round_one_decimal(min(config.level_max, max(config.level_min, raw)))


def mu_from_level(level: float, config: LeagueConfig) -> float:
    """LG-040: μ_initial = 25 + 5·(L0 − 4) for the questionnaire level L0 (clamped to 1.0–7.0)."""
    clamped = min(config.level_max, max(config.level_min, level))
    return config.mu0 + config.level_mu_per_point * (clamped - config.level_center)


def expected_total_lp(level: float, config: LeagueConfig) -> float:
    """LG-061: LP_total_expected = (Level − 1.0)/6.0 × 2000 (both anchor levels configurable)."""
    span = config.expected_lp_level_master - config.expected_lp_level_floor
    return (level - config.expected_lp_level_floor) / span * config.expected_lp_span
