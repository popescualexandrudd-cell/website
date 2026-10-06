"""The day's reminders (§11): "abonamentul expiră" and the question after the first game (Q71);
every morning (Stage 14 schedules it)."""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from jungle.feedback.services import ask_after_first_game
from jungle.subscriptions.services import remind_expiring


class Command(BaseCommand):
    help = "Trimite mesajele zilei: abonamentele care expiră curând (§11), întrebarea NPS (Q71)."

    def handle(self, *args: Any, **options: Any) -> None:
        count = remind_expiring()
        self.stdout.write(f"Abonamente care expiră curând: {count}.")
        asked = ask_after_first_game()
        self.stdout.write(f"Întrebați după primul meci (NPS): {asked}.")
