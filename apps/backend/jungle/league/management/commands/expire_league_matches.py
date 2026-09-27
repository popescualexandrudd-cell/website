"""Closes the scores not confirmed by everyone in their window and the ones not paid in time
(LG-095, LG-096). Run every 5 minutes, with `process_no_shows` (Celery beat from Stage 14)."""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from jungle.league.matches import expire_matches


class Command(BaseCommand):
    help = "Expires league scores not confirmed in their window or not paid in time."

    def handle(self, *args: Any, **options: Any) -> None:
        report = expire_matches()
        self.stdout.write(
            f"Meciuri expirate: {report.unconfirmed} neconfirmate, {report.unpaid} neplătite."
        )
