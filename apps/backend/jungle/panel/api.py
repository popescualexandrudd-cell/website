"""The admin panel's own reads (§8.6): permissions per location and the live dashboard. Every
other module of the panel calls the staff API of its domain."""

from __future__ import annotations

import uuid
from datetime import datetime

from django.http import HttpRequest
from ninja import Router, Schema

from jungle.core.schemas import errors
from jungle.core.security import session_auth
from jungle.panel import services

router = Router(tags=["staff: panel"], auth=session_auth)


class ScopeOut(Schema):
    location_id: uuid.UUID
    location_name: str
    actions: list[str]


class PanelUserOut(Schema):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: str | None


class PermissionsOut(Schema):
    user: PanelUserOut
    roles: list[str]
    scopes: list[ScopeOut]


class CourtNowOut(Schema):
    id: uuid.UUID
    name: str
    busy: bool
    until: datetime | None
    session_type: str
    booked_minutes_today: int
    open_minutes_today: int


class DashboardOut(Schema):
    day: str
    bookings_today: int
    occupancy_percent: int
    cash_taken_today: int
    revenue_today: int
    unread_notices: int
    pending_decisions: int
    inactive_devices: int
    courts: list[CourtNowOut]


@router.get("/permissions", response={200: PermissionsOut, **errors(401, 403)})
def permissions(request: HttpRequest) -> PermissionsOut:
    found = services.permissions(request)
    user = found.user
    return PermissionsOut(
        user=PanelUserOut(
            id=user.pk, first_name=user.first_name, last_name=user.last_name, email=user.email
        ),
        roles=found.roles,
        scopes=[ScopeOut(**vars(s)) for s in found.scopes],
    )


@router.get("/dashboard", response={200: DashboardOut, **errors(401, 403, 422)})
def dashboard(request: HttpRequest, location_id: uuid.UUID) -> services.Dashboard:
    return services.dashboard(request, location_id)
