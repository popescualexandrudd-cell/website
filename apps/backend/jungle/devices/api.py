"""Staff management of registered devices."""

from __future__ import annotations

import uuid
from datetime import datetime

from django.http import HttpRequest
from ninja import Field, Router, Schema, Status

from jungle.core.schemas import errors
from jungle.core.security import session_auth
from jungle.devices import services
from jungle.devices.models import DeviceKind

router = Router(tags=["staff: devices"], auth=session_auth)


class DeviceOut(Schema):
    id: uuid.UUID
    kind: str
    location_id: uuid.UUID
    name: str
    is_active: bool
    last_seen_at: datetime | None
    created_at: datetime


class DeviceIn(Schema):
    kind: DeviceKind
    location_id: uuid.UUID
    name: str = Field(min_length=1, max_length=120)


class DeviceActiveIn(Schema):
    is_active: bool
    reason: str = Field(min_length=3)


@router.get("", response={200: list[DeviceOut], **errors(401, 403)})
def list_devices(request: HttpRequest) -> list[DeviceOut]:
    return [DeviceOut.from_orm(d) for d in services.list_devices(request)]


@router.post("", response={201: DeviceOut, **errors(401, 403, 404, 422)})
def register_device(request: HttpRequest, payload: DeviceIn) -> Status[DeviceOut]:
    device = services.register_device(request, payload.kind, payload.location_id, payload.name)
    return Status(201, DeviceOut.from_orm(device))


@router.post("/{device_id}/active", response={200: DeviceOut, **errors(401, 403, 404, 422)})
def set_active(request: HttpRequest, device_id: uuid.UUID, payload: DeviceActiveIn) -> DeviceOut:
    return DeviceOut.from_orm(
        services.set_device_active(request, device_id, payload.is_active, payload.reason)
    )
