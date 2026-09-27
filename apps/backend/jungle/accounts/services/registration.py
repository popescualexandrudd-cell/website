"""Creating an account online (R-001, R-002) and verifying the email address."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from django.core import signing
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.http import HttpRequest

from jungle.accounts.models import AccountType, User
from jungle.accounts.services import emails
from jungle.accounts.services.validation import (
    check_birth_date,
    check_password,
    clean_email,
    clean_phone,
    email_taken,
)
from jungle.audit import services as audit
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.legal import services as legal


@dataclass(frozen=True)
class RegistrationData:
    email: str
    password: str
    first_name: str
    last_name: str
    phone: str
    date_of_birth: date
    preferred_language: str
    accepted: list[legal.AcceptedDocument]


def register(request: HttpRequest, data: RegistrationData) -> User:
    email = clean_email(data.email)
    phone = clean_phone(data.phone)
    age = check_birth_date(data.date_of_birth)
    min_age = int(get_config("accounts.min_self_registration_age"))
    if age < min_age:
        raise DomainError(ErrorCode.ACCOUNTS_TOO_YOUNG, params={"min_age": min_age})
    candidate = User(
        email=email, first_name=data.first_name.strip(), last_name=data.last_name.strip()
    )
    check_password(data.password, candidate)
    documents = legal.documents_to_accept(data.accepted)
    if email_taken(email):
        raise DomainError(ErrorCode.ACCOUNTS_EMAIL_TAKEN, status=409)
    try:
        with transaction.atomic():
            user = User.objects.create_user(
                email,
                data.password,
                first_name=candidate.first_name,
                last_name=candidate.last_name,
                phone=phone,
                date_of_birth=data.date_of_birth,
                preferred_language=data.preferred_language,
                account_type=AccountType.FULL,
            )
            legal.record_consents(user, documents, request)
            audit.record(
                audit.actor_from_request(request),
                "accounts.registered",
                target=user,
                after=audit.snapshot(user),
            )
            transaction.on_commit(lambda: emails.send_verification_email(user))
    except IntegrityError as exc:  # concurrent registration with the same email
        raise DomainError(ErrorCode.ACCOUNTS_EMAIL_TAKEN, status=409) from exc
    return user


def verify_email(request: HttpRequest, token: str) -> User:
    ttl_seconds = int(get_config("accounts.email_verification_ttl_hours")) * 3600
    try:
        payload = signing.loads(token, salt=emails.VERIFY_SALT, max_age=ttl_seconds)
    except signing.SignatureExpired as exc:
        raise DomainError(ErrorCode.ACCOUNTS_TOKEN_EXPIRED) from exc
    except signing.BadSignature as exc:
        raise DomainError(ErrorCode.ACCOUNTS_TOKEN_INVALID) from exc
    user = User.objects.filter(pk=payload.get("u"), is_active=True).first()
    if user is None or user.email != payload.get("e"):
        raise DomainError(ErrorCode.ACCOUNTS_TOKEN_INVALID)
    if user.email_verified_at is None:
        user.email_verified_at = clock.now()
        user.save(update_fields=["email_verified_at"])
        audit.record(audit.actor_from_request(request), "accounts.email_verified", target=user)
    return user


RESEND_COOLDOWN_SECONDS = 60


def resend_verification(user: User) -> None:
    if user.email_verified_at is not None:
        return
    if not cache.add(f"accounts:resend-verify:{user.pk}", 1, RESEND_COOLDOWN_SECONDS):
        raise DomainError(
            ErrorCode.AUTH_RATE_LIMITED,
            status=429,
            params={"retry_after_seconds": RESEND_COOLDOWN_SECONDS},
        )
    emails.send_verification_email(user)
