"""Who is at a kiosk (League Kiosk, Payments Kiosk): the card the scanner read, then a short
session so one scan is enough for several actions.

When the device has a Hardware Bridge enrolled, a scan must come signed by it (a browser
cannot invent a card scan) and is accepted once; without a bridge (development) the plain
code is accepted. The first scan opens a session on the server, bound to that device, that
ends after a minute without use or when the kiosk logs the person out (§8.2: 30 s idle).
"""

from __future__ import annotations

import secrets
from typing import Any

from django.core.cache import cache
from django.http import HttpRequest
from ninja import Field, Schema

from jungle.accounts.models import User
from jungle.cards import services as cards
from jungle.core.errors import DomainError, ErrorCode
from jungle.devices import bridge
from jungle.devices.auth import device_of

SESSION_SECONDS = 60


class CardIn(Schema):
    token: str | None = Field(default=None, max_length=200, description="Codul citit (fără Bridge)")
    signed: dict[str, Any] | None = Field(default=None, description="Scanarea semnată de Bridge")
    session: str | None = Field(
        default=None, max_length=64, description="Sesiunea deschisă de o scanare (POST /session)"
    )


def _key(request: HttpRequest, session: str) -> str:
    return f"kiosk-session:{device_of(request).pk}:{session}"


def scanned_token(request: HttpRequest, card: CardIn) -> str:
    """What the scanner read (signed by the device's bridge when it has one), or the card
    behind a session this kiosk opened."""
    device = device_of(request)
    if card.session:
        key = _key(request, card.session)
        token = cache.get(key)
        if token is None:
            raise DomainError(ErrorCode.DEVICES_SESSION_EXPIRED, status=403)
        cache.touch(key, SESSION_SECONDS)
        return str(token)
    if device.public_key:
        payload = bridge.verify(device, card.signed or {}, "scan")
        return str(payload.get("code", ""))
    if not card.token:
        raise DomainError(ErrorCode.CARDS_INVALID, status=404)
    return card.token


def person(request: HttpRequest, card: CardIn) -> User:
    """The card holder (an active card of an active account)."""
    return cards.resolve(scanned_token(request, card)).user


def open_session(request: HttpRequest, card: CardIn) -> tuple[User, str]:
    """The person and the session for the next actions (the same one when it was given)."""
    token = scanned_token(request, card)
    user = cards.resolve(token).user
    session = card.session or secrets.token_urlsafe(24)
    cache.set(_key(request, session), token, SESSION_SECONDS)
    return user, session


def end_session(request: HttpRequest, session: str) -> None:
    cache.delete(_key(request, session))


def acting_as(request: HttpRequest, user: User) -> HttpRequest:
    """The request, now on behalf of the card holder at this kiosk: services that act for
    "the current person" (ordering a subscription, using a voucher) work unchanged, and the
    audit log records both the person and the device. Staff permissions never apply here:
    they need a staff login with two-factor authentication (ADR-0011)."""
    request.user = user
    return request


class LogoutIn(Schema):
    session: str = Field(max_length=64)
