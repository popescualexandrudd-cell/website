"""Account emails: verification link, password reset, account claim."""

from __future__ import annotations

from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from jungle.accounts.models import User
from jungle.configuration.services import get_config
from jungle.notifications.email import send_templated_email

VERIFY_SALT = "jungle.accounts.verify-email"

# Paths of the future account pages in apps/web (Stage 11); localised per language.
_PATHS = {
    "verify_email": {"ro": "/ro/cont/verificare-email", "en": "/en/account/verify-email"},
    "password_reset": {"ro": "/ro/cont/parola-noua", "en": "/en/account/new-password"},
}


def _link(page: str, language: str, params: dict[str, str]) -> str:
    lang = language if language in ("ro", "en") else "ro"
    return f"{settings.WEB_BASE_URL}{_PATHS[page][lang]}?{urlencode(params)}"


def make_verification_token(user: User) -> str:
    return signing.dumps({"u": str(user.pk), "e": user.email}, salt=VERIFY_SALT)


def send_verification_email(user: User) -> None:
    if not user.email:
        return
    ttl = int(get_config("accounts.email_verification_ttl_hours"))
    link = _link("verify_email", user.preferred_language, {"token": make_verification_token(user)})
    send_templated_email(
        "verify_email",
        user.email,
        user.preferred_language,
        {"first_name": user.first_name, "link": link, "ttl_hours": ttl},
    )


def password_reset_params(user: User) -> dict[str, str]:
    return {
        "uid": urlsafe_base64_encode(force_bytes(str(user.pk))),
        "token": default_token_generator.make_token(user),
    }


def send_password_reset_email(user: User, template: str = "password_reset") -> None:
    if not user.email:
        return
    link = _link("password_reset", user.preferred_language, password_reset_params(user))
    send_templated_email(
        template, user.email, user.preferred_language, {"first_name": user.first_name, "link": link}
    )
