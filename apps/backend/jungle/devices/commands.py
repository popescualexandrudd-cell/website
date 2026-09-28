"""Commands the server signs for a Hardware Bridge (ADR-0013).

Sensitive actions at a device (take cash for a transaction, give change, print a fiscal
receipt, refill or empty the cash box) run only on a command signed with the server's
Ed25519 key. The page in the kiosk's browser only carries it: a compromised page cannot pay
itself out. Each command names the device and has a unique nonce and a time; the bridge
executes it once, within a short window. The wire format is the bridge's (`bridge.canonical`).
"""

from __future__ import annotations

import base64
import secrets
from functools import cache
from typing import Any

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from django.conf import settings

from jungle.core import clock
from jungle.devices.bridge import canonical
from jungle.devices.models import Device


@cache
def _key(seed: str) -> Ed25519PrivateKey:
    return Ed25519PrivateKey.from_private_bytes(base64.b64decode(seed))


def _private_key() -> Ed25519PrivateKey:
    return _key(settings.DEVICE_COMMAND_KEY)


def public_key() -> str:
    """What each bridge is configured with (`BRIDGE_SERVER_PUBLIC_KEY`)."""
    raw = _private_key().public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    return base64.b64encode(raw).decode()


def sign(device: Device, kind: str, **fields: Any) -> dict[str, Any]:
    payload = {
        **fields,
        "device": str(device.pk),
        "type": kind,
        "nonce": secrets.token_hex(16),
        "at": clock.now().isoformat(),
    }
    signature = _private_key().sign(canonical(payload))
    return {"payload": payload, "signature": base64.b64encode(signature).decode()}
