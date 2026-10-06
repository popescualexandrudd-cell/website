"""The owner's reports and exports (§8.6, ADR-0009 §3, ADR-0010), the staff overview (§8.1) and
the system status in the panel."""

from __future__ import annotations

import csv
import io
from collections.abc import Callable
from datetime import datetime, timedelta
from typing import Any

import pytest

from jungle.accounts.models import User
from jungle.audit.models import AuditLog
from jungle.audit.services import SYSTEM
from jungle.bookings.models import (
    Booking,
    BookingStatus,
    ClassEnrollment,
    ClassSession,
    EnrollmentStatus,
    SessionType,
)
from jungle.conftest import Api, error_code, grant
from jungle.core import clock
from jungle.core.permissions import Role
from jungle.devices.models import Device, DeviceKind
from jungle.ledger import services as ledger
from jungle.ledger.models import AccountKind, TransactionKind
from jungle.locations.models import Location
from jungle.scheduler.models import JobRun

pytestmark = pytest.mark.django_db
DAY = "2027-03-16"


def book(club: Any, person: User, resource: Any, at: str, minutes: int, **extra: Any) -> Booking:
    start = datetime.fromisoformat(at)
    return Booking.objects.create(
        location=club.location,
        resource=resource,
        organizer=person,
        created_by=person,
        starts_at=start,
        ends_at=start + timedelta(minutes=minutes),
        session_type=extra.pop("session_type", SessionType.FREE_RENTAL),
        price_total=extra.pop("price_total", 12000),
        **extra,
    )


@pytest.fixture
def activity(club: Any, make_user: Callable[..., User]) -> Any:
    """One club day: two bookings on court 1 (3 h), a cancelled one, a no-show, a class with one
    person present; the café and padel revenue, a discount; a sale without a category."""
    person = make_user(first_name="=Ana", last_name="Pop")  # a formula-looking name
    book(club, person, club.court1, f"{DAY}T10:00:00+02:00", 90)
    book(club, person, club.court1, f"{DAY}T18:00:00+02:00", 90, session_type=SessionType.TRAINING)
    book(club, person, club.court2, f"{DAY}T12:00:00+02:00", 60, status=BookingStatus.CANCELLED)
    book(club, person, club.court2, f"{DAY}T14:00:00+02:00", 60, status=BookingStatus.NO_SHOW)
    book(club, person, club.court1, "2027-03-18T10:00:00+02:00", 60)  # outside the period
    session = ClassSession.objects.create(
        location=club.location,
        studio=club.studio,
        instructor=club.coach,
        kind="beginner",
        starts_at=f"{DAY}T19:00:00+02:00",
        ends_at=f"{DAY}T19:50:00+02:00",
        capacity=4,
        price_total=4000,
    )
    for status in (
        EnrollmentStatus.ATTENDED,
        EnrollmentStatus.ENROLLED,
        EnrollmentStatus.CANCELLED,
    ):
        ClassEnrollment.objects.create(session=session, user=make_user(), status=status)
    cash = ledger.account(AccountKind.CASH, location=club.location, category="safe")
    cafe = ledger.account(AccountKind.REVENUE, location=club.location, category="cafe")
    padel = ledger.account(AccountKind.REVENUE, location=club.location, category="padel")
    other = ledger.account(AccountKind.REVENUE, location=club.location)
    discounts = ledger.account(AccountKind.DISCOUNTS, location=club.location, category="reward")
    ledger.post(
        TransactionKind.SALE,
        [(cash, 2400), (cafe, -2400)],
        description="=SUM(A1)",
        actor=SYSTEM,
        location=club.location,
    )
    ledger.post(
        TransactionKind.PAYMENT,
        [(cash, 9000), (discounts, 3000), (padel, -12000)],
        description="Teren 1",
        actor=SYSTEM,
        location=club.location,
    )
    ledger.post(
        TransactionKind.CHARGE,
        [(ledger.account(AccountKind.RECEIVABLE, user=person), 500), (other, -500)],
        description="Taxă",
        actor=SYSTEM,
        location=club.location,
    )
    return person


def test_adr0009_the_periods_revenue_bookings_and_occupancy(
    api: Api, staff: Callable[..., User], club: Any, activity: Any, time_machine: Any
) -> None:
    staff(Role.MANAGER, club.location)
    time_machine.move_to(f"{DAY}T21:00:00+02:00", tick=False)
    # The ledger entries were written "now" (15.03, the club fixture): report 15–16.03.
    url = f"/staff/panel/reports?location_id={club.location.pk}&first=2027-03-15&last={DAY}"
    found = api.get(url).json()
    assert found["revenue"] == {"cafe": 2400, "other": 500, "padel": 12000}
    assert (found["revenue_total"], found["discounts"], found["cash_taken"]) == (14900, 3000, 11400)
    assert found["bookings"] == {
        "free_rental": 2,
        "training": 1,
    }  # the no-show counts, not cancelled
    assert (found["cancelled"], found["no_shows"]) == (1, 1)
    court1 = next(c for c in found["courts"] if c["name"] == "teren-1")
    # Two days of 08:00–23:00 (Q3): 1800 minutes; 180 booked → 10%.
    assert (court1["booked_minutes"], court1["open_minutes"], court1["percent"]) == (180, 1800, 10)
    assert (found["class_places"], found["class_attended"]) == (2, 1)
    assert found["new_accounts"] >= 4


