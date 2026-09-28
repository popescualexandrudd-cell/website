"""Device enrollment and authentication (ADR-0012) and messages signed by the Hardware Bridge
(ADR-0013)."""

from __future__ import annotations

import base64
import uuid
from datetime import timedelta
from typing import Any

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from django.test import Client, override_settings

from jungle.audit.models import AuditLog
from jungle.conftest import Api, error_code
from jungle.core import clock
from jungle.core.errors import DomainError
from jungle.core.permissions import Role
from jungle.devices import bridge
from jungle.devices.models import Device, DeviceKind
from jungle.locations.models import Location

pytestmark = pytest.mark.django_db

FINGERPRINT = "ab" * 32


def raw_key(key: Ed25519PrivateKey) -> str:
    return base64.b64encode(key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)).decode()


def signed(key: Ed25519PrivateKey, payload: dict[str, Any]) -> dict[str, Any]:
    signature = key.sign(bridge.canonical(payload))
    return {"payload": payload, "signature": base64.b64encode(signature).decode()}


def scan_payload(device: Device, **changes: Any) -> dict[str, Any]:
    return {
        "device": str(device.pk),
        "type": "scan",
        "nonce": uuid.uuid4().hex,
        "at": clock.now().isoformat(),
        "code": "CARD",
        **changes,
    }


@pytest.fixture
def device(location: Location) -> Device:
    return Device.objects.create(kind=DeviceKind.LEAGUE_KIOSK, location=location, name="Chioșc 1")


def enroll(api: Api, device: Device, **body: Any) -> Any:
    return api.post(f"/staff/devices/{device.pk}/enroll", body)


def whoami(token: str, **meta: Any) -> Any:
    return Client().get("/api/v1/device/whoami", HTTP_X_DEVICE_TOKEN=token, **meta)


def test_adr0012_enrollment_shows_the_token_once(api: Api, staff: Any, device: Device) -> None:
    staff(Role.ADMIN)
    key = Ed25519PrivateKey.generate()
    response = enroll(api, device, public_key=raw_key(key))
    assert response.status_code == 200
    token = response.json()["token"]
    assert token.startswith(f"{device.pk}.")
    device.refresh_from_db()
    assert device.enrolled_at is not None and device.public_key == raw_key(key)
    assert token.split(".", 1)[1] not in device.token_hash  # only the hash is kept
    log = AuditLog.objects.get(action="devices.enrolled")
    assert log.after == {"bridge_key": True, "certificate": False}
    assert "token" not in str(log.after)

    alive = whoami(token)
    assert alive.status_code == 200 and alive.json()["name"] == "Chioșc 1"
    device.refresh_from_db()
    assert device.last_seen_at is not None
    whoami(token)  # within a minute: last_seen_at is not written again
    again = enroll(api, device).json()["token"]  # a new token replaces the old one
    assert whoami(token).status_code == 401
    assert whoami(again).status_code == 200


def test_adr0012_enrollment_input(api: Api, staff: Any, device: Device) -> None:
    staff(Role.ADMIN)
    assert error_code(enroll(api, device, public_key="nu-e-cheie")) == "devices.key_invalid"
    short = base64.b64encode(b"x" * 10).decode()
    assert error_code(enroll(api, device, public_key=short)) == "devices.key_invalid"
    bad = enroll(api, device, certificate_fingerprint="zz")
    assert error_code(bad) == "validation.invalid"
    colons = ":".join(["AB"] * 32)
    assert enroll(api, device, certificate_fingerprint=colons).status_code == 200
    device.refresh_from_db()
    assert device.certificate_fingerprint == FINGERPRINT
    missing = api.post(f"/staff/devices/{uuid.uuid4()}/enroll", {})
    assert error_code(missing) == "devices.not_found"


def test_adr0012_only_admins_enroll(api: Api, staff: Any, device: Device) -> None:
    staff(Role.MANAGER)
    assert error_code(enroll(api, device)) == "auth.forbidden"
    assert Device.objects.get(pk=device.pk).token_hash == ""


