"""Marks no-shows and completed bookings, and raises blocks (R-072, R-073).

Run every 5 minutes (Celery beat from Stage 14; cron or by hand until then).
"""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from jungle.attendance.services import process_no_shows


class Command(BaseCommand):
    help = "Marks no-shows and completed bookings; blocks after repeated no-shows."

    def handle(self, *args: Any, **options: Any) -> None:
        report = process_no_shows()
        self.stdout.write(
            f"Neprezentări: {report.bookings_no_show} rezervări, {report.enrollments_no_show} "
            f"la clase; încheiate: {report.bookings_completed}; blocări noi: {report.restrictions}."
        )
