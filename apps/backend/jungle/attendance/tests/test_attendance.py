"""Scans and automatic attendance (R-030 … R-032), no-shows (R-072) and blocks (R-073, Q15)."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import pytest
from django.core.management import call_command
from django.test import Client

from jungle.attendance.models import BookingRestriction, StaffNotice
from jungle.attendance.services import process_no_shows
from jungle.bookings.models import (
    Booking,
    BookingStatus,
    ClassEnrollment,
    ClassSession,
    EnrollmentStatus,
)
from jungle.conftest import Api, error_code, login_as
from jungle.core.permissions import Role

pytestmark = pytest.mark.django_db


def make_booking(club: Any, user: Any, start: str, **fields: Any) -> Booking:
    starts_at = datetime.fromisoformat(start)
    values: dict[str, Any] = {
        "location": club.location,
        "resource": club.court1,
        "organizer": user,
        "created_by": user,
        "starts_at": starts_at,
        "ends_at": starts_at + timedelta(hours=1),
        "session_type": "training",
        "price_total": 0,
    }
    values.update(fields)
    return Booking.objects.create(**values)


def scan(api: Api, club: Any, user: Any, kind: str, **extra: Any) -> Any:
    body = {"user_id": str(user.id), "location_id": str(club.location.id), "kind": kind, **extra}
    return api.post("/staff/scans", body)


def test_r031_court_entry_links_the_running_booking(
    api: Api, club: Any, make_user: Any, staff: Any, time_machine: Any
) -> None:
    player = make_user()
    booking = make_booking(club, player, "2027-03-15T10:00:00+02:00")
    staff(Role.RECEPTION, club.location)
    time_machine.move_to("2027-03-15T09:50:00+02:00", tick=False)  # 10 min early: allowed
    response = scan(api, club, player, "court_entry", resource_id=str(club.court1.id))
    assert response.status_code == 201, response.json()
    assert response.json()["booking_id"] == str(booking.id)
    arrival = scan(api, club, player, "arrival")
    assert arrival.status_code == 201 and arrival.json()["booking_id"] is None
    assert scan(api, club, player, "court_entry").status_code == 404  # no court given
    unknown = scan(api, club, player, "arrival", user_id="00000000-0000-0000-0000-000000000000")
    assert error_code(unknown) == "attendance.unknown_person"


def test_scans_need_staff(api: Api, club: Any, make_user: Any, client: Client) -> None:
    player = make_user()
    login_as(client, player, mfa=False)
    assert scan(api, club, player, "arrival").status_code == 403


def test_r032_class_entry_is_attendance(
    api: Api, club: Any, make_user: Any, staff: Any, time_machine: Any
) -> None:
    person = make_user()
    start = datetime.fromisoformat("2027-03-15T18:00:00+02:00")
    session = ClassSession.objects.create(
        location=club.location,
        studio=club.studio,
        instructor=club.coach,
        kind="beginner",
        starts_at=start,
        ends_at=start + timedelta(hours=1),
        capacity=4,
        price_total=0,
    )
    enrollment = ClassEnrollment.objects.create(
        session=session, user=person, status=EnrollmentStatus.ENROLLED
    )
    staff(Role.RECEPTION, club.location)
    time_machine.move_to("2027-03-15T18:05:00+02:00", tick=False)
    response = scan(api, club, person, "class_entry", class_session_id=str(session.id))
    assert response.json()["enrollment_id"] == str(enrollment.id)
    enrollment.refresh_from_db()
    assert enrollment.status == EnrollmentStatus.ATTENDED


def test_r072_no_show_and_completed(club: Any, make_user: Any, time_machine: Any) -> None:
    from jungle.attendance.models import Scan

    absent, present = make_user(), make_user()
    missed = make_booking(club, absent, "2027-03-15T10:00:00+02:00")
    played = make_booking(club, present, "2027-03-15T10:00:00+02:00", resource=club.court2)
    Scan.objects.create(
        user=present,
        location=club.location,
        kind="court_entry",
        booking=played,
        scanned_at=played.starts_at,
    )
    time_machine.move_to("2027-03-15T10:14:00+02:00", tick=False)
    assert process_no_shows().bookings_no_show == 0  # still within the 15 minutes
    time_machine.move_to("2027-03-15T10:15:00+02:00", tick=False)
    report = process_no_shows()
    assert (report.bookings_no_show, report.bookings_completed) == (1, 0)
    time_machine.move_to("2027-03-15T11:00:00+02:00", tick=False)
    assert process_no_shows().bookings_completed == 1
    missed.refresh_from_db()
    played.refresh_from_db()
    assert (missed.status, played.status) == (BookingStatus.NO_SHOW, BookingStatus.COMPLETED)


def test_r072_late_arrival_reverts_the_no_show(
    api: Api, club: Any, make_user: Any, staff: Any, time_machine: Any
) -> None:
    player = make_user()
    booking = make_booking(club, player, "2027-03-15T10:00:00+02:00")
    time_machine.move_to("2027-03-15T10:20:00+02:00", tick=False)
    process_no_shows()
    staff(Role.RECEPTION, club.location)
    scan(api, club, player, "court_entry", resource_id=str(club.court1.id))
    booking.refresh_from_db()
    assert booking.status == BookingStatus.CONFIRMED


def test_r073_third_no_show_blocks_and_notifies_manager(
    api: Api, club: Any, make_user: Any, staff: Any, client: Client, time_machine: Any
) -> None:
    player = make_user()
    old = make_booking(
        club, player, "2026-12-01T10:00:00+02:00", status=BookingStatus.NO_SHOW
    )  # > 90 days
    for day in (15, 16, 17):
        make_booking(club, player, f"2027-03-{day}T10:00:00+02:00")
    time_machine.move_to("2027-03-16T12:00:00+02:00", tick=False)
    assert process_no_shows().restrictions == 0  # 2 in the window (+1 too old)
    time_machine.move_to("2027-03-17T12:00:00+02:00", tick=False)
    call_command("process_no_shows")
    restriction = BookingRestriction.objects.get(user=player)
    assert restriction.no_show_count == 3 and old.status == BookingStatus.NO_SHOW
    notice = StaffNotice.objects.get()
    assert notice.recipient is None and notice.recipient_role == Role.MANAGER  # Q15 default

    manager = staff(Role.MANAGER, club.location)
    notices = api.get(f"/staff/notices?location_id={club.location.id}").json()
    assert [n["kind"] for n in notices] == ["no_show_block"]
    read = api.post(f"/staff/notices/{notices[0]['id']}/read?location_id={club.location.id}")
    assert read.json()["read_at"] is not None
    assert (
        api.post(
            f"/staff/notices/{club.location.id}/read?location_id={club.location.id}"
        ).status_code
        == 404
    )

    listed = api.get(f"/staff/restrictions?location_id={club.location.id}").json()
    assert listed[0]["no_show_count"] == 3
    lift = f"/staff/restrictions/{restriction.id}/lift"
    assert api.post(lift, {"location_id": str(club.location.id), "reason": ""}).status_code == 422
    response = api.post(
        lift, {"location_id": str(club.location.id), "reason": "A vorbit cu antrenorul"}
    )
    assert response.status_code == 200 and response.json()["lifted_at"] is not None
    assert (
        api.post(lift, {"location_id": str(club.location.id), "reason": "din nou"}).status_code
        == 404
    )
    restriction.refresh_from_db()
    assert restriction.lifted_by == manager

    login_as(client, player, mfa=False)  # can book again
    body = {
        "resource_id": str(club.court2.id),
        "starts_at": "2027-03-20T10:00:00+02:00",
        "duration_minutes": 60,
        "session_type": "training",
    }
    assert api.post("/bookings", body).status_code == 201


def test_r073_lesson_no_show_notifies_its_coach(
    club: Any, make_user: Any, time_machine: Any
) -> None:
    player = make_user()
    for day in (15, 16):
        make_booking(club, player, f"2027-03-{day}T10:00:00+02:00", status=BookingStatus.NO_SHOW)
    make_booking(club, player, "2027-03-17T10:00:00+02:00", session_type="lesson", coach=club.coach)
    time_machine.move_to("2027-03-17T11:00:00+02:00", tick=False)
    process_no_shows()
    assert StaffNotice.objects.get().recipient == club.coach
    # A fourth no-show while blocked does not create a second block.
    make_booking(club, player, "2027-03-18T10:00:00+02:00")
    time_machine.move_to("2027-03-18T11:00:00+02:00", tick=False)
    assert process_no_shows().restrictions == 0


def test_r102_class_no_show_notifies_the_instructor(
    club: Any, make_user: Any, time_machine: Any
) -> None:
    person = make_user()
    for day in (15, 16):
        make_booking(club, person, f"2027-03-{day}T10:00:00+02:00", status=BookingStatus.NO_SHOW)
    start = datetime.fromisoformat("2027-03-17T18:00:00+02:00")
    session = ClassSession.objects.create(
        location=club.location,
        studio=club.studio,
        instructor=club.coach,
        kind="group",
        starts_at=start,
        ends_at=start + timedelta(hours=1),
        capacity=4,
        price_total=0,
    )
    ClassEnrollment.objects.create(session=session, user=person, status=EnrollmentStatus.ENROLLED)
    time_machine.move_to("2027-03-17T18:20:00+02:00", tick=False)
    report = process_no_shows()
    assert (report.enrollments_no_show, report.restrictions) == (1, 1)
    assert StaffNotice.objects.get().recipient == club.coach


def test_events_are_completed_not_no_show(club: Any, make_user: Any, time_machine: Any) -> None:
    host = make_user()
    event = make_booking(
        club,
        host,
        "2027-03-15T18:00:00+02:00",
        resource=club.room,
        session_type="event",
        ends_at=datetime.fromisoformat("2027-03-15T21:00:00+02:00"),
    )
    time_machine.move_to("2027-03-15T19:00:00+02:00", tick=False)
    process_no_shows()
    event.refresh_from_db()
    assert event.status == BookingStatus.CONFIRMED
    time_machine.move_to("2027-03-15T21:00:00+02:00", tick=False)
    process_no_shows()
    event.refresh_from_db()
    assert event.status == BookingStatus.COMPLETED


def test_coach_sees_only_own_notices(
    api: Api, club: Any, make_user: Any, staff: Any, time_machine: Any
) -> None:
    other_coach = staff(Role.COACH, club.location)
    player = make_user()
    for day in (15, 16):
        make_booking(club, player, f"2027-03-{day}T10:00:00+02:00", status=BookingStatus.NO_SHOW)
    make_booking(club, player, "2027-03-17T10:00:00+02:00", session_type="lesson", coach=club.coach)
    time_machine.move_to("2027-03-17T11:00:00+02:00", tick=False)
    process_no_shows()
    assert other_coach != club.coach
    assert api.get(f"/staff/notices?location_id={club.location.id}").json() == []
