"""The league's daily job: inactivity decay and its warnings (LG-106, LG-107), and the §11
reminders (a long pause, matches still needed, the Match of the day).

Run once a day, shortly after midnight club time, by the scheduler (ADR-0024).
"""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from jungle.league.daily import run_daily


class Command(BaseCommand):
    help = "Applies the league's daily decay and sends the decay warnings and reminders."

    def handle(self, *args: Any, **options: Any) -> None:
        report = run_daily()
        self.stdout.write(
            f"Decay: {report.days_decayed} zile, {report.lp_removed} LP scăzute; "
            f"avertizări: {report.warnings}; mementouri: {report.reminders}."
        )
