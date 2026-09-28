"""Ed25519 signatures (ADR-0013).

The bridge's private key never leaves this machine and never reaches the browser. What the
bridge reports (a card scanned, a banknote accepted, change given) is signed with it; the server
trusts only what carries a valid signature. The server's sensitive commands (give change) come
signed with the server's key, and the bridge checks them before acting.

Wire format, the same in both directions and on the server (`jungle.devices.bridge`):
{"payload": {...}, "signature": "<base64>"}, the signed bytes being the payload as canonical JSON
(sorted keys, no spaces, UTF-8). Each payload carries `device`, `type`, a unique `nonce` and the
time `at`; a message is accepted once, within a short window.
"""

from __future__ import annotations

import base64
import binascii
import json
import os
import secrets
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    PublicFormat,
    load_pem_private_key,
)


class SignatureError(Exception):
    """A message that is not signed correctly, is stale, replayed or meant for someone else."""


def canonical(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def now_utc() -> datetime:
    return datetime.now(UTC)


def load_or_create_key(path: Path) -> Ed25519PrivateKey:
    """The bridge's key, created on first start (readable only by the service's user)."""
    if path.exists():
        key = load_pem_private_key(path.read_bytes(), password=None)
        if not isinstance(key, Ed25519PrivateKey):
            raise SignatureError("key_not_ed25519")
        return key
    key = Ed25519PrivateKey.generate()
    path.parent.mkdir(parents=True, exist_ok=True)
    pem = key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption())
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as handle:
        handle.write(pem)
    return key


def public_key_b64(key: Ed25519PrivateKey) -> str:
    """What the admin pastes at enrollment: 32 raw bytes, base64."""
    raw = key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    return base64.b64encode(raw).decode()


def parse_public_key(value: str) -> Ed25519PublicKey:
    try:
        return Ed25519PublicKey.from_public_bytes(base64.b64decode(value, validate=True))
    except (binascii.Error, ValueError) as exc:
        raise SignatureError("key_invalid") from exc


class Signer:
    """Signs the bridge's messages for one device."""

    def __init__(self, key: Ed25519PrivateKey, device_id: str, clock: Callable[[], datetime]):
        self.key = key
        self.device_id = device_id
        self.clock = clock
        self.public_key = public_key_b64(key)

    def sign(self, kind: str, **fields: Any) -> dict[str, Any]:
        payload = {
            **fields,
            "device": self.device_id,
            "type": kind,
            "nonce": secrets.token_hex(16),
            "at": self.clock().isoformat(),
        }
        signature = self.key.sign(canonical(payload))
        return {"payload": payload, "signature": base64.b64encode(signature).decode()}


class Verifier:
    """Checks the server's commands: signature, device, type, time window, and each nonce
    once (`seen` records it durably, so a replay is refused even after a restart)."""

    def __init__(
        self,
        server_key: Ed25519PublicKey | None,
        device_id: str,
        window_seconds: int,
        clock: Callable[[], datetime],
        seen: Callable[[str], bool],
    ):
        self.server_key = server_key
        self.device_id = device_id
        self.window = window_seconds
        self.clock = clock
        self.seen = seen

    def verify(self, envelope: Any, kind: str) -> dict[str, Any]:
        if self.server_key is None:
            raise SignatureError("no_server_key")
        if not isinstance(envelope, dict):
            raise SignatureError("malformed")
        payload = envelope.get("payload")
        signature = envelope.get("signature")
        if not isinstance(payload, dict) or not isinstance(signature, str):
            raise SignatureError("malformed")
        try:
            self.server_key.verify(base64.b64decode(signature, validate=True), canonical(payload))
            made = datetime.fromisoformat(str(payload["at"]))
            nonce = str(payload["nonce"])
        except (InvalidSignature, binascii.Error, KeyError, ValueError) as exc:
            raise SignatureError("signature") from exc
        if payload.get("device") != self.device_id or payload.get("type") != kind:
            raise SignatureError("wrong_target")
        if made.tzinfo is None or abs((self.clock() - made).total_seconds()) > self.window:
            raise SignatureError("stale")
        if not 8 <= len(nonce) <= 100:
            raise SignatureError("nonce")
        if not self.seen(nonce):
            raise SignatureError("replay")
        return payload
