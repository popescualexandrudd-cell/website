"""Pilates Reformer classes (R-100 … R-103): schedule, enrolment and the automatic waiting list.

The capacity of a class is at most the number of active Reformer machines in its studio
(4 at launch, Q46). The same cancellation and no-show rules as for courts apply (R-102).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from django.db import IntegrityError, transaction
from django.db.models import QuerySet
from django.http import HttpRequest

from jungle.accounts.models import User, UserRole
from jungle.accounts.services.authz import authorize, current_user
from jungle.audit import services as audit
from jungle.bookings.models import (
    CancellationOutcome,
    ClassEnrollment,
    ClassKind,
    ClassSession,
    ClassStatus,
    EnrollmentStatus,
)
from jungle.bookings.services import (
    bookings_link,
    cancellation_outcome,
    check_can_book_online,
    check_coach_free,
    check_future,
    check_grid,
    check_opening_hours,
    local_text,
)
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action, Role
from jungle.ledger.payments import due_for_enrollment, settle
from jungle.locations.models import Resource, ResourceKind
from jungle.notifications.email import send_templated_email
from jungle.pricing.models import Product
from jungle.pricing.services import quote
from jungle.subscriptions import services as subscriptions


def active_reformers(studio: Resource) -> int:
    return Resource.objects.filter(
        parent=studio, kind=ResourceKind.REFORMER, is_active=True
    ).count()


@dataclass(frozen=True)
class ClassData:
    studio_id: uuid.UUID
    instructor_id: uuid.UUID
    kind: str
    starts_at: datetime
    duration_minutes: int
    capacity: int


def create_class_session(request: HttpRequest, data: ClassData) -> ClassSession:
    studio = (
        Resource.objects.select_related("location")
        .filter(pk=data.studio_id, kind=ResourceKind.PILATES_STUDIO, is_active=True)
        .first()
    )
    if studio is None:
        raise DomainError(ErrorCode.RESOURCES_NOT_FOUND, status=404)
    authorize(request, Action.CLASSES_MANAGE, studio.location_id)
    if data.kind not in ClassKind.values:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "kind"})
    machines = active_reformers(studio)
    if data.capacity < 1 or data.capacity > machines:
        raise DomainError(ErrorCode.CLASSES_CAPACITY_TOO_HIGH, params={"reformers": machines})
    if data.duration_minutes < 30 or data.duration_minutes % 30:
        raise DomainError(ErrorCode.BOOKING_INVALID_DURATION, params={"allowed": "30+"})
    instructor = User.objects.filter(pk=data.instructor_id, is_active=True).first()
    if instructor is None or not UserRole.objects.filter(user=instructor, role=Role.COACH).exists():
        raise DomainError(ErrorCode.BOOKING_COACH_REQUIRED)
    ends_at = data.starts_at.astimezone(UTC) + timedelta(minutes=data.duration_minutes)
    check_grid(data.starts_at, ends_at)
    check_future(data.starts_at)
    check_opening_hours(data.starts_at, ends_at)
    check_coach_free(instructor, data.starts_at, ends_at)
    priced = quote(studio.location, studio.kind, Product.CLASS, data.starts_at, ends_at)
    session = ClassSession(
        location=studio.location,
        studio=studio,
        instructor=instructor,
        kind=data.kind,
        starts_at=data.starts_at,
        ends_at=ends_at,
        capacity=data.capacity,
        price_total=priced.total,
        price_provisional=priced.provisional,
    )
    try:
        with transaction.atomic():
            session.save()
    except IntegrityError as exc:
        if "class_studio_no_overlap" in str(exc):
            raise DomainError(ErrorCode.CLASSES_STUDIO_BUSY, status=409) from exc
        raise
    audit.record(audit.actor_from_request(request), "classes.created", target=session)
    return session


def upcoming_classes(location_id: uuid.UUID) -> QuerySet[ClassSession]:
    return ClassSession.objects.filter(
        location_id=location_id, status=ClassStatus.SCHEDULED, starts_at__gt=clock.now()
    ).select_related("instructor")


def enrolled_count(session: ClassSession) -> int:
    return session.enrollments.filter(
        status__in=(EnrollmentStatus.ENROLLED, EnrollmentStatus.ATTENDED)
    ).count()


def enroll(request: HttpRequest, session_id: uuid.UUID) -> ClassEnrollment:
    """A place if there is one, otherwise the class's waiting list (R-102)."""
    user = current_user(request)
    check_can_book_online(user)
    with transaction.atomic():
        session = ClassSession.objects.select_for_update().filter(pk=session_id).first()
        if session is None or session.status != ClassStatus.SCHEDULED:
            raise DomainError(ErrorCode.CLASSES_NOT_FOUND, status=404)
        check_future(session.starts_at)
        full = enrolled_count(session) >= session.capacity
        try:
            with transaction.atomic():
                enrollment = ClassEnrollment.objects.create(
                    session=session,
                    user=user,
                    status=EnrollmentStatus.WAITLISTED if full else EnrollmentStatus.ENROLLED,
                )
        except IntegrityError as exc:
            raise DomainError(ErrorCode.CLASSES_ALREADY_ENROLLED, status=409) from exc
        if enrollment.status == EnrollmentStatus.ENROLLED:
            subscriptions.cover_enrollment(enrollment)  # R-083
        audit.record(
            audit.actor_from_request(request),
            "classes.enrolled",
            target=enrollment,
            after={"session": str(session.pk), "status": enrollment.status},
        )
    return enrollment


