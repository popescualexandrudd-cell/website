"""The scheduler (ADR-0024): runs the due jobs at the start of every minute, until it is stopped.
uv run python manage.py run_scheduler           # in production: the `scheduler` service
uv run python manage.py run_scheduler --once    # one round, then stop (a check by hand)
"""

from __future__ import annotations

import signal
import threading
from typing import Any

from django.core.management.base import BaseCommand, CommandParser

from jungle.core import clock
from jungle.scheduler.schedule import run_once


class Command(BaseCommand):
    help = "Rulează sarcinile programate ale clubului, la fiecare minut (ADR-0024)."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--once", action="store_true", help="o singură tură, apoi se oprește")

    def handle(self, *args: Any, **options: Any) -> None:
        stopped = threading.Event()
        signal.signal(signal.SIGTERM, lambda *_: stopped.set())
        while True:
            runs = run_once()
            if runs is None:
                self.stdout.write("Alt planificator rulează deja; aștept.")
            else:
                for run in runs:
                    self.stdout.write(f"{run.job}: {'ok' if run.ok else 'EȘUAT'}")
            now = clock.now()
            pause = 60 - now.second - now.microsecond / 1_000_000
            if options["once"] or stopped.wait(pause):
                return
