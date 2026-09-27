"""Apple Wallet (R-020, R-023): the signed .pkpass file and the update push.

A .pkpass is a ZIP with pass.json, the images, per-language labels, manifest.json (the
SHA-1 of every file) and `signature`: a detached PKCS #7 signature of the manifest with the
club's "Pass Type ID" certificate, including Apple's WWDR intermediate certificate.

When the card changes, every iPhone that holds it gets an empty push through APNs and then
asks our web service (`wallet_api.py`) for the new pass. The certificates live only on the
server (`.env`, Q24); without them the adapter stays off.
"""

from __future__ import annotations

import hashlib
import io
import json
import logging
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey
from cryptography.hazmat.primitives.serialization import pkcs7
from django.conf import settings

from jungle.cards.fields import card_fields, full_name
from jungle.cards.models import CardStatus, MemberCard
from jungle.cards.printing import BONE_50, BRASS_400, NIGHT_900

log = logging.getLogger(__name__)
ASSETS = Path(__file__).parent / "wallet_assets"
IMAGES = ("icon.png", "icon@2x.png", "icon@3x.png", "logo.png", "logo@2x.png", "logo@3x.png")
CONTENT_TYPE = "application/vnd.apple.pkpass"


def enabled() -> bool:
    return bool(settings.APPLE_WALLET_ENABLED and settings.APPLE_PASS_TYPE_ID)


def _rgb(hex_colour: str) -> str:
    value = hex_colour.lstrip("#")
    r, g, b = (int(value[i : i + 2], 16) for i in (0, 2, 4))
    return f"rgb({r},{g},{b})"


def pass_json(card: MemberCard) -> dict[str, object]:
    fields = card_fields(card)
    return {
        "formatVersion": 1,
        "passTypeIdentifier": settings.APPLE_PASS_TYPE_ID,
        "serialNumber": str(card.pk),
        "teamIdentifier": settings.APPLE_TEAM_ID,
        "organizationName": "Jungle Padel",
        "description": "Card de membru Jungle Padel",
        "logoText": "Jungle Padel",
        "foregroundColor": _rgb(BONE_50),
        "labelColor": _rgb(BRASS_400),
        "backgroundColor": _rgb(NIGHT_900),
        "authenticationToken": card.wallet_auth_token,
        "webServiceURL": settings.APPLE_WALLET_WEB_SERVICE_URL,
        "voided": card.status != CardStatus.ACTIVE,
        "sharingProhibited": True,
        "barcodes": [
            {
                "format": "PKBarcodeFormatQR",
                "message": card.token,
                "messageEncoding": "iso-8859-1",
                "altText": card.number,
            }
        ],
        "storeCard": {
            "primaryFields": [{"key": "name", "label": "label_member", "value": full_name(card)}],
            "secondaryFields": [
                {"key": f.key, "label": f"label_{f.key}", "value": f.value} for f in fields[:3]
            ],
            "backFields": [
                {"key": "number", "label": "label_number", "value": card.number},
                {"key": "info", "label": "label_info", "value": "info_text"},
            ],
        },
    }


def _strings(language: str, card: MemberCard) -> bytes:
    """Per-language labels (RO + EN, R-140): the .strings format of Apple."""
    ro = language == "ro"
    labels = {
        "label_member": "Membru" if ro else "Member",
        "label_number": "Număr card" if ro else "Card number",
        "label_info": "Informații" if ro else "Information",
        "info_text": (
            "Scanează cardul la sosire, la intrarea pe teren și la plăți. "
            "Card pierdut? Îl blochezi și primești altul din contul tău."
            if ro
            else "Scan the card on arrival, when entering the court and to pay. "
            "Lost it? Block it and get a new one from your account."
        ),
    }
    for f in card_fields(card):
        labels[f"label_{f.key}"] = f.label_ro if ro else f.label_en
    lines = [f'"{k}" = "{v.replace(chr(34), chr(39))}";' for k, v in labels.items()]
    return ("\n".join(lines) + "\n").encode("utf-16")


