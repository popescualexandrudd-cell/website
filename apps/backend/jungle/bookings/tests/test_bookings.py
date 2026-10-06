"""Court and Reformer bookings (R-040 … R-044), cancellations (R-070, R-071), the automatic
waiting list (R-074, Q16) and the database guarantee against overlaps (R-043, ADR-0004)."""

from __future__ import annotations

import threading
from datetime import datetime, timedelta
from typing import Any

import pytest
from django.core import mail
from django.db import IntegrityError, connection, transaction
from django.test import Client

from jungle.attendance.models import BookingRestriction, Scan, ScanKind
from jungle.audit.models import AuditLog
from jungle.bookings.models import Booking, BookingStatus, SlotWaitlistEntry, WaitStatus
from jungle.bookings.services import cancellation_outcome
from jungle.conftest import Api, booking_body, error_code, login_as, set_config
from jungle.core import clock
from jungle.core.permissions import Role

pytestmark = pytest.mark.django_db

TUE_10 = "2027-03-16T10:00:00+02:00"


@pytest.fixture
def player(make_user: Any, client: Client) -> Any:
    user = make_user(first_name="Ana")
    login_as(client, user, mfa=False)
    return user


def book(api: Api, *args: Any, **kwargs: Any) -> Any:
    return api.post("/bookings", booking_body(*args, **kwargs))


# ---------------------------------------------------------------- creating
def test_r040_player_books_a_court_with_price(api: Api, club: Any, player: Any) -> None:
    response = book(api, club.court1, "2027-03-16T16:30:00+02:00", 90)
    assert response.status_code == 201, response.json()
    body = response.json()
    assert body["price_total"] == 5000 + 6000 + 6000  # R-052: semi-peak + 2 × peak
    assert body["price_provisional"] is True
    assert body["status"] == "confirmed" and body["source"] == "online"
    assert AuditLog.objects.filter(action="booking.created").count() == 1
    mine = api.get("/bookings/mine").json()
    assert [b["id"] for b in mine] == [body["id"]]


@pytest.mark.parametrize(
    ("starts_at", "minutes", "code"),
    [
        ("2027-03-16T10:15:00+02:00", 60, "booking.off_grid"),  # R-041
        (TUE_10, 45, "booking.invalid_duration"),  # Q2
        (TUE_10, 210, "booking.invalid_duration"),
        ("2027-03-16T22:30:00+02:00", 60, "booking.outside_hours"),  # Q3
        ("2027-03-16T07:30:00+02:00", 60, "booking.outside_hours"),
        ("2027-03-15T08:00:00+02:00", 60, "booking.in_past"),
    ],
)
def test_r041_time_rules(
    api: Api, club: Any, player: Any, starts_at: str, minutes: int, code: str
) -> None:
    response = book(api, club.court1, starts_at, minutes)
    assert response.status_code == 400 and error_code(response) == code


def test_q3_last_slot_ends_at_closing_and_24h_close(api: Api, club: Any, player: Any) -> None:
    assert book(api, club.court1, "2027-03-16T22:00:00+02:00").status_code == 201
    set_config(
        "bookings.opening_hours", {"weekday": ["08:00", "24:00"], "weekend": ["08:00", "24:00"]}
    )
    assert book(api, club.court1, "2027-03-16T23:00:00+02:00").status_code == 201
    response = book(api, club.court2, "2027-03-16T23:30:00+02:00")  # would end 00:30 next day
    assert error_code(response) == "booking.outside_hours"


def test_adr0010_booking_on_dst_day(api: Api, club: Any, player: Any) -> None:
    """28.03.2027: club time is UTC+3 after 03:00; 10:00 local is 07:00 UTC."""
    response = book(api, club.court1, "2027-03-28T10:00:00+03:00", 90)
    assert response.status_code == 201, response.json()
    booking = Booking.objects.get()
    assert booking.starts_at.isoformat() == "2027-03-28T07:00:00+00:00"
    assert booking.ends_at - booking.starts_at == timedelta(minutes=90)
    day = api.get("/bookings/availability?location=jungle-padel&day=2027-03-28").json()
    court = next(r for r in day["resources"] if r["id"] == str(club.court1.id))
    assert court["busy"] == [
        {"starts_at": "2027-03-28T07:00:00Z", "ends_at": "2027-03-28T08:30:00Z"}
    ]


