"""Paying for bookings and classes (R-060 … R-067, R-070 … R-072, Q10, Q14)."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import pytest
from django.test import Client

from jungle.attendance.models import Scan
from jungle.attendance.services import process_no_shows
from jungle.audit.services import SYSTEM
from jungle.bookings.models import (
    Booking,
    BookingStatus,
    ClassEnrollment,
    ClassSession,
    EnrollmentStatus,
)
from jungle.conftest import Api, error_code, login_as
from jungle.core.errors import DomainError
from jungle.core.permissions import Role
from jungle.ledger import payments, services
from jungle.ledger.models import LedgerTransaction, Payment, PaymentMethod, RevenueCategory
from jungle.ledger.payments import PaymentData, due_for_booking, due_for_enrollment

pytestmark = pytest.mark.django_db

TUE_18 = "2027-03-16T18:00:00+02:00"  # peak: 2 × 60 RON = 120 RON


def make_booking(club: Any, organizer: Any, start: str = TUE_18, **fields: Any) -> Booking:
    starts_at = datetime.fromisoformat(start)
    values: dict[str, Any] = {
        "location": club.location,
        "resource": club.court1,
        "organizer": organizer,
        "created_by": organizer,
        "starts_at": starts_at,
        "ends_at": starts_at + timedelta(hours=1),
        "session_type": "training",
        "price_total": 12000,
    }
    values.update(fields)
    return Booking.objects.create(**values)


def cash(payer: Any, amount: int, tendered: int, key: str) -> PaymentData:
    return PaymentData(
        payer_id=payer.pk,
        amount=amount,
        method=PaymentMethod.CASH,
        tendered=tendered,
        idempotency_key=key,
    )


# ---------------------------------------------------------------- paying
def test_r060_r061_hour_split_between_partners_in_cash(club: Any, make_user: Any) -> None:
    organizer, partners = make_user(), [make_user() for _ in range(3)]
    booking = make_booking(club, organizer, price_total=10001)
    due = due_for_booking(booking)
    shares = services.split_amount(payments.money_status(due).to_pay, 4)
    assert shares == [2501, 2500, 2500, 2500]

    first = payments.pay(SYSTEM, due, cash(organizer, shares[0], 5000, "p0"))
    assert (first.tendered, first.change) == (5000, 2499)  # R-062: change is given
    assert first.fiscal_receipt.startswith("SIM-")  # R-066: simulated until the register is chosen
    assert services.customer_debt(organizer) == 10001 - 2501  # the charge is recorded on payment
    for n, partner in enumerate(partners, start=1):
        payments.pay(SYSTEM, due, cash(partner, shares[n], shares[n], f"p{n}"))
    status = payments.money_status(due)
    assert (status.charged, status.paid, status.to_pay) == (10001, 10001, 0)
    assert services.customer_debt(organizer) == 0
    with pytest.raises(DomainError) as exc:
        payments.pay(SYSTEM, due, cash(organizer, 1, 1, "p9"))
    assert exc.value.code.value == "payments.nothing_due"


def test_r067_a_retried_payment_is_taken_once(club: Any, make_user: Any) -> None:
    organizer = make_user()
    due = due_for_booking(make_booking(club, organizer))
    first = payments.pay(SYSTEM, due, cash(organizer, 6000, 10000, "same"))
    again = payments.pay(SYSTEM, due, cash(organizer, 6000, 10000, "same"))
    assert again.pk == first.pk and Payment.objects.count() == 1
    with pytest.raises(DomainError) as exc:
        payments.pay(SYSTEM, due, cash(organizer, 7000, 10000, "same"))
    assert exc.value.code.value == "payments.idempotency_conflict"
    with pytest.raises(DomainError) as exc:
        payments.pay(SYSTEM, due, cash(organizer, 1000, 1000, ""))
    assert exc.value.code.value == "payments.idempotency_required"


@pytest.mark.parametrize(
    ("amount", "method", "tendered", "code"),
    [
        (0, PaymentMethod.CASH, 0, "payments.invalid_amount"),
        (12001, PaymentMethod.CASH, 20000, "payments.overpay"),
        (6000, PaymentMethod.CASH, 5000, "payments.insufficient_cash"),
        (6000, PaymentMethod.BALANCE, 0, "payments.insufficient_balance"),
        (6000, PaymentMethod.CARD, 0, "payments.method_unavailable"),  # Q9, R-062
    ],
)
def test_payment_refusals(
    club: Any, make_user: Any, amount: int, method: str, tendered: int, code: str
) -> None:
    organizer = make_user()
    due = due_for_booking(make_booking(club, organizer))
    data = PaymentData(
        payer_id=organizer.pk, amount=amount, method=method, tendered=tendered, idempotency_key="k"
    )
    with pytest.raises(DomainError) as exc:
        payments.pay(SYSTEM, due, data)
    assert exc.value.code.value == code
    assert not Payment.objects.exists() and services.customer_debt(organizer) == 0


def test_unknown_payer(club: Any, make_user: Any) -> None:
    due = due_for_booking(make_booking(club, make_user()))
    data = PaymentData(
        payer_id=club.location.pk,
        amount=100,
        method=PaymentMethod.CASH,
        tendered=100,
        idempotency_key="k",
    )
    with pytest.raises(DomainError) as exc:
        payments.pay(SYSTEM, due, data)
    assert exc.value.status == 404


# ---------------------------------------------------------------- cancellations (R-070, R-071, Q14)
def test_q14_free_cancellation_returns_payments_as_credit(
    api: Api, club: Any, make_user: Any, client: Client
) -> None:
    organizer, partner = make_user(), make_user()
    booking = make_booking(club, organizer)
    due = due_for_booking(booking)
    payments.pay(SYSTEM, due, cash(organizer, 6000, 6000, "a"))
    payments.pay(SYSTEM, due, cash(partner, 6000, 6000, "b"))

    login_as(client, organizer, mfa=False)
    assert api.post(f"/bookings/{booking.pk}/cancel", {}).json()["cancellation_outcome"] == "free"
    assert services.customer_credit(organizer) == 6000
    assert services.customer_credit(partner) == 6000
    assert services.customer_debt(organizer) == 0
    booking.refresh_from_db()
    status = payments.money_status(due_for_booking(booking))
    assert (status.charged, status.paid, status.refunded, status.to_pay) == (0, 12000, 12000, 0)
    assert payments.refund_as_credit(due_for_booking(booking)) == []  # settled once

    # The credit pays the next booking (R-065).
    other = make_booking(club, organizer, "2027-03-17T18:00:00+02:00")
    paid = payments.pay(
        SYSTEM,
        due_for_booking(other),
        PaymentData(
            payer_id=organizer.pk, amount=6000, method=PaymentMethod.BALANCE, idempotency_key="c"
        ),
    )
    assert paid.method == "balance" and services.customer_credit(organizer) == 0
    assert api.get("/account").json() == {"credit": 0, "debt": 6000}
    entries = api.get("/account/entries").json()
    assert {e["kind"] for e in entries} >= {"charge", "payment", "credit", "reversal"}


def test_r071_late_cancellation_is_a_debt(
    api: Api, club: Any, make_user: Any, client: Client, time_machine: Any
) -> None:
    organizer = make_user()
    booking = make_booking(club, organizer)
    time_machine.move_to("2027-03-16T09:00:00+02:00", tick=False)  # 9 h before
    login_as(client, organizer, mfa=False)
    assert (
        api.post(f"/bookings/{booking.pk}/cancel", {}).json()["cancellation_outcome"] == "charged"
    )
    assert services.customer_debt(organizer) == 12000
    status = api.get(f"/account/payment-status?booking_id={booking.pk}").json()
    assert status["to_pay"] == 12000 and status["charged"] == 12000


def test_waived_cancellation_owes_nothing(
    api: Api, club: Any, make_user: Any, staff: Any, time_machine: Any
) -> None:
    organizer = make_user()
    booking = make_booking(club, organizer)
    payments.pay(SYSTEM, due_for_booking(booking), cash(organizer, 3000, 3000, "a"))
    time_machine.move_to("2027-03-16T17:00:00+02:00", tick=False)
    staff(Role.RECEPTION, club.location)
    api.post(f"/bookings/{booking.pk}/cancel", {"waive": True, "reason": "Accidentare"})
    assert services.customer_debt(organizer) == 0 and services.customer_credit(organizer) == 3000


def test_unpaid_free_cancellation_leaves_nothing(club: Any, make_user: Any) -> None:
    organizer = make_user()
    booking = make_booking(
        club, organizer, status=BookingStatus.CANCELLED, cancellation_outcome="free"
    )
    due = due_for_booking(booking)
    payments.settle(due)
    assert payments.money_status(due).to_pay == 0
    assert not LedgerTransaction.objects.exists()


# ---------------------------------------------------------------- no-shows and completion (R-072)
def test_r072_no_show_and_completed_sessions_are_charged(
    club: Any, make_user: Any, time_machine: Any
) -> None:
    absent, present = make_user(), make_user()
    make_booking(club, absent)
    played = make_booking(club, present, resource=club.court2)
    Scan.objects.create(
        user=present,
        location=club.location,
        kind="court_entry",
        booking=played,
        scanned_at=played.starts_at,
    )
    time_machine.move_to("2027-03-16T19:00:00+02:00", tick=False)
    process_no_shows()
    assert services.customer_debt(absent) == 12000
    assert services.customer_debt(present) == 12000  # played, not paid yet: a debt
    process_no_shows()
    assert LedgerTransaction.objects.filter(kind="charge").count() == 2  # charged once


def test_events_are_charged_when_they_end(club: Any, make_user: Any, time_machine: Any) -> None:
    host = make_user()
    event = make_booking(
        club,
        host,
        resource=club.room,
        session_type="event",
        ends_at=datetime.fromisoformat("2027-03-16T21:00:00+02:00"),
        price_total=60000,
    )
    assert payments.booking_category(event) == RevenueCategory.EVENTS
    time_machine.move_to("2027-03-16T21:00:00+02:00", tick=False)
    process_no_shows()
    assert services.customer_debt(host) == 60000


def test_revenue_categories(club: Any, make_user: Any) -> None:
    user = make_user()
    lesson = make_booking(club, user, session_type="lesson", coach=club.coach)
    tennis = make_booking(club, user, resource=club.tennis)
    padel = make_booking(club, user, resource=club.court2)
    assert payments.booking_category(lesson) == RevenueCategory.LESSONS
    assert payments.booking_category(tennis) == RevenueCategory.TENNIS
    assert payments.booking_category(padel) == RevenueCategory.PADEL
    assert (
        payments.charge(
            due_for_booking(make_booking(club, user, "2027-03-18T10:00:00+02:00", price_total=0))
        )
        is None
    )


# ---------------------------------------------------------------- classes
def test_class_places_are_paid_charged_or_free(
    api: Api, club: Any, make_user: Any, staff: Any, client: Client, time_machine: Any
) -> None:
    start = datetime.fromisoformat("2027-03-17T18:00:00+02:00")
    session = ClassSession.objects.create(
        location=club.location,
        studio=club.studio,
        instructor=club.coach,
        kind="group",
        starts_at=start,
        ends_at=start + timedelta(hours=1),
        capacity=4,
        price_total=8000,
    )
    comes, misses, waits = make_user(), make_user(), make_user()
    came = ClassEnrollment.objects.create(
        session=session, user=comes, status=EnrollmentStatus.ENROLLED
    )
    ClassEnrollment.objects.create(session=session, user=misses, status=EnrollmentStatus.ENROLLED)
    waiting = ClassEnrollment.objects.create(
        session=session, user=waits, status=EnrollmentStatus.WAITLISTED
    )
    assert payments.money_status(due_for_enrollment(waiting)).to_pay == 0
    assert payments.money_status(due_for_enrollment(came)).to_pay == 8000

    staff(Role.MANAGER, club.location)
    body = {
        "enrollment_id": str(came.pk),
        "payer_id": str(comes.pk),
        "amount": 8000,
        "method": "cash",
        "tendered": 10000,
        "reason": "Chioșcul e în service",
    }
    response = api.post("/staff/payments", body, HTTP_IDEMPOTENCY_KEY="class-1")
    assert response.status_code == 201, response.json()
    assert response.json()["change"] == 2000

    time_machine.move_to("2027-03-17T18:05:00+02:00", tick=False)
    api.post(
        "/staff/scans",
        {
            "user_id": str(comes.pk),
            "location_id": str(club.location.pk),
            "kind": "class_entry",
            "class_session_id": str(session.pk),
        },
    )
    time_machine.move_to("2027-03-17T18:20:00+02:00", tick=False)
    process_no_shows()
    assert services.customer_debt(comes) == 0  # attended and paid
    assert services.customer_debt(misses) == 8000  # R-102: no-show is paid

    login_as(client, waits, mfa=False)
    status = api.get(f"/account/payment-status?enrollment_id={waiting.pk}").json()
    assert status["to_pay"] == 0


# ---------------------------------------------------------------- endpoints and rights
def test_staff_payment_rules(api: Api, club: Any, make_user: Any, staff: Any) -> None:
    organizer = make_user()
    booking = make_booking(club, organizer)
    body = {
        "booking_id": str(booking.pk),
        "payer_id": str(organizer.pk),
        "amount": 12000,
        "method": "cash",
        "tendered": 12000,
        "reason": "Excepție",
    }
    staff(Role.RECEPTION, club.location)
    assert api.post("/staff/payments", body, HTTP_IDEMPOTENCY_KEY="x").status_code == 403  # Q10
    staff(Role.MANAGER, club.location)
    assert api.post("/staff/payments", body).status_code == 422  # the key is required
    assert (
        error_code(api.post("/staff/payments", {**body, "reason": " "}, HTTP_IDEMPOTENCY_KEY="x"))
        == "validation.invalid"
    )
    both = {**body, "enrollment_id": str(booking.pk)}
    assert (
        error_code(api.post("/staff/payments", both, HTTP_IDEMPOTENCY_KEY="x"))
        == "validation.invalid"
    )
    neither = {k: v for k, v in body.items() if k != "booking_id"}
    assert (
        error_code(api.post("/staff/payments", neither, HTTP_IDEMPOTENCY_KEY="x"))
        == "validation.invalid"
    )
    ghost = {**body, "booking_id": str(club.location.pk)}
    assert api.post("/staff/payments", ghost, HTTP_IDEMPOTENCY_KEY="x").status_code == 404
    ghost_class = {**neither, "enrollment_id": str(club.location.pk)}
    assert api.post("/staff/payments", ghost_class, HTTP_IDEMPOTENCY_KEY="x").status_code == 404
    ok = api.post("/staff/payments", body, HTTP_IDEMPOTENCY_KEY="x")
    retry = api.post("/staff/payments", body, HTTP_IDEMPOTENCY_KEY="x")
    assert ok.status_code == retry.status_code == 201 and ok.json()["id"] == retry.json()["id"]

    location = f"location_id={club.location.pk}"
    assert api.get(f"/staff/customers/{organizer.pk}/account?{location}").json() == {
        "credit": 0,
        "debt": 0,
    }
    assert len(api.get(f"/staff/customers/{organizer.pk}/entries?{location}").json()) == 2
    assert api.get(f"/staff/customers/{club.location.pk}/account?{location}").status_code == 404
    assert api.get(f"/staff/customers/{club.location.pk}/entries?{location}").status_code == 404


def test_payment_status_and_split_for_the_organizer_only(
    api: Api, club: Any, make_user: Any, client: Client, staff: Any
) -> None:
    organizer = make_user()
    booking = make_booking(club, organizer, price_total=10001)
    login_as(client, organizer, mfa=False)
    split = api.get(f"/account/split?booking_id={booking.pk}&parts=3").json()
    assert split == {"to_pay": 10001, "shares": [3335, 3333, 3333]}
    assert api.get(f"/account/split?booking_id={booking.pk}&parts=9").status_code == 400
    login_as(client, make_user(), mfa=False)
    assert api.get(f"/account/payment-status?booking_id={booking.pk}").status_code == 403
    staff(Role.RECEPTION, club.location)
    assert api.get(f"/account/payment-status?booking_id={booking.pk}").json()["to_pay"] == 10001


def test_settling_a_confirmed_booking_posts_nothing(club: Any, make_user: Any) -> None:
    payments.settle(due_for_booking(make_booking(club, make_user())))
    assert not LedgerTransaction.objects.exists()


def test_fiscal_simulator_and_readable_rows(club: Any, make_user: Any) -> None:
    from jungle.ledger import fiscal
    from jungle.ledger.models import LedgerAccount, LedgerEntry

    with pytest.raises(ValueError, match="less than"):
        fiscal.SimulatedFiscalPrinter().print_receipt([fiscal.ReceiptLine("x", 500)], 400)
    organizer = make_user()
    payment = payments.pay(
        SYSTEM, due_for_booking(make_booking(club, organizer)), cash(organizer, 500, 500, "s")
    )
    tx = payment.transaction
    rows = [
        payment,
        tx,
        LedgerEntry.objects.filter(transaction=tx).first(),
        LedgerAccount.objects.first(),
    ]
    assert all(str(row) for row in rows)