@pytest.mark.parametrize(
    ("token", "problem"),
    [
        ("fara-punct", None),
        ("nu-e-uuid.secret", "malformed"),
        (f"{uuid.uuid4()}.secret", "unknown"),
        ("{device}.gresit", "wrong_token"),
    ],
)
def test_adr0012_wrong_tokens_are_refused_and_logged(
    api: Api, staff: Any, device: Device, token: str, problem: str | None
) -> None:
    staff(Role.ADMIN)
    enroll(api, device)
    response = whoami(token.format(device=device.pk))
    assert response.status_code == 401
    logs = AuditLog.objects.filter(action="devices.auth_refused")
    if problem is None:  # not even a device token: nothing to log
        assert not logs.exists()
    else:
        assert (logs.get().after or {})["problem"] == problem
    assert Client().get("/api/v1/device/whoami").status_code == 401


def test_adr0012_an_inactive_device_is_refused(api: Api, staff: Any, device: Device) -> None:
    staff(Role.ADMIN)
    token = enroll(api, device).json()["token"]
    Device.objects.filter(pk=device.pk).update(is_active=False)
    assert whoami(token).status_code == 401
    assert (AuditLog.objects.get(action="devices.auth_refused").after or {})[
        "problem"
    ] == "inactive"


def test_adr0012_the_client_certificate_must_match(api: Api, staff: Any, device: Device) -> None:
    staff(Role.ADMIN)
    token = enroll(api, device, certificate_fingerprint=FINGERPRINT).json()["token"]
    assert whoami(token).status_code == 401  # no certificate from the proxy
    assert whoami(token, HTTP_X_CLIENT_CERT_SHA256="cd" * 32).status_code == 401
    upper = ":".join(["AB"] * 32)
    assert whoami(token, HTTP_X_CLIENT_CERT_SHA256=upper).status_code == 200
    problems = [
        (log.after or {})["problem"]
        for log in AuditLog.objects.filter(action="devices.auth_refused")
    ]
    assert problems == ["certificate", "certificate"]


def test_adr0012_production_requires_mtls(api: Api, staff: Any, device: Device) -> None:
    staff(Role.ADMIN)
    token = enroll(api, device).json()["token"]
    with override_settings(DEVICE_MTLS_REQUIRED=True):
        assert whoami(token).status_code == 401


# ---------------------------------------------------------------- the bridge's signed messages
def test_adr0013_a_signed_scan_is_accepted_once(device: Device) -> None:
    key = Ed25519PrivateKey.generate()
    device.public_key = raw_key(key)
    message = signed(key, scan_payload(device))
    assert bridge.verify(device, message, "scan")["code"] == "CARD"
    with pytest.raises(DomainError) as exc:  # replayed
        bridge.verify(device, message, "scan")
    assert (exc.value.code.value, exc.value.status) == ("devices.signature_invalid", 403)


@pytest.mark.parametrize(
    "change",
    [
        "no_key",
        "not_a_dict",
        "other_key",
        "tampered",
        "bad_base64",
        "no_nonce",
        "bad_time",
        "naive_time",
        "stale",
        "future",
        "other_device",
        "other_type",
        "short_nonce",
    ],
)
def test_adr0013_invalid_messages_are_refused(device: Device, change: str) -> None:
    key = Ed25519PrivateKey.generate()
    device.public_key = "" if change == "no_key" else raw_key(key)
    payload = scan_payload(device)
    edits: dict[str, dict[str, Any]] = {
        "bad_time": {"at": "ieri"},
        "naive_time": {"at": clock.now().replace(tzinfo=None).isoformat()},
        "stale": {"at": (clock.now() - timedelta(minutes=3)).isoformat()},
        "future": {"at": (clock.now() + timedelta(minutes=3)).isoformat()},
        "other_device": {"device": str(uuid.uuid4())},
        "other_type": {"type": "cash"},
        "short_nonce": {"nonce": "abc"},
    }
    payload.update(edits.get(change, {}))
    if change == "no_nonce":
        del payload["nonce"]
    signer = Ed25519PrivateKey.generate() if change == "other_key" else key
    message: dict[str, Any] = signed(signer, payload)
    if change == "not_a_dict":
        message = {"payload": "text", "signature": message["signature"]}
    if change == "tampered":
        message["payload"] = {**payload, "code": "ALT"}
    if change == "bad_base64":
        message["signature"] = "%%%"
    with pytest.raises(DomainError) as exc:
        bridge.verify(device, message, "scan")
    assert exc.value.code.value == "devices.signature_invalid"