def test_session_types_per_resource(api: Api, club: Any, player: Any) -> None:
    assert (
        error_code(book(api, club.tennis, TUE_10, session_type="official_match"))
        == "booking.invalid_type"
    )
    assert (
        error_code(book(api, club.reformer, TUE_10)) == "booking.invalid_type"
    )  # R-090: lessons only
    assert error_code(book(api, club.studio, TUE_10)) == "booking.resource_not_bookable"
    assert book(api, club.tennis, TUE_10).json()["price_total"] == 12000  # 120 RON/h (R-051)
    missing = book(api, club.court1, TUE_10, resource_id="00000000-0000-0000-0000-000000000000")
    assert missing.status_code == 404


def test_lessons_need_a_coach_who_cannot_be_in_two_places(
    api: Api, club: Any, player: Any, make_user: Any
) -> None:
    assert (
        error_code(book(api, club.court1, TUE_10, session_type="lesson"))
        == "booking.coach_required"
    )
    not_a_coach = make_user()
    response = book(api, club.court1, TUE_10, session_type="lesson", coach_id=str(not_a_coach.id))
    assert error_code(response) == "booking.coach_required"
    first = book(api, club.court1, TUE_10, session_type="lesson", coach_id=str(club.coach.id))
    assert first.status_code == 201 and first.json()["price_total"] == 2 * 9000
    clash = book(
        api,
        club.court2,
        "2027-03-16T10:30:00+02:00",
        session_type="lesson",
        coach_id=str(club.coach.id),
    )
    assert clash.status_code == 409 and error_code(clash) == "booking.coach_busy"
    reformer = book(
        api,
        club.reformer,
        "2027-03-16T12:00:00+02:00",
        session_type="lesson",
        coach_id=str(club.coach.id),
    )
    assert reformer.status_code == 201 and reformer.json()["price_total"] == 2 * 7500


def test_r043_overlap_refused_adjacent_allowed(api: Api, club: Any, player: Any) -> None:
    assert book(api, club.court1, TUE_10, 90).status_code == 201
    taken = book(api, club.court1, "2027-03-16T11:00:00+02:00")
    assert taken.status_code == 409 and error_code(taken) == "booking.slot_taken"
    assert book(api, club.court1, "2027-03-16T11:30:00+02:00").status_code == 201  # adjacent
    assert book(api, club.court2, TUE_10).status_code == 201  # another court


def test_r043_database_refuses_overlap_and_off_grid_directly(club: Any, player: Any) -> None:
    """The guarantee holds even for code that bypasses the service (ADR-0004)."""
    start = datetime.fromisoformat(TUE_10)

    def row(**fields: Any) -> Booking:
        values: dict[str, Any] = {
            "location": club.location,
            "resource": club.court1,
            "organizer": player,
            "created_by": player,
            "starts_at": start,
            "ends_at": start + timedelta(hours=1),
            "session_type": "free_rental",
            "price_total": 0,
        }
        values.update(fields)
        return Booking(**values)

    row().save()
    for bad in (
        row(starts_at=start + timedelta(minutes=30)),  # overlap
        row(
            resource=club.court2,
            starts_at=start + timedelta(minutes=10),
            ends_at=start + timedelta(minutes=70),
        ),  # grid
        row(
            resource=club.court2, ends_at=start + timedelta(minutes=30)
        ),  # 30 minutes is not a duration
        row(resource=club.court2, ends_at=start),  # not positive
    ):
        with pytest.raises(IntegrityError), transaction.atomic():
            bad.save()
    row(status=BookingStatus.CANCELLED).save()  # cancelled rows do not block


@pytest.mark.django_db(transaction=True)
def test_r043_concurrent_bookings_only_one_wins(club: Any, make_user: Any) -> None:
    """Two people press 'book' for the same court at the same moment."""
    from jungle.bookings.services import insert_booking

    start = datetime.fromisoformat(TUE_10)
    users = [make_user(), make_user()]
    results: list[str] = []
    barrier = threading.Barrier(2)

    def attempt(user: Any) -> None:
        try:
            barrier.wait()
            insert_booking(
                Booking(
                    location=club.location,
                    resource=club.court1,
                    organizer=user,
                    created_by=user,
                    starts_at=start,
                    ends_at=start + timedelta(hours=1),
                    session_type="free_rental",
                    price_total=0,
                )
            )
            results.append("ok")
        except Exception as exc:
            results.append(getattr(getattr(exc, "code", None), "value", repr(exc)))
        finally:
            connection.close()

    threads = [threading.Thread(target=attempt, args=(u,)) for u in users]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert sorted(results) == ["booking.slot_taken", "ok"]
    assert Booking.objects.count() == 1


