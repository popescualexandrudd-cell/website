"""Live updates for the screens (ADR-0005): after a change is committed, the screens of the
location hear "changed" on their WebSocket and reload their state from the API (the source
of truth). A screen opens its WebSocket with a short, one-time ticket it gets from the API
with its device token (a browser WebSocket cannot send the token as a header)."""

from __future__ import annotations

import logging
import secrets
import uuid
from typing import Any

from asgiref.sync import async_to_sync
from channels.generic.websocket import JsonWebsocketConsumer
from channels.layers import get_channel_layer
from django.core.cache import cache
from django.db import transaction

from jungle.devices.models import Device

log = logging.getLogger(__name__)
TICKET_SECONDS = 60


def group(location_id: uuid.UUID | str) -> str:
    return f"screens.{location_id}"


def changed(location_id: uuid.UUID | str | None, topic: str) -> None:
    """After the transaction commits (never for data that was rolled back)."""
    if location_id is None:
        return

    def send() -> None:
        layer = get_channel_layer()
        try:
            async_to_sync(layer.group_send)(
                group(location_id), {"type": "screens.changed", "topic": topic}
            )
        except Exception:  # the screens refresh on their own anyway; a write never fails
            log.warning("screens: could not announce a change", exc_info=True)

    transaction.on_commit(send)


def issue_ticket(device: Device) -> str:
    ticket = secrets.token_urlsafe(24)
    cache.set(
        f"screen-ticket:{ticket}",
        {"device": str(device.pk), "location": str(device.location_id)},
        TICKET_SECONDS,
    )
    return ticket


def redeem(ticket: str) -> dict[str, str] | None:
    """Good once, for a minute."""
    if not ticket or len(ticket) > 64:
        return None
    key = f"screen-ticket:{ticket}"
    found: dict[str, str] | None = cache.get(key)
    cache.delete(key)
    return found


class ScreenConsumer(JsonWebsocketConsumer):  # type: ignore[misc]
    """One screen's connection: it only ever receives "changed" notices for its location."""

    location: str = ""

    def connect(self) -> None:
        query = dict(
            part.split("=", 1)
            for part in self.scope.get("query_string", b"").decode().split("&")
            if "=" in part
        )
        found = redeem(query.get("ticket", ""))
        if found is None:
            self.close(code=4401)
            return
        self.location = found["location"]
        async_to_sync(self.channel_layer.group_add)(group(self.location), self.channel_name)
        self.accept()
        self.send_json({"type": "hello"})

    def disconnect(self, code: int) -> None:
        if self.location:
            async_to_sync(self.channel_layer.group_discard)(group(self.location), self.channel_name)

    def receive_json(self, content: Any, **kwargs: Any) -> None:
        if isinstance(content, dict) and content.get("type") == "ping":
            self.send_json({"type": "pong"})

    def screens_changed(self, event: dict[str, Any]) -> None:
        self.send_json({"type": "changed", "topic": event.get("topic", "")})
