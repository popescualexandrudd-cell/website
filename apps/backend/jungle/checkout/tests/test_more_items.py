"""More of the Payments Kiosk (§8.3): a class place and a tournament fee paid in cash, what
happens when an item can no longer be paid at the end, a machine that reports odd amounts,
and the checks the service keeps even when the API already filters its input."""

from __future__ import annotations

import uuid
from collections.abc import Callable
from typing import Any

import pytest
from django.test import RequestFactory

from jungle.accounts.models import User
from jungle.attendance.models import StaffNotice
from jungle.bookings.models import Booking, ClassEnrollment, ClassSession, EnrollmentStatus
from jungle.cafe.models import CafeProduct
from jungle.checkout import services
from jungle.checkout.models import Checkout, CheckoutStatus
from jungle.checkout.tests.conftest import LEU, Kiosk
from jungle.checkout.tests.test_kiosk_other import session_of
from jungle.conftest import error_code
from jungle.core import clock
from jungle.core.errors import DomainError
from jungle.devices.kiosk_session import CardIn
from jungle.league.models import LeagueSeason, Tournament, TournamentEntry
from jungle.league.tests.conftest import at
from jungle.ledger import payments
from jungle.ledger.services import customer_credit
from jungle.locations.models import Location, Resource, ResourceKind

pytestmark = pytest.mark.django_db
Card = Callable[[User], dict[str, Any]]


def problems() -> list[str]:
    return [
        n.payload["problem"]
        for n in StaffNotice.objects.filter(kind="checkout.cash_attention").order_by("created_at")
    ]


def request_of(kiosk: Kiosk) -> Any:
    request = RequestFactory().post("/", REMOTE_ADDR=kiosk.ip)
    request.auth = kiosk.device  # type: ignore[attr-defined]
    return request


def start_paying(kiosk: Kiosk, session: dict[str, Any], items: list[dict[str, Any]]) -> str:
    created = kiosk.post("/checkouts", {"card": session, "items": items}).json()
    started = kiosk.post(
        f"/checkouts/{created['id']}/start", {"card": session, "change_mode": "normal"}
    ).json()
    assert kiosk.order(started["command"])["ok"]
    return str(created["id"])


# ---------------------------------------------------------------- other things to pay
def test_r101_a_class_place_paid_in_cash(
    kiosk: Kiosk, card: Card, player: User, location: Location, make_user: Callable[..., User]
) -> None:
    studio = Resource.objects.create(
        location=location, slug="studio", name="Studio", kind=ResourceKind.PILATES_STUDIO
    )
    lesson = ClassSession.objects.create(
        location=location,
        studio=studio,
        instructor=make_user(),
        kind="beginner",
        starts_at=at("2027-04-05 19:00"),
        ends_at=at("2027-04-05 19:50"),
        capacity=4,
        price_total=5000,
    )
    place = ClassEnrollment.objects.create(
        session=lesson, user=player, status=EnrollmentStatus.ENROLLED
    )
    session = session_of(kiosk, card(player))
    view = kiosk.post("/session", {"card": session}).json()
    assert [(p["kind"], p["to_pay"]) for p in view["payables"]] == [("enrollment", 5000)]
    kiosk.buy(session, [{"kind": "enrollment", "subject_id": str(place.pk)}], [50 * LEU])
    assert payments.money_status(payments.due_for_enrollment(place)).to_pay == 0
    assert kiosk.post("/session", {"card": session}).json()["payables"] == []  # paid: gone


