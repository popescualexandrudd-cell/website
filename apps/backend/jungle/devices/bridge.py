"""Messages signed by a Hardware Bridge (ADR-0013).

The bridge on each device holds an Ed25519 private key that never leaves the machine; its
public key is registered at enrollment. What the bridge reports (a card scanned, later: a
banknote accepted) is signed, so a compromised browser cannot invent it. Each message carries
the device id, a type, a unique nonce and the time it was made; the server accepts it once,
within a short window.

Wire format: {"payload": {...}, "signature": "<base64 Ed25519 signature>"}, where the signed
bytes are the payload as canonical JSON (sorted keys, no spaces, UTF-8).
"""

from __future__ import annotations

import base64
import binascii
import json
from datetime import datetime
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from django.conf import settings
from django.core.cache import cache

from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.devices.models import Device


def canonical(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def public_key(value: str) -> Ed25519PublicKey:
    """A registered key: 32 raw bytes, base64."""
    try:
        raw = base64.b64decode(value, validate=True)
        return Ed25519PublicKey.from_public_bytes(raw)
    except (binascii.Error, ValueError) as exc:
        raise DomainError(ErrorCode.DEVICES_KEY_INVALID) from exc


def _invalid() -> DomainError:
    return DomainError(ErrorCode.DEVICES_SIGNATURE_INVALID, status=403)


def verify(device: Device, envelope: dict[str, Any], kind: str) -> dict[str, Any]:
    """The payload of a valid, fresh, never-seen message of `kind` from this device's bridge."""
    payload = envelope.get("payload")
    signature = envelope.get("signature")
    if not isinstance(payload, dict) or not isinstance(signature, str) or not device.public_key:
        raise _invalid()
    try:
        public_key(device.public_key).verify(
            base64.b64decode(signature, validate=True), canonical(payload)
        )
        made = datetime.fromisoformat(str(payload["at"]))
        nonce = str(payload["nonce"])
    except (InvalidSignature, binascii.Error, KeyError, ValueError) as exc:
        raise _invalid() from exc
    window = settings.BRIDGE_MESSAGE_WINDOW_SECONDS
    if (
        payload.get("device") != str(device.pk)
        or payload.get("type") != kind
        or made.tzinfo is None
        or abs((clock.now() - made).total_seconds()) > window
        or not 8 <= len(nonce) <= 100
    ):
        raise _invalid()
    # Anti-replay: each nonce once (kept a little longer than the accepted window).
    if not cache.add(f"bridge-nonce:{device.pk}:{nonce}", 1, timeout=window * 2 + 60):
        raise _invalid()
    return payload
