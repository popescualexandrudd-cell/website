"""Sends the notifications that are due and retries the failed ones (every minute, Stage 14)."""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from jungle.notifications.services import send_due


class Command(BaseCommand):
    help = "Trimite notificările programate și reîncearcă pe cele netrimise (§11)."

    def handle(self, *args: Any, **options: Any) -> None:
        outcome = send_due()
        self.stdout.write(
            f"Trimise: {outcome.sent}; netrimise (se reîncearcă): {outcome.failed}; "
            f"fără canal sau oprite: {outcome.skipped}."
        )
