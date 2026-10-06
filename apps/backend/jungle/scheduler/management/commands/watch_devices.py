"""Kiosks, screens and the café display silent for 10 minutes while the club is open: an alert to
the managers of their location (ADR-0017). Run every 5 minutes by the scheduler (ADR-0024)."""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from jungle.scheduler.watch import devices_offline


class Command(BaseCommand):
    help = "Anunță managerii despre aparatele care nu mai răspund (ADR-0017)."

    def handle(self, *args: Any, **options: Any) -> None:
        silent = devices_offline()
        self.stdout.write(f"Aparate care nu răspund: {len(silent)}.")