def test_a_tournament_fee_paid_by_either_player_of_the_pair(
    kiosk: Kiosk, card: Card, player: User, location: Location, make_user: Callable[..., User]
) -> None:
    season = LeagueSeason.objects.create(
        location=location,
        number=1,
        name="Sezonul 1",
        starts_at=at("2027-04-01 00:00"),
        ends_at=at("2027-07-01 00:00"),
    )
    tournament = Tournament.objects.create(
        season=season,
        location=location,
        name="Cupa de primăvară",
        format="groups_knockout",
        team_size=2,
        starts_at=at("2027-04-10 10:00"),
        registration_closes_at=at("2027-04-09 10:00"),
        entry_fee=8000,
        max_entries=8,
        created_at=clock.now(),
    )
    partner = make_user()
    entry = TournamentEntry.objects.create(
        tournament=tournament, player_a=partner, player_b=player, registered_at=clock.now()
    )
    session = session_of(kiosk, card(player))
    view = kiosk.post("/session", {"card": session}).json()
    assert [(p["kind"], p["subject_id"]) for p in view["payables"]] == [
        ("tournament_entry", str(entry.pk))
    ]
    stranger = session_of(kiosk, card(make_user()))
    item = [{"kind": "tournament_entry", "subject_id": str(entry.pk), "amount": 4000}]
    refused = kiosk.post("/checkouts", {"card": stranger, "items": item})
    assert error_code(refused) == "checkout.not_yours"
    kiosk.buy(session, item, [10 * LEU] * 4)
    kiosk.buy(session_of(kiosk, card(partner)), item, [10 * LEU] * 4)
    from jungle.league.tournaments import due_for_entry

    assert payments.money_status(due_for_entry(entry)).to_pay == 0


# ---------------------------------------------------------------- at the end of the payment
def test_an_item_no_longer_payable_at_the_end_becomes_credit(
    kiosk: Kiosk, card: Card, player: User, booking: Booking, coffee: CafeProduct
) -> None:
    """Someone paid the hour at reception meanwhile, and the bar changed the coffee's price: the
    cash already in is not lost, it becomes the customer's credit (and the manager is told)."""
    session = session_of(kiosk, card(player))
    items: list[dict[str, Any]] = [
        {"kind": "booking", "subject_id": str(booking.pk), "amount": booking.price_total},
        {"kind": "cafe", "cafe_lines": [{"product_id": str(coffee.pk), "quantity": 1}]},
    ]
    txn = start_paying(kiosk, session, items)
    accepted = kiosk.insert(200 * LEU, 50 * LEU, 1 * LEU, 1 * LEU)
    _pay_online(booking)
    CafeProduct.objects.filter(pk=coffee.pk).update(price=1500)
    finished = kiosk.post(f"/checkouts/{txn}/finish", {"events": accepted}).json()
    settled = finished["settled"]
    assert settled["checkout"]["credited"] == booking.price_total + 1200
    assert customer_credit(player) == booking.price_total + 1200
    assert problems() == ["item_not_paid", "item_not_paid"]
    assert settled["orders"] == []


def _pay_online(booking: Booking) -> None:
    from jungle.audit.services import SYSTEM

    payments.pay(
        SYSTEM,
        payments.due_for_booking(booking),
        payments.PaymentData(
            payer_id=booking.organizer_id,
            amount=booking.price_total,
            method="cash",
            tendered=booking.price_total,
            idempotency_key="paid-at-reception-meanwhile",
        ),
    )


def test_a_machine_that_reports_more_change_than_asked(
    kiosk: Kiosk, card: Card, player: User, booking: Booking
) -> None:
    session = session_of(kiosk, card(player))
    item = [{"kind": "booking", "subject_id": str(booking.pk), "amount": 9000}]
    txn = start_paying(kiosk, session, item)
    accepted = kiosk.insert(100 * LEU)
    kiosk.post(f"/checkouts/{txn}/finish", {"events": accepted})
    odd = kiosk.bridge.journal.append(txn, "cash.dispensed", 20 * LEU)
    settled = kiosk.post(f"/checkouts/{txn}/settle", {"events": [odd.envelope]}).json()
    assert settled["checkout"]["credited"] == 0
    assert problems() == ["too_much_change"]


