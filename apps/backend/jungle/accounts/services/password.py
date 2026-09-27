"""Changing and resetting passwords. Reset requests never reveal whether an email exists."""

from __future__ import annotations

import uuid

from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.http import HttpRequest
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

from jungle.accounts.models import User, normalize_email
from jungle.accounts.services import emails
from jungle.accounts.services.validation import check_password
from jungle.audit import services as audit
from jungle.core import clock
from jungle.core.crypto import sha256_hex
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.ratelimit import increment

RESET_REQUESTS_PER_HOUR = 3


def request_reset(request: HttpRequest, email: str) -> None:
    email = normalize_email(email)
    key = f"accounts:reset:{sha256_hex(email)}"
    if increment(key, 3600) > RESET_REQUESTS_PER_HOUR:
        return  # silently dropped: same response as for an unknown address
    user = User.objects.filter(email=email, is_active=True).first()
    if user is None:
        return
    audit.record(
        audit.actor_from_request(request), "accounts.password_reset_requested", target=user
    )
    emails.send_password_reset_email(user)


def confirm_reset(request: HttpRequest, uid: str, token: str, new_password: str) -> User:
    try:
        pk = uuid.UUID(force_str(urlsafe_base64_decode(uid)))
        user = User.objects.get(pk=pk, is_active=True)
    except (ValueError, TypeError, UnicodeDecodeError, User.DoesNotExist) as exc:
        raise DomainError(ErrorCode.ACCOUNTS_TOKEN_INVALID) from exc
    if not default_token_generator.check_token(user, token):
        raise DomainError(ErrorCode.ACCOUNTS_TOKEN_INVALID)
    check_password(new_password, user)
    with transaction.atomic():
        user.set_password(new_password)
        fields = ["password"]
        if user.email_verified_at is None:  # the link proves ownership of the address
            user.email_verified_at = clock.now()
            fields.append("email_verified_at")
        user.save(update_fields=fields)
        audit.record(audit.actor_from_request(request), "accounts.password_reset", target=user)
    return user


def change_password(request: HttpRequest, user: User, current: str, new: str) -> None:
    if not user.check_password(current):
        raise DomainError(ErrorCode.ACCOUNTS_CURRENT_PASSWORD_INCORRECT)
    check_password(new, user)
    user.set_password(new)
    user.save(update_fields=["password"])
    update_session_auth_hash(request, user)
    audit.record(audit.actor_from_request(request), "accounts.password_changed", target=user)
