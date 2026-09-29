"""The screens' API (§8.5): for enrolled screens only (device token, client certificate in
production), active, of the club, on the club's network. `GET /state` is the full picture;
`POST /ticket` opens the WebSocket that says when to reload it (ADR-0005)."""

from __future__ import annotations

import uuid
from datetime import datetime

from django.http import HttpRequest
from ninja import Field, Router, Schema

from jungle.audit import services as audit
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.http import client_ip
from jungle.core.schemas import errors
from jungle.devices.auth import device_auth, device_of
from jungle.devices.models import Device, DeviceKind
from jungle.devices.network import in_club_network
from jungle.screens import realtime, views

router = Router(tags=["device: screens"], auth=device_auth)


class ScreenPlayerOut(Schema):
    """Everyone by name (Q55); rank, LP and level only for league players (`in_league`, R-012);
    an empty name is an erased account ("Jucător")."""

    name: str
    in_league: bool
    tier: str
    division: str
    lp: int | None
    level: float | None
    position: int | None


class ScreenSessionOut(Schema):
    booking_id: uuid.UUID
    starts_at: datetime
    ends_at: datetime
    minutes: int
    session_type: str
    match_of_the_day: bool
    teams: list[list[ScreenPlayerOut]]


class ScreenNextOut(Schema):
    starts_at: datetime
    session_type: str


class ScreenCourtOut(Schema):
    id: uuid.UUID
    name: str
    current: ScreenSessionOut | None
    next: ScreenNextOut | None


class ScreenRowOut(Schema):
    position: int
    names: list[str]
    tier: str
    division: str
    lp: int
    level: float


class ScreenLeagueOut(Schema):
    doubles: list[ScreenRowOut]
    singles: list[ScreenRowOut]
    pairs: list[ScreenRowOut]
    kings: list[ScreenRowOut]
    match_of_the_day: ScreenSessionOut | None
    match_of_the_day_court: str


class ScreenEventOut(Schema):
    title: str
    starts_at: datetime | None


class ScreenStateOut(Schema):
    kind: str = Field(description="court sau lobby")
    location_name: str
    server_time: datetime
    league: ScreenLeagueOut
    events: list[ScreenEventOut]
    announcements: list[dict[str, str]]
    court: ScreenCourtOut | None
    courts: list[ScreenCourtOut]
    cafe_ready: list[int]
    qr_url: str
    qr_svg: str


class ScreenTicketOut(Schema):
    ticket: str
    path: str = "/ws/screens/"
    expires_in: int = realtime.TICKET_SECONDS


def guard(request: HttpRequest) -> Device:
    """An active screen of the club, on the club's network; anything else is refused and
    recorded."""
    device = device_of(request)
    current = (
        Device.objects.select_related("location", "resource")
        .filter(pk=device.pk, kind=DeviceKind.SCREEN, is_active=True)
        .first()
    )
    if current is None or not in_club_network(client_ip(request) or ""):
        audit.record(
            audit.actor_from_request(request),
            "screens.refused",
            after={"device": str(device.pk), "ip": client_ip(request) or ""},
        )
        raise DomainError(ErrorCode.AUTH_FORBIDDEN, status=403)
    return current


@router.get("/state", response={200: ScreenStateOut, **errors(401, 403)})
def state(request: HttpRequest) -> views.State:
    device = guard(request)
    if device.resource is not None:
        return views.court_state(device.resource)
    return views.lobby_state(device.location)


@router.post("/ticket", response={200: ScreenTicketOut, **errors(401, 403)})
def ticket(request: HttpRequest) -> ScreenTicketOut:
    """A one-time pass (60 s) to open the WebSocket of live updates."""
    return ScreenTicketOut(ticket=realtime.issue_ticket(guard(request)))
