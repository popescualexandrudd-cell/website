"""How a backup went, told by deploy/scripts/backup after each run (ADR-0016, Stage 14B):
    python manage.py backup_report --kind full --ok < output.txt
    python manage.py backup_report --kind restore-test --failed < output.txt
The text read from the standard input (the end of the backup's output) is kept with the run."""

from __future__ import annotations

import sys
from typing import Any

from django.core.management.base import BaseCommand, CommandParser

from jungle.scheduler.backups import KINDS, record


class Command(BaseCommand):
    help = "Notează rezultatul unui backup și anunță personalul dacă a eșuat (ADR-0016)."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--kind", choices=KINDS, required=True)
        outcome = parser.add_mutually_exclusive_group(required=True)
        outcome.add_argument("--ok", action="store_true")
        outcome.add_argument("--failed", action="store_true")

    def handle(self, *args: Any, **options: Any) -> None:
        detail = "" if sys.stdin.isatty() else sys.stdin.read()
        run = record(options["kind"], bool(options["ok"]), detail)
        self.stdout.write(f"{run.job}: {'ok' if run.ok else 'EȘUAT'}")
