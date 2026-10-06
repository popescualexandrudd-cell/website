"""The website's texts changed from the panel (§8.6, Stage 11): drafts, publication, the default
text back. Staff with `content.manage` (per location: the website is the club's) save a draft,
publish it with a reason or go back to the catalogue's text with a reason; every step is in the
audit log, and the website is asked to refresh after a published change (`configuration.web`,
tag "content"). Only the website's texts (`web.…`) can be changed: the panel, the kiosks, the
screens, the messages and the legal texts (`web.legal.…`, approved by the owner, Q41) keep their
own way of changing.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass

from django.db import transaction
from django.db.models import QuerySet
from django.http import HttpRequest

from jungle.accounts.services.authz import authorize
from jungle.audit import services as audit
from jungle.configuration import web
from jungle.content.models import TextOverride
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action

KEY = re.compile(r"^web(\.[A-Za-z0-9_]+)+$")
LEGAL = "web.legal."
LANGUAGES = ("ro", "en")
MAX_LENGTH = 2000


@dataclass(frozen=True)
class TextChange:
    key: str
    language: str
    text: str


def _check(key: str, language: str) -> None:
    if not KEY.match(key) or len(key) > 200 or key.startswith(LEGAL):
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "key"})
    if language not in LANGUAGES:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "language"})


def published(language: str) -> dict[str, str]:
    """{key: text} of the published changes in a language (the website merges them)."""
    if language not in LANGUAGES:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "language"})
    rows = TextOverride.objects.filter(language=language).exclude(published="")
    return {row.key: row.published for row in rows}


def changes(request: HttpRequest, location_id: uuid.UUID) -> QuerySet[TextOverride]:
    authorize(request, Action.CONTENT_MANAGE, location_id)
    return TextOverride.objects.select_related("updated_by")


def _row(key: str, language: str) -> TextOverride:
    row = TextOverride.objects.select_for_update().filter(key=key, language=language).first()
    if row is None:
        raise DomainError(ErrorCode.CONTENT_NOT_FOUND, status=404)
    return row


def save_draft(request: HttpRequest, location_id: uuid.UUID, change: TextChange) -> TextOverride:
    user = authorize(request, Action.CONTENT_MANAGE, location_id)
    _check(change.key, change.language)
    text = change.text.strip()
    if not text or len(text) > MAX_LENGTH:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "text"})
    with transaction.atomic():
        row, _ = TextOverride.objects.select_for_update().get_or_create(
            key=change.key,
            language=change.language,
            defaults={"updated_by": user, "updated_at": clock.now()},
        )
        row.draft = text
        row.updated_by = user
        row.updated_at = clock.now()
        row.save()
        audit.record(
            audit.actor_from_request(request),
            "content.draft_saved",
            target=row,
            after={"key": row.key, "language": row.language},
        )
    return row


def publish(
    request: HttpRequest, location_id: uuid.UUID, key: str, language: str, reason: str
) -> TextOverride:
    """The draft goes on the website."""
    user = authorize(request, Action.CONTENT_MANAGE, location_id)
    _check(key, language)
    if not reason.strip():
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "reason"})
    with transaction.atomic():
        row = _row(key, language)
        if not row.draft:
            raise DomainError(ErrorCode.CONTENT_NO_DRAFT, status=409)
        before = row.published
        row.published, row.draft = row.draft, ""
        row.published_at = row.updated_at = clock.now()
        row.updated_by = user
        row.save()
        audit.record(
            audit.actor_from_request(request),
            "content.published",
            target=row,
            before={"text": before},
            after={"text": row.published},
            reason=reason.strip(),
        )
        web.revalidate_after_commit([web.CONTENT_TAG])
    return row


def discard_draft(
    request: HttpRequest, location_id: uuid.UUID, key: str, language: str
) -> TextOverride | None:
    """The draft is dropped; a change never published disappears."""
    authorize(request, Action.CONTENT_MANAGE, location_id)
    _check(key, language)
    with transaction.atomic():
        row = _row(key, language)
        if not row.draft:
            raise DomainError(ErrorCode.CONTENT_NO_DRAFT, status=409)
        audit.record(
            audit.actor_from_request(request),
            "content.draft_discarded",
            target=row,
            before={"text": row.draft},
        )
        if not row.published:
            row.delete()
            return None
        row.draft = ""
        row.save(update_fields=["draft"])
    return row


def restore_default(
    request: HttpRequest, location_id: uuid.UUID, key: str, language: str, reason: str
) -> None:
    """The catalogue's text comes back on the website (the change, draft included, is deleted)."""
    authorize(request, Action.CONTENT_MANAGE, location_id)
    _check(key, language)
    if not reason.strip():
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "reason"})
    with transaction.atomic():
        row = _row(key, language)
        audit.record(
            audit.actor_from_request(request),
            "content.restored",
            target=row,
            before={"text": row.published, "draft": row.draft},
            reason=reason.strip(),
        )
        was_live = bool(row.published)
        row.delete()
        if was_live:
            web.revalidate_after_commit([web.CONTENT_TAG])
