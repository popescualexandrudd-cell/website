"""The daily check that the backups and the restore test happened (ADR-0016): an alert to the
staff for each gap. Run by the scheduler (ADR-0024); does nothing where BACKUPS_EXPECTED is off."""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from jungle.scheduler.backups import check


class Command(BaseCommand):
    help = "Verifică zilnic că backup-ul și testul de restaurare au rulat (ADR-0016)."

    def handle(self, *args: Any, **options: Any) -> None:
        gaps = check()
        self.stdout.write(
            "Backup: totul la zi." if not gaps else f"Backup: lipsă {', '.join(gaps)}."
        )
