"""Booking endpoints: public availability and prices, the customer's own bookings, classes and
event requests, and the reception/manager views under /staff."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Annotated, Any

from django.http import HttpRequest
from ninja import Field, Router, Schema, Status
from pydantic import AwareDatetime

from jungle.bookings import classes as class_services
from jungle.bookings import services
from jungle.bookings.models import (
    Booking,
    ClassEnrollment,
    ClassSession,
    EventRequest,
    SessionType,
    SlotWaitlistEntry,
    Source,
)
from jungle.configuration.services import get_config
from jungle.core.schemas import OkOut, errors
from jungle.core.security import session_auth
from jungle.locations.models import ResourceKind
from jungle.locations.services import active_resources, get_location_by_slug
from jungle.pricing.models import CustomerType
from jungle.pricing.services import day_bounds, quote

public_router = Router(tags=["bookings"])
me_router = Router(tags=["bookings"], auth=session_auth)
classes_router = Router(tags=["classes"])
events_router = Router(tags=["events"], auth=session_auth)
staff_router = Router(tags=["staff: bookings"], auth=session_auth)

BOOKABLE = (
    ResourceKind.PADEL_COURT,
    ResourceKind.TENNIS_COURT,
    ResourceKind.REFORMER,
    ResourceKind.EVENT_ROOM,
)


# ---------------------------------------------------------------- schemas
class IntervalOut(Schema):
    starts_at: datetime
    ends_at: datetime


class ResourceAvailabilityOut(Schema):
    id: uuid.UUID
    kind: str
    name: str
    busy: list[IntervalOut]


class AvailabilityOut(Schema):
    day: date
    open: str
    close: str
    durations_minutes: list[int]
    resources: list[ResourceAvailabilityOut]


class SegmentOut(Schema):
    starts_at: datetime
    band: str
    season: str
    amount: int


class QuoteOut(Schema):
    total: int = Field(description="bani (RON × 100)")
    provisional: bool = Field(description="cel puțin un tarif este DE_STABILIT")
    segments: list[SegmentOut]


class BookingIn(Schema):
    resource_id: uuid.UUID
    starts_at: AwareDatetime
    duration_minutes: int = Field(ge=30, le=24 * 60)
    session_type: SessionType
    coach_id: uuid.UUID | None = None


class StaffBookingIn(BookingIn):
    for_user_id: uuid.UUID
    customer_type: CustomerType = CustomerType.STANDARD


class BookingOut(Schema):
    id: uuid.UUID
    location_id: uuid.UUID
    resource_id: uuid.UUID
    resource_name: str
    coach_id: uuid.UUID | None
    starts_at: datetime
    ends_at: datetime
    session_type: str
    status: str
    source: str
    price_total: int
    price_provisional: bool
    promoted_at: datetime | None
    cancelled_at: datetime | None
    cancellation_outcome: str


class StaffBookingOut(BookingOut):
    organizer_id: uuid.UUID
    organizer_name: str


class CancelIn(Schema):
    reason: str = Field(default="", max_length=250)
    waive: bool = False


class TypeIn(Schema):
    session_type: SessionType


class WaitlistOut(Schema):
    id: uuid.UUID
    resource_id: uuid.UUID
    starts_at: datetime
    ends_at: datetime
    session_type: str
    status: str


class ClassOut(Schema):
    id: uuid.UUID
    studio_id: uuid.UUID
    kind: str
    instructor_name: str
    starts_at: datetime
    ends_at: datetime
    capacity: int
    places_left: int
    price_total: int
    price_provisional: bool


class ClassIn(Schema):
    studio_id: uuid.UUID
    instructor_id: uuid.UUID
    kind: str
    starts_at: AwareDatetime
    duration_minutes: int = Field(ge=30, le=240)
    capacity: int = Field(ge=1, le=50)


class EnrollmentOut(Schema):
    id: uuid.UUID
    session_id: uuid.UUID
    status: str
    starts_at: datetime
    promoted_at: datetime | None
    cancellation_outcome: str


class RosterEntryOut(Schema):
    enrollment_id: uuid.UUID
    user_id: uuid.UUID
    name: str
    status: str


class RosterOut(Schema):
    session: ClassOut
    people: list[RosterEntryOut]


class EventIn(Schema):
    room_id: uuid.UUID
    starts_at: AwareDatetime
    duration_minutes: int = Field(ge=60, le=24 * 60)
    guests: int = Field(ge=1, le=1000)
    message: str = Field(default="", max_length=2000)


class EventOut(Schema):
    id: uuid.UUID
    room_id: uuid.UUID
    starts_at: datetime
    ends_at: datetime
    guests: int
    message: str
    status: str
    booking_id: uuid.UUID | None
    decision_note: str


class StaffEventOut(EventOut):
    requester_id: uuid.UUID
    requester_name: str
    requester_email: str


class DecisionIn(Schema):
    approve: bool
    note: str = Field(default="", max_length=500)


# ---------------------------------------------------------------- converters
def _booking(b: Booking) -> dict[str, Any]:
    return {
        "id": b.id,
        "location_id": b.location_id,
        "resource_id": b.resource_id,
        "resource_name": b.resource.name,
        "coach_id": b.coach_id,
        "starts_at": b.starts_at,
        "ends_at": b.ends_at,
        "session_type": b.session_type,
        "status": b.status,
        "source": b.source,
        "price_total": b.price_total,
        "price_provisional": b.price_provisional,
        "promoted_at": b.promoted_at,
        "cancelled_at": b.cancelled_at,
        "cancellation_outcome": b.cancellation_outcome,
    }


def booking_out(b: Booking) -> BookingOut:
    return BookingOut(**_booking(b))


def staff_booking_out(b: Booking) -> StaffBookingOut:
    return StaffBookingOut(
        **_booking(b),
        organizer_id=b.organizer_id,
        organizer_name=f"{b.organizer.first_name} {b.organizer.last_name}",
    )


def class_out(s: ClassSession) -> ClassOut:
    return ClassOut(
        id=s.id,
        studio_id=s.studio_id,
        kind=s.kind,
        instructor_name=s.instructor.first_name,
        starts_at=s.starts_at,
        ends_at=s.ends_at,
        capacity=s.capacity,
        places_left=max(0, s.capacity - class_services.enrolled_count(s)),
        price_total=s.price_total,
        price_provisional=s.price_provisional,
    )


def enrollment_out(e: ClassEnrollment) -> EnrollmentOut:
    return EnrollmentOut(
        id=e.id,
        session_id=e.session_id,
        status=e.status,
        starts_at=e.session.starts_at,
        promoted_at=e.promoted_at,
        cancellation_outcome=e.cancellation_outcome,
    )


def waitlist_out(w: SlotWaitlistEntry) -> WaitlistOut:
    return WaitlistOut(
        id=w.id,
        resource_id=w.resource_id,
        starts_at=w.starts_at,
        ends_at=w.ends_at,
        session_type=w.session_type,
        status=w.status,
    )


def _event(e: EventRequest) -> dict[str, Any]:
    return {
        "id": e.id,
        "room_id": e.room_id,
        "starts_at": e.starts_at,
        "ends_at": e.ends_at,
        "guests": e.guests,
        "message": e.message,
        "status": e.status,
        "booking_id": e.booking_id,
        "decision_note": e.decision_note,
    }


def _booking_data(payload: BookingIn) -> services.BookingData:
    return services.BookingData(
        resource_id=payload.resource_id,
        starts_at=payload.starts_at,
        duration_minutes=payload.duration_minutes,
        session_type=payload.session_type,
        coach_id=payload.coach_id,
    )


# ---------------------------------------------------------------- public
@public_router.get("/availability", response={200: AvailabilityOut, **errors(404, 422)}, auth=None)
def availability(request: HttpRequest, location: str, day: date) -> AvailabilityOut:
    """Occupied intervals per resource for one club-time day. No personal data (R-012)."""
    place = get_location_by_slug(location)
    resources = [r for r in active_resources(place) if r.kind in BOOKABLE]
    start, end = day_bounds(day)
    busy = services.busy_intervals([r.id for r in resources], start, end)
    hours = get_config("bookings.opening_hours")["weekend" if day.weekday() >= 5 else "weekday"]
    return AvailabilityOut(
        day=day,
        open=hours[0],
        close=hours[1],
        durations_minutes=get_config("bookings.durations_minutes"),
        resources=[
            ResourceAvailabilityOut(
                id=r.id,
                kind=r.kind,
                name=r.name,
                busy=[IntervalOut(starts_at=s, ends_at=e) for s, e in busy[r.id]],
            )
            for r in resources
        ],
    )


@public_router.get("/quote", response={200: QuoteOut, **errors(400, 404, 409, 422)}, auth=None)
def get_quote(
    request: HttpRequest,
    resource_id: uuid.UUID,
    starts_at: AwareDatetime,
    duration_minutes: int,
    session_type: SessionType = SessionType.FREE_RENTAL,
) -> QuoteOut:
    """The price before booking (R-052), with the per-30-minute breakdown."""
    data = services.BookingData(resource_id, starts_at, duration_minutes, session_type)
    resource = services.get_resource(resource_id)
    ends_at = services.validate_slot(resource, data)
    priced = quote(
        resource.location, resource.kind, services.product_for(session_type), starts_at, ends_at
    )
    return QuoteOut(**priced.as_dict())


# ---------------------------------------------------------------- the customer's own bookings
@me_router.post("", response={201: BookingOut, **errors(400, 401, 403, 404, 409, 422)})
def create_booking(request: HttpRequest, payload: BookingIn) -> Status[BookingOut]:
    booking = services.create_booking(request, _booking_data(payload))
    return Status(201, booking_out(booking))


@me_router.get("/mine", response={200: list[BookingOut], **errors(401)})
def my_bookings(request: HttpRequest) -> list[BookingOut]:
    return [booking_out(b) for b in services.my_bookings(request)]


@me_router.post("/{booking_id}/cancel", response={200: BookingOut, **errors(401, 403, 404, 409)})
def cancel_booking(request: HttpRequest, booking_id: uuid.UUID, payload: CancelIn) -> BookingOut:
    booking = services.cancel_booking(request, booking_id, payload.reason, payload.waive)
    return booking_out(services.get_booking(booking.id))


@me_router.post(
    "/{booking_id}/session-type", response={200: BookingOut, **errors(400, 401, 403, 404, 409, 422)}
)
def change_type(request: HttpRequest, booking_id: uuid.UUID, payload: TypeIn) -> BookingOut:
    services.change_session_type(request, booking_id, payload.session_type)
    return booking_out(services.get_booking(booking_id))


@me_router.post("/waitlist", response={201: WaitlistOut, **errors(400, 401, 403, 404, 409, 422)})
def join_waitlist(request: HttpRequest, payload: BookingIn) -> Status[WaitlistOut]:
    entry = services.join_waitlist(request, _booking_data(payload))
    return Status(201, waitlist_out(entry))


@me_router.get("/waitlist", response={200: list[WaitlistOut], **errors(401)})
def my_waitlist(request: HttpRequest) -> list[WaitlistOut]:
    return [waitlist_out(w) for w in services.my_waitlist(request)]


@me_router.post("/waitlist/{entry_id}/leave", response={200: OkOut, **errors(401, 404)})
def leave_waitlist(request: HttpRequest, entry_id: uuid.UUID) -> OkOut:
    services.leave_waitlist(request, entry_id)
    return OkOut()


# ---------------------------------------------------------------- classes
ClassLimit = Annotated[int, Field(ge=1, le=200)]


@classes_router.get("", response={200: list[ClassOut], **errors(404, 422)}, auth=None)
def list_classes(request: HttpRequest, location: str, limit: ClassLimit = 100) -> list[ClassOut]:
    """R-103: the next classes, in time order (at most ``limit``)."""
    place = get_location_by_slug(location)
    return [class_out(s) for s in class_services.upcoming_classes(place.id, limit)]


@classes_router.post(
    "/{session_id}/enroll",
    response={201: EnrollmentOut, **errors(400, 401, 403, 404, 409)},
    auth=session_auth,
)
def enroll(request: HttpRequest, session_id: uuid.UUID) -> Status[EnrollmentOut]:
    return Status(201, enrollment_out(class_services.enroll(request, session_id)))


@classes_router.get("/mine", response={200: list[EnrollmentOut], **errors(401)}, auth=session_auth)
def my_enrollments(request: HttpRequest) -> list[EnrollmentOut]:
    return [enrollment_out(e) for e in class_services.my_enrollments(request)]


@classes_router.post(
    "/enrollments/{enrollment_id}/cancel",
    response={200: EnrollmentOut, **errors(401, 404, 409)},
    auth=session_auth,
)
def cancel_enrollment(request: HttpRequest, enrollment_id: uuid.UUID) -> EnrollmentOut:
    return enrollment_out(class_services.cancel_enrollment(request, enrollment_id))


# ---------------------------------------------------------------- event room (Q34)
@events_router.post("", response={201: EventOut, **errors(400, 401, 404, 422)})
def request_event(request: HttpRequest, payload: EventIn) -> Status[EventOut]:
    event = services.request_event(request, services.EventData(**payload.dict()))
    return Status(201, EventOut(**_event(event)))


@events_router.get("/mine", response={200: list[EventOut], **errors(401)})
def my_events(request: HttpRequest) -> list[EventOut]:
    return [EventOut(**_event(e)) for e in services.my_event_requests(request)]


# ---------------------------------------------------------------- staff
@staff_router.get("/bookings", response={200: list[StaffBookingOut], **errors(401, 403, 422)})
def day_bookings(request: HttpRequest, location_id: uuid.UUID, day: date) -> list[StaffBookingOut]:
    return [staff_booking_out(b) for b in services.bookings_for_day(request, location_id, day)]


@staff_router.post(
    "/bookings", response={201: StaffBookingOut, **errors(400, 401, 403, 404, 409, 422)}
)
def book_for_client(request: HttpRequest, payload: StaffBookingIn) -> Status[StaffBookingOut]:
    booking = services.create_booking(
        request,
        _booking_data(payload),
        for_user_id=payload.for_user_id,
        source=Source.RECEPTION,
        customer_type=payload.customer_type,
    )
    return Status(201, staff_booking_out(booking))


class MoveIn(Schema):
    resource_id: uuid.UUID
    starts_at: datetime
    reason: str = Field(min_length=3, max_length=250)


@staff_router.post(
    "/bookings/{booking_id}/move",
    response={200: StaffBookingOut, **errors(400, 401, 403, 404, 409, 422)},
)
def move_booking(request: HttpRequest, booking_id: uuid.UUID, payload: MoveIn) -> StaffBookingOut:
    """The admin calendar: another time or court of the same kind, with a reason (audited)."""
    moved = services.move_booking(
        request, booking_id, payload.resource_id, payload.starts_at, payload.reason
    )
    return staff_booking_out(moved)


@staff_router.post("/classes", response={201: ClassOut, **errors(400, 401, 403, 404, 409, 422)})
def create_class(request: HttpRequest, payload: ClassIn) -> Status[ClassOut]:
    session = class_services.create_class_session(
        request, class_services.ClassData(**payload.dict())
    )
    return Status(201, class_out(session))


@staff_router.get(
    "/classes/{session_id}/roster", response={200: RosterOut, **errors(401, 403, 404)}
)
def class_roster(request: HttpRequest, session_id: uuid.UUID) -> RosterOut:
    session, people = class_services.roster(request, session_id)
    return RosterOut(
        session=class_out(session),
        people=[
            RosterEntryOut(
                enrollment_id=e.id,
                user_id=e.user_id,
                name=f"{e.user.first_name} {e.user.last_name}",
                status=e.status,
            )
            for e in people
        ],
    )


@staff_router.get("/events", response={200: list[StaffEventOut], **errors(401, 403, 422)})
def list_events(request: HttpRequest, location_id: uuid.UUID) -> list[StaffEventOut]:
    return [
        StaffEventOut(
            **_event(e),
            requester_id=e.requester_id,
            requester_name=f"{e.requester.first_name} {e.requester.last_name}",
            requester_email=e.requester.email or "",
        )
        for e in services.event_requests(request, location_id)
    ]


@staff_router.post(
    "/events/{event_id}/decision", response={200: EventOut, **errors(401, 403, 404, 409)}
)
def decide_event(request: HttpRequest, event_id: uuid.UUID, payload: DecisionIn) -> EventOut:
    event = services.decide_event(request, event_id, payload.approve, payload.note)
    return EventOut(**_event(event))
