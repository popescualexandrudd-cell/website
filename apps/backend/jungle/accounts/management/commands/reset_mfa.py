"""Removes 2FA from an account (for example after a lost phone). Audited."""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand, CommandError, CommandParser

from jungle.accounts.models import User, normalize_email
from jungle.accounts.services.mfa import reset_mfa
from jungle.audit.services import SYSTEM


class Command(BaseCommand):
    help = "Reset two-factor authentication for a user."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--email", required=True)
        parser.add_argument("--reason", required=True)

    def handle(self, *args: Any, **options: Any) -> None:
        user = User.objects.filter(email=normalize_email(options["email"])).first()
        if user is None:
            raise CommandError("User not found.")
        reset_mfa(SYSTEM, user, options["reason"])
        self.stdout.write(
            self.style.SUCCESS("2FA reset; the user must enrol again at the next login.")
        )
