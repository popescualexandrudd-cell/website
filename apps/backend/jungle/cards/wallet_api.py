"""The web service Apple Wallet calls (PassKit Web Service), under /api/v1/wallet/apple:

- POST/DELETE /v1/devices/{device}/registrations/{passType}/{serial}: a phone starts or
  stops following a card (header `Authorization: ApplePass <token>`);
- GET /v1/devices/{device}/registrations/{passType}?passesUpdatedSince=…: which cards changed;
- GET /v1/passes/{passType}/{serial}: the latest .pkpass;
- POST /v1/log: error reports from the phones.

Answers follow Apple's contract (status codes, no JSON error envelope).
"""

from __future__ import annotations

import hmac
import logging
import uuid
from datetime import UTC, datetime
from email.utils import format_datetime, parsedate_to_datetime

from django.conf import settings
from django.db import IntegrityError, transaction
from django.http import HttpRequest, HttpResponse, JsonResponse
from ninja import Router, Schema

from jungle.cards import wallet_apple
from jungle.cards.models import AppleDeviceRegistration, MemberCard
from jungle.core import clock

log = logging.getLogger(__name__)
router = Router(tags=["wallet: apple"])


class RegistrationIn(Schema):
    pushToken: str


class LogIn(Schema):
    logs: list[str] = []


def _card(request: HttpRequest, pass_type: str, serial: str) -> MemberCard | None:
    """The card, if the pass type is ours and the request carries its token."""
    if not wallet_apple.enabled() or pass_type != settings.APPLE_PASS_TYPE_ID:
        return None
    try:
        card_id = uuid.UUID(serial)
    except ValueError:
        return None
    card = MemberCard.objects.select_related("user").filter(pk=card_id).first()
    header = request.headers.get("Authorization", "")
    expected = f"ApplePass {card.wallet_auth_token}" if card else ""
    if card is None or not hmac.compare_digest(header.encode(), expected.encode()):
        return None
    return card


@router.post(
    "/v1/devices/{device}/registrations/{pass_type}/{serial}", auth=None, include_in_schema=False
)
def register(
    request: HttpRequest, device: str, pass_type: str, serial: str, payload: RegistrationIn
) -> HttpResponse:
    card = _card(request, pass_type, serial)
    if card is None:
        return HttpResponse(status=401)
    try:
        with transaction.atomic():
            AppleDeviceRegistration.objects.create(
                card=card,
                device_library_id=device[:128],
                push_token=payload.pushToken[:256],
                created_at=clock.now(),
            )
    except IntegrityError:
        AppleDeviceRegistration.objects.filter(card=card, device_library_id=device[:128]).update(
            push_token=payload.pushToken[:256]
        )
        return HttpResponse(status=200)
    return HttpResponse(status=201)


@router.delete(
    "/v1/devices/{device}/registrations/{pass_type}/{serial}", auth=None, include_in_schema=False
)
def unregister(request: HttpRequest, device: str, pass_type: str, serial: str) -> HttpResponse:
    card = _card(request, pass_type, serial)
    if card is None:
        return HttpResponse(status=401)
    AppleDeviceRegistration.objects.filter(card=card, device_library_id=device).delete()
    return HttpResponse(status=200)


@router.get("/v1/devices/{device}/registrations/{pass_type}", auth=None, include_in_schema=False)
def changed(
    request: HttpRequest, device: str, pass_type: str, passesUpdatedSince: str = ""
) -> HttpResponse:
    if not wallet_apple.enabled() or pass_type != settings.APPLE_PASS_TYPE_ID:
        return HttpResponse(status=404)
    cards = MemberCard.objects.filter(apple_registrations__device_library_id=device)
    if passesUpdatedSince:
        try:
            since = datetime.fromtimestamp(int(passesUpdatedSince), tz=UTC)
        except ValueError:
            return HttpResponse(status=400)
        cards = cards.filter(updated_at__gt=since)
    rows = list(cards.values_list("pk", "updated_at"))
    if not rows:
        return HttpResponse(status=204)
    latest = max(updated for _, updated in rows)
    return JsonResponse(
        {"serialNumbers": [str(pk) for pk, _ in rows], "lastUpdated": str(int(latest.timestamp()))}
    )


@router.get("/v1/passes/{pass_type}/{serial}", auth=None, include_in_schema=False)
def latest_pass(request: HttpRequest, pass_type: str, serial: str) -> HttpResponse:
    card = _card(request, pass_type, serial)
    if card is None:
        return HttpResponse(status=401)
    modified = card.updated_at.replace(microsecond=0)
    since = request.headers.get("If-Modified-Since")
    if since:
        try:
            if modified <= parsedate_to_datetime(since):
                return HttpResponse(status=304)
        except (TypeError, ValueError):
            pass  # an unreadable date: send the pass
    response = HttpResponse(wallet_apple.build_pkpass(card), content_type=wallet_apple.CONTENT_TYPE)
    response["Last-Modified"] = format_datetime(modified, usegmt=True)
    return response


@router.post("/v1/log", auth=None, include_in_schema=False)
def device_log(request: HttpRequest, payload: LogIn) -> HttpResponse:
    for line in payload.logs[:20]:
        log.info("Apple Wallet: %s", line[:500])
    return HttpResponse(status=200)