def cancel_enrollment(request: HttpRequest, enrollment_id: uuid.UUID) -> ClassEnrollment:
    """R-070 … R-074 for classes; the freed place goes to the first person waiting."""
    user = current_user(request)
    with transaction.atomic():
        enrollment = (
            ClassEnrollment.objects.select_for_update()
            .select_related("session")
            .filter(pk=enrollment_id, user=user)
            .first()
        )
        if enrollment is None:
            raise DomainError(ErrorCode.CLASSES_NOT_FOUND, status=404)
        session = ClassSession.objects.select_for_update().get(pk=enrollment.session_id)
        now = clock.now()
        if enrollment.status not in (EnrollmentStatus.ENROLLED, EnrollmentStatus.WAITLISTED) or (
            session.starts_at <= now
        ):
            raise DomainError(ErrorCode.CLASSES_NOT_CANCELLABLE, status=409)
        had_place = enrollment.status == EnrollmentStatus.ENROLLED
        enrollment.status = EnrollmentStatus.CANCELLED
        enrollment.cancelled_at = now
        enrollment.cancellation_outcome = (
            cancellation_outcome(session.starts_at, enrollment.promoted_at, now)
            if had_place
            else CancellationOutcome.FREE
        )
        enrollment.save()
        audit.record(
            audit.actor_from_request(request),
            "classes.cancelled",
            target=enrollment,
            after={"outcome": enrollment.cancellation_outcome},
        )
        subscriptions.on_cancelled(enrollment.cancellation_outcome, enrollment=enrollment)  # Q14
        settle(due_for_enrollment(enrollment))
        if had_place:
            promote_class_waitlist(session, now)
    return enrollment


def promote_class_waitlist(session: ClassSession, now: datetime) -> ClassEnrollment | None:
    """R-102: the first person waiting takes the free place and is notified."""
    from jungle.attendance.models import BookingRestriction

    if enrolled_count(session) >= session.capacity:
        return None
    for candidate in session.enrollments.select_related("user").filter(
        status=EnrollmentStatus.WAITLISTED
    ):
        if BookingRestriction.objects.filter(user=candidate.user, lifted_at__isnull=True).exists():
            continue
        candidate.status = EnrollmentStatus.ENROLLED
        candidate.promoted_at = now
        candidate.save(update_fields=["status", "promoted_at"])
        subscriptions.cover_enrollment(candidate)
        audit.record(audit.SYSTEM, "classes.promoted_from_waitlist", target=candidate)
        _notify(candidate.user, session, now)
        return candidate
    return None


def _notify(user: User, session: ClassSession, now: datetime) -> None:
    if not user.email:
        return
    grace = int(get_config("bookings.promotion_free_cancel_hours"))
    context = {
        "name": user.first_name,
        "what": "Pilates Reformer",
        "when": f"{local_text(session.starts_at)} – {local_text(session.ends_at)[-5:]}",
        "free_cancel_until": local_text(now + timedelta(hours=grace)),
        "link": bookings_link(user.preferred_language),
    }
    email, language = user.email, user.preferred_language
    transaction.on_commit(lambda: send_templated_email("spot_promoted", email, language, context))


def roster(
    request: HttpRequest, session_id: uuid.UUID
) -> tuple[ClassSession, list[ClassEnrollment]]:
    session = ClassSession.objects.filter(pk=session_id).first()
    if session is None:
        raise DomainError(ErrorCode.CLASSES_NOT_FOUND, status=404)
    authorize(request, Action.ATTENDANCE_VIEW, session.location_id)
    people = list(
        session.enrollments.select_related("user").exclude(status=EnrollmentStatus.CANCELLED)
    )
    return session, people


def my_enrollments(request: HttpRequest) -> QuerySet[ClassEnrollment]:
    return ClassEnrollment.objects.filter(user=current_user(request)).select_related("session")
