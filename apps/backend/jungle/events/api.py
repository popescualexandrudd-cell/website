"""The club's calendar (R-110, §9.2.12): public for the website, managed by staff from the panel."""

from __future__ import annotations

import uuid
from datetime import datetime

from django.http import HttpRequest
from ninja import Field, Router, Schema, Status
from pydantic import AwareDatetime

from jungle.core.schemas import errors
from jungle.core.security import session_auth
from jungle.events import services
from jungle.events.models import ClubEvent, EventKind
from jungle.locations.services import get_location_by_slug

public_router = Router(tags=["events"])
staff_router = Router(tags=["staff: events"], auth=session_auth)


class CalendarTournamentOut(Schema):
    format: str
    status: str = Field(description="registration | in_progress")
    registration_closes_at: datetime
    places_left: int


class CalendarItemOut(Schema):
    id: uuid.UUID
    kind: str = Field(description="dj_night | social | club | tournament (the league's, §6.14)")
    title_ro: str
    title_en: str
    text_ro: str
    text_en: str
    starts_at: datetime
    ends_at: datetime | None = Field(description="null for a tournament: no time limit")
    cancelled: bool
    demo: bool = Field(description="demo data, shown as such (invariant 12)")
    tournament: CalendarTournamentOut | None


class EventRoomOut(Schema):
    capacity: int | None
    price_per_hour: int | None = Field(description="bani (RON × 100), the cheapest band")
    provisional: bool = Field(description="the rate is DE_STABILIT")


class EventsCalendarOut(Schema):
    items: list[CalendarItemOut]
    room: EventRoomOut | None


class ClubEventIn(Schema):
    kind: EventKind
    title_ro: str = Field(max_length=120)
    title_en: str = Field(max_length=120)
    text_ro: str = Field(default="", max_length=500)
    text_en: str = Field(default="", max_length=500)
    # With the offset of the club's time (ADR-0010): a time without one is refused.
    starts_at: AwareDatetime
    ends_at: AwareDatetime


class ClubEventCreateIn(ClubEventIn):
    location_id: uuid.UUID
    published: bool = False


class ClubEventChangeIn(ClubEventIn):
    reason: str = Field(default="", max_length=500)


class ClubEventPublicationIn(Schema):
    published: bool
    reason: str = Field(default="", max_length=500)


class ClubEventCancelIn(Schema):
    reason: str = Field(min_length=1, max_length=500)


class ClubEventOut(Schema):
    id: uuid.UUID
    kind: str
    title_ro: str
    title_en: str
    text_ro: str
    text_en: str
    starts_at: datetime
    ends_at: datetime
    published: bool
    cancelled_at: datetime | None
    cancel_reason: str
    is_demo: bool


def _data(payload: ClubEventIn) -> services.EventData:
    return services.EventData(
        kind=payload.kind,
        title_ro=payload.title_ro,
        title_en=payload.title_en,
        text_ro=payload.text_ro,
        text_en=payload.text_en,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
    )


def _out(event: ClubEvent) -> ClubEventOut:
    return ClubEventOut.from_orm(event)


@public_router.get("/calendar", response={200: EventsCalendarOut, **errors(404)}, auth=None)
def calendar_view(request: HttpRequest, location: str) -> EventsCalendarOut:
    """The website's calendar: published events and the league's open tournaments, by time."""
    shown = services.calendar(get_location_by_slug(location))
    return EventsCalendarOut(
        items=[
            CalendarItemOut(
                id=item.id,
                kind=item.kind,
                title_ro=item.title_ro,
                title_en=item.title_en,
                text_ro=item.text_ro,
                text_en=item.text_en,
                starts_at=item.starts_at,
                ends_at=item.ends_at,
                cancelled=item.cancelled,
                demo=item.demo,
                tournament=(
                    CalendarTournamentOut(
                        format=item.tournament.format,
                        status=item.tournament.status,
                        registration_closes_at=item.tournament.registration_closes_at,
                        places_left=item.tournament.places_left,
                    )
                    if item.tournament
                    else None
                ),
            )
            for item in shown.items
        ],
        room=(
            EventRoomOut(
                capacity=shown.room.capacity,
                price_per_hour=shown.room.price_per_hour,
                provisional=shown.room.provisional,
            )
            if shown.room
            else None
        ),
    )


@staff_router.get("/club-events", response={200: list[ClubEventOut], **errors(401, 403)})
def list_club_events(request: HttpRequest, location_id: uuid.UUID) -> list[ClubEventOut]:
    return [_out(e) for e in services.staff_list(request, location_id)]


@staff_router.post("/club-events", response={201: ClubEventOut, **errors(401, 403, 404, 422)})
def create_club_event(request: HttpRequest, payload: ClubEventCreateIn) -> Status[ClubEventOut]:
    event = services.create(request, payload.location_id, _data(payload), payload.published)
    return Status(201, _out(event))


@staff_router.put(
    "/club-events/{event_id}", response={200: ClubEventOut, **errors(401, 403, 404, 409, 422)}
)
def change_club_event(
    request: HttpRequest, event_id: uuid.UUID, payload: ClubEventChangeIn
) -> ClubEventOut:
    return _out(services.update(request, event_id, _data(payload), payload.reason))


@staff_router.post(
    "/club-events/{event_id}/publication",
    response={200: ClubEventOut, **errors(401, 403, 404, 409)},
)
def publish_club_event(
    request: HttpRequest, event_id: uuid.UUID, payload: ClubEventPublicationIn
) -> ClubEventOut:
    return _out(services.set_published(request, event_id, payload.published, payload.reason))


@staff_router.post(
    "/club-events/{event_id}/cancel",
    response={200: ClubEventOut, **errors(401, 403, 404, 409, 422)},
)
def cancel_club_event(
    request: HttpRequest, event_id: uuid.UUID, payload: ClubEventCancelIn
) -> ClubEventOut:
    return _out(services.cancel(request, event_id, payload.reason))