def test_a_power_cut_after_the_money_went_back_or_after_the_end(
    kiosk: Kiosk, card: Card, player: User, booking: Booking
) -> None:
    session = session_of(kiosk, card(player))
    item = [{"kind": "booking", "subject_id": str(booking.pk), "amount": 5000}]
    txn = start_paying(kiosk, session, item)
    kiosk.insert(50 * LEU)
    cut = kiosk.bridge.journal.append(txn, "cash.interrupted", 5000, dispensed=5000)
    kiosk.post("/events", {"events": [cut.envelope]})
    checkout = Checkout.objects.get(pk=txn)
    assert (checkout.status, checkout.credited) == (CheckoutStatus.INTERRUPTED, 0)
    assert customer_credit(player) == 0
    again = kiosk.bridge.journal.append(txn, "cash.interrupted", 5000)
    kiosk.post("/events", {"events": [again.envelope]})  # already closed: nothing changes
    checkout.refresh_from_db()
    assert checkout.credited == 0 and problems() == ["interrupted"]


def test_a_full_refund_and_a_refund_too_late(
    kiosk: Kiosk, card: Card, player: User, booking: Booking
) -> None:
    session = session_of(kiosk, card(player))
    item = [{"kind": "booking", "subject_id": str(booking.pk), "amount": 5000}]
    txn = start_paying(kiosk, session, item)
    accepted = kiosk.insert(50 * LEU)
    cancelled = kiosk.post(f"/checkouts/{txn}/cancel", {"events": accepted}).json()
    kiosk.order(cancelled["stop"])
    back = kiosk.order(cancelled["refund"])
    done = kiosk.post(f"/checkouts/{txn}/refunded", {"events": [back["signed"]]}).json()
    assert done["credited"] == 0 and customer_credit(player) == 0
    assert kiosk.post(f"/checkouts/{txn}/refunded", {"events": []}).status_code == 200
    paid = kiosk.buy(session, item, [50 * LEU])
    late = kiosk.post(f"/checkouts/{paid['checkout']['id']}/refunded", {"events": []})
    assert error_code(late) == "checkout.state_invalid"


# ---------------------------------------------------------------- the service's own checks
def test_the_service_checks_what_the_api_already_filters(
    kiosk: Kiosk, card: Card, player: User, booking: Booking
) -> None:
    with pytest.raises(DomainError, match="validation.invalid"):
        services.subject("gift", None)
    assert services.subject("enrollment", booking.pk).enrollment_id == booking.pk
    request = request_of(kiosk)
    signed = CardIn(**card(player))
    with pytest.raises(DomainError, match="checkout.empty"):
        services.create(request, signed, [])
    session = CardIn(session=session_of(kiosk, card(player))["session"])
    hour = services.ItemData(kind="booking", subject_id=booking.pk, amount=-1)
    with pytest.raises(DomainError, match="payments.invalid_amount"):
        services.create(request, session, [hour])
    created = services.create(
        request, session, [services.ItemData(kind="booking", subject_id=booking.pk)]
    )
    with pytest.raises(DomainError, match="validation.invalid"):
        services.start(request, created.pk, session, "maybe")
    with pytest.raises(DomainError, match="validation.invalid"):
        services.record_events(request, [{}] * (services.MAX_EVENTS + 1))
    missing = kiosk.post(
        f"/checkouts/{uuid.uuid4()}/start",
        {"card": {"session": session.session}, "change_mode": "normal"},
    )
    assert error_code(missing) == "checkout.not_found"


def test_how_the_records_read_in_the_admin(
    kiosk: Kiosk, card: Card, player: User, booking: Booking
) -> None:
    from jungle.checkout.models import CashEvent, CashOperation, CheckoutItem, KioskPin

    session = session_of(kiosk, card(player))
    kiosk.buy(session, [{"kind": "booking", "subject_id": str(booking.pk)}], [200 * LEU, 50 * LEU])
    checkout = Checkout.objects.get()
    assert str(checkout) == "Încheiat 24000"
    assert str(CheckoutItem.objects.get()) == CheckoutItem.objects.get().description
    assert str(CashEvent.objects.filter(kind="cash.accepted").first()).startswith("cash.accepted ")
    operation = CashOperation.objects.create(
        device=kiosk.device,
        location=kiosk.device.location,
        kind="count",
        staff=player,
        created_at=clock.now(),
    )
    assert str(operation).startswith("Numărare ")
    pin = KioskPin.objects.create(user=player, pin_hash="x", updated_at=clock.now())
    assert str(pin) == str(player.pk)
