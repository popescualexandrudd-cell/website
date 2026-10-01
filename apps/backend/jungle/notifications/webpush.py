"""Web Push (the installable site's notifications, Q17): the message encryption of RFC 8291
(`aes128gcm`, RFC 8188) and the server identification of RFC 8292 (VAPID, ES256), with the
`cryptography` library the project already uses. The browser's push service (Google, Mozilla,
Apple) only carries the encrypted bytes: it cannot read the message.

The keys live only in the server's `.env` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, made with
`manage.py vapid_keys`; `VAPID_SUBJECT` = the club's contact, `mailto:...`). Without them push is
off and nothing is sent.
"""

from __future__ import annotations

import base64
import json
import os
import struct
import time
from dataclasses import dataclass
from urllib.parse import urlsplit

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from django.conf import settings

RECORD_SIZE = 4096
TTL_SECONDS = 24 * 3600
TIMEOUT_SECONDS = 10.0


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def unb64url(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _raw_public(key: ec.EllipticCurvePublicKey) -> bytes:
    return key.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )


def generate_keys() -> tuple[str, str]:
    """A new VAPID key pair (public, private), base64url; the public one is given to browsers."""
    private = ec.generate_private_key(ec.SECP256R1())
    raw_private = private.private_numbers().private_value.to_bytes(32, "big")
    return b64url(_raw_public(private.public_key())), b64url(raw_private)


def _hkdf(salt: bytes, ikm: bytes, info: bytes, length: int) -> bytes:
    return HKDF(algorithm=hashes.SHA256(), length=length, salt=salt, info=info).derive(ikm)


def encrypt(
    payload: bytes,
    p256dh: str,
    auth: str,
    *,
    sender: ec.EllipticCurvePrivateKey | None = None,
    salt: bytes | None = None,
) -> bytes:
    """RFC 8291 §3–4: one `aes128gcm` record for a subscription (`sender`, `salt`: tests)."""
    receiver_raw = unb64url(p256dh)
    receiver = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), receiver_raw)
    sender = sender or ec.generate_private_key(ec.SECP256R1())
    sender_raw = _raw_public(sender.public_key())
    salt = salt or os.urandom(16)
    shared = sender.exchange(ec.ECDH(), receiver)
    ikm = _hkdf(unb64url(auth), shared, b"WebPush: info\x00" + receiver_raw + sender_raw, 32)
    key = _hkdf(salt, ikm, b"Content-Encoding: aes128gcm\x00", 16)
    nonce = _hkdf(salt, ikm, b"Content-Encoding: nonce\x00", 12)
    if len(payload) > RECORD_SIZE - 17 - 86:
        raise ValueError("push payload too large")
    ciphertext = AESGCM(key).encrypt(nonce, payload + b"\x02", None)
    header = salt + struct.pack("!IB", RECORD_SIZE, len(sender_raw)) + sender_raw
    return header + ciphertext


def vapid_header(endpoint: str, private_key: str, public_key: str, subject: str) -> str:
    """RFC 8292: `vapid t=<signed JWT>, k=<public key>` for the push service of `endpoint`."""
    parts = urlsplit(endpoint)
    claims = {
        "aud": f"{parts.scheme}://{parts.netloc}",
        "exp": int(time.time()) + 12 * 3600,
        "sub": subject,
    }
    signing_input = (
        b64url(json.dumps({"typ": "JWT", "alg": "ES256"}, separators=(",", ":")).encode())
        + "."
        + b64url(json.dumps(claims, separators=(",", ":")).encode())
    )
    key = ec.derive_private_key(int.from_bytes(unb64url(private_key), "big"), ec.SECP256R1())
    r, s = decode_dss_signature(key.sign(signing_input.encode(), ec.ECDSA(hashes.SHA256())))
    signature = r.to_bytes(32, "big") + s.to_bytes(32, "big")
    return f"vapid t={signing_input}.{b64url(signature)}, k={public_key}"


@dataclass(frozen=True)
class Subscription:
    endpoint: str
    p256dh: str
    auth: str


class PushGone(Exception):
    """The browser unsubscribed (HTTP 404 / 410): the subscription is removed."""


def enabled() -> bool:
    return bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY and settings.VAPID_SUBJECT)


def send(
    subscription: Subscription, message: dict[str, str], client: httpx.Client | None = None
) -> None:
    """Delivers one encrypted message; PushGone for a dead subscription, httpx errors else."""
    body = encrypt(
        json.dumps(message, ensure_ascii=False).encode(), subscription.p256dh, subscription.auth
    )
    headers = {
        "Authorization": vapid_header(
            subscription.endpoint,
            settings.VAPID_PRIVATE_KEY,
            settings.VAPID_PUBLIC_KEY,
            settings.VAPID_SUBJECT,
        ),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "TTL": str(TTL_SECONDS),
        "Urgency": "normal",
    }
    owner = client is None
    http = client or httpx.Client(timeout=TIMEOUT_SECONDS)
    try:
        response = http.post(subscription.endpoint, content=body, headers=headers)
    finally:
        if owner:
            http.close()
    if response.status_code in (404, 410):
        raise PushGone(subscription.endpoint)
    response.raise_for_status()
