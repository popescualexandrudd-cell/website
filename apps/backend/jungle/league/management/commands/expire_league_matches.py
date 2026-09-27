"""Closes the scores not confirmed by everyone in their window and the ones not paid in time
(LG-095, LG-096), and the challenges not answered or not played in time (LG-111, LG-112).
Run every 5 minutes, with `process_no_shows` (Celery beat from Stage 14)."""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from jungle.league.challenges import expire_challenges
from jungle.league.matches import expire_matches


class Command(BaseCommand):
    help = "Expires league scores and challenges past their deadlines."

    def handle(self, *args: Any, **options: Any) -> None:
        report = expire_matches()
        challenges = expire_challenges()
        self.stdout.write(
            f"Meciuri expirate: {report.unconfirmed} neconfirmate, {report.unpaid} neplătite. "
            f"Provocări expirate: {challenges.unanswered} fără răspuns, "
            f"{challenges.unplayed} nejucate."
        )
