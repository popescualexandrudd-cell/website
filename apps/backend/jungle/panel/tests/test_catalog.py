"""The panel's operational reads (§8.6): all resources (inactive ones too), the coaches, the
subscriptions with their use this month (R-086 freezes), the company accounts (R-088) and the
week's classes with the places taken (R-101)."""

from __future__ import annotations

from collections.abc import Callable
from datetime import date, datetime, timedelta
from typing import Any

import pytest

from jungle.accounts.models import User
from jungle.bookings.models import ClassEnrollment, ClassSession, ClassStatus, EnrollmentStatus
from jungle.conftest import Api, error_code, grant
from jungle.core import clock
from jungle.core.permissions import Role
from jungle.league.models import LeagueSeason, SeasonStatus
from jungle.locations.models import Location
from jungle.subscriptions.models import (
    CorporateAccount,
    CorporateMember,
    Subscription,
    SubscriptionComponent,
    SubscriptionFreeze,
    SubscriptionStatus,
)

pytestmark = pytest.mark.django_db


def test_resources_include_the_inactive_ones_and_coaches_the_club_ones(
    api: Api, staff: Callable[..., User], club: Any, make_user: Callable[..., User]
) -> None:
    staff(Role.RECEPTION, club.location)
    found = api.get(f"/staff/panel/resources?location_id={club.location.pk}").json()
    assert "reformer-5" in {r["name"] for r in found if not r["is_active"]}
    elsewhere = make_user(first_name="Alt")
    grant(elsewhere, Role.COACH, Location.objects.create(slug="alta", name="Alta"))
    here = make_user(first_name="Ioana", last_name="A")
    grant(here, Role.COACH, club.location)
    coaches = api.get(f"/staff/panel/coaches?location_id={club.location.pk}").json()
    assert [c["id"] for c in coaches] == [str(here.pk), str(club.coach.pk)]
    assert coaches[0]["name"] == "Ioana A"
    where = f"location_id={club.location.pk}"
    weekend = api.get(f"/staff/panel/hours?{where}&day=2027-03-20").json()  # Q3
    assert weekend == {"opens": "08:00", "closes": "23:00"}


def test_r086_subscriptions_with_use_and_freezes(
    api: Api, staff: Callable[..., User], club: Any, make_user: Callable[..., User]
) -> None:
    manager = staff(Role.MANAGER, club.location)
    company = CorporateAccount.objects.create(location=club.location, name="Firma SRL")
    person = make_user(first_name="Ana", last_name="Pop")
    today = clock.today_local()
    subscriptions = [
        Subscription.objects.create(
            user=person,
            location=club.location,
            corporate=corporate,
            period="monthly",
            starts_on=today,
            ends_on=today + timedelta(days=37),
            status=status,
            price_total=40000,
            created_by=manager,
            created_at=clock.now() + timedelta(minutes=n),
        )
        for n, (status, corporate) in enumerate(
            [(SubscriptionStatus.ACTIVE, company), (SubscriptionStatus.PENDING_PAYMENT, None)]
        )
    ]
    SubscriptionComponent.objects.create(
        subscription=subscriptions[0],
        sport="padel",
        sessions_per_month=8,
        peak_allowed=True,
        monthly_price=40000,
    )
    SubscriptionFreeze.objects.create(
        subscription=subscriptions[0],
        starts_on=today,
        ends_on=today + timedelta(days=7),
        created_by=manager,
        created_at=clock.now(),
    )
    url = f"/staff/panel/subscriptions?location_id={club.location.pk}"
    found = api.get(url).json()
    assert [s["status"] for s in found] == ["pending_payment", "active"]  # the newest first
    active = found[1]
    assert (active["user_name"], active["corporate"], active["frozen_days"]) == (
        "Pop Ana",
        "Firma SRL",
        7,
    )
    assert active["usage"][0]["sessions_per_month"] == 8
    assert len(api.get(f"{url}&status=active").json()) == 1


def test_r088_company_accounts_with_their_current_members(
    api: Api, staff: Callable[..., User], club: Any, make_user: Callable[..., User]
) -> None:
    staff(Role.MANAGER, club.location)
    company = CorporateAccount.objects.create(location=club.location, name="Firma SRL")
    for last, removed in (("Zet", None), ("Ban", None), ("Plecat", clock.now())):
        CorporateMember.objects.create(
            account=company,
            user=make_user(first_name="X", last_name=last),
            added_at=clock.now(),
            removed_at=removed,
        )
    found = api.get(f"/staff/panel/corporate?location_id={club.location.pk}").json()
    assert [m["name"] for m in found[0]["members"]] == ["Ban X", "Zet X"]


def test_r101_the_weeks_classes_with_places_taken(
    api: Api, staff: Callable[..., User], club: Any, make_user: Callable[..., User]
) -> None:
    staff(Role.COACH, club.location)

    def session(day: int, status: str = ClassStatus.SCHEDULED) -> ClassSession:
        start = datetime.fromisoformat("2027-03-15T18:00:00+02:00") + timedelta(days=day)
        return ClassSession.objects.create(
            location=club.location,
            studio=club.studio,
            instructor=club.coach,
            kind="beginner",
            starts_at=start,
            ends_at=start + timedelta(minutes=50),
            capacity=4,
            price_total=4000,
            status=status,
        )

    first = session(0)
    session(3, ClassStatus.CANCELLED)
    session(7)  # the next week
    for status in (EnrollmentStatus.ENROLLED, EnrollmentStatus.WAITLISTED, "cancelled"):
        ClassEnrollment.objects.create(session=first, user=make_user(), status=status)
    week = date(2027, 3, 15)
    found = api.get(f"/staff/panel/classes?location_id={club.location.pk}&week_of={week}").json()
    assert [c["status"] for c in found] == ["scheduled", "cancelled"]
    assert (found[0]["enrolled"], found[0]["waiting"], found[0]["studio"]) == (
        1,
        1,
        "sala-pilates",
    )


def test_each_read_needs_its_permission(api: Api, staff: Callable[..., User], club: Any) -> None:
    staff(Role.RECEPTION, club.location)
    where = f"location_id={club.location.pk}"
    assert error_code(api.get(f"/staff/panel/subscriptions?{where}")) == "auth.forbidden"
    assert error_code(api.get(f"/staff/panel/corporate?{where}")) == "auth.forbidden"


def test_every_season_for_the_league_administration(
    api: Api, staff: Callable[..., User], club: Any
) -> None:
    staff(Role.MANAGER, club.location)
    for number, status in ((0, SeasonStatus.CLOSED), (1, SeasonStatus.PLANNED)):
        LeagueSeason.objects.create(
            location=club.location,
            number=number,
            name=f"Sezonul {number}",
            starts_at=clock.now(),
            ends_at=clock.now() + timedelta(days=90),
            status=status,
        )
    found = api.get(f"/staff/panel/league/seasons?location_id={club.location.pk}").json()
    assert [(s["number"], s["status"]) for s in found] == [(1, "planned"), (0, "closed")]
