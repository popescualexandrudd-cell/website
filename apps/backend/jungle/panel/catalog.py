"""What the panel's operational modules read (§8.6): every resource of a location, active or not
(the calendar and the resources module), the coaches and instructors (lessons, classes), the
subscriptions and company accounts, the week's classes with their places taken. Writes go through
the staff API of each domain, which checks the permission again."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta

from django.db.models import Count, Q
from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.accounts.services.authz import authorize
from jungle.bookings.models import ClassSession, EnrollmentStatus
from jungle.core import clock
from jungle.core.permissions import Action, Role
from jungle.league.models import LeagueSeason
from jungle.locations.models import Resource
from jungle.subscriptions import services as subscriptions
from jungle.subscriptions.models import CorporateAccount, Subscription

LIST_LIMIT = 200


def resources(request: HttpRequest, location_id: uuid.UUID) -> list[Resource]:
    authorize(request, Action.BOOKINGS_VIEW, location_id)
    return list(Resource.objects.filter(location_id=location_id).order_by("sort_order", "name"))


@dataclass(frozen=True)
class Person:
    id: uuid.UUID
    name: str


def coaches(request: HttpRequest, location_id: uuid.UUID) -> list[Person]:
    """The coaches and instructors who work at the location (a role without a location counts
    everywhere), for lessons and classes."""
    authorize(request, Action.BOOKINGS_VIEW, location_id)
    found = (
        User.objects.filter(
            Q(roles__location_id=location_id) | Q(roles__location__isnull=True),
            roles__role=Role.COACH,
            is_active=True,
        )
        .distinct()
        .order_by("last_name", "first_name")
    )
    return [Person(u.pk, f"{u.first_name} {u.last_name}".strip()) for u in found]


@dataclass(frozen=True)
class UsageView:
    sport: str
    sessions_per_month: int
    used_this_month: int
    makeups_available: int
    peak_allowed: bool


@dataclass(frozen=True)
class SubscriptionView:
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    corporate: str
    period: str
    starts_on: date
    ends_on: date
    status: str
    custom: bool
    price_total: int
    price_provisional: bool
    frozen_days: int
    usage: list[UsageView] = field(default_factory=list)


def subscription_list(
    request: HttpRequest, location_id: uuid.UUID, status: str = ""
) -> list[SubscriptionView]:
    authorize(request, Action.SUBSCRIPTIONS_MANAGE, location_id)
    found = (
        Subscription.objects.filter(location_id=location_id)
        .select_related("user", "corporate")
        .prefetch_related("freezes", "components")
        .order_by("-created_at")
    )
    if status:
        found = found.filter(status=status)
    return [
        SubscriptionView(
            id=s.pk,
            user_id=s.user_id,
            user_name=f"{s.user.last_name} {s.user.first_name}".strip(),
            corporate=s.corporate.name if s.corporate else "",
            period=s.period,
            starts_on=s.starts_on,
            ends_on=s.ends_on,
            status=s.status,
            custom=s.custom,
            price_total=s.price_total,
            price_provisional=s.price_provisional,
            frozen_days=sum((f.ends_on - f.starts_on).days for f in s.freezes.all()),
            usage=[UsageView(**vars(u)) for u in subscriptions.usage(s)],
        )
        for s in found[:LIST_LIMIT]
    ]


@dataclass(frozen=True)
class CorporateView:
    id: uuid.UUID
    name: str
    registration_code: str
    billing_email: str
    is_active: bool
    members: list[Person] = field(default_factory=list)


def corporate_list(request: HttpRequest, location_id: uuid.UUID) -> list[CorporateView]:
    authorize(request, Action.CORPORATE_MANAGE, location_id)
    found = CorporateAccount.objects.filter(location_id=location_id).prefetch_related(
        "members__user"
    )
    return [
        CorporateView(
            id=a.pk,
            name=a.name,
            registration_code=a.registration_code,
            billing_email=a.billing_email,
            is_active=a.is_active,
            members=sorted(
                (
                    Person(m.user_id, f"{m.user.last_name} {m.user.first_name}".strip())
                    for m in a.members.all()
                    if m.removed_at is None
                ),
                key=lambda p: p.name,
            ),
        )
        for a in found
    ]


@dataclass(frozen=True)
class ClassView:
    id: uuid.UUID
    kind: str
    studio_id: uuid.UUID
    studio: str
    instructor_id: uuid.UUID
    instructor: str
    starts_at: datetime
    ends_at: datetime
    capacity: int
    enrolled: int
    waiting: int
    status: str
    price_total: int
    price_provisional: bool


def week_classes(request: HttpRequest, location_id: uuid.UUID, first_day: date) -> list[ClassView]:
    """The classes of the seven days from `first_day` (club time), cancelled ones included."""
    authorize(request, Action.BOOKINGS_VIEW, location_id)
    start = datetime.combine(first_day, time(), clock.BUSINESS_TZ)
    found = (
        ClassSession.objects.filter(
            location_id=location_id, starts_at__gte=start, starts_at__lt=start + timedelta(days=7)
        )
        .select_related("studio", "instructor")
        .annotate(
            enrolled=Count(
                "enrollments",
                filter=Q(
                    enrollments__status__in=(
                        EnrollmentStatus.ENROLLED,
                        EnrollmentStatus.ATTENDED,
                        EnrollmentStatus.NO_SHOW,
                    )
                ),
            ),
            waiting=Count("enrollments", filter=Q(enrollments__status=EnrollmentStatus.WAITLISTED)),
        )
        .order_by("starts_at")
    )
    return [
        ClassView(
            id=c.pk,
            kind=c.kind,
            studio_id=c.studio_id,
            studio=c.studio.name,
            instructor_id=c.instructor_id,
            instructor=f"{c.instructor.first_name} {c.instructor.last_name}".strip(),
            starts_at=c.starts_at,
            ends_at=c.ends_at,
            capacity=c.capacity,
            enrolled=c.enrolled,
            waiting=c.waiting,
            status=c.status,
            price_total=c.price_total,
            price_provisional=c.price_provisional,
        )
        for c in found
    ]


def seasons(request: HttpRequest, location_id: uuid.UUID) -> list[LeagueSeason]:
    """Every season of the location, the planned ones too (the public list hides them)."""
    authorize(request, Action.LEAGUE_MANAGE, location_id)
    return list(LeagueSeason.objects.filter(location_id=location_id).order_by("-number"))
