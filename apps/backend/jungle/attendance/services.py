"""Check-in and attendance (R-030 … R-032), no-shows and booking blocks (R-072, R-073, Q15).

Scans come from staff (reception) in this stage; the registered scanners and kiosks send
them from Stage 7 on, through the same `record_scan`. A scan is the only proof of presence:
coaches never have to mark anything (R-032).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from django.db import IntegrityError, transaction
from django.db.models import Q, QuerySet
from django.http import HttpRequest

from jungle.accounts.models import User, UserRole
from jungle.accounts.services.authz import authorize, current_user
from jungle.attendance.models import BookingRestriction, Scan, ScanKind, StaffNotice
from jungle.audit import services as audit
from jungle.bookings.models import (
    Booking,
    BookingStatus,
    ClassEnrollment,
    ClassSession,
    ClassStatus,
    EnrollmentStatus,
    SessionType,
)
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action, Role
from jungle.ledger.payments import due_for_booking, due_for_enrollment, settle
from jungle.locations.models import Location, Resource

NOTICE_NO_SHOW_BLOCK = "no_show_block"


def _grace() -> timedelta:
    return timedelta(minutes=int(get_config("bookings.no_show_grace_minutes")))


# ---------------------------------------------------------------- scans
@dataclass(frozen=True)
class ScanData:
    user_id: uuid.UUID
    location_id: uuid.UUID
    kind: str
    resource_id: uuid.UUID | None = None
    class_session_id: uuid.UUID | None = None


def record_scan(request: HttpRequest, data: ScanData) -> Scan:
    """R-030 … R-032: one card scan. A court entry is linked to the booking running on that
    court (from 15 minutes before its start until its end); a class entry marks attendance."""
    staff = authorize(request, Action.ATTENDANCE_RECORD, data.location_id)
    location = Location.objects.filter(pk=data.location_id).first()
    person = User.objects.filter(pk=data.user_id, is_active=True).first()
    if location is None or person is None:
        raise DomainError(ErrorCode.ATTENDANCE_UNKNOWN_PERSON, status=404)
    now = clock.now()
    scan = Scan(user=person, location=location, kind=data.kind, recorded_by=staff, scanned_at=now)
    with transaction.atomic():
        if data.kind == ScanKind.COURT_ENTRY:
            scan.resource, scan.booking = _court_booking(data, location, now)
        elif data.kind == ScanKind.CLASS_ENTRY:
            scan.enrollment = _class_enrollment(data, person, now)
        scan.save()
    audit.record(
        audit.actor_from_request(request),
        "attendance.scan",
        target=scan,
        after={
            "kind": scan.kind,
            "booking": str(scan.booking_id),
            "enrollment": str(scan.enrollment_id),
        },
    )
    return scan


def _court_booking(
    data: ScanData, location: Location, now: datetime
) -> tuple[Resource, Booking | None]:
    resource = (
        Resource.objects.filter(pk=data.resource_id, location=location).first()
        if data.resource_id
        else None
    )
    if resource is None:
        raise DomainError(ErrorCode.RESOURCES_NOT_FOUND, status=404)
    booking = (
        Booking.objects.select_for_update()
        .filter(
            resource=resource,
            status__in=(BookingStatus.CONFIRMED, BookingStatus.NO_SHOW),
            starts_at__lte=now + _grace(),
            ends_at__gt=now,
        )
        .first()
    )
    if booking is not None and booking.status == BookingStatus.NO_SHOW:
        # Late, but here before the end: not a no-show after all. A block that was
        # already raised stays until the responsible coach decides (R-073).
        booking.status = BookingStatus.CONFIRMED
        booking.save(update_fields=["status"])
        audit.record(audit.SYSTEM, "booking.no_show_reverted", target=booking)
    return resource, booking


def _class_enrollment(data: ScanData, person: User, now: datetime) -> ClassEnrollment | None:
    enrollment = (
        ClassEnrollment.objects.select_for_update()
        .filter(
            session_id=data.class_session_id,
            session__location_id=data.location_id,
            user=person,
            status__in=(EnrollmentStatus.ENROLLED, EnrollmentStatus.NO_SHOW),
            session__starts_at__lte=now + _grace(),
            session__ends_at__gt=now,
        )
        .first()
    )
    if enrollment is not None:
        enrollment.status = EnrollmentStatus.ATTENDED
        enrollment.save(update_fields=["status"])
        settle(due_for_enrollment(enrollment))
    return enrollment


# ---------------------------------------------------------------- no-shows (R-072, R-073)
@dataclass
class NoShowReport:
    bookings_no_show: int = 0
    bookings_completed: int = 0
    enrollments_no_show: int = 0
    restrictions: int = 0


def process_no_shows(now: datetime | None = None) -> NoShowReport:
    """Runs every few minutes (management command `process_no_shows`).

    - a confirmed booking with no scan by `grace` minutes after its start → no-show (R-072);
    - a finished booking with scans → completed;
    - an enrolled class participant with no class scan by the grace time → no-show;
    - the third no-show in the window (Q15: 90 days) blocks bookings and notifies the
      responsible coach (the lesson's coach, the class instructor, or the manager) (R-073).
    """
    now = now or clock.now()
    cutoff = now - _grace()
    report = NoShowReport()
    with transaction.atomic():
        late = Booking.objects.select_for_update().filter(
            status=BookingStatus.CONFIRMED, starts_at__lte=cutoff
        )
        for booking in late:
            if booking.scans.exists():
                if booking.ends_at <= now:
                    booking.status = BookingStatus.COMPLETED
                    booking.save(update_fields=["status"])
                    settle(due_for_booking(booking))
                    report.bookings_completed += 1
                continue
            if booking.session_type == SessionType.EVENT:
                continue  # events are not scanned in; they close at the end
            booking.status = BookingStatus.NO_SHOW
            booking.save(update_fields=["status"])
            audit.record(audit.SYSTEM, "booking.no_show", target=booking)
            settle(due_for_booking(booking))  # R-072: a no-show is paid
            report.bookings_no_show += 1
            responsible = booking.coach if booking.session_type == SessionType.LESSON else None
            if _check_block(booking.organizer, booking.location_id, responsible, now):
                report.restrictions += 1
        ended_events = Booking.objects.select_for_update().filter(
            status=BookingStatus.CONFIRMED, session_type=SessionType.EVENT, ends_at__lte=now
        )
        for event in ended_events:
            event.status = BookingStatus.COMPLETED
            event.save(update_fields=["status"])
            settle(due_for_booking(event))
            report.bookings_completed += 1

        absent = ClassEnrollment.objects.select_for_update().filter(
            status=EnrollmentStatus.ENROLLED,
            session__status=ClassStatus.SCHEDULED,
            session__starts_at__lte=cutoff,
        )
        for enrollment in absent.select_related("session", "user", "session__instructor"):
            enrollment.status = EnrollmentStatus.NO_SHOW
            enrollment.save(update_fields=["status"])
            audit.record(audit.SYSTEM, "classes.no_show", target=enrollment)
            settle(due_for_enrollment(enrollment))
            report.enrollments_no_show += 1
            session: ClassSession = enrollment.session
            if _check_block(enrollment.user, session.location_id, session.instructor, now):
                report.restrictions += 1
    return report


def no_show_count(user: User, now: datetime) -> int:
    since = now - timedelta(days=int(get_config("bookings.no_show_window_days")))
    bookings = Booking.objects.filter(
        organizer=user, status=BookingStatus.NO_SHOW, starts_at__gte=since
    ).count()
    classes = ClassEnrollment.objects.filter(
        user=user, status=EnrollmentStatus.NO_SHOW, session__starts_at__gte=since
    ).count()
    return bookings + classes


def _check_block(
    user: User, location_id: uuid.UUID, responsible: User | None, now: datetime
) -> bool:
    """R-073: from the threshold on (default: the third), block and notify. Returns True
    when a new block was created."""
    count = no_show_count(user, now)
    if count < int(get_config("bookings.no_show_block_threshold")):
        return False
    if BookingRestriction.objects.filter(user=user, lifted_at__isnull=True).exists():
        return False
    try:
        with transaction.atomic():
            restriction = BookingRestriction.objects.create(
                user=user,
                reason=f"{count} neprezentări",
                no_show_count=count,
                created_at=now,
            )
    except IntegrityError:  # pragma: no cover - a concurrent run created it first
        return False
    StaffNotice.objects.create(
        location_id=location_id,
        recipient=responsible,
        recipient_role="" if responsible else Role.MANAGER,
        kind=NOTICE_NO_SHOW_BLOCK,
        payload={
            "user_id": str(user.pk),
            "name": f"{user.first_name} {user.last_name}",
            "no_shows": count,
            "restriction_id": str(restriction.pk),
        },
        created_at=now,
    )
    audit.record(
        audit.SYSTEM,
        "restriction.created",
        target=restriction,
        after={"user": str(user.pk), "no_shows": count},
    )
    return True


# ---------------------------------------------------------------- restrictions and notices
def active_restrictions(
    request: HttpRequest, location_id: uuid.UUID
) -> QuerySet[BookingRestriction]:
    authorize(request, Action.RESTRICTIONS_MANAGE, location_id)
    return BookingRestriction.objects.filter(lifted_at__isnull=True).select_related("user")


def lift_restriction(
    request: HttpRequest, restriction_id: uuid.UUID, location_id: uuid.UUID, reason: str
) -> BookingRestriction:
    """R-073: the responsible coach (or the manager) lets the player book again."""
    staff = authorize(request, Action.RESTRICTIONS_MANAGE, location_id)
    if not reason.strip():
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "reason"})
    with transaction.atomic():
        restriction = (
            BookingRestriction.objects.select_for_update()
            .filter(pk=restriction_id, lifted_at__isnull=True)
            .first()
        )
        if restriction is None:
            raise DomainError(ErrorCode.RESTRICTIONS_NOT_FOUND, status=404)
        restriction.lifted_at = clock.now()
        restriction.lifted_by = staff
        restriction.lift_reason = reason[:250]
        restriction.save()
        audit.record(
            audit.actor_from_request(request),
            "restriction.lifted",
            target=restriction,
            after={"user": str(restriction.user_id)},
            reason=reason,
        )
    return restriction


def _notices_for(user: User, location_id: uuid.UUID) -> QuerySet[StaffNotice]:
    roles = UserRole.objects.filter(user=user).filter(
        Q(location__isnull=True) | Q(location_id=location_id)
    )
    role_names = list(roles.values_list("role", flat=True))
    return StaffNotice.objects.filter(location_id=location_id).filter(
        Q(recipient=user) | Q(recipient__isnull=True, recipient_role__in=role_names)
    )


def my_notices(request: HttpRequest, location_id: uuid.UUID) -> QuerySet[StaffNotice]:
    authorize(request, Action.ATTENDANCE_VIEW, location_id)
    return _notices_for(current_user(request), location_id)


def mark_notice_read(
    request: HttpRequest, notice_id: uuid.UUID, location_id: uuid.UUID
) -> StaffNotice:
    authorize(request, Action.ATTENDANCE_VIEW, location_id)
    notice = _notices_for(current_user(request), location_id).filter(pk=notice_id).first()
    if notice is None:
        raise DomainError(ErrorCode.NOT_FOUND, status=404)
    if notice.read_at is None:
        notice.read_at = clock.now()
        notice.save(update_fields=["read_at"])
    return notice


def attendance_for_user(user: User) -> QuerySet[Scan]:
    return Scan.objects.filter(user=user).select_related("resource")
