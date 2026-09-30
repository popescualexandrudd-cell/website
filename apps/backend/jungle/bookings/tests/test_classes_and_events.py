"""Pilates Reformer classes (R-100 … R-102, Q46) and the event room (Q34)."""

from __future__ import annotations

from typing import Any

import pytest
from django.core import mail
from django.test import Client

from jungle.attendance.models import BookingRestriction
from jungle.bookings.models import Booking, ClassEnrollment, EnrollmentStatus
from jungle.conftest import Api, error_code, grant, login_as
from jungle.core import clock
from jungle.core.permissions import Role

pytestmark = pytest.mark.django_db

WED_18 = "2027-03-17T18:00:00+02:00"


def class_body(club: Any, **extra: Any) -> dict[str, Any]:
    return {
        "studio_id": str(club.studio.id),
        "instructor_id": str(club.coach.id),
        "kind": "beginner",
        "starts_at": WED_18,
        "duration_minutes": 60,
        "capacity": 4,
        **extra,
    }


@pytest.fixture
def pilates(api: Api, club: Any, staff: Any) -> dict[str, Any]:
    staff(Role.COACH, club.location)
    response = api.post("/staff/classes", class_body(club))
    assert response.status_code == 201, response.json()
    return dict(response.json())


def test_r101_capacity_is_limited_by_active_reformers(api: Api, club: Any, staff: Any) -> None:
    """Q46: 4 Reformers at launch (the fifth is inactive)."""
    staff(Role.COACH, club.location)
    too_many = api.post("/staff/classes", class_body(club, capacity=5))
    assert too_many.status_code == 400 and error_code(too_many) == "classes.capacity_too_high"
    assert too_many.json()["error"]["params"] == {"reformers": 4}
    assert (
        error_code(api.post("/staff/classes", class_body(club, kind="yoga")))
        == "validation.invalid"
    )
    assert (
        error_code(api.post("/staff/classes", class_body(club, duration_minutes=45)))
        == "booking.invalid_duration"
    )
    assert (
        error_code(
            api.post("/staff/classes", class_body(club, instructor_id=str(club.location.id)))
        )
        == "booking.coach_required"
    )
    assert (
        api.post("/staff/classes", class_body(club, studio_id=str(club.court1.id))).status_code
        == 404
    )


def test_classes_cannot_overlap_in_the_studio(
    api: Api, club: Any, pilates: dict[str, Any], make_user: Any
) -> None:
    second = make_user()
    grant(second, Role.COACH)
    body = class_body(club, starts_at="2027-03-17T18:30:00+02:00", instructor_id=str(second.id))
    clash = api.post("/staff/classes", body)
    assert clash.status_code == 409 and error_code(clash) == "classes.studio_busy"


def test_instructor_cannot_teach_a_lesson_and_a_class_at_once(
    api: Api, club: Any, pilates: dict[str, Any], make_user: Any, client: Client
) -> None:
    login_as(client, make_user(), mfa=False)
    lesson = {
        "resource_id": str(club.court1.id),
        "starts_at": "2027-03-17T18:30:00+02:00",
        "duration_minutes": 60,
        "session_type": "lesson",
        "coach_id": str(club.coach.id),
    }
    response = api.post("/bookings", lesson)
    assert response.status_code == 409 and error_code(response) == "booking.coach_busy"
    assert (
        api.post("/bookings", {**lesson, "starts_at": "2027-03-17T19:00:00+02:00"}).status_code
        == 201
    )


def test_class_refused_when_instructor_has_a_lesson(
    api: Api, club: Any, make_user: Any, client: Client, staff: Any
) -> None:
    login_as(client, make_user(), mfa=False)
    lesson = {
        "resource_id": str(club.court1.id),
        "starts_at": WED_18,
        "duration_minutes": 60,
        "session_type": "lesson",
        "coach_id": str(club.coach.id),
    }
    assert api.post("/bookings", lesson).status_code == 201
    staff(Role.COACH, club.location)
    response = api.post("/staff/classes", class_body(club))
    assert response.status_code == 409 and error_code(response) == "booking.coach_busy"


