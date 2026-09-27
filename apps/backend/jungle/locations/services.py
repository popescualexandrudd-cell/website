"""Managing locations and resources from the admin, without new code (§2.2)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, NoReturn

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import QuerySet
from django.http import HttpRequest

from jungle.accounts.services.authz import authorize
from jungle.audit import services as audit
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.locations.models import Location, Resource, ResourceKind


def active_locations() -> QuerySet[Location]:
    return Location.objects.filter(is_active=True)


def get_location_by_slug(slug: str) -> Location:
    location = Location.objects.filter(slug=slug, is_active=True).first()
    if location is None:
        raise DomainError(ErrorCode.LOCATIONS_NOT_FOUND, status=404)
    return location


def active_resources(location: Location) -> QuerySet[Resource]:
    return location.resources.filter(is_active=True)


def _raise_validation(exc: ValidationError) -> NoReturn:
    fields = exc.message_dict if hasattr(exc, "error_dict") else {}
    if "parent" in fields:
        raise DomainError(ErrorCode.RESOURCES_INVALID_PARENT) from exc
    if "capacity" in fields:
        raise DomainError(ErrorCode.RESOURCES_INVALID_CAPACITY) from exc
    raise DomainError(ErrorCode.VALIDATION_INVALID, params={"fields": sorted(fields)}) from exc


@dataclass(frozen=True)
class LocationData:
    slug: str
    name: str
    address: str = ""
    city: str = ""
    is_active: bool = True


def create_location(request: HttpRequest, data: LocationData) -> Location:
    authorize(request, Action.LOCATIONS_MANAGE)
    if Location.objects.filter(slug=data.slug).exists():
        raise DomainError(ErrorCode.LOCATIONS_SLUG_TAKEN, status=409)
    location = Location(
        slug=data.slug,
        name=data.name.strip(),
        address=data.address.strip(),
        city=data.city.strip(),
        is_active=data.is_active,
    )
    try:
        location.full_clean()
    except ValidationError as exc:
        raise DomainError(
            ErrorCode.VALIDATION_INVALID, params={"fields": sorted(exc.message_dict)}
        ) from exc
    with transaction.atomic():
        location.save()
        audit.record(
            audit.actor_from_request(request),
            "locations.created",
            target=location,
            after=audit.snapshot(location),
        )
    return location


@dataclass(frozen=True)
class ResourceData:
    location_id: uuid.UUID
    kind: ResourceKind
    slug: str
    name: str
    parent_id: uuid.UUID | None = None
    capacity: int | None = None
    attributes: dict[str, Any] = field(default_factory=dict)
    is_active: bool = True
    sort_order: int = 0


def create_resource(request: HttpRequest, data: ResourceData) -> Resource:
    authorize(request, Action.RESOURCES_MANAGE, location_id=data.location_id)
    location = Location.objects.filter(pk=data.location_id).first()
    if location is None:
        raise DomainError(ErrorCode.LOCATIONS_NOT_FOUND, status=404)
    parent = None
    if data.parent_id is not None:
        parent = Resource.objects.filter(pk=data.parent_id).first()
        if parent is None:
            raise DomainError(ErrorCode.RESOURCES_INVALID_PARENT)
    if data.capacity is not None and data.capacity < 1:
        raise DomainError(ErrorCode.RESOURCES_INVALID_CAPACITY)
    if Resource.objects.filter(location=location, slug=data.slug).exists():
        raise DomainError(ErrorCode.RESOURCES_SLUG_TAKEN, status=409)
    resource = Resource(
        location=location,
        kind=data.kind,
        slug=data.slug,
        name=data.name.strip(),
        parent=parent,
        capacity=data.capacity,
        attributes=data.attributes,
        is_active=data.is_active,
        sort_order=data.sort_order,
    )
    try:
        resource.full_clean()
    except ValidationError as exc:
        _raise_validation(exc)
    with transaction.atomic():
        resource.save()
        audit.record(
            audit.actor_from_request(request),
            "resources.created",
            target=resource,
            after=audit.snapshot(resource),
        )
    return resource


@dataclass(frozen=True)
class ResourceChanges:
    name: str | None = None
    capacity: int | None = None
    attributes: dict[str, Any] | None = None
    is_active: bool | None = None
    sort_order: int | None = None


def update_resource(
    request: HttpRequest, resource_id: uuid.UUID, changes: ResourceChanges, reason: str
) -> Resource:
    resource = Resource.objects.filter(pk=resource_id).first()
    if resource is None:
        raise DomainError(ErrorCode.RESOURCES_NOT_FOUND, status=404)
    authorize(request, Action.RESOURCES_MANAGE, location_id=resource.location_id)
    before = audit.snapshot(resource)
    for name in ("name", "capacity", "attributes", "is_active", "sort_order"):
        value = getattr(changes, name)
        if value is not None:
            setattr(resource, name, value.strip() if isinstance(value, str) else value)
    if resource.capacity is not None and resource.capacity < 1:
        raise DomainError(ErrorCode.RESOURCES_INVALID_CAPACITY)
    try:
        resource.full_clean()
    except ValidationError as exc:
        _raise_validation(exc)
    with transaction.atomic():
        resource.save()
        audit.record(
            audit.actor_from_request(request),
            "resources.updated",
            target=resource,
            before=before,
            after=audit.snapshot(resource),
            reason=reason,
        )
    return resource