def test_availability_shows_no_personal_data(api: Api, club: Any, player: Any) -> None:
    """R-012: public availability shows only occupied intervals."""
    book(api, club.court1, TUE_10)
    Client().logout()
    body = Api(Client()).get("/bookings/availability?location=jungle-padel&day=2027-03-16").json()
    assert body["open"] == "08:00" and body["close"] == "23:00"
    assert body["durations_minutes"] == [60, 90, 120, 150, 180]
    text = str(body)
    assert player.first_name not in text and player.email not in text
    kinds = {r["kind"] for r in body["resources"]}
    assert "pilates_studio" not in kinds


def test_quote_endpoint(api: Api, club: Any) -> None:
    response = api.get(
        f"/bookings/quote?resource_id={club.court1.id}&starts_at=2027-03-16T16:30:00%2B02:00&duration_minutes=90"
    )
    assert response.status_code == 200, response.json()
    assert response.json()["total"] == 17000 and len(response.json()["segments"]) == 3
    naive = api.get(
        f"/bookings/quote?resource_id={club.court1.id}&starts_at=2027-03-16T14:30:00&duration_minutes=90"
    )
    assert naive.status_code == 422  # times must carry their offset


def test_reception_books_for_a_client(
    api: Api, club: Any, staff: Any, make_user: Any, client: Client
) -> None:
    customer = make_user()
    body = {
        **booking_body(club.court1, TUE_10),
        "for_user_id": str(customer.id),
        "customer_type": "member",
    }
    login_as(client, customer, mfa=False)
    assert api.post("/staff/bookings", body).status_code == 403  # a client cannot
    staff(Role.RECEPTION, club.location)
    response = api.post("/staff/bookings", body)
    assert response.status_code == 201, response.json()
    assert (
        response.json()["organizer_id"] == str(customer.id)
        and response.json()["source"] == "reception"
    )
    unknown = api.post(
        "/staff/bookings", {**body, "for_user_id": "00000000-0000-0000-0000-000000000000"}
    )
    assert unknown.status_code == 404
    day = api.get(f"/staff/bookings?location_id={club.location.id}&day=2027-03-16").json()
    assert [b["organizer_name"] for b in day] == [f"{customer.first_name} {customer.last_name}"]


# ---------------------------------------------------------------- cancelling
def test_r070_r071_cancellation_outcomes() -> None:
    start = datetime.fromisoformat("2027-03-20T10:00:00+02:00")
    assert cancellation_outcome(start, None, start - timedelta(hours=24)) == "free"
    assert cancellation_outcome(start, None, start - timedelta(hours=23, minutes=59)) == "charged"
    promoted = start - timedelta(hours=5)
    assert cancellation_outcome(start, promoted, promoted + timedelta(hours=2)) == "free"  # Q16
    assert (
        cancellation_outcome(start, promoted, promoted + timedelta(hours=2, seconds=1)) == "charged"
    )


def test_cancel_own_booking_and_slot_is_freed(
    api: Api, club: Any, player: Any, time_machine: Any
) -> None:
    booking_id = book(api, club.court1, "2027-03-17T10:00:00+02:00").json()["id"]
    response = api.post(f"/bookings/{booking_id}/cancel", {"reason": "Nu pot"})
    assert response.status_code == 200
    assert response.json()["cancellation_outcome"] == "free"
    assert api.post(f"/bookings/{booking_id}/cancel", {}).status_code == 409  # already cancelled
    assert book(api, club.court1, "2027-03-17T10:00:00+02:00").status_code == 201

    late_id = book(api, club.court2, TUE_10).json()["id"]  # 25 h ahead
    time_machine.move_to("2027-03-15T11:00:00+02:00", tick=False)  # 23 h before
    assert api.post(f"/bookings/{late_id}/cancel", {}).json()["cancellation_outcome"] == "charged"


def test_cancel_rights_and_waive(
    api: Api, club: Any, player: Any, make_user: Any, client: Client, staff: Any, time_machine: Any
) -> None:
    booking_id = book(api, club.court1, TUE_10).json()["id"]
    time_machine.move_to("2027-03-16T09:00:00+02:00", tick=False)
    assert (
        api.post(f"/bookings/{booking_id}/cancel", {"waive": True, "reason": "x"}).status_code
        == 403
    )

    login_as(client, make_user(), mfa=False)  # someone else
    assert api.post(f"/bookings/{booking_id}/cancel", {}).status_code == 403

    staff(Role.RECEPTION, club.location)
    assert (
        api.post(f"/bookings/{booking_id}/cancel", {"waive": True}).status_code == 403
    )  # no reason
    response = api.post(f"/bookings/{booking_id}/cancel", {"waive": True, "reason": "Accidentare"})
    assert response.json()["cancellation_outcome"] == "waived"
    assert api.post("/bookings/00000000-0000-0000-0000-000000000000/cancel", {}).status_code == 404


