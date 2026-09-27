"""The league's emails (R-140: in the person's language, with a link to their account).
Sent after the change is committed; the full notification system comes in Stage 12."""

from __future__ import annotations

from typing import Any

from django.conf import settings

from jungle.accounts.models import User
from jungle.notifications.email import send_templated_email

ACCOUNT_LEAGUE_PATH = {"ro": "/ro/cont/liga", "en": "/en/account/league"}
ACCOUNT_VOUCHERS_PATH = {"ro": "/ro/cont/vouchere", "en": "/en/account/vouchers"}


def send(template: str, user: User, context: dict[str, Any], paths: dict[str, str]) -> None:
    if not user.email:
        return  # a child account has no email of its own
    language = user.preferred_language if user.preferred_language in paths else "ro"
    send_templated_email(
        template,
        user.email,
        language,
        {
            "first_name": user.first_name,
            "link": f"{settings.WEB_BASE_URL}{paths[language]}",
            **context,
        },
    )
