"""Web Push (Q17): RFC 8291 encryption (checked by decrypting as a browser would) and RFC 8292
identification (checked with the public key), and the delivery to a push service."""

from __future__ import annotations

import base64
import json
import struct
from typing import Any

import httpx
import pytest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from django.test import override_settings

from jungle.notifications import webpush
from jungle.notifications.webpush import b64url, unb64url


def hkdf(salt: bytes, ikm: bytes, info: bytes, length: int) -> bytes:
    return HKDF(algorithm=hashes.SHA256(), length=length, salt=salt, info=info).derive(ikm)


class Browser:
    """The receiving side of RFC 8291, as a browser implements it."""

    def __init__(self) -> None:
        self.key = ec.generate_private_key(ec.SECP256R1())
        self.auth = b"0123456789abcdef"
        raw = self.key.public_key().public_bytes(
            serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
        )
        self.p256dh = b64url(raw)

    def decrypt(self, body: bytes) -> bytes:
        salt, size, id_len = body[:16], *struct.unpack("!IB", body[16:21])
        sender_raw = body[21 : 21 + id_len]
        assert size == 4096 and id_len == 65
        sender = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), sender_raw)
        shared = self.key.exchange(ec.ECDH(), sender)
        info = b"WebPush: info\x00" + unb64url(self.p256dh) + sender_raw
        ikm = hkdf(self.auth, shared, info, 32)
        key = hkdf(salt, ikm, b"Content-Encoding: aes128gcm\x00", 16)
        nonce = hkdf(salt, ikm, b"Content-Encoding: nonce\x00", 12)
        plain = AESGCM(key).decrypt(nonce, body[21 + id_len :], None)
        assert plain.endswith(b"\x02")  # the last record's delimiter
        return plain[:-1]


def test_q17_a_browser_reads_what_the_club_encrypted() -> None:
    browser = Browser()
    body = webpush.encrypt(b'{"title":"Rezervare"}', browser.p256dh, b64url(browser.auth))
    assert browser.decrypt(body) == b'{"title":"Rezervare"}'
    # A fresh key and salt every time: the same text never looks the same twice.
    assert webpush.encrypt(b"x", browser.p256dh, b64url(browser.auth)) != webpush.encrypt(
        b"x", browser.p256dh, b64url(browser.auth)
    )
    with pytest.raises(ValueError, match="too large"):
        webpush.encrypt(b"x" * 4000, browser.p256dh, b64url(browser.auth))


def test_q17_vapid_keys_and_the_signed_identification() -> None:
    public, private = webpush.generate_keys()
    assert len(unb64url(public)) == 65 and len(unb64url(private)) == 32
    header = webpush.vapid_header(
        "https://fcm.googleapis.com/fcm/send/abc", private, public, "mailto:club@example.test"
    )
    token, key = header.removeprefix("vapid t=").split(", k=")
    assert key == public
    head, claims, signature = token.split(".")
    assert json.loads(unb64url(claims))["aud"] == "https://fcm.googleapis.com"
    assert json.loads(unb64url(claims))["sub"] == "mailto:club@example.test"
    raw = unb64url(signature)
    verifier = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), unb64url(public))
    verifier.verify(
        encode_dss_signature(int.from_bytes(raw[:32], "big"), int.from_bytes(raw[32:], "big")),
        f"{head}.{claims}".encode(),
        ec.ECDSA(hashes.SHA256()),
    )
    assert base64.urlsafe_b64decode(head + "==") == b'{"typ":"JWT","alg":"ES256"}'


@pytest.fixture
def keys() -> Any:
    public, private = webpush.generate_keys()
    with override_settings(
        VAPID_PUBLIC_KEY=public, VAPID_PRIVATE_KEY=private, VAPID_SUBJECT="mailto:c@example.test"
    ):
        yield


def test_q17_push_is_off_without_the_keys() -> None:
    assert webpush.enabled() is False


def test_q17_delivery_to_the_push_service(keys: Any, monkeypatch: pytest.MonkeyPatch) -> None:
    assert webpush.enabled() is True
    browser = Browser()
    sub = webpush.Subscription(
        "https://push.example.test/send/1", browser.p256dh, b64url(browser.auth)
    )
    seen: list[httpx.Request] = []
    status = {"code": 201}

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(status["code"])

    client = httpx.Client(transport=httpx.MockTransport(handler))
    webpush.send(sub, {"title": "Mâine", "body": "Teren 1"}, client)
    request = seen[0]
    assert request.headers["Content-Encoding"] == "aes128gcm"
    assert request.headers["Authorization"].startswith("vapid t=")
    assert json.loads(browser.decrypt(request.content)) == {"title": "Mâine", "body": "Teren 1"}
    status["code"] = 410
    with pytest.raises(webpush.PushGone):
        webpush.send(sub, {"title": "x"}, client)
    status["code"] = 500
    with pytest.raises(httpx.HTTPStatusError):
        webpush.send(sub, {"title": "x"}, client)
    # Without a client of its own, one is opened and closed for the message.
    status["code"] = 201
    opened: list[httpx.Client] = []
    real = httpx.Client

    def factory(**kwargs: Any) -> httpx.Client:
        made = real(transport=httpx.MockTransport(handler))
        opened.append(made)
        return made

    monkeypatch.setattr(httpx, "Client", factory)
    webpush.send(sub, {"title": "x"})
    assert opened and opened[0].is_closed
