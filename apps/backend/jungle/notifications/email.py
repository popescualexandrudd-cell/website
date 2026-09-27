"""Transactional emails in the recipient's language (R-140).

Templates live in `templates/emails/<name>.<lang>.subject.txt` and `<name>.<lang>.txt`.
The provider is the Django email backend configured in settings (adapter; Q24).
Editable, database-stored templates arrive with the full notification system (Stage 12).
"""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

TEMPLATES = (
    "verify_email",
    "password_reset",
    "account_claim",
    "waitlist_confirm",
    "waitlist_welcome",
    "spot_promoted",
    "card_issued",
    "league_challenge",
    "league_decay_warning",
    "league_season_reward",
)
LANGUAGES = ("ro", "en")


def send_templated_email(template: str, to: str, language: str, context: dict[str, Any]) -> None:
    if template not in TEMPLATES:
        raise ValueError(f"unknown email template {template!r}")
    lang = language if language in LANGUAGES else "ro"
    subject = render_to_string(f"emails/{template}.{lang}.subject.txt", context).strip()
    body = render_to_string(f"emails/{template}.{lang}.txt", context)
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to])
