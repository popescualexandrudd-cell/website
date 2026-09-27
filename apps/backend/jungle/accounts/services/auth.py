"""Login, logout and the second factor (ADR-0011, §12.1: lockout after failed attempts)."""

from __future__ import annotations

import hmac
import math
from dataclasses import dataclass

import pyotp
from django.contrib.auth import authenticate, login, logout
from django.core.cache import cache
from django.db import transaction
from django.http import HttpRequest

from jungle.accounts.models import MfaRecoveryCode, User, normalize_email
from jungle.accounts.services.authz import MFA_SESSION_KEY
from jungle.audit import services as audit
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.crypto import decrypt, sha256_hex
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.http import client_ip
from jungle.core.ratelimit import increment

TOTP_PERIOD = 30


@dataclass(frozen=True)
class LoginResult:
    user: User
    mfa_verified: bool
    mfa_setup_required: bool


# ---------------------------------------------------------------- lockout
def _email_key(email: str) -> str:
    return f"auth:fail:email:{sha256_hex(email)}"


def _ip_key(ip: str | None) -> str:
    return f"auth:fail:ip:{ip or 'unknown'}"


def _lock_key(email: str) -> str:
    return f"auth:lock:{sha256_hex(email)}"


def _window_seconds() -> int:
    return int(get_config("auth.lockout_minutes")) * 60


def check_not_locked(email: str, ip: str | None) -> None:
    locked_until = cache.get(_lock_key(email))
    now = clock.now().timestamp()
    if locked_until is not None and locked_until > now:
        raise DomainError(
            ErrorCode.AUTH_LOCKED,
            status=429,
            params={"retry_after_seconds": math.ceil(locked_until - now)},
        )
    if cache.get(_ip_key(ip), 0) >= int(get_config("auth.ip_max_failures")):
        raise DomainError(
            ErrorCode.AUTH_LOCKED, status=429, params={"retry_after_seconds": _window_seconds()}
        )


def register_failure(email: str, ip: str | None) -> None:
    window = _window_seconds()
    failures = increment(_email_key(email), window)
    increment(_ip_key(ip), window)
    if failures >= int(get_config("auth.login_max_failures")):
        cache.set(_lock_key(email), clock.now().timestamp() + window, window)
        cache.delete(_email_key(email))


def clear_failures(email: str) -> None:
    cache.delete_many([_email_key(email), _lock_key(email)])


# ---------------------------------------------------------------- second factor
def _current_step() -> int:
    return int(clock.now().timestamp()) // TOTP_PERIOD


def verify_totp(user: User, code: str, secret: str | None = None) -> bool:
    """Check a 6-digit code (±1 period) and refuse codes already used (replay)."""
    code = code.strip().replace(" ", "")
    if not code.isdigit() or len(code) != 6:
        return False
    plain = (
        secret if secret is not None else (decrypt(user.totp_secret) if user.totp_secret else "")
    )
    if not plain:
        return False
    totp = pyotp.TOTP(plain, interval=TOTP_PERIOD)
    with transaction.atomic():
        locked = User.objects.select_for_update().get(pk=user.pk)
        for step in (_current_step() - 1, _current_step(), _current_step() + 1):
            if hmac.compare_digest(totp.at(step * TOTP_PERIOD), code):
                if locked.totp_last_step is not None and step <= locked.totp_last_step:
                    return False
                locked.totp_last_step = step
                locked.save(update_fields=["totp_last_step"])
                user.totp_last_step = step
                return True
    return False


def normalize_recovery_code(code: str) -> str:
    return "".join(ch for ch in code.upper() if ch.isalnum())


def use_recovery_code(user: User, code: str) -> bool:
    digest = sha256_hex(normalize_recovery_code(code))
    with transaction.atomic():
        row = (
            MfaRecoveryCode.objects.select_for_update()
            .filter(user=user, code_hash=digest, used_at__isnull=True)
            .first()
        )
        if row is None:
            return False
        row.used_at = clock.now()
        row.save(update_fields=["used_at"])
    return True


def verify_second_factor(user: User, code: str) -> bool:
    if not user.totp_confirmed_at or not code:
        return False
    return verify_totp(user, code) or use_recovery_code(user, code)


# ---------------------------------------------------------------- login / logout
def login_user(
    request: HttpRequest, email: str, password: str, otp_code: str | None
) -> LoginResult:
    email = normalize_email(email)
    ip = client_ip(request)
    actor = audit.actor_from_request(request)
    check_not_locked(email, ip)
    user = authenticate(request, email=email, password=password)
    if not isinstance(user, User):
        register_failure(email, ip)
        audit.record(
            actor,
            "auth.login_failed",
            target_type="accounts.user",
            after={"email_sha256": sha256_hex(email)},
        )
        raise DomainError(ErrorCode.AUTH_INVALID_CREDENTIALS, status=401)

    staff = user.is_staff_member()
    verified = False
    if staff and user.totp_confirmed_at:
        if not otp_code:
            raise DomainError(ErrorCode.AUTH_MFA_CODE_REQUIRED, status=401)
        if not verify_second_factor(user, otp_code):
            register_failure(email, ip)
            audit.record(actor, "auth.mfa_failed", target=user)
            raise DomainError(ErrorCode.AUTH_MFA_CODE_INVALID, status=401)
        verified = True

    login(request, user)
    request.session[MFA_SESSION_KEY] = verified
    if staff:
        request.session.set_expiry(int(get_config("auth.staff_session_hours")) * 3600)
    clear_failures(email)
    audit.record(
        audit.actor_from_request(request),
        "auth.login",
        target=user,
        after={"staff": staff, "mfa_verified": verified},
    )
    return LoginResult(
        user=user, mfa_verified=verified, mfa_setup_required=staff and not user.totp_confirmed_at
    )


def logout_user(request: HttpRequest) -> None:
    if request.user.is_authenticated:
        audit.record(audit.actor_from_request(request), "auth.logout", target=request.user)
    logout(request)