# ---------------------------------------------------------------- signing
@dataclass(frozen=True)
class Signer:
    certificate: x509.Certificate
    key: RSAPrivateKey
    wwdr: x509.Certificate

    def sign(self, manifest: bytes) -> bytes:
        return (
            pkcs7.PKCS7SignatureBuilder()
            .set_data(manifest)
            .add_signer(self.certificate, self.key, hashes.SHA256())
            .add_certificate(self.wwdr)
            .sign(
                serialization.Encoding.DER,
                [pkcs7.PKCS7Options.DetachedSignature, pkcs7.PKCS7Options.Binary],
            )
        )


def signer_from_settings() -> Signer:
    password = settings.APPLE_PASS_KEY_PASSWORD.encode() or None
    key = serialization.load_pem_private_key(
        Path(settings.APPLE_PASS_KEY_FILE).read_bytes(), password
    )
    if not isinstance(key, RSAPrivateKey):  # Apple issues RSA pass certificates
        raise ValueError("the pass key must be an RSA key")
    return Signer(
        certificate=x509.load_pem_x509_certificate(
            Path(settings.APPLE_PASS_CERT_FILE).read_bytes()
        ),
        key=key,
        wwdr=x509.load_pem_x509_certificate(Path(settings.APPLE_WWDR_CERT_FILE).read_bytes()),
    )


def build_pkpass(card: MemberCard, signer: Signer | None = None) -> bytes:
    files: dict[str, bytes] = {
        "pass.json": json.dumps(pass_json(card), ensure_ascii=False).encode()
    }
    for name in IMAGES:
        files[name] = (ASSETS / name).read_bytes()
    for language in ("ro", "en"):
        files[f"{language}.lproj/pass.strings"] = _strings(language, card)
    manifest = json.dumps(
        {
            name: hashlib.sha1(data, usedforsecurity=False).hexdigest()
            for name, data in files.items()
        },
        sort_keys=True,
    ).encode()
    signature = (signer or signer_from_settings()).sign(manifest)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in files.items():
            archive.writestr(name, data)
        archive.writestr("manifest.json", manifest)
        archive.writestr("signature", signature)
    return buffer.getvalue()


# ---------------------------------------------------------------- update push (R-023)
class Pusher(Protocol):
    def push(self, push_token: str) -> int:
        """Sends the empty update push; returns the APNs status code."""
        ...


class ApnsPusher:
    """HTTP/2 to APNs with the pass certificate (Apple's rule for Wallet updates)."""

    def push(self, push_token: str) -> int:  # pragma: no cover - needs Apple's servers
        import ssl

        import httpx

        context = ssl.create_default_context()
        context.load_cert_chain(
            settings.APPLE_PASS_CERT_FILE,
            settings.APPLE_PASS_KEY_FILE,
            settings.APPLE_PASS_KEY_PASSWORD or None,
        )
        with httpx.Client(http2=True, verify=context, timeout=10) as client:
            response = client.post(
                f"{settings.APPLE_APNS_HOST}/3/device/{push_token}",
                headers={"apns-topic": settings.APPLE_PASS_TYPE_ID},
                json={},
            )
        return response.status_code


_pusher: Pusher = ApnsPusher()


def set_pusher(pusher: Pusher) -> None:
    """Tests (and a future provider) replace the APNs client."""
    global _pusher
    _pusher = pusher


def refresh(card: MemberCard) -> int:
    """Asks every device holding the card to fetch it again. A device that removed the pass
    (APNs 410) is forgotten. Returns the number of pushes sent."""
    if not enabled():
        return 0
    sent = 0
    for registration in card.apple_registrations.all():
        try:
            status = _pusher.push(registration.push_token)
        except Exception:  # a network error must not break the change that caused it
            log.warning("APNs push failed for card %s", card.pk, exc_info=True)
            continue
        if status == 410:
            registration.delete()
        elif status == 200:
            sent += 1
        else:
            log.warning("APNs answered %s for card %s", status, card.pk)
    return sent