def test_reception_cannot_schedule_classes(api: Api, club: Any, staff: Any) -> None:
    staff(Role.RECEPTION, club.location)
    assert api.post("/staff/classes", class_body(club)).status_code == 403


def test_r102_enrol_waitlist_and_automatic_promotion(
    api: Api,
    club: Any,
    pilates: dict[str, Any],
    make_user: Any,
    client: Client,
    django_capture_on_commit_callbacks: Any,
    time_machine: Any,
) -> None:
    public = Api(Client()).get("/classes?location=jungle-padel").json()
    assert public[0]["places_left"] == 4 and public[0]["price_total"] == 2 * 4000
    people = [make_user() for _ in range(6)]
    enrollments = []
    for person in people:
        login_as(client, person, mfa=False)
        response = api.post(f"/classes/{pilates['id']}/enroll")
        assert response.status_code == 201
        enrollments.append(response.json())
    assert [e["status"] for e in enrollments] == ["enrolled"] * 4 + ["waitlisted"] * 2
    again = api.post(f"/classes/{pilates['id']}/enroll")
    assert again.status_code == 409 and error_code(again) == "classes.already_enrolled"

    BookingRestriction.objects.create(
        user=people[4], reason="t", no_show_count=3, created_at=clock.now()
    )
    time_machine.move_to("2027-03-17T08:00:00+02:00", tick=False)  # 10 h before: charged
    login_as(client, people[0], mfa=False)
    with django_capture_on_commit_callbacks(execute=True):
        response = api.post(f"/classes/enrollments/{enrollments[0]['id']}/cancel")
    assert response.json()["cancellation_outcome"] == "charged"
    promoted = ClassEnrollment.objects.get(pk=enrollments[5]["id"])  # people[4] is blocked
    assert promoted.status == EnrollmentStatus.ENROLLED and promoted.promoted_at == clock.now()
    assert mail.outbox[0].to == [people[5].email]
    assert api.post(f"/classes/enrollments/{enrollments[0]['id']}/cancel").status_code == 409

    login_as(client, people[4], mfa=False)  # a waitlisted person leaves: free, nobody promoted
    assert (
        api.post(f"/classes/enrollments/{enrollments[4]['id']}/cancel").json()[
            "cancellation_outcome"
        ]
        == "free"
    )
    assert len(api.get("/classes/mine").json()) == 1


def test_class_roster_for_staff(
    api: Api, club: Any, pilates: dict[str, Any], make_user: Any, client: Client, staff: Any
) -> None:
    person = make_user(first_name="Irina")
    login_as(client, person, mfa=False)
    api.post(f"/classes/{pilates['id']}/enroll")
    assert api.get(f"/staff/classes/{pilates['id']}/roster").status_code == 403
    staff(Role.COACH, club.location)
    roster = api.get(f"/staff/classes/{pilates['id']}/roster").json()
    assert roster["session"]["places_left"] == 3
    assert [p["name"] for p in roster["people"]] == [f"Irina {person.last_name}"]
    assert api.get("/staff/classes/00000000-0000-0000-0000-000000000000/roster").status_code == 404


def test_enrolment_errors(
    api: Api, club: Any, pilates: dict[str, Any], make_user: Any, client: Client, time_machine: Any
) -> None:
    login_as(client, make_user(), mfa=False)
    assert api.post("/classes/00000000-0000-0000-0000-000000000000/enroll").status_code == 404
    assert (
        api.post("/classes/enrollments/00000000-0000-0000-0000-000000000000/cancel").status_code
        == 404
    )
    time_machine.move_to("2027-03-17T18:10:00+02:00", tick=False)
    assert error_code(api.post(f"/classes/{pilates['id']}/enroll")) == "booking.in_past"


