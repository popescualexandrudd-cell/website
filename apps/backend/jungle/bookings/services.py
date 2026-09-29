"""Booking rules (§5, R-040 … R-044, R-070 … R-074, Q34).

Every check that protects the schedule also exists in the database (R-043, ADR-0004); the
checks here give the customer a clear, translated reason before the database has to refuse.
Money is recorded as amounts in bani on the booking; charging and credits arrive in Stage 4.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta

from django.conf import settings
from django.db import IntegrityError, connection, transaction
from django.db.models import Q, QuerySet
from django.http import HttpRequest

from jungle.accounts.models import User, UserRole
from jungle.accounts.services.authz import authorize, current_user
from jungle.attendance.models import BookingRestriction
from jungle.audit import services as audit
from jungle.bookings.models import (
    Booking,
    BookingStatus,
    CancellationOutcome,
    EventRequest,
    EventRequestStatus,
    SessionType,
    SlotWaitlistEntry,
    Source,
    WaitStatus,
)
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.clock import BUSINESS_TZ
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action, Role
from jungle.ledger.payments import due_for_booking, settle
from jungle.locations.models import Resource, ResourceKind
from jungle.notifications.email import send_templated_email
from jungle.pricing.models import CustomerType, Product
from jungle.pricing.services import day_bounds, quote
from jungle.subscriptions import services as subscriptions

COURT_KINDS = (ResourceKind.PADEL_COURT, ResourceKind.TENNIS_COURT)
# Which session types each kind of resource accepts.
ALLOWED_TYPES: dict[str, tuple[str, ...]] = {
    ResourceKind.PADEL_COURT: (
        SessionType.OFFICIAL_MATCH,
        SessionType.TRAINING,
        SessionType.LESSON,
        SessionType.TOURNAMENT,
        SessionType.CHALLENGE,
        SessionType.FREE_RENTAL,
    ),
    ResourceKind.TENNIS_COURT: (
        SessionType.TRAINING,
        SessionType.LESSON,
        SessionType.TOURNAMENT,
        SessionType.FREE_RENTAL,
    ),
    ResourceKind.REFORMER: (SessionType.LESSON,),  # R-090: private Reformer sessions
}
ACTIVE_STATUSES = (BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.NO_SHOW)


def product_for(session_type: str) -> str:
    if session_type == SessionType.LESSON:
        return Product.LESSON
    if session_type == SessionType.EVENT:
        return Product.EVENT
    return Product.RENTAL


# ---------------------------------------------------------------- time rules
def _hhmm(moment: datetime) -> str:
    return moment.astimezone(BUSINESS_TZ).strftime("%H:%M")


def check_grid(starts_at: datetime, ends_at: datetime) -> None:
    """R-041: starts and ends on the 30-minute grid of club time."""
    for moment in (starts_at, ends_at):
        local = moment.astimezone(BUSINESS_TZ)
        if local.minute not in (0, 30) or local.second or local.microsecond:
            raise DomainError(ErrorCode.BOOKING_OFF_GRID)


def check_duration(minutes: int) -> None:
    allowed: list[int] = get_config("bookings.durations_minutes")
    if minutes not in allowed:
        raise DomainError(
            ErrorCode.BOOKING_INVALID_DURATION,
            params={"allowed": ", ".join(str(m) for m in allowed)},
        )


def check_opening_hours(starts_at: datetime, ends_at: datetime) -> None:
    """Q3: the whole booking fits inside the opening hours of its club-time day."""
    local_start = starts_at.astimezone(BUSINESS_TZ)
    local_end = ends_at.astimezone(BUSINESS_TZ)
    hours = get_config("bookings.opening_hours")[
        "weekend" if local_start.weekday() >= 5 else "weekday"
    ]
    open_at, close_at = hours
    end_text = (
        "24:00"
        if local_end.time() == time(0) and local_end.date() > local_start.date()
        else _hhmm(ends_at)
    )
    same_day = local_end.date() == local_start.date() or end_text == "24:00"
    if not same_day or _hhmm(starts_at) < open_at or end_text > close_at:
        raise DomainError(
            ErrorCode.BOOKING_OUTSIDE_HOURS, params={"open": open_at, "close": close_at}
        )


def check_future(starts_at: datetime) -> None:
    if starts_at <= clock.now():
        raise DomainError(ErrorCode.BOOKING_IN_PAST)


def check_can_book_online(user: User) -> None:
    """R-002: an online customer has a verified email (so fake accounts cannot hold courts);
    R-073: and is not blocked after repeated no-shows."""
    if user.email_verified_at is None:
        raise DomainError(ErrorCode.BOOKING_EMAIL_NOT_VERIFIED, status=403)
    check_not_restricted(user)


def check_not_restricted(user: User) -> None:
    """R-073: blocked after repeated no-shows, until a coach or manager lifts it."""
    if BookingRestriction.objects.filter(user=user, lifted_at__isnull=True).exists():
        raise DomainError(ErrorCode.BOOKING_RESTRICTED, status=403)


# ---------------------------------------------------------------- creating bookings
@dataclass(frozen=True)
class BookingData:
    resource_id: uuid.UUID
    starts_at: datetime
    duration_minutes: int
    session_type: str
    coach_id: uuid.UUID | None = None


def get_resource(resource_id: uuid.UUID) -> Resource:
    resource = (
        Resource.objects.select_related("location").filter(pk=resource_id, is_active=True).first()
    )
    if resource is None:
        raise DomainError(ErrorCode.RESOURCES_NOT_FOUND, status=404)
    return resource


def _coach(coach_id: uuid.UUID | None, resource: Resource) -> User | None:
    if coach_id is None:
        return None
    coach = User.objects.filter(pk=coach_id, is_active=True).first()
    has_role = UserRole.objects.filter(
        Q(location__isnull=True) | Q(location=resource.location), user_id=coach_id, role=Role.COACH
    ).exists()
    if coach is None or not has_role:
        raise DomainError(ErrorCode.BOOKING_COACH_REQUIRED)
    return coach


def check_classes_free(coach: User, starts_at: datetime, ends_at: datetime) -> None:
    """A coach who teaches a class is not bookable for a lesson at the same time."""
    from jungle.bookings.models import ClassSession, ClassStatus

    teaching = ClassSession.objects.filter(
        instructor=coach, starts_at__lt=ends_at, ends_at__gt=starts_at
    ).exclude(status=ClassStatus.CANCELLED)
    if teaching.exists():
        raise DomainError(ErrorCode.BOOKING_COACH_BUSY, status=409)


def check_coach_free(coach: User, starts_at: datetime, ends_at: datetime) -> None:
    """A coach who teaches a class is not bookable for a lesson at the same time, and back.
    (Lessons among themselves are guarded by the database constraint.)"""
    check_classes_free(coach, starts_at, ends_at)
    lessons = Booking.objects.filter(
        coach=coach, starts_at__lt=ends_at, ends_at__gt=starts_at
    ).exclude(status=BookingStatus.CANCELLED)
    if lessons.exists():
        raise DomainError(ErrorCode.BOOKING_COACH_BUSY, status=409)


def _translate_integrity(exc: IntegrityError) -> DomainError:
    text = str(exc)
    if "booking_coach_no_overlap" in text:
        return DomainError(ErrorCode.BOOKING_COACH_BUSY, status=409)
    if "booking_no_overlap" in text:
        return DomainError(ErrorCode.BOOKING_SLOT_TAKEN, status=409)
    raise exc


def _lock_schedules(booking: Booking) -> None:
    """Serialises bookings of the same resource and the same coach (transaction-scoped).

    The exclusion constraints alone would still refuse a double booking, but two inserts
    racing for the same slot can end in a deadlock report instead of a clean refusal.
    Locks are taken in a fixed order, so bookings never wait on each other in a cycle.
    """
    keys = sorted(
        f"booking:{kind}:{key}"
        for kind, key in (("resource", booking.resource_id), ("coach", booking.coach_id))
        if key is not None
    )
    with connection.cursor() as cursor:
        for key in keys:
            cursor.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", [key])


def insert_booking(booking: Booking) -> Booking:
    try:
        with transaction.atomic():
            _lock_schedules(booking)
            booking.save()
    except IntegrityError as exc:
        raise _translate_integrity(exc) from exc
    return booking


def validate_slot(resource: Resource, data: BookingData) -> datetime:
    """All the time rules of a court or Reformer booking; returns the end time."""
    if resource.kind not in ALLOWED_TYPES:
        raise DomainError(ErrorCode.BOOKING_RESOURCE_NOT_BOOKABLE)
    if data.session_type not in ALLOWED_TYPES[resource.kind]:
        raise DomainError(ErrorCode.BOOKING_INVALID_TYPE)
    check_duration(data.duration_minutes)
    ends_at = data.starts_at.astimezone(UTC) + timedelta(minutes=data.duration_minutes)
    check_grid(data.starts_at, ends_at)
    check_future(data.starts_at)
    check_opening_hours(data.starts_at, ends_at)
    return ends_at


def create_booking(
    request: HttpRequest,
    data: BookingData,
    *,
    for_user_id: uuid.UUID | None = None,
    source: str = Source.ONLINE,
    customer_type: str = CustomerType.STANDARD,
) -> Booking:
    """R-040 … R-044: a court (or private Reformer session) booked online or at reception.

    Staff (reception) may book for a client (`for_user_id`); a client books for themselves.
    """
    resource = get_resource(data.resource_id)
    if for_user_id is not None:
        actor = authorize(request, Action.BOOKINGS_MANAGE, resource.location_id)
        organizer = User.objects.filter(pk=for_user_id, is_active=True).first()
        if organizer is None:
            raise DomainError(ErrorCode.ACCOUNTS_NOT_FOUND, status=404)
        check_not_restricted(organizer)
    else:
        actor = organizer = current_user(request)
        check_can_book_online(organizer)
    ends_at = validate_slot(resource, data)
    coach = _coach(data.coach_id, resource)
    if data.session_type == SessionType.LESSON and coach is None:
        raise DomainError(ErrorCode.BOOKING_COACH_REQUIRED)
    if coach is not None:
        check_coach_free(coach, data.starts_at, ends_at)
    priced = quote(
        resource.location,
        resource.kind,
        product_for(data.session_type),
        data.starts_at,
        ends_at,
        customer_type,
    )
    with transaction.atomic():
        booking = insert_booking(
            Booking(
                location=resource.location,
                resource=resource,
                organizer=organizer,
                coach=coach,
                starts_at=data.starts_at,
                ends_at=ends_at,
                session_type=data.session_type,
                source=source,
                customer_type=customer_type,
                price_total=priced.total,
                price_breakdown=priced.as_dict(),
                price_provisional=priced.provisional,
                created_by=actor,
            )
        )
        subscriptions.cover_booking(booking)  # R-083: a lesson may be a subscription session
    audit.record(
        audit.actor_from_request(request), "booking.created", target=booking, after=_brief(booking)
    )
    return booking


def _brief(booking: Booking) -> dict[str, object]:
    return {
        "resource": str(booking.resource_id),
        "organizer": str(booking.organizer_id),
        "starts_at": booking.starts_at.isoformat(),
        "ends_at": booking.ends_at.isoformat(),
        "session_type": booking.session_type,
        "status": booking.status,
        "price_total": booking.price_total,
    }


# ---------------------------------------------------------------- cancelling
def cancellation_outcome(
    booking_start: datetime, promoted_at: datetime | None, now: datetime
) -> str:
    """R-070 / R-071, with Q16: free ≥ 24 h before, or within 2 h of a waiting-list promotion."""
    free_hours = int(get_config("bookings.free_cancellation_hours"))
    if booking_start - now >= timedelta(hours=free_hours):
        return CancellationOutcome.FREE
    grace = int(get_config("bookings.promotion_free_cancel_hours"))
    if promoted_at is not None and now - promoted_at <= timedelta(hours=grace):
        return CancellationOutcome.FREE
    return CancellationOutcome.CHARGED


def _own_or_staff(request: HttpRequest, booking: Booking) -> tuple[User, bool]:
    user = current_user(request)
    if booking.organizer_id == user.pk:
        return user, False
    return authorize(request, Action.BOOKINGS_MANAGE, booking.location_id), True


def get_booking(booking_id: uuid.UUID) -> Booking:
    booking = Booking.objects.select_related("resource", "location").filter(pk=booking_id).first()
    if booking is None:
        raise DomainError(ErrorCode.BOOKING_NOT_FOUND, status=404)
    return booking


def cancel_booking(
    request: HttpRequest, booking_id: uuid.UUID, reason: str = "", waive: bool = False
) -> Booking:
    """R-070 … R-074. The freed slot goes automatically to the first person waiting for it."""
    with transaction.atomic():
        booking = Booking.objects.select_for_update().filter(pk=booking_id).first()
        if booking is None:
            raise DomainError(ErrorCode.BOOKING_NOT_FOUND, status=404)
        _user, is_staff = _own_or_staff(request, booking)
        now = clock.now()
        if booking.status != BookingStatus.CONFIRMED or booking.starts_at <= now:
            raise DomainError(ErrorCode.BOOKING_NOT_CANCELLABLE, status=409)
        if waive and not (is_staff and reason.strip()):
            raise DomainError(ErrorCode.AUTH_FORBIDDEN, status=403)
        before = _brief(booking)
        booking.status = BookingStatus.CANCELLED
        booking.cancelled_at = now
        booking.cancellation_outcome = (
            CancellationOutcome.WAIVED
            if waive
            else cancellation_outcome(booking.starts_at, booking.promoted_at, now)
        )
        booking.cancellation_reason = reason[:250]
        booking.save()
        audit.record(
            audit.actor_from_request(request),
            "booking.cancelled",
            target=booking,
            before=before,
            after={**_brief(booking), "outcome": booking.cancellation_outcome},
            reason=reason,
        )
        subscriptions.on_cancelled(booking.cancellation_outcome, booking=booking)  # Q14
        settle(due_for_booking(booking))  # R-070, R-071: debt or credit in the account
        promote_waiting(booking.resource, booking.starts_at, booking.ends_at)
    return booking


def move_booking(
    request: HttpRequest,
    booking_id: uuid.UUID,
    resource_id: uuid.UUID,
    starts_at: datetime,
    reason: str,
) -> Booking:
    """The admin calendar (§8.6): staff move a booking to another time or court of the same kind
    at the same club, with a reason, under the same rules as a new booking (grid, duration,
    opening hours, not in the past, no overlap — R-043 —, the coach free). The price stays the
    one agreed; the freed slot goes to the first person waiting for it."""
    if not reason.strip():
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "reason"})
    with transaction.atomic():
        booking = Booking.objects.select_for_update().filter(pk=booking_id).first()
        if booking is None:
            raise DomainError(ErrorCode.BOOKING_NOT_FOUND, status=404)
        authorize(request, Action.BOOKINGS_MANAGE, booking.location_id)
        if booking.status != BookingStatus.CONFIRMED or booking.ends_at <= clock.now():
            raise DomainError(ErrorCode.BOOKING_NOT_MOVABLE, status=409)
        resource = get_resource(resource_id)
        old_resource = Resource.objects.get(pk=booking.resource_id)
        if resource.location_id != booking.location_id or resource.kind != old_resource.kind:
            raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "resource_id"})
        minutes = int((booking.ends_at - booking.starts_at).total_seconds() // 60)
        data = BookingData(resource.pk, starts_at, minutes, booking.session_type, booking.coach_id)
        ends_at = validate_slot(resource, data)
        if booking.coach is not None:
            teaching_or_other = Booking.objects.filter(
                coach=booking.coach, starts_at__lt=ends_at, ends_at__gt=starts_at
            ).exclude(pk=booking.pk)
            if teaching_or_other.exclude(status=BookingStatus.CANCELLED).exists():
                raise DomainError(ErrorCode.BOOKING_COACH_BUSY, status=409)
            check_classes_free(booking.coach, starts_at, ends_at)
        before = _brief(booking)
        old = (old_resource, booking.starts_at, booking.ends_at)
        booking.resource = resource
        booking.starts_at = starts_at.astimezone(UTC)  # UTC in the database (ADR-0010)
        booking.ends_at = ends_at
        try:
            with transaction.atomic():
                _lock_schedules(booking)
                booking.save(update_fields=["resource", "starts_at", "ends_at"])
        except IntegrityError as exc:
            raise _translate_integrity(exc) from exc
        audit.record(
            audit.actor_from_request(request),
            "booking.moved",
            target=booking,
            before=before,
            after=_brief(booking),
            reason=reason,
        )
        promote_waiting(*old)
    return booking


def change_session_type(request: HttpRequest, booking_id: uuid.UUID, session_type: str) -> Booking:
    """R-044 / Q29: the session type can change until the first check-in scan."""
    with transaction.atomic():
        booking = (
            Booking.objects.select_for_update()
            .select_related("resource")
            .filter(pk=booking_id)
            .first()
        )
        if booking is None:
            raise DomainError(ErrorCode.BOOKING_NOT_FOUND, status=404)
        _own_or_staff(request, booking)
        if booking.status != BookingStatus.CONFIRMED or booking.scans.exists():
            raise DomainError(ErrorCode.BOOKING_TYPE_LOCKED, status=409)
        allowed = ALLOWED_TYPES.get(booking.resource.kind, ())
        if (
            session_type not in allowed
            or session_type == SessionType.LESSON
            or booking.session_type == SessionType.LESSON
        ):
            raise DomainError(ErrorCode.BOOKING_INVALID_TYPE)
        before = booking.session_type
        booking.session_type = session_type
        booking.save(update_fields=["session_type"])
        audit.record(
            audit.actor_from_request(request),
            "booking.type_changed",
            target=booking,
            before={"session_type": before},
            after={"session_type": session_type},
        )
    return booking


# ---------------------------------------------------------------- waiting list (R-074)
def join_waitlist(request: HttpRequest, data: BookingData) -> SlotWaitlistEntry:
    user = current_user(request)
    check_can_book_online(user)
    resource = get_resource(data.resource_id)
    ends_at = validate_slot(resource, data)
    if data.session_type == SessionType.LESSON:
        raise DomainError(ErrorCode.BOOKING_INVALID_TYPE)
    try:
        with transaction.atomic():
            return SlotWaitlistEntry.objects.create(
                user=user,
                resource=resource,
                starts_at=data.starts_at,
                ends_at=ends_at,
                session_type=data.session_type,
            )
    except IntegrityError as exc:
        raise DomainError(ErrorCode.BOOKING_ALREADY_WAITING, status=409) from exc


def leave_waitlist(request: HttpRequest, entry_id: uuid.UUID) -> None:
    user = current_user(request)
    updated = SlotWaitlistEntry.objects.filter(
        pk=entry_id, user=user, status=WaitStatus.WAITING
    ).update(status=WaitStatus.CANCELLED)
    if not updated:
        raise DomainError(ErrorCode.NOT_FOUND, status=404)


def local_text(moment: datetime) -> str:
    return moment.astimezone(BUSINESS_TZ).strftime("%d.%m.%Y %H:%M")


# The account page of apps/web that lists the customer's bookings (Stage 11).
_BOOKINGS_PATH = {"ro": "/ro/cont/rezervari", "en": "/en/account/bookings"}


def bookings_link(language: str) -> str:
    return f"{settings.WEB_BASE_URL}{_BOOKINGS_PATH.get(language, _BOOKINGS_PATH['ro'])}"


def promote_waiting(resource: Resource, starts_at: datetime, ends_at: datetime) -> list[Booking]:
    """R-074: after a cancellation, people waiting for an overlapping slot are booked
    automatically, in order (priority, then first come), while the slot stays free."""
    now = clock.now()
    promoted: list[Booking] = []
    waiting = SlotWaitlistEntry.objects.select_for_update().filter(
        resource=resource,
        status=WaitStatus.WAITING,
        starts_at__lt=ends_at,
        ends_at__gt=starts_at,
    )
    for entry in waiting:
        if entry.starts_at <= now:
            entry.status = WaitStatus.EXPIRED
            entry.save(update_fields=["status"])
            continue
        if BookingRestriction.objects.filter(
            user_id=entry.user_id, lifted_at__isnull=True
        ).exists():
            continue
        try:
            priced = quote(
                resource.location,
                resource.kind,
                product_for(entry.session_type),
                entry.starts_at,
                entry.ends_at,
            )
            booking = insert_booking(
                Booking(
                    location=resource.location,
                    resource=resource,
                    organizer_id=entry.user_id,
                    starts_at=entry.starts_at,
                    ends_at=entry.ends_at,
                    session_type=entry.session_type,
                    source=Source.WAITLIST,
                    price_total=priced.total,
                    price_breakdown=priced.as_dict(),
                    price_provisional=priced.provisional,
                    promoted_at=now,
                    created_by_id=entry.user_id,
                )
            )
        except DomainError:
            continue  # still taken (another booking overlaps) or not priced: keep waiting
        entry.status = WaitStatus.PROMOTED
        entry.booking = booking
        entry.save(update_fields=["status", "booking"])
        audit.record(
            audit.SYSTEM, "booking.promoted_from_waitlist", target=booking, after=_brief(booking)
        )
        _notify_promotion(entry.user, f"{resource.name}", entry.starts_at, entry.ends_at, now)
        promoted.append(booking)
    return promoted


def _notify_promotion(
    user: User, what: str, starts_at: datetime, ends_at: datetime, now: datetime
) -> None:
    if not user.email:
        return
    grace = int(get_config("bookings.promotion_free_cancel_hours"))
    context = {
        "name": user.first_name,
        "what": what,
        "when": f"{local_text(starts_at)} – {ends_at.astimezone(BUSINESS_TZ):%H:%M}",
        "free_cancel_until": local_text(now + timedelta(hours=grace)),
        "link": bookings_link(user.preferred_language),
    }
    email, language = user.email, user.preferred_language
    transaction.on_commit(lambda: send_templated_email("spot_promoted", email, language, context))


# ---------------------------------------------------------------- reading
def my_bookings(request: HttpRequest) -> QuerySet[Booking]:
    user = current_user(request)
    return Booking.objects.filter(organizer=user).select_related("resource").order_by("-starts_at")


def bookings_for_day(request: HttpRequest, location_id: uuid.UUID, day: date) -> QuerySet[Booking]:
    authorize(request, Action.BOOKINGS_VIEW, location_id)
    start, end = day_bounds(day)
    return (
        Booking.objects.filter(location_id=location_id, starts_at__lt=end, ends_at__gt=start)
        .exclude(status=BookingStatus.CANCELLED)
        .select_related("resource", "organizer", "coach")
    )


def busy_intervals(
    resource_ids: list[uuid.UUID], start: datetime, end: datetime
) -> dict[uuid.UUID, list[tuple[datetime, datetime]]]:
    """Occupied time per resource (no personal data: public availability, §9)."""
    result: dict[uuid.UUID, list[tuple[datetime, datetime]]] = {rid: [] for rid in resource_ids}
    rows = (
        Booking.objects.filter(resource_id__in=resource_ids, starts_at__lt=end, ends_at__gt=start)
        .exclude(status=BookingStatus.CANCELLED)
        .values_list("resource_id", "starts_at", "ends_at")
        .order_by("starts_at")
    )
    for rid, s, e in rows:
        result[rid].append((s, e))
    return result


# ---------------------------------------------------------------- event room (Q34)
@dataclass(frozen=True)
class EventData:
    room_id: uuid.UUID
    starts_at: datetime
    duration_minutes: int
    guests: int
    message: str = ""


def request_event(request: HttpRequest, data: EventData) -> EventRequest:
    user = current_user(request)
    check_can_book_online(user)
    room = get_resource(data.room_id)
    if room.kind != ResourceKind.EVENT_ROOM:
        raise DomainError(ErrorCode.BOOKING_RESOURCE_NOT_BOOKABLE)
    if data.duration_minutes < 60 or data.duration_minutes % 30:
        raise DomainError(ErrorCode.BOOKING_INVALID_DURATION, params={"allowed": "60+"})
    ends_at = data.starts_at.astimezone(UTC) + timedelta(minutes=data.duration_minutes)
    check_grid(data.starts_at, ends_at)
    check_future(data.starts_at)
    check_opening_hours(data.starts_at, ends_at)
    capacity = room.capacity or 0
    if data.guests < 1 or (capacity and data.guests > capacity):
        raise DomainError(ErrorCode.EVENTS_TOO_MANY_GUESTS, params={"capacity": capacity})
    event = EventRequest.objects.create(
        requester=user,
        room=room,
        starts_at=data.starts_at,
        ends_at=ends_at,
        guests=data.guests,
        message=data.message[:2000],
    )
    audit.record(audit.actor_from_request(request), "event.requested", target=event)
    return event


def decide_event(
    request: HttpRequest, event_id: uuid.UUID, approve: bool, note: str = ""
) -> EventRequest:
    with transaction.atomic():
        event = (
            EventRequest.objects.select_for_update()
            .select_related("room", "room__location")
            .filter(pk=event_id)
            .first()
        )
        if event is None:
            raise DomainError(ErrorCode.EVENTS_NOT_FOUND, status=404)
        staff = authorize(request, Action.EVENTS_MANAGE, event.room.location_id)
        if event.status != EventRequestStatus.PENDING:
            raise DomainError(ErrorCode.EVENTS_ALREADY_DECIDED, status=409)
        if approve:
            priced = quote(
                event.room.location, event.room.kind, Product.EVENT, event.starts_at, event.ends_at
            )
            event.booking = insert_booking(
                Booking(
                    location=event.room.location,
                    resource=event.room,
                    organizer_id=event.requester_id,
                    starts_at=event.starts_at,
                    ends_at=event.ends_at,
                    session_type=SessionType.EVENT,
                    source=Source.EVENT_REQUEST,
                    price_total=priced.total,
                    price_breakdown=priced.as_dict(),
                    price_provisional=priced.provisional,
                    created_by=staff,
                )
            )
        event.status = EventRequestStatus.APPROVED if approve else EventRequestStatus.DECLINED
        event.decided_by = staff
        event.decided_at = clock.now()
        event.decision_note = note[:500]
        event.save()
        audit.record(
            audit.actor_from_request(request), f"event.{event.status}", target=event, reason=note
        )
    return event


def event_requests(request: HttpRequest, location_id: uuid.UUID) -> QuerySet[EventRequest]:
    authorize(request, Action.EVENTS_MANAGE, location_id)
    return EventRequest.objects.filter(room__location_id=location_id).select_related(
        "requester", "room"
    )


def my_event_requests(request: HttpRequest) -> QuerySet[EventRequest]:
    return EventRequest.objects.filter(requester=current_user(request)).select_related("room")


def my_waitlist(request: HttpRequest) -> QuerySet[SlotWaitlistEntry]:
    return SlotWaitlistEntry.objects.filter(
        user=current_user(request), status=WaitStatus.WAITING
    ).select_related("resource")
