"""Creates the first Admin (global role) with 2FA already enabled.

The password is read from an environment variable (never from the command line), and the
command prints the 2FA setup link and the one-time recovery codes.
"""

from __future__ import annotations

import os
from typing import Any

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import transaction

from jungle.accounts.models import User, UserRole, normalize_email
from jungle.accounts.services.mfa import enroll_confirmed
from jungle.accounts.services.validation import check_password
from jungle.audit.services import SYSTEM
from jungle.audit.services import record as audit_record
from jungle.core.errors import DomainError
from jungle.core.permissions import Role


class Command(BaseCommand):
    help = "Create a global Admin with 2FA enabled (password from $JUNGLE_ADMIN_PASSWORD)."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--email", required=True)
        parser.add_argument("--first-name", required=True)
        parser.add_argument("--last-name", required=True)
        parser.add_argument("--password-env", default="JUNGLE_ADMIN_PASSWORD")

    def handle(self, *args: Any, **options: Any) -> None:
        password = os.environ.get(options["password_env"], "")
        email = normalize_email(options["email"])
        if not password:
            raise CommandError(f"Set the password in ${options['password_env']}.")
        if User.objects.filter(email=email).exists():
            raise CommandError(f"{email} already exists.")
        candidate = User(
            email=email, first_name=options["first_name"], last_name=options["last_name"]
        )
        try:
            check_password(password, candidate)
        except DomainError as exc:
            raise CommandError(f"Password too weak: {', '.join(exc.params['reasons'])}") from exc
        with transaction.atomic():
            user = User.objects.create_user(
                email, password, first_name=candidate.first_name, last_name=candidate.last_name
            )
            UserRole.objects.create(user=user, role=Role.ADMIN, location=None)
            audit_record(
                SYSTEM, "roles.granted", target=user, after={"role": Role.ADMIN}, reason="bootstrap"
            )
            setup, codes = enroll_confirmed(user, SYSTEM)
        self.stdout.write(self.style.SUCCESS(f"Admin {email} created."))
        self.stdout.write("Scan this link (as a QR code) in an authenticator app:")
        self.stdout.write(setup.otpauth_uri)
        self.stdout.write("Recovery codes (each works once; keep them offline):")
        for code in codes:
            self.stdout.write(f"  {code}")