def test_started_booking_cannot_be_cancelled(
    api: Api, club: Any, player: Any, time_machine: Any
) -> None:
    booking_id = book(api, club.court1, TUE_10).json()["id"]
    time_machine.move_to("2027-03-16T10:05:00+02:00", tick=False)
    response = api.post(f"/bookings/{booking_id}/cancel", {})
    assert response.status_code == 409 and error_code(response) == "booking.not_cancellable"


# ---------------------------------------------------------------- session type (R-044, Q29)
def test_q29_type_changes_until_first_scan(api: Api, club: Any, player: Any) -> None:
    booking_id = book(api, club.court1, TUE_10).json()["id"]
    response = api.post(f"/bookings/{booking_id}/session-type", {"session_type": "official_match"})
    assert response.status_code == 200 and response.json()["session_type"] == "official_match"
    assert (
        error_code(api.post(f"/bookings/{booking_id}/session-type", {"session_type": "lesson"}))
        == "booking.invalid_type"
    )
    Scan.objects.create(
        user=player,
        location=club.location,
        kind=ScanKind.COURT_ENTRY,
        booking_id=booking_id,
        scanned_at=clock.now(),
    )
    locked = api.post(f"/bookings/{booking_id}/session-type", {"session_type": "training"})
    assert locked.status_code == 409 and error_code(locked) == "booking.type_locked"
    assert (
        api.post(
            "/bookings/00000000-0000-0000-0000-000000000000/session-type",
            {"session_type": "training"},
        ).status_code
        == 404
    )


# ---------------------------------------------------------------- waiting list (R-074, Q16)
def test_r074_waitlist_promotes_automatically(
    api: Api,
    club: Any,
    player: Any,
    make_user: Any,
    client: Client,
    django_capture_on_commit_callbacks: Any,
    time_machine: Any,
) -> None:
    first_id = book(api, club.court1, TUE_10, 90).json()["id"]

    waiting = make_user(first_name="Bogdan", preferred_language="en")
    blocked = make_user()
    login_as(client, blocked, mfa=False)
    assert api.post("/bookings/waitlist", booking_body(club.court1, TUE_10)).status_code == 201
    BookingRestriction.objects.create(
        user=blocked, reason="test", no_show_count=3, created_at=clock.now()
    )
    login_as(client, waiting, mfa=False)
    response = api.post("/bookings/waitlist", booking_body(club.court1, TUE_10))
    assert response.status_code == 201
    again = api.post("/bookings/waitlist", booking_body(club.court1, TUE_10))
    assert again.status_code == 409 and error_code(again) == "booking.already_waiting"
    assert len(api.get("/bookings/waitlist").json()) == 1

    time_machine.move_to("2027-03-15T20:00:00+02:00", tick=False)  # 14 h before: late cancel
    login_as(client, player, mfa=False)
    with django_capture_on_commit_callbacks(execute=True):
        assert (
            api.post(f"/bookings/{first_id}/cancel", {}).json()["cancellation_outcome"] == "charged"
        )

    promoted = Booking.objects.get(organizer=waiting)
    assert promoted.source == "waitlist" and promoted.promoted_at == clock.now()
    assert not Booking.objects.filter(organizer=blocked).exists()  # R-073: skipped
    assert SlotWaitlistEntry.objects.get(user=waiting).status == WaitStatus.PROMOTED
    # §11: the player hears of the (paid) cancellation, the next one of the place.
    [cancelled] = [m for m in mail.outbox if m.to == [player.email]]
    assert "se plătește" in cancelled.body or "is paid" in cancelled.body
    [promotion] = [m for m in mail.outbox if m.to == [waiting.email]]
    assert "15.03.2027 22:00" in promotion.body  # free cancellation until (Q16)

    time_machine.move_to("2027-03-15T21:30:00+02:00", tick=False)
    login_as(client, waiting, mfa=False)
    response = api.post(f"/bookings/{promoted.id}/cancel", {})
    assert response.json()["cancellation_outcome"] == "free"  # within 2 h of promotion


def test_waitlist_rules(api: Api, club: Any, player: Any, time_machine: Any) -> None:
    lesson = booking_body(club.court1, TUE_10, session_type="lesson", coach_id=str(club.coach.id))
    assert error_code(api.post("/bookings/waitlist", lesson)) == "booking.invalid_type"
    entry = api.post("/bookings/waitlist", booking_body(club.court1, TUE_10)).json()
    assert api.post(f"/bookings/waitlist/{entry['id']}/leave").status_code == 200
    assert api.post(f"/bookings/waitlist/{entry['id']}/leave").status_code == 404


