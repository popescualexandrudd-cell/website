"""Delete waitlist sign-ups never confirmed in time (daily, by the scheduler, ADR-0024)."""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from jungle.audit.services import SYSTEM
from jungle.waitlist.services import purge_unconfirmed


class Command(BaseCommand):
    help = "Delete unconfirmed waitlist sign-ups older than the confirmation window."

    def handle(self, *args: Any, **options: Any) -> None:
        self.stdout.write(f"Deleted {purge_unconfirmed(SYSTEM)} unconfirmed sign-ups.")
