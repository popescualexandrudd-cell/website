"""Google Wallet (R-020, R-023): the "Add to Google Wallet" link and the card updates.

The link carries a JWT signed (RS256) with the club's service-account key; it contains the
card class and object, so saving it creates the card in the member's Google Wallet. When the
card changes, the object is updated through the Google Wallet API (the phone refreshes by
itself). The key file lives only on the server (`.env`, Q24); without it the adapter is off.
"""

from __future__ import annotations

import base64
import json
import logging
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey
from django.conf import settings
from django.core.cache import cache

from jungle.cards.fields import card_fields, full_name
from jungle.cards.models import CardStatus, MemberCard
from jungle.cards.printing import NIGHT_900

log = logging.getLogger(__name__)
SAVE_URL = "https://pay.google.com/gp/v/save/"
API = "https://walletobjects.googleapis.com/walletobjects/v1"
TOKEN_URL = "https://oauth2.googleapis.com/token"  # noqa: S105 - a public URL, not a secret
SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer"
CLASS_SUFFIX = "member_card"


def enabled() -> bool:
    return bool(settings.GOOGLE_WALLET_ENABLED and settings.GOOGLE_WALLET_ISSUER_ID)


@dataclass(frozen=True)
class ServiceAccount:
    email: str
    key_id: str
    key: RSAPrivateKey


def account_from_settings() -> ServiceAccount:
    data = json.loads(Path(settings.GOOGLE_WALLET_SERVICE_ACCOUNT_FILE).read_text())
    key = serialization.load_pem_private_key(data["private_key"].encode(), None)
    if not isinstance(key, RSAPrivateKey):
        raise ValueError("the service account key must be an RSA key")
    return ServiceAccount(data["client_email"], data.get("private_key_id", ""), key)


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def sign_jwt(claims: dict[str, Any], account: ServiceAccount) -> str:
    header = {"alg": "RS256", "typ": "JWT", "kid": account.key_id}
    signing_input = f"{_b64(json.dumps(header).encode())}.{_b64(json.dumps(claims).encode())}"
    signature = account.key.sign(signing_input.encode(), padding.PKCS1v15(), hashes.SHA256())
    return f"{signing_input}.{_b64(signature)}"


def _text(ro: str, en: str) -> dict[str, Any]:
    return {
        "defaultValue": {"language": "ro", "value": ro},
        "translatedValues": [{"language": "en", "value": en}],
    }


def class_id() -> str:
    return f"{settings.GOOGLE_WALLET_ISSUER_ID}.{CLASS_SUFFIX}"


def object_id(card: MemberCard) -> str:
    return f"{settings.GOOGLE_WALLET_ISSUER_ID}.{card.pk.hex}"


def card_class() -> dict[str, Any]:
    return {"id": class_id()}


def card_object(card: MemberCard) -> dict[str, Any]:
    return {
        "id": object_id(card),
        "classId": class_id(),
        "state": "ACTIVE" if card.status == CardStatus.ACTIVE else "INACTIVE",
        "cardTitle": _text("Jungle Padel", "Jungle Padel"),
        "subheader": _text("Membru", "Member"),
        "header": {"defaultValue": {"language": "ro", "value": full_name(card)}},
        "hexBackgroundColor": NIGHT_900,
        "logo": {
            "sourceUri": {"uri": f"{settings.WEB_BASE_URL}/wallet/logo-660.png"},
            "contentDescription": _text("Sigla Jungle Padel", "Jungle Padel logo"),
        },
        "barcode": {"type": "QR_CODE", "value": card.token, "alternateText": card.number},
        "textModulesData": [
            {"id": f.key, "header": f.label_ro, "body": f.value} for f in card_fields(card)
        ]
        + [{"id": "number", "header": "Număr card", "body": card.number}],
    }


def save_url(card: MemberCard, account: ServiceAccount | None = None) -> str:
    """The "Add to Google Wallet" link for the member (valid while the card is active)."""
    claims = {
        "iss": (account or account_from_settings()).email,
        "aud": "google",
        "typ": "savetowallet",
        "iat": int(time.time()),
        "origins": [settings.WEB_BASE_URL],
        "payload": {"genericClasses": [card_class()], "genericObjects": [card_object(card)]},
    }
    return SAVE_URL + sign_jwt(claims, account or account_from_settings())


# ---------------------------------------------------------------- updates (R-023)
class Transport(Protocol):
    def access_token(self, assertion: str) -> str: ...

    def patch(self, url: str, token: str, body: dict[str, Any]) -> int: ...


class HttpTransport:  # pragma: no cover - needs Google's servers
    def access_token(self, assertion: str) -> str:
        import httpx

        response = httpx.post(
            TOKEN_URL,
            data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": assertion,
            },
            timeout=10,
        )
        response.raise_for_status()
        return str(response.json()["access_token"])

    def patch(self, url: str, token: str, body: dict[str, Any]) -> int:
        import httpx

        response = httpx.patch(
            url, json=body, headers={"Authorization": f"Bearer {token}"}, timeout=10
        )
        return response.status_code


_transport: Transport = HttpTransport()


def set_transport(transport: Transport) -> None:
    global _transport
    _transport = transport


def _token(account: ServiceAccount) -> str:
    cached = cache.get("google_wallet_token")
    if cached:
        return str(cached)
    now = int(time.time())
    assertion = sign_jwt(
        {"iss": account.email, "scope": SCOPE, "aud": TOKEN_URL, "iat": now, "exp": now + 3600},
        account,
    )
    token = _transport.access_token(assertion)
    cache.set("google_wallet_token", token, 3000)
    return token


def refresh(card: MemberCard, account: ServiceAccount | None = None) -> bool:
    """Updates the card in Google Wallet. A card never saved there answers 404: nothing to do."""
    if not enabled():
        return False
    try:
        account = account or account_from_settings()
        status = _transport.patch(
            f"{API}/genericObject/{object_id(card)}", _token(account), card_object(card)
        )
    except Exception:  # a network error must not break the change that caused it
        log.warning("Google Wallet update failed for card %s", card.pk, exc_info=True)
        return False
    if status not in (200, 404):
        log.warning("Google Wallet answered %s for card %s", status, card.pk)
    return status == 200
