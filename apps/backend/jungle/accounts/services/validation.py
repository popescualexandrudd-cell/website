"""Input normalisation shared by registration, guest accounts and profile updates."""

from __future__ import annotations

from datetime import date

import phonenumbers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email

from jungle.accounts.models import User, normalize_email
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode

MAX_AGE_YEARS = 120


def clean_email(email: str) -> str:
    value = normalize_email(email)
    try:
        validate_email(value)
    except ValidationError as exc:
        raise DomainError(ErrorCode.ACCOUNTS_EMAIL_INVALID) from exc
    return value


def email_taken(email: str) -> bool:
    return User.objects.filter(email__iexact=email).exists()


def clean_phone(phone: str) -> str:
    """Normalise to E.164; Romanian numbers may be written without the country code."""
    try:
        parsed = phonenumbers.parse(phone, "RO")
    except phonenumbers.NumberParseException as exc:
        raise DomainError(ErrorCode.ACCOUNTS_PHONE_INVALID) from exc
    if not phonenumbers.is_valid_number(parsed):
        raise DomainError(ErrorCode.ACCOUNTS_PHONE_INVALID)
    return str(phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164))


def check_birth_date(birth_date: date) -> int:
    """Return the age in years; refuse dates in the future or implausibly old."""
    today = clock.today_local()
    if birth_date > today:
        raise DomainError(ErrorCode.ACCOUNTS_BIRTH_DATE_INVALID)
    age = clock.age_on(birth_date, today)
    if age > MAX_AGE_YEARS:
        raise DomainError(ErrorCode.ACCOUNTS_BIRTH_DATE_INVALID)
    return age


def check_password(password: str, user: User) -> None:
    try:
        validate_password(password, user=user)
    except ValidationError as exc:
        reasons = sorted({str(e.code) for e in exc.error_list if e.code})
        raise DomainError(ErrorCode.ACCOUNTS_PASSWORD_WEAK, params={"reasons": reasons}) from exc
