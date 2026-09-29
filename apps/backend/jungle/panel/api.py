"""The admin panel's own reads (§8.6): permissions per location and the live dashboard. Every
other module of the panel calls the staff API of its domain."""

from __future__ import annotations

import uuid
from datetime import datetime

from django.http import HttpRequest
from ninja import Field, Router, Schema

from jungle.core.schemas import errors
from jungle.core.security import session_auth
from jungle.panel import people, services

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


# ---------------------------------------------------------------- users (R-004)
class PanelCardOut(Schema):
    id: uuid.UUID
    number: str
    status: str
    issued_at: datetime
    revoked_at: datetime | None
    revoke_reason: str


class PanelBookingOut(Schema):
    id: uuid.UUID
    resource: str
    starts_at: datetime
    ends_at: datetime
    status: str
    session_type: str


class PanelProfileOut(Schema):
    in_league: bool
    level_validated: str | None
    level_waiting: bool
    hidden_on_screens: bool
    cards: list[PanelCardOut]
    bookings: list[PanelBookingOut]


class PanelHiddenIn(Schema):
    location_id: uuid.UUID
    hidden: bool
    note: str = Field(default="", max_length=200)


class PanelHiddenOut(Schema):
    hidden_on_screens: bool


@router.get(
    "/users/{user_id}/profile", response={200: PanelProfileOut, **errors(401, 403, 404, 422)}
)
def profile(request: HttpRequest, user_id: uuid.UUID, location_id: uuid.UUID) -> people.Profile:
    return people.profile(request, user_id, location_id)


@router.post(
    "/users/{user_id}/hidden-on-screens",
    response={200: PanelHiddenOut, **errors(401, 403, 404, 422)},
)
def hidden_on_screens(
    request: HttpRequest, user_id: uuid.UUID, payload: PanelHiddenIn
) -> PanelHiddenOut:
    """Q55 (GDPR art. 21): "do not show my name on the screens", noted at the person's request."""
    hidden = people.set_hidden_on_screens(
        request, user_id, payload.location_id, payload.hidden, payload.note.strip()
    )
    return PanelHiddenOut(hidden_on_screens=hidden)
