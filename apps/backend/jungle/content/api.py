"""The website's texts changed from the panel (§8.6, Stage 11): the published changes for the
website, and the drafts, publication and default text for the staff (`content.manage`)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from django.http import HttpRequest
from ninja import Field, Router, Schema

from jungle.content import services
from jungle.content.models import TextOverride
from jungle.core.schemas import OkOut, errors
from jungle.core.security import session_auth

public_router = Router(tags=["content"])
staff_router = Router(tags=["staff: content"], auth=session_auth)
Language = Literal["ro", "en"]


@public_router.get("/texts", response={200: dict[str, str], **errors(422)}, auth=None)
def texts(request: HttpRequest, language: Language) -> dict[str, str]:
    """The published changes of the website's texts, {"web.…": text}; the website keeps its own
    text wherever a change does not fit (an unknown key or different fields)."""
    return services.published(language)


class TextChangeOut(Schema):
    key: str
    language: str
    draft: str = Field(description="waiting for publication; empty when there is none")
    published: str = Field(description="on the website; empty: the catalogue's text")
    published_at: datetime | None
    updated_by: str
    updated_at: datetime


def _out(row: TextOverride) -> TextChangeOut:
    return TextChangeOut(
        key=row.key,
        language=row.language,
        draft=row.draft,
        published=row.published,
        published_at=row.published_at,
        updated_by=row.updated_by.full_name,
        updated_at=row.updated_at,
    )


class TextDraftIn(Schema):
    location_id: uuid.UUID
    key: str = Field(max_length=200)
    language: Language
    text: str = Field(min_length=1, max_length=2000)


class TextActionIn(Schema):
    location_id: uuid.UUID
    key: str = Field(max_length=200)
    language: Language
    reason: str = Field(default="", max_length=500)


@staff_router.get("/content/texts", response={200: list[TextChangeOut], **errors(401, 403)})
def text_changes(request: HttpRequest, location_id: uuid.UUID) -> list[TextChangeOut]:
    return [_out(row) for row in services.changes(request, location_id)]


@staff_router.post("/content/texts", response={200: TextChangeOut, **errors(401, 403, 422)})
def save_text(request: HttpRequest, payload: TextDraftIn) -> TextChangeOut:
    """Saves a draft (the website does not change yet)."""
    change = services.TextChange(payload.key, payload.language, payload.text)
    return _out(services.save_draft(request, payload.location_id, change))


@staff_router.post(
    "/content/texts/publish", response={200: TextChangeOut, **errors(401, 403, 404, 409, 422)}
)
def publish_text(request: HttpRequest, payload: TextActionIn) -> TextChangeOut:
    return _out(
        services.publish(
            request, payload.location_id, payload.key, payload.language, payload.reason
        )
    )


@staff_router.post(
    "/content/texts/discard", response={200: OkOut, **errors(401, 403, 404, 409, 422)}
)
def discard_text(request: HttpRequest, payload: TextActionIn) -> OkOut:
    services.discard_draft(request, payload.location_id, payload.key, payload.language)
    return OkOut()


@staff_router.post("/content/texts/restore", response={200: OkOut, **errors(401, 403, 404, 422)})
def restore_text(request: HttpRequest, payload: TextActionIn) -> OkOut:
    """The catalogue's text comes back (with a reason)."""
    services.restore_default(
        request, payload.location_id, payload.key, payload.language, payload.reason
    )
    return OkOut()
