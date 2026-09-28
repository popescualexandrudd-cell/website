"""Registering and enrolling club devices (ADR-0012)."""

from __future__ import annotations

import re
import uuid

from django.db import transaction
from django.db.models import QuerySet
from django.http import HttpRequest

from jungle.accounts.services.authz import authorize
from jungle.audit import services as audit
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.devices import auth, bridge
from jungle.devices.models import Device, DeviceKind
from jungle.locations.models import Location


def list_devices(request: HttpRequest) -> QuerySet[Device]:
    authorize(request, Action.DEVICES_MANAGE)
    return Device.objects.select_related("location")


def register_device(
    request: HttpRequest, kind: DeviceKind, location_id: uuid.UUID, name: str
) -> Device:
    authorize(request, Action.DEVICES_MANAGE, location_id=location_id)
    location = Location.objects.filter(pk=location_id).first()
    if location is None:
        raise DomainError(ErrorCode.LOCATIONS_NOT_FOUND, status=404)
    with transaction.atomic():
        device = Device.objects.create(kind=kind, location=location, name=name.strip())
        audit.record(
            audit.actor_from_request(request),
            "devices.registered",
            target=device,
            after=audit.snapshot(device),
        )
    return device


def set_device_active(
    request: HttpRequest, device_id: uuid.UUID, active: bool, reason: str
) -> Device:
    device = Device.objects.filter(pk=device_id).first()
    if device is None:
        raise DomainError(ErrorCode.DEVICES_NOT_FOUND, status=404)
    authorize(request, Action.DEVICES_MANAGE, location_id=device.location_id)
    with transaction.atomic():
        before = {"is_active": device.is_active}
        device.is_active = active
        device.save(update_fields=["is_active"])
        audit.record(
            audit.actor_from_request(request),
            "devices.activated" if active else "devices.deactivated",
            target=device,
            before=before,
            after={"is_active": active},
            reason=reason,
        )
    return device


FINGERPRINT = re.compile(r"^[0-9a-f]{64}$")


def enroll(
    request: HttpRequest,
    device_id: uuid.UUID,
    public_key: str = "",
    certificate_fingerprint: str = "",
) -> tuple[Device, str]:
    """ADR-0012: a new device token (shown once; any older one stops working), the bridge's
    Ed25519 public key and the client certificate's SHA-256 fingerprint."""
    device = Device.objects.filter(pk=device_id).first()
    if device is None:
        raise DomainError(ErrorCode.DEVICES_NOT_FOUND, status=404)
    authorize(request, Action.DEVICES_MANAGE, location_id=device.location_id)
    public_key = public_key.strip()
    if public_key:
        bridge.public_key(public_key)  # raises when it is not a valid Ed25519 key
    fingerprint = certificate_fingerprint.strip().lower().replace(":", "")
    if fingerprint and not FINGERPRINT.match(fingerprint):
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "certificate_fingerprint"})
    secret = auth.new_secret()
    with transaction.atomic():
        device.token_hash = auth.hash_secret(secret)
        device.public_key = public_key
        device.certificate_fingerprint = fingerprint
        device.enrolled_at = clock.now()
        device.save(
            update_fields=["token_hash", "public_key", "certificate_fingerprint", "enrolled_at"]
        )
        audit.record(
            audit.actor_from_request(request),
            "devices.enrolled",
            target=device,
            after={"bridge_key": bool(public_key), "certificate": bool(fingerprint)},
        )
    return device, f"{device.pk}.{secret}"
