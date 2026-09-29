"""Staff management of registered devices."""

from __future__ import annotations

import uuid
from datetime import datetime

from django.http import HttpRequest
from ninja import Field, Router, Schema, Status

from jungle.core import clock
from jungle.core.schemas import errors
from jungle.core.security import session_auth
from jungle.devices import services
from jungle.devices.auth import device_auth, device_of
from jungle.devices.models import DeviceKind

router = Router(tags=["staff: devices"], auth=session_auth)
device_router = Router(tags=["devices"], auth=device_auth)


class DeviceOut(Schema):
    id: uuid.UUID
    kind: str
    location_id: uuid.UUID
    name: str
    resource_id: uuid.UUID | None = Field(default=None, description="Terenul unui ecran (§8.5)")
    is_active: bool
    last_seen_at: datetime | None
    enrolled_at: datetime | None
    created_at: datetime


class DeviceIn(Schema):
    kind: DeviceKind
    location_id: uuid.UUID
    name: str = Field(min_length=1, max_length=120)
    resource_id: uuid.UUID | None = Field(
        default=None, description="Doar pentru ecranul unui teren; fără: ecran de lobby"
    )


class EnrollIn(Schema):
    public_key: str = Field(default="", max_length=100, description="Ed25519, base64 (Bridge)")
    certificate_fingerprint: str = Field(default="", max_length=128)


class EnrollOut(Schema):
    device: DeviceOut
    token: str = Field(description="Se afișează o singură dată; se pune în .env pe aparat.")


class HeartbeatOut(Schema):
    id: uuid.UUID
    kind: str
    name: str
    location_id: uuid.UUID
    server_time: datetime


class DeviceActiveIn(Schema):
    is_active: bool
    reason: str = Field(min_length=3)


@router.get("", response={200: list[DeviceOut], **errors(401, 403)})
def list_devices(request: HttpRequest) -> list[DeviceOut]:
    return [DeviceOut.from_orm(d) for d in services.list_devices(request)]


@router.post("", response={201: DeviceOut, **errors(401, 403, 404, 422)})
def register_device(request: HttpRequest, payload: DeviceIn) -> Status[DeviceOut]:
    device = services.register_device(
        request, payload.kind, payload.location_id, payload.name, payload.resource_id
    )
    return Status(201, DeviceOut.from_orm(device))


@router.post("/{device_id}/active", response={200: DeviceOut, **errors(401, 403, 404, 422)})
def set_active(request: HttpRequest, device_id: uuid.UUID, payload: DeviceActiveIn) -> DeviceOut:
    return DeviceOut.from_orm(
        services.set_device_active(request, device_id, payload.is_active, payload.reason)
    )


@router.post("/{device_id}/enroll", response={200: EnrollOut, **errors(400, 401, 403, 404, 422)})
def enroll(request: HttpRequest, device_id: uuid.UUID, payload: EnrollIn) -> EnrollOut:
    """ADR-0012: the token is shown once; enrolling again replaces it."""
    device, token = services.enroll(
        request, device_id, payload.public_key, payload.certificate_fingerprint
    )
    return EnrollOut(device=DeviceOut.from_orm(device), token=token)


@device_router.get("/whoami", response={200: HeartbeatOut, **errors(401)})
def whoami(request: HttpRequest) -> HeartbeatOut:
    """A device checks it is enrolled (and signals that it is alive)."""
    device = device_of(request)
    return HeartbeatOut(
        id=device.id,
        kind=device.kind,
        name=device.name,
        location_id=device.location_id,
        server_time=clock.now(),
    )