# ---------------------------------------------------------------- event room (Q34)
def event_body(club: Any, **extra: Any) -> dict[str, Any]:
    return {
        "room_id": str(club.room.id),
        "starts_at": WED_18,
        "duration_minutes": 180,
        "guests": 15,
        **extra,
    }


def test_q34_event_request_and_manager_approval(
    api: Api, club: Any, make_user: Any, client: Client, staff: Any
) -> None:
    requester = make_user()
    login_as(client, requester, mfa=False)
    assert error_code(api.post("/events", event_body(club, guests=25))) == "events.too_many_guests"
    assert (
        error_code(api.post("/events", event_body(club, room_id=str(club.court1.id))))
        == "booking.resource_not_bookable"
    )
    assert (
        error_code(api.post("/events", event_body(club, duration_minutes=75)))
        == "booking.invalid_duration"
    )
    response = api.post("/events", event_body(club, message="Aniversare"))
    assert response.status_code == 201 and response.json()["status"] == "pending"
    event_id = response.json()["id"]
    assert len(api.get("/events/mine").json()) == 1

    staff(Role.RECEPTION, club.location)
    assert api.post(f"/staff/events/{event_id}/decision", {"approve": True}).status_code == 403
    staff(Role.MANAGER, club.location)
    listed = api.get(f"/staff/events?location_id={club.location.id}").json()
    assert listed[0]["requester_email"] == requester.email
    decided = api.post(f"/staff/events/{event_id}/decision", {"approve": True, "note": "Confirmat"})
    assert decided.status_code == 200 and decided.json()["status"] == "approved"
    booking = Booking.objects.get(pk=decided.json()["booking_id"])
    assert booking.session_type == "event" and booking.price_total == 6 * 10000
    again = api.post(f"/staff/events/{event_id}/decision", {"approve": False})
    assert again.status_code == 409 and error_code(again) == "events.already_decided"
    assert (
        api.post(
            "/staff/events/00000000-0000-0000-0000-000000000000/decision", {"approve": True}
        ).status_code
        == 404
    )


def test_q34_declined_and_clashing_event(
    api: Api, club: Any, make_user: Any, client: Client, staff: Any
) -> None:
    login_as(client, make_user(), mfa=False)
    first = api.post("/events", event_body(club)).json()["id"]
    second = api.post("/events", event_body(club, starts_at="2027-03-17T19:00:00+02:00")).json()[
        "id"
    ]
    staff(Role.MANAGER, club.location)
    assert api.post(f"/staff/events/{first}/decision", {"approve": True}).status_code == 200
    clash = api.post(f"/staff/events/{second}/decision", {"approve": True})
    assert clash.status_code == 409 and error_code(clash) == "booking.slot_taken"
    declined = api.post(f"/staff/events/{second}/decision", {"approve": False, "note": "Ocupat"})
    assert declined.json()["status"] == "declined" and declined.json()["booking_id"] is None


def test_r103_the_public_schedule_is_in_time_order_and_bounded(
    api: Api, club: Any, staff: Any
) -> None:
    """§9.2.9: the website shows the coming week from the next classes, earliest first."""
    staff(Role.COACH, club.location)
    for starts in ("2027-03-19T18:00:00+02:00", WED_18, "2027-03-18T09:00:00+02:00"):
        assert api.post("/staff/classes", class_body(club, starts_at=starts)).status_code == 201
    public = Api(Client())
    listed = public.get("/classes?location=jungle-padel").json()
    assert [c["starts_at"][:10] for c in listed] == ["2027-03-17", "2027-03-18", "2027-03-19"]
    assert len(public.get("/classes?location=jungle-padel&limit=2").json()) == 2
    assert public.get("/classes?location=jungle-padel&limit=0").status_code == 422
    assert public.get("/classes?location=jungle-padel&limit=201").status_code == 422
