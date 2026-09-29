"""The admin calendar moves a booking (§8.6): same rules as a new booking (R-041 grid, R-043 no
overlap, Q3 opening hours, the coach free), a reason in the audit log, the freed slot offered to
the first person waiting (R-074). The price stays the one agreed."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest
from django.test import Client

from jungle.accounts.models import User
from jungle.audit.models import AuditLog
from jungle.bookings.models import Booking, BookingStatus, ClassSession
from jungle.conftest import Api, booking_body, error_code, grant, login_as
from jungle.core.permissions import Role
from jungle.locations.models import Resource, ResourceKind

pytestmark = pytest.mark.django_db
TUE_10 = "2027-03-16T10:00:00+02:00"
TUE_12 = "2027-03-16T12:00:00+02:00"


def move(
    api: Api, booking: str, resource: Any, starts_at: str, reason: str = "cerut la telefon"
) -> Any:
    return api.post(
        f"/staff/bookings/{booking}/move",
        {"resource_id": str(resource.id), "starts_at": starts_at, "reason": reason},
    )


@pytest.fixture
def player(make_user: Callable[..., User]) -> User:
    return make_user(first_name="Jucător")


@pytest.fixture
def reception(club: Any, make_user: Callable[..., User], client: Client) -> User:
    user = make_user(first_name="Recepție")
    grant(user, Role.RECEPTION)
    return user


def test_move_to_another_time_and_court(
    api: Api, club: Any, player: Any, reception: User, client: Client
) -> None:
    login_as(client, player, mfa=False)
    booking = api.post("/bookings", booking_body(club.court1, TUE_10, 90)).json()
    price = Booking.objects.get(pk=booking["id"]).price_total
    login_as(client, reception)
    moved = move(api, booking["id"], club.court2, TUE_12)
    assert moved.status_code == 200, moved.content
    body = moved.json()
    assert (body["resource_name"], body["starts_at"][:16]) == ("teren-2", "2027-03-16T10:00")
    assert body["ends_at"][:16] == "2027-03-16T11:30"  # the same length (UTC: 12:00–13:30)
    assert Booking.objects.get(pk=booking["id"]).price_total == price  # the agreed price
    log = AuditLog.objects.get(action="booking.moved")
    assert log.reason == "cerut la telefon" and (log.before or {})["resource"] == str(
        club.court1.id
    )


def test_the_same_rules_as_a_new_booking(
    api: Api, club: Any, player: Any, reception: User, client: Client, make_user: Any
) -> None:
    login_as(client, player, mfa=False)
    first = api.post("/bookings", booking_body(club.court1, TUE_10)).json()["id"]
    other = make_user()
    login_as(client, other, mfa=False)
    api.post("/bookings", booking_body(club.court2, TUE_12))
    login_as(client, reception)
    assert error_code(move(api, first, club.court2, TUE_12)) == "booking.slot_taken"  # R-043
    assert (
        error_code(move(api, first, club.court1, "2027-03-16T10:15:00+02:00")) == "booking.off_grid"
    )
    late = move(api, first, club.court1, "2027-03-16T22:30:00+02:00")
    assert error_code(late) == "booking.outside_hours"
    assert error_code(move(api, first, club.tennis, TUE_12)) == "validation.invalid"  # other kind
    assert error_code(move(api, first, club.court2, TUE_10, reason="   ")) == "validation.invalid"
    assert move(api, "00000000-0000-0000-0000-000000000000", club.court1, TUE_12).status_code == 404
    Booking.objects.filter(pk=first).update(status=BookingStatus.CANCELLED)
    assert error_code(move(api, first, club.court1, TUE_12)) == "booking.not_movable"
    other_club_court = Resource.objects.create(
        location=club.location.__class__.objects.create(slug="alt", name="Alt"),
        slug="t",
        name="t",
        kind=ResourceKind.PADEL_COURT,
    )
    Booking.objects.filter(pk=first).update(status=BookingStatus.CONFIRMED)
    assert error_code(move(api, first, other_club_court, TUE_12)) == "validation.invalid"
    login_as(client, player, mfa=False)
    assert error_code(move(api, first, club.court1, TUE_12)) == "auth.forbidden"


def test_a_lesson_keeps_its_coach_free(
    api: Api, club: Any, player: Any, reception: User, client: Client
) -> None:
    login_as(client, reception)
    lesson = api.post(
        "/staff/bookings",
        {
            **booking_body(club.court1, TUE_10, 60, "lesson", coach_id=str(club.coach.id)),
            "for_user_id": str(player.id),
        },
    )
    assert lesson.status_code == 201, lesson.content
    other = api.post(
        "/staff/bookings",
        {
            **booking_body(club.court2, TUE_12, 60, "lesson", coach_id=str(club.coach.id)),
            "for_user_id": str(player.id),
        },
    ).json()["id"]
    assert error_code(move(api, lesson.json()["id"], club.court1, TUE_12)) == "booking.coach_busy"
    ClassSession.objects.create(
        location=club.location,
        studio=club.studio,
        instructor=club.coach,
        kind="beginner",
        starts_at="2027-03-16T15:00:00+02:00",
        ends_at="2027-03-16T16:00:00+02:00",
        capacity=4,
        price_total=0,
    )
    busy = move(api, other, club.court2, "2027-03-16T15:00:00+02:00")
    assert error_code(busy) == "booking.coach_busy"
    assert move(api, other, club.court2, "2027-03-16T17:00:00+02:00").status_code == 200


def test_the_freed_slot_goes_to_the_first_waiting(
    api: Api,
    club: Any,
    player: Any,
    reception: User,
    client: Client,
    make_user: Any,
    django_capture_on_commit_callbacks: Any,
) -> None:
    login_as(client, player, mfa=False)
    booking = api.post("/bookings", booking_body(club.court1, TUE_10)).json()["id"]
    waiting = make_user()
    login_as(client, waiting, mfa=False)
    assert api.post("/bookings/waitlist", booking_body(club.court1, TUE_10)).status_code == 201
    login_as(client, reception)
    with django_capture_on_commit_callbacks(execute=True):
        assert move(api, booking, club.court2, TUE_12).status_code == 200
    assert Booking.objects.filter(organizer=waiting, resource=club.court1).exists()
