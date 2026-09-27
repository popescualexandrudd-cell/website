"""Enrolling and resetting two-factor authentication (TOTP + one-time recovery codes)."""

from __future__ import annotations

import secrets
from dataclasses import dataclass

import pyotp
from django.db import transaction
from django.http import HttpRequest

from jungle.accounts.models import MfaRecoveryCode, User
from jungle.accounts.services.auth import normalize_recovery_code, verify_totp
from jungle.accounts.services.authz import MFA_SESSION_KEY
from jungle.audit import services as audit
from jungle.core import clock
from jungle.core.crypto import decrypt, encrypt, sha256_hex
from jungle.core.errors import DomainError, ErrorCode

ISSUER = "Jungle Padel"
RECOVERY_CODE_COUNT = 10
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I


@dataclass(frozen=True)
class MfaSetup:
    secret: str
    otpauth_uri: str


def start_setup(user: User) -> MfaSetup:
    if user.totp_confirmed_at:
        raise DomainError(ErrorCode.MFA_ALREADY_ENABLED, status=409)
    secret = pyotp.random_base32()
    user.totp_secret = encrypt(secret)
    user.save(update_fields=["totp_secret"])
    uri = pyotp.TOTP(secret).provisioning_uri(name=user.email or str(user.pk), issuer_name=ISSUER)
    return MfaSetup(secret=secret, otpauth_uri=uri)


def _new_recovery_code() -> str:
    raw = "".join(secrets.choice(_ALPHABET) for _ in range(10))
    return f"{raw[:5]}-{raw[5:]}"


def issue_recovery_codes(user: User) -> list[str]:
    codes = [_new_recovery_code() for _ in range(RECOVERY_CODE_COUNT)]
    MfaRecoveryCode.objects.filter(user=user).delete()
    MfaRecoveryCode.objects.bulk_create(
        [
            MfaRecoveryCode(user=user, code_hash=sha256_hex(normalize_recovery_code(c)))
            for c in codes
        ]
    )
    return codes


def confirm_setup(request: HttpRequest, user: User, code: str) -> list[str]:
    if user.totp_confirmed_at:
        raise DomainError(ErrorCode.MFA_ALREADY_ENABLED, status=409)
    if not user.totp_secret:
        raise DomainError(ErrorCode.MFA_SETUP_NOT_STARTED, status=409)
    if not verify_totp(user, code, secret=decrypt(user.totp_secret)):
        raise DomainError(ErrorCode.AUTH_MFA_CODE_INVALID, status=400)
    with transaction.atomic():
        user.totp_confirmed_at = clock.now()
        user.save(update_fields=["totp_confirmed_at"])
        codes = issue_recovery_codes(user)
        audit.record(audit.actor_from_request(request), "mfa.enabled", target=user)
    request.session[MFA_SESSION_KEY] = True
    return codes


def enroll_confirmed(user: User, actor: audit.Actor) -> tuple[MfaSetup, list[str]]:
    """For the bootstrap command: enable 2FA directly, the admin scans the printed URI."""
    setup = MfaSetup(secret=pyotp.random_base32(), otpauth_uri="")
    uri = pyotp.TOTP(setup.secret).provisioning_uri(
        name=user.email or str(user.pk), issuer_name=ISSUER
    )
    with transaction.atomic():
        user.totp_secret = encrypt(setup.secret)
        user.totp_confirmed_at = clock.now()
        user.totp_last_step = None
        user.save(update_fields=["totp_secret", "totp_confirmed_at", "totp_last_step"])
        codes = issue_recovery_codes(user)
        audit.record(actor, "mfa.enabled", target=user, reason="bootstrap")
    return MfaSetup(secret=setup.secret, otpauth_uri=uri), codes


def reset_mfa(actor: audit.Actor, user: User, reason: str) -> None:
    """Remove 2FA (lost phone). The person must enrol again at the next login."""
    with transaction.atomic():
        user.totp_secret = ""
        user.totp_confirmed_at = None
        user.totp_last_step = None
        user.save(update_fields=["totp_secret", "totp_confirmed_at", "totp_last_step"])
        MfaRecoveryCode.objects.filter(user=user).delete()
        audit.record(actor, "mfa.reset", target=user, reason=reason)
