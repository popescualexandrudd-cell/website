"""Turns a feature flag on or off from the server (ADR-0022), with a reason in the audit log: for
example at the launch, `manage.py set_flag full_site on --reason "lansarea"` (Q57). The panel's
Settings page does the same for the administrator; the website is told after the commit."""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import transaction

from jungle.audit import services as audit
from jungle.audit.services import SYSTEM
from jungle.configuration.models import FeatureFlag
from jungle.configuration.registry import FLAGS


class Command(BaseCommand):
    help = "Turns a feature flag on or off (audited)."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("key", help="the flag, e.g. full_site")
        parser.add_argument("state", choices=["on", "off"])
        parser.add_argument("--reason", required=True, help="why (kept in the audit log)")

    def handle(self, *args: Any, **options: Any) -> None:
        key, enabled, reason = options["key"], options["state"] == "on", options["reason"].strip()
        if key not in FLAGS:
            raise CommandError(f"unknown flag {key!r}; known: {', '.join(sorted(FLAGS))}")
        if not reason:
            raise CommandError("give a reason")
        with transaction.atomic():
            flag, _ = FeatureFlag.objects.select_for_update().get_or_create(
                key=key, defaults={"enabled": FLAGS[key].default}
            )
            before = {"enabled": flag.enabled}
            flag.enabled = enabled
            flag.save()
            audit.record(
                SYSTEM,
                "flags.changed",
                target=flag,
                before=before,
                after={"enabled": enabled},
                reason=reason,
            )
        self.stdout.write(f"{key}: {'on' if enabled else 'off'}")
