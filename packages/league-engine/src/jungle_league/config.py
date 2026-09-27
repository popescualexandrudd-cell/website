"""League configuration: every constant of §6 lives here, never in the formulas (ADR-0008 point 6).

A configuration is immutable and carries a version (ADR-0022). The backend stores each version;
a new version applies from the next season unless the admin confirms an immediate change (§6).
Values marked DE_CONFIRMAT in docs/03-liga/ID-URI-REGULI.md are defaults awaiting the owner.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class DeuceRule(StrEnum):
    """What happens at 40–40 (LG-072). Official FIP / Premier Padel rule since 2026: Star Point."""

    STAR_POINT = "star_point"  # two advantages at most, then one deciding point
    GOLDEN_POINT = "golden_point"  # one deciding point at the first deuce
    ADVANTAGE = "advantage"  # classic advantages without limit


class FinalSet(StrEnum):
    """Format of the third set (LG-073)."""

    FULL = "full"  # a normal set with a tie-break at 6–6 (official default)
    SUPER_TIEBREAK = "super_tiebreak"  # a tie-break to 10 points, 2 clear


class ThirdRefusal(StrEnum):
    """What a third refused challenge in a season means (LG-111, Q-owner)."""

    NOTHING = "nothing"  # only shown in the player's own account (default)
    TECHNICAL_LOSS = "technical_loss"


@dataclass(frozen=True, slots=True)
class LeagueConfig:
    version: int = 1

    # Rating (§6.2)
    mu0: float = 25.0
    sigma0: float = 25.0 / 3.0
    beta: float = 25.0 / 6.0
    tau: float = 25.0 / 300.0
    draw_epsilon: float = 0.1
    kappa: float = 0.0001

    # Displayed level (§6.3)
    level_center: float = 4.0
    level_mu_per_point: float = 5.0
    level_min: float = 1.0
    level_max: float = 7.0

    # Entry and placement (§6.4)
    placement_matches: int = 5
    placement_cap_index: int = 12  # Platinum IV

    # Ranks (§6.5)
    lp_per_division: int = 100
    promotion_protection_matches: int = 3
    demotion_lp: int = 75

    # LP (§6.6)
    k_factor: float = 40.0
    expected_lp_span: float = 2000.0
    # LP_total_expected = (Level − floor)/(master − floor) × span. §6.6 starts from 1.0 and 7.0
    # "to be calibrated by simulation": docs/03-liga/simulari/ chose 1.3 and 5.9 (DE_CONFIRMAT);
    # recalibrate with real data after "Season 0 – Calibration" (Q27).
    expected_lp_level_floor: float = 1.3
    expected_lp_level_master: float = 5.9
    g_divisor: float = 1000.0
    g_min: float = 0.75
    g_max: float = 1.5
    tournament_multiplier: float = 1.5
    challenge_multiplier: float = 1.0
    challenge_bonus: int = 5
    win_lp_min: int = 3
    win_lp_max: int = 60
    draw_lp_limit: int = 20

    # Unfinished matches (§6.8)
    weight_two_sets_tied: float = 0.75
    weight_one_set: float = 0.5

    # Anti-abuse and eligibility (§6.10)
    repetition_window_days: int = 7
    repetition_full_matches: int = 2
    repetition_third_multiplier: float = 0.5
    repetition_later_multiplier: float = 0.25
    max_official_matches_per_day: int = 3
    min_matches_per_season: int = 12
    min_matches_per_season_pairs: int = 6  # Q31
    level_gap_limit: float | None = None  # Q5: disabled by default
    decay_grace_days: int = 14
    decay_diamond_lp_per_day: int = 5
    decay_master_lp_per_day: int = 10
    decay_warning_days: int = 3

    # Challenges (§6.11)
    challenge_max_divisions_above: int = 1
    challenge_response_hours: int = 72
    challenge_refusals_per_season: int = 2
    challenge_third_refusal: ThirdRefusal = ThirdRefusal.NOTHING
    challenge_schedule_days: int = 7

    # Seasons (§6.13)
    season_compression: float = 0.75
    season_sigma_increase: float = 1.5
    replacement_matches: int = 3

    # Score format (§6.7)
    deuce_rule: DeuceRule = DeuceRule.STAR_POINT
    final_set: FinalSet = FinalSet.FULL

    def __post_init__(self) -> None:
        checks = {
            "sigma0": self.sigma0 > 0,
            "beta": self.beta > 0,
            "tau": self.tau >= 0,
            "draw_epsilon": self.draw_epsilon > 0,
            "kappa": 0 < self.kappa < 1,
            "level_range": self.level_min < self.level_max,
            "level_mu_per_point": self.level_mu_per_point > 0,
            "placement_matches": self.placement_matches >= 0,
            "placement_cap_index": 0 <= self.placement_cap_index <= MASTER_INDEX,
            "lp_per_division": self.lp_per_division > 0,
            "demotion_lp": 0 <= self.demotion_lp < self.lp_per_division,
            "k_factor": self.k_factor > 0,
            "expected_lp_levels": self.expected_lp_level_floor < self.expected_lp_level_master,
            "g_range": 0 < self.g_min <= 1 <= self.g_max,
            "win_lp": 0 < self.win_lp_min <= self.win_lp_max,
            "weights": 0 < self.weight_one_set <= self.weight_two_sets_tied <= 1,
            "repetition": 0
            < self.repetition_later_multiplier
            <= self.repetition_third_multiplier
            <= 1,
            "season_compression": 0 <= self.season_compression <= 1,
        }
        wrong = [name for name, ok in checks.items() if not ok]
        if wrong:
            raise ValueError(f"invalid league configuration: {', '.join(wrong)}")


MASTER_INDEX = 20  # Bronze IV = 0 … Diamond I = 19, Master = 20

DEFAULT_CONFIG = LeagueConfig()
