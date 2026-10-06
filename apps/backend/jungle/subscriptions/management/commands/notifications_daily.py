"""The day's reminders (§11): "abonamentul expiră" (every morning, Stage 14 schedules it)."""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from jungle.subscriptions.services import remind_expiring


class Command(BaseCommand):
    help = "Trimite memento-urile zilei: abonamentele care expiră curând (§11)."

    def handle(self, *args: Any, **options: Any) -> None:
        count = remind_expiring()
        self.stdout.write(f"Abonamente care expiră curând: {count}.")