def test_expired_waitlist_entries_are_not_promoted(
    club: Any, make_user: Any, time_machine: Any
) -> None:
    from jungle.bookings.services import promote_waiting

    user = make_user()
    start = datetime.fromisoformat(TUE_10)
    SlotWaitlistEntry.objects.create(
        user=user,
        resource=club.court1,
        starts_at=start,
        ends_at=start + timedelta(hours=1),
        session_type="training",
    )
    time_machine.move_to("2027-03-16T10:30:00+02:00", tick=False)
    assert promote_waiting(club.court1, start, start + timedelta(hours=1)) == []
    assert SlotWaitlistEntry.objects.get().status == WaitStatus.EXPIRED


def test_waitlist_stays_waiting_when_slot_still_taken(
    api: Api, club: Any, player: Any, make_user: Any
) -> None:
    from jungle.bookings.services import promote_waiting

    book(api, club.court1, TUE_10)
    start = datetime.fromisoformat(TUE_10)
    SlotWaitlistEntry.objects.create(
        user=make_user(),
        resource=club.court1,
        starts_at=start,
        ends_at=start + timedelta(hours=1),
        session_type="training",
    )
    assert promote_waiting(club.court1, start, start + timedelta(hours=1)) == []
    assert SlotWaitlistEntry.objects.get().status == WaitStatus.WAITING


# ---------------------------------------------------------------- restrictions (R-073)
def test_r073_restricted_player_cannot_book(api: Api, club: Any, player: Any) -> None:
    BookingRestriction.objects.create(
        user=player, reason="3 neprezentări", no_show_count=3, created_at=clock.now()
    )
    response = book(api, club.court1, TUE_10)
    assert response.status_code == 403 and error_code(response) == "booking.restricted"
    assert (
        error_code(api.post("/bookings/waitlist", booking_body(club.court1, TUE_10)))
        == "booking.restricted"
    )


def test_anonymous_cannot_book(api: Api, club: Any) -> None:
    assert book(api, club.court1, TUE_10).status_code == 401


def test_r002_unverified_email_cannot_book_online(
    api: Api, club: Any, make_user: Any, client: Client, staff: Any
) -> None:
    """Fake accounts cannot hold courts; reception can still book for the person."""
    person = make_user(email_verified_at=None)
    login_as(client, person, mfa=False)
    response = book(api, club.court1, TUE_10)
    assert response.status_code == 403 and error_code(response) == "booking.email_not_verified"
    staff(Role.RECEPTION, club.location)
    body = {**booking_body(club.court1, TUE_10), "for_user_id": str(person.id)}
    assert api.post("/staff/bookings", body).status_code == 201


# ---------------------------------------------------------------- §11 notifications
def test_s11_a_booking_confirmed_reminded_and_a_cancellation_withdraws_the_reminders(
    api: Api, club: Any, player: Any, time_machine: Any, django_capture_on_commit_callbacks: Any
) -> None:
    from jungle.notifications import services as notifications
    from jungle.notifications.models import Notification, Status

    with django_capture_on_commit_callbacks(execute=True):
        booking = book(api, club.court1, TUE_10).json()  # Tuesday 10:00, now Monday 09:00
    assert [m.subject for m in mail.outbox] == ["Rezervarea e confirmată"]
    assert "teren-1, 16.03.2027 10:00 – 11:00" in mail.outbox[0].body
    reminders = Notification.objects.filter(event="booking.reminder_24h")
    assert [n.send_after.isoformat() for n in reminders] == ["2027-03-15T08:00:00+00:00"]
    assert not Notification.objects.filter(event="booking.reminder_2h").exists()  # push only
    # the reminder goes at its time
    time_machine.move_to("2027-03-15T10:01:00+02:00", tick=False)
    assert notifications.send_due().sent == 1
    assert mail.outbox[-1].subject == "Mâine la Jungle Padel"

    # a second booking, cancelled before its reminder: the reminder never goes
    with django_capture_on_commit_callbacks(execute=True):
        second = book(api, club.court1, "2027-03-18T10:00:00+02:00").json()
        api.post(f"/bookings/{second['id']}/cancel", {})
    assert mail.outbox[-1].subject == "Rezervarea e anulată"
    withdrawn = Notification.objects.get(event="booking.reminder_24h", key__contains=second["id"])
    assert withdrawn.status == Status.SKIPPED and withdrawn.last_error == "withdrawn"
    assert booking["id"] != second["id"]
