"""Device authentication (ADR-0012).

A kiosk, a screen or the café display calls the API with `X-Device-Token: <device id>.<secret>`.
The secret is shown once, at enrollment; the server keeps only its SHA-256. In staging and
production the proxy also checks the device's client certificate (mTLS) and passes its
fingerprint, which must match the one enrolled. A refused attempt is written in the audit log.
What a device may do (its kind, club and network) is checked again by each service.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.core.cache import cache
from django.http import HttpRequest
from ninja.security import APIKeyHeader

from jungle.audit import services as audit
from jungle.core import clock
from jungle.core.http import client_ip
from jungle.devices.models import Device

HEADER = "X-Device-Token"
SEEN_EVERY = timedelta(minutes=1)  # last_seen_at is written at most once a minute
# Failed attempts from one address: after this many in the window, that address is refused
# at once (no database work, no more audit rows), so guessing cannot flood the audit log.
MAX_FAILURES = 20
FAILURE_WINDOW_SECONDS = 600


def new_secret() -> str:
    return secrets.token_urlsafe(32)


def hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()


def _failures_key(request: HttpRequest) -> str:
    return f"device-auth-failures:{client_ip(request) or '-'}"


def _refuse(request: HttpRequest, device_id: str, problem: str) -> None:
    key = _failures_key(request)
    cache.add(key, 0, FAILURE_WINDOW_SECONDS)
    failures = cache.incr(key)
    audit.record(
        audit.actor_from_request(request),
        "devices.auth_refused",
        after={
            "device": device_id[:40],
            "problem": problem,
            "ip": client_ip(request) or "",
            "throttled": failures >= MAX_FAILURES,
        },
    )


def authenticate_device(request: HttpRequest, key: str | None) -> Device | None:
    if not key or "." not in key:
        return None
    if cache.get(_failures_key(request), 0) >= MAX_FAILURES:
        return None  # too many failures from this address: refused without a trace per try
    device_id, secret = key.split(".", 1)
    try:
        pk = uuid.UUID(device_id)
    except ValueError:
        _refuse(request, device_id, "malformed")
        return None
    device = Device.objects.filter(pk=pk).first()
    if device is None or not device.token_hash:
        _refuse(request, device_id, "unknown")
        return None
    if not hmac.compare_digest(device.token_hash, hash_secret(secret)):
        _refuse(request, device_id, "wrong_token")
        return None
    fingerprint = str(request.META.get(settings.DEVICE_CERT_HEADER, "")).lower().replace(":", "")
    expected = device.certificate_fingerprint.lower().replace(":", "")
    if (settings.DEVICE_MTLS_REQUIRED or expected) and (
        not fingerprint or not hmac.compare_digest(fingerprint, expected)
    ):
        _refuse(request, device_id, "certificate")
        return None
    if not device.is_active:
        _refuse(request, device_id, "inactive")
        return None
    now = clock.now()
    if device.last_seen_at is None or now - device.last_seen_at >= SEEN_EVERY:
        Device.objects.filter(pk=device.pk).update(last_seen_at=now)
    request.device = device  # type: ignore[attr-defined]
    return device


class DeviceAuth(APIKeyHeader):
    param_name = HEADER

    def authenticate(self, request: HttpRequest, key: str | None) -> Any:
        return authenticate_device(request, key)


device_auth = DeviceAuth()


def device_of(request: HttpRequest) -> Device:
    device: Device = request.auth  # type: ignore[attr-defined]
    return device
