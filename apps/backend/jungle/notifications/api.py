"""Notifications (§11, Stage 12): the client's choices and push subscription, the panel's texts."""

from __future__ import annotations

import uuid
from datetime import datetime

from django.conf import settings
from django.http import HttpRequest
from ninja import Field, Router, Schema

from jungle.core.schemas import OkOut, errors
from jungle.core.security import session_auth
from jungle.notifications import services, webpush

me_router = Router(tags=["notifications"], auth=session_auth)
staff_router = Router(tags=["staff: notifications"], auth=session_auth)


class PreferencesIO(Schema):
    choices: dict[str, dict[str, bool]] = Field(
        description="{category: {channel: on}}, only the categories that can be turned off"
    )


class PushKeyOut(Schema):
    enabled: bool
    public_key: str = Field(description="VAPID public key (base64url) for pushManager.subscribe")


class PushSubscriptionIn(Schema):
    endpoint: str = Field(max_length=1000)
    p256dh: str = Field(max_length=200)
    auth: str = Field(max_length=100)


class PushEndpointIn(Schema):
    endpoint: str = Field(max_length=1000)


class MessageOut(Schema):
    id: uuid.UUID
    event: str
    channel: str
    sent_at: datetime | None


class TemplateOut(Schema):
    event: str
    category: str
    channel: str
    language: str
    subject: str
    body: str
    edited: bool


class TemplateIn(Schema):
    location_id: uuid.UUID
    event: str = Field(max_length=40)
    channel: str = Field(max_length=8)
    language: str = Field(max_length=2)
    subject: str = Field(max_length=160)
    body: str = Field(max_length=5000)


class TemplateKeyIn(Schema):
    location_id: uuid.UUID
    event: str = Field(max_length=40)
    channel: str = Field(max_length=8)
    language: str = Field(max_length=2)


class OutboxOut(Schema):
    id: uuid.UUID
    event: str
    channel: str
    user_name: str
    status: str
    attempts: int
    last_error: str
    created_at: datetime
    sent_at: datetime | None


@me_router.get("/preferences", response={200: PreferencesIO, **errors(401)})
def get_preferences(request: HttpRequest) -> PreferencesIO:
    return PreferencesIO(choices=services.preferences(request))


@me_router.put("/preferences", response={200: PreferencesIO, **errors(401, 422)})
def put_preferences(request: HttpRequest, payload: PreferencesIO) -> PreferencesIO:
    return PreferencesIO(choices=services.set_preferences(request, payload.choices))


@me_router.get("/push-key", response={200: PushKeyOut}, auth=None)
def push_key(request: HttpRequest) -> PushKeyOut:
    """Whether the club sends push notifications, and the key browsers subscribe with."""
    return PushKeyOut(
        enabled=webpush.enabled(), public_key=settings.VAPID_PUBLIC_KEY if webpush.enabled() else ""
    )


@me_router.post("/push-subscriptions", response={200: OkOut, **errors(401, 422, 503)})
def subscribe(request: HttpRequest, payload: PushSubscriptionIn) -> OkOut:
    services.subscribe(request, payload.endpoint, payload.p256dh, payload.auth)
    return OkOut()


@me_router.post("/push-subscriptions/remove", response={200: OkOut, **errors(401)})
def unsubscribe(request: HttpRequest, payload: PushEndpointIn) -> OkOut:
    services.unsubscribe(request, payload.endpoint)
    return OkOut()


@me_router.get("/mine", response={200: list[MessageOut], **errors(401)})
def mine(request: HttpRequest) -> list[MessageOut]:
    return [MessageOut.from_orm(n) for n in services.recent(request)]


@staff_router.get("/notifications/templates", response={200: list[TemplateOut], **errors(401, 403)})
def templates(request: HttpRequest, location_id: uuid.UUID) -> list[TemplateOut]:
    return [TemplateOut(**view.__dict__) for view in services.staff_templates(request, location_id)]


@staff_router.put("/notifications/templates", response={200: OkOut, **errors(401, 403, 404, 422)})
def save_template(request: HttpRequest, payload: TemplateIn) -> OkOut:
    services.save_template(
        request,
        payload.location_id,
        payload.event,
        payload.channel,
        payload.language,
        payload.subject,
        payload.body,
    )
    return OkOut()


@staff_router.post("/notifications/templates/reset", response={200: OkOut, **errors(401, 403)})
def reset_template(request: HttpRequest, payload: TemplateKeyIn) -> OkOut:
    services.reset_template(
        request, payload.location_id, payload.event, payload.channel, payload.language
    )
    return OkOut()


@staff_router.get("/notifications/outbox", response={200: list[OutboxOut], **errors(401, 403)})
def outbox(request: HttpRequest, location_id: uuid.UUID) -> list[OutboxOut]:
    return [
        OutboxOut(
            id=n.id,
            event=n.event,
            channel=n.channel,
            user_name=f"{n.user.first_name} {n.user.last_name}".strip(),
            status=n.status,
            attempts=n.attempts,
            last_error=n.last_error,
            created_at=n.created_at,
            sent_at=n.sent_at,
        )
        for n in services.staff_outbox(request, location_id)
    ]
