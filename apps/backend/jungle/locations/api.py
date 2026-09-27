"""Locations and resources: public listing and staff management."""

from __future__ import annotations

import uuid
from typing import Any

from django.http import HttpRequest
from ninja import Field, Router, Schema, Status

from jungle.core.schemas import errors
from jungle.core.security import session_auth
from jungle.locations import services
from jungle.locations.models import ResourceKind

public_router = Router(tags=["locations"])
staff_router = Router(tags=["staff: locations"], auth=session_auth)

SLUG = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


class LocationOut(Schema):
    id: uuid.UUID
    slug: str
    name: str
    address: str
    city: str
    is_active: bool


class ResourceOut(Schema):
    id: uuid.UUID
    location_id: uuid.UUID
    kind: str
    slug: str
    name: str
    parent_id: uuid.UUID | None
    capacity: int | None
    attributes: dict[str, Any]
    is_active: bool
    sort_order: int


class LocationIn(Schema):
    slug: str = Field(pattern=SLUG, max_length=60)
    name: str = Field(min_length=1, max_length=120)
    address: str = Field(default="", max_length=250)
    city: str = Field(default="", max_length=120)
    is_active: bool = True


class ResourceIn(Schema):
    location_id: uuid.UUID
    kind: ResourceKind
    slug: str = Field(pattern=SLUG, max_length=60)
    name: str = Field(min_length=1, max_length=120)
    parent_id: uuid.UUID | None = None
    capacity: int | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    sort_order: int = Field(default=0, ge=0)


class ResourcePatch(Schema):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    capacity: int | None = None
    attributes: dict[str, Any] | None = None
    is_active: bool | None = None
    sort_order: int | None = Field(default=None, ge=0)
    reason: str = ""


@public_router.get("", response=list[LocationOut], auth=None)
def list_locations(request: HttpRequest) -> list[LocationOut]:
    return [LocationOut.from_orm(loc) for loc in services.active_locations()]


@public_router.get("/{slug}/resources", response={200: list[ResourceOut], **errors(404)}, auth=None)
def list_resources(request: HttpRequest, slug: str) -> list[ResourceOut]:
    location = services.get_location_by_slug(slug)
    return [ResourceOut.from_orm(r) for r in services.active_resources(location)]


@staff_router.post("/locations", response={201: LocationOut, **errors(400, 401, 403, 409, 422)})
def create_location(request: HttpRequest, payload: LocationIn) -> Status[LocationOut]:
    location = services.create_location(request, services.LocationData(**payload.dict()))
    return Status(201, LocationOut.from_orm(location))


@staff_router.post(
    "/resources", response={201: ResourceOut, **errors(400, 401, 403, 404, 409, 422)}
)
def create_resource(request: HttpRequest, payload: ResourceIn) -> Status[ResourceOut]:
    resource = services.create_resource(request, services.ResourceData(**payload.dict()))
    return Status(201, ResourceOut.from_orm(resource))


@staff_router.patch(
    "/resources/{resource_id}", response={200: ResourceOut, **errors(400, 401, 403, 404, 422)}
)
def update_resource(
    request: HttpRequest, resource_id: uuid.UUID, payload: ResourcePatch
) -> ResourceOut:
    data = payload.dict(exclude_unset=True)
    reason = data.pop("reason", "")
    resource = services.update_resource(
        request, resource_id, services.ResourceChanges(**data), reason
    )
    return ResourceOut.from_orm(resource)