def test_a_period_is_checked(api: Api, staff: Callable[..., User], club: Any) -> None:
    staff(Role.MANAGER, club.location)
    where = f"location_id={club.location.pk}"
    backwards = api.get(f"/staff/panel/reports?{where}&first=2027-03-16&last=2027-03-15")
    assert error_code(backwards) == "validation.invalid"
    too_long = api.get(f"/staff/panel/reports?{where}&first=2027-01-01&last=2029-01-01")
    assert error_code(too_long) == "validation.invalid"


def test_the_exports_are_safe_audited_csv(
    api: Api, staff: Callable[..., User], club: Any, activity: Any
) -> None:
    staff(Role.ADMIN)
    where = f"location_id={club.location.pk}&first=2027-03-15&last={DAY}"
    ledger_csv = api.get(f"/staff/panel/reports/export.csv?{where}&kind=transactions")
    assert ledger_csv["Content-Type"] == "text/csv; charset=utf-8"
    assert "transactions-2027-03-15-2027-03-16.csv" in ledger_csv["Content-Disposition"]
    rows = list(csv.reader(io.StringIO(ledger_csv.content.decode())))
    assert rows[0][:3] == ["date", "time", "kind"]
    sale = [r for r in rows if r[2] == "sale"]
    assert sale[0][3] == "'=SUM(A1)"  # a formula is read as text
    assert {r[5] for r in sale} == {"24.00", "-24.00"}
    bookings_csv = api.get(f"/staff/panel/reports/export.csv?{where}&kind=bookings")
    booked = list(csv.reader(io.StringIO(bookings_csv.content.decode())))
    assert booked[1][:3] == [DAY, "10:00", "11:30"] and booked[1][6] == "'=Ana Pop"
    assert booked[1][7] == "120.00" and len(booked) == 5
    assert AuditLog.objects.filter(action="reports.exported").count() == 2
    wrong = api.get(f"/staff/panel/reports/export.csv?{where}&kind=users")
    assert error_code(wrong) == "validation.invalid"


def test_reports_are_for_the_owners_side(api: Api, staff: Callable[..., User], club: Any) -> None:
    staff(Role.RECEPTION, club.location)
    where = f"location_id={club.location.pk}&first={DAY}&last={DAY}"
    assert error_code(api.get(f"/staff/panel/reports?{where}")) == "auth.forbidden"
    export = api.get(f"/staff/panel/reports/export.csv?{where}&kind=bookings")
    assert error_code(export) == "auth.forbidden"


def test_the_staff_and_what_each_role_may_do(
    api: Api, staff: Callable[..., User], club: Any, make_user: Callable[..., User]
) -> None:
    manager = staff(Role.MANAGER, club.location)
    elsewhere = make_user(first_name="Alt")
    grant(elsewhere, Role.RECEPTION, Location.objects.create(slug="alta", name="Alta"))
    found = api.get(f"/staff/panel/staff?location_id={club.location.pk}").json()
    names = {p["id"]: p for p in found["people"]}
    assert str(elsewhere.pk) not in names  # a role at another location only
    assert names[str(manager.pk)]["roles"][0] == {
        "id": names[str(manager.pk)]["roles"][0]["id"],
        "role": "manager",
        "location": club.location.name,
    }
    assert names[str(club.coach.pk)]["roles"][0]["location"] == ""  # everywhere
    assert "reports.view" in found["matrix"]["manager"]
    assert "reports.view" not in found["matrix"]["reception"]


def test_the_system_status(
    api: Api, staff: Callable[..., User], club: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    staff(Role.ADMIN)
    now = clock.now()
    Device.objects.create(
        kind=DeviceKind.SCREEN,
        location=club.location,
        name="Ecran 1",
        enrolled_at=now,
        last_seen_at=now - timedelta(minutes=1),
    )
    Device.objects.create(
        kind=DeviceKind.LEAGUE_KIOSK,
        location=club.location,
        name="Chioșc",
        enrolled_at=now,
        last_seen_at=now - timedelta(hours=1),
    )
    Device.objects.create(kind=DeviceKind.CAFE_DISPLAY, location=club.location, name="Afișaj")
    url = f"/staff/panel/system?location_id={club.location.pk}"
    found = api.get(url).json()
    assert (found["database"], found["cache"], found["version"]) == (True, True, "dev")
    assert found["time_zone"] == "Europe/Bucharest"
    state = {d["name"]: (d["enrolled"], d["online"]) for d in found["devices"]}
    assert state == {"Ecran 1": (True, True), "Chioșc": (True, False), "Afișaj": (False, False)}

    def down(*args: Any, **kwargs: Any) -> None:
        raise ConnectionError("redis down")

    jobs = {j["name"]: (j["ok"], j["last_started_at"]) for j in found["jobs"]}
    assert jobs["send_notifications"] == (None, None) and jobs["backup.restore-test"] == (
        None,
        None,
    )
    JobRun.objects.create(job="backup.full", started_at=now - timedelta(days=2), ok=True)
    JobRun.objects.create(job="backup.full", started_at=now - timedelta(hours=3), ok=False)
    JobRun.objects.create(job="watch_devices", started_at=now)  # running
    last_ok = {j["name"]: j["ok"] for j in api.get(url).json()["jobs"]}
    assert (last_ok["backup.full"], last_ok["watch_devices"], last_ok["league_daily"]) == (
        False,
        None,
        None,
    )

    monkeypatch.setattr("jungle.panel.insights.cache.set", down)
    assert api.get(url).json()["cache"] is False
    missing = api.get("/staff/panel/system?location_id=00000000-0000-0000-0000-000000000000")
    assert error_code(missing) == "locations.not_found"
