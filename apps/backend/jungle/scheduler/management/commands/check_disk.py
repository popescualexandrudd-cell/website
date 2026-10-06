"""The server's disk above the limit: an alert to the managers and admins (ADR-0017). Run every
hour by the scheduler (ADR-0024); does nothing where DISK_WATCH_PATH is empty."""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from jungle.scheduler.watch import disk_low


class Command(BaseCommand):
    help = "Verifică spațiul pe disc al serverului (ADR-0017)."

    def handle(self, *args: Any, **options: Any) -> None:
        percent = disk_low()
        self.stdout.write(
            "Discul nu e urmărit aici." if percent is None else f"Disc ocupat: {percent}%."
        )
