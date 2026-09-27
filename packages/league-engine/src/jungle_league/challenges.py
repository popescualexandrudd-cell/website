"""Direct challenges (§6.11)."""

from __future__ import annotations

from datetime import datetime, timedelta
from enum import StrEnum

from .config import LeagueConfig, ThirdRefusal


class RefusalOutcome(StrEnum):
    ALLOWED = "allowed"  # within the refusals allowed per season
    RECORDED = "recorded"  # over the limit: only shown in the player's own account
    TECHNICAL_LOSS = "technical_loss"  # over the limit, when the admin chose this policy


def can_challenge(challenger_index: int, target_index: int, config: LeagueConfig) -> bool:
    """LG-110: the target may be in the same division or at most one division above."""
    return 0 <= target_index - challenger_index <= config.challenge_max_divisions_above


def response_deadline(created_at: datetime, config: LeagueConfig) -> datetime:
    """LG-111: the challenged side has 72 hours to accept or refuse."""
    return created_at + timedelta(hours=config.challenge_response_hours)


def schedule_deadline(accepted_at: datetime, config: LeagueConfig) -> datetime:
    """LG-112: the match is played within 7 days of the acceptance."""
    return accepted_at + timedelta(days=config.challenge_schedule_days)


def refusal_outcome(refusals_before: int, config: LeagueConfig) -> RefusalOutcome:
    """LG-111: 2 refusals per season are allowed; the admin decides what a further one means."""
    if refusals_before < config.challenge_refusals_per_season:
        return RefusalOutcome.ALLOWED
    if config.challenge_third_refusal is ThirdRefusal.TECHNICAL_LOSS:
        return RefusalOutcome.TECHNICAL_LOSS
    return RefusalOutcome.RECORDED
