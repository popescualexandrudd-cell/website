"""The Payments Kiosk beyond cash (§8.3): who may call it, what is refused, check-in, credit
and vouchers, subscriptions and freezing, debts, and device faults."""

from __future__ import annotations

import base64
import uuid
from collections.abc import Callable
from datetime import timedelta
from typing import Any

import pytest
from django.test import Client

from jungle.accounts.models import User
from jungle.attendance.models import Scan, ScanKind, StaffNotice
from jungle.audit.models import AuditLog
from jungle.audit.services import SYSTEM
from jungle.bookings.models import Booking, BookingStatus, CancellationOutcome, SessionType
from jungle.cafe.models import CafeOrder, CafeProduct
from jungle.checkout.tests.conftest import BASE, HOUR_PRICE, LEU, Kiosk
from jungle.conftest import error_code
from jungle.core import clock
from jungle.devices.bridge import canonical
from jungle.devices.models import Device, DeviceKind
from jungle.ledger import payments
from jungle.ledger.models import AccountKind
from jungle.ledger.services import account, customer_credit, post
from jungle.locations.models import Location, Resource
from jungle.rewards.models import VoucherKind, VoucherTarget
from jungle.rewards.services import VoucherData, issue_voucher

pytestmark = pytest.mark.django_db
Card = Callable[[User], dict[str, Any]]


def session_of(kiosk: Kiosk, card: dict[str, Any]) -> dict[str, Any]:
    return {"session": kiosk.post("/session", {"card": card}).json()["session"]}


def give_credit(user: User, location: Location, amount: int) -> None:
    post(
        "credit",
        [
            (account(AccountKind.CASH, location=location), amount),
            (account(AccountKind.CUSTOMER_BALANCE, user=user), -amount),
        ],
        description="credit for the test",
        actor=SYSTEM,
    )


# ---------------------------------------------------------------- who may call
def test_only_an_active_payments_kiosk_on_the_club_network(
    kiosk: Kiosk, location: Location, tmp_path: Any
) -> None:
    assert Client().get(f"{BASE}/idle").status_code == 401
    assert kiosk.get("/idle").json()["location_slug"] == "jungle-padel"
    outside = Client().get(f"{BASE}/idle", HTTP_X_DEVICE_TOKEN=kiosk.token, REMOTE_ADDR="8.8.8.8")
    assert error_code(outside) == "checkout.kiosk_only"
    league = Device.objects.create(kind=DeviceKind.LEAGUE_KIOSK, location=location, name="Liga")
    other = Kiosk(league, tmp_path)
    try:
        assert error_code(other.get("/idle")) == "checkout.kiosk_only"
        assert error_code(other.post("/events", {"events": []})) == "checkout.kiosk_only"
    finally:
        other.close()
    problems = [
        (a.after or {})["problem"] for a in AuditLog.objects.filter(action="checkout.refused")
    ]
    assert sorted(problems) == [
        "not_a_payments_kiosk",
        "not_a_payments_kiosk",
        "outside_club_network",
    ]


def test_the_idle_screen_shows_the_menu(kiosk: Kiosk, coffee: CafeProduct) -> None:
    idle = kiosk.get("/idle").json()
    assert idle["menu"][0]["products"][0]["name_ro"] == "Espresso"


def test_r030_check_in_at_the_payments_kiosk(kiosk: Kiosk, card: Card, player: User) -> None:
    done = kiosk.post("/check-in", {"card": card(player)}).json()
    assert done["first_name"] == "Ana"
    assert Scan.objects.get(user=player, kind=ScanKind.ARRIVAL).device_id == kiosk.device.pk


# ---------------------------------------------------------------- the basket is checked
def test_what_the_basket_refuses(
    kiosk: Kiosk,
    card: Card,
    player: User,
    booking: Booking,
    coffee: CafeProduct,
    make_user: Callable[..., User],
    location: Location,
) -> None:
    session = session_of(kiosk, card(player))

    def refused(items: list[dict[str, Any]]) -> str:
        return error_code(kiosk.post("/checkouts", {"card": session, "items": items}))

    hour = {"kind": "booking", "subject_id": str(booking.pk)}
    assert refused([hour, hour]) == "checkout.duplicate_item"
    assert refused([{**hour, "amount": HOUR_PRICE + 1}]) == "payments.overpay"
    assert refused([{"kind": "cafe", "cafe_lines": []}]) == "cafe.product_unavailable"
    unknown = [{"kind": "cafe", "cafe_lines": [{"product_id": str(uuid.uuid4()), "quantity": 1}]}]
    assert refused(unknown) == "cafe.product_unavailable"
    assert refused([{"kind": "booking", "subject_id": str(uuid.uuid4())}]) == "booking.not_found"
    assert refused([{"kind": "booking"}]) == "validation.invalid"
    many = [{"kind": "cafe", "cafe_lines": [{"product_id": str(coffee.pk), "quantity": 20}]}]
    CafeProduct.objects.filter(pk=coffee.pk).update(price=5_000_000)
    assert refused(many) == "checkout.too_much"
    # Someone else's subscription cannot be paid here; another club's booking neither.
    other = make_user()
    from jungle.subscriptions.models import Subscription

    theirs = Subscription.objects.create(
        user=other,
        location=location,
        period="monthly",
        starts_on=clock.today_local(),
        ends_on=clock.today_local() + timedelta(days=30),
        price_total=10000,
        created_by=other,
        created_at=clock.now(),
    )
    assert refused([{"kind": "subscription", "subject_id": str(theirs.pk)}]) == "checkout.not_yours"
    elsewhere = Location.objects.create(slug="alt", name="Alt club")
    court = Resource.objects.create(location=elsewhere, slug="t", name="T", kind="padel_court")
    away = Booking.objects.create(
        location=elsewhere,
        resource=court,
        organizer=player,
        created_by=player,
        starts_at=booking.starts_at,
        ends_at=booking.ends_at,
        session_type=SessionType.FREE_RENTAL,
        price_total=HOUR_PRICE,
    )
    assert refused([{"kind": "booking", "subject_id": str(away.pk)}]) == "checkout.wrong_location"
    free = Booking.objects.create(
        location=location,
        resource=booking.resource,
        organizer=player,
        created_by=player,
        starts_at=booking.ends_at,
        ends_at=booking.ends_at + timedelta(minutes=60),
        session_type=SessionType.FREE_RENTAL,
        price_total=0,
    )
    assert refused([{"kind": "booking", "subject_id": str(free.pk)}]) == "payments.nothing_due"
    zero = {"kind": "booking", "subject_id": str(booking.pk), "amount": 0}
    assert kiosk.post("/checkouts", {"card": session, "items": [zero]}).status_code == 422


def test_one_payment_at_a_time_per_kiosk_and_only_its_customer(
    kiosk: Kiosk, card: Card, player: User, booking: Booking, make_user: Callable[..., User]
) -> None:
    session = session_of(kiosk, card(player))
    item = [{"kind": "booking", "subject_id": str(booking.pk), "amount": 1000}]
    first = kiosk.post("/checkouts", {"card": session, "items": item}).json()
    second = kiosk.post("/checkouts", {"card": session, "items": item}).json()  # replaces it
    assert kiosk.get(f"/checkouts/{first['id']}").json()["status"] == "cancelled"
    stranger = session_of(kiosk, card(make_user()))
    body = {"card": stranger, "change_mode": "normal"}
    assert error_code(kiosk.post(f"/checkouts/{second['id']}/start", body)) == "checkout.not_yours"
    started = kiosk.post(
        f"/checkouts/{second['id']}/start", {"card": session, "change_mode": "normal"}
    ).json()
    again = kiosk.post(
        f"/checkouts/{second['id']}/start", {"card": session, "change_mode": "normal"}
    )
    assert error_code(again) == "checkout.state_invalid"
    assert error_code(kiosk.post("/checkouts", {"card": session, "items": item})) == "checkout.busy"
    short = kiosk.post(f"/checkouts/{second['id']}/finish", {"events": []})
    assert error_code(short) == "checkout.not_enough"
    assert error_code(kiosk.post(f"/checkouts/{second['id']}/settle", {"events": []})) == (
        "checkout.state_invalid"
    )
    assert error_code(kiosk.get(f"/checkouts/{uuid.uuid4()}")) == "checkout.not_found"
    assert started["checkout"]["status"] == "collecting"


def test_forged_or_broken_cash_events_are_refused(
    kiosk: Kiosk, card: Card, player: User, booking: Booking
) -> None:
    session = session_of(kiosk, card(player))
    item = [{"kind": "booking", "subject_id": str(booking.pk), "amount": 1000}]
    created = kiosk.post("/checkouts", {"card": session, "items": item}).json()
    kiosk.post(f"/checkouts/{created['id']}/start", {"card": session, "change_mode": "normal"})
    real = kiosk.bridge.journal.append(created["id"], "cash.accepted", 5000)
    forged = {
        "payload": {**real.envelope["payload"], "amount": 500000},
        "signature": real.envelope["signature"],
    }
    assert error_code(kiosk.post("/events", {"events": [forged]})) == "devices.signature_invalid"
    bad_amount = kiosk.bridge.signer.sign(
        "cash.accepted", event=str(uuid.uuid4()), txn=created["id"], amount=-5
    )
    assert error_code(kiosk.post("/events", {"events": [bad_amount]})) == "checkout.event_invalid"
    no_time = kiosk.bridge.signer.sign("cash.accepted", event=str(uuid.uuid4()), txn=created["id"])
    no_time["payload"]["at"] = "ieri"
    assert kiosk.post("/events", {"events": [no_time]}).status_code == 403  # signature broken
    too_many = {"events": [real.envelope] * 101}
    assert kiosk.post("/events", too_many).status_code == 422


def test_an_event_time_the_bridge_did_not_give(kiosk: Kiosk, card: Card, player: User) -> None:
    """A bridge clock without a time zone is recorded at the server's time."""
    naive = kiosk.bridge.signer.sign(
        "cash.started", event=str(uuid.uuid4()), txn="t" * 12, amount=0
    )
    naive["payload"]["at"] = "2027-04-05T18:00:00"
    naive["signature"] = base64.b64encode(
        kiosk.bridge.signer.key.sign(canonical(naive["payload"]))
    ).decode()
    bad = kiosk.bridge.signer.sign("cash.started", event=str(uuid.uuid4()), txn="t" * 12)
    bad["payload"]["at"] = "ieri"
    bad["signature"] = base64.b64encode(
        kiosk.bridge.signer.key.sign(canonical(bad["payload"]))
    ).decode()
    recorded = kiosk.post("/events", {"events": [naive, bad]}).json()["recorded"]
    assert len(recorded) == 2


# ---------------------------------------------------------------- without cash
def test_the_credit_in_the_account_pays(
    kiosk: Kiosk,
    card: Card,
    player: User,
    booking: Booking,
    coffee: CafeProduct,
    location: Location,
) -> None:
    give_credit(player, location, 20000)
    session = session_of(kiosk, card(player))
    hour = {"kind": "booking", "subject_id": str(booking.pk), "amount": 8000}
    paid = kiosk.post(
        "/pay-balance", {"card": session, "item": hour, "idempotency_key": "k" * 10}
    ).json()
    assert paid == {"amount": 8000, "order": None}
    again = kiosk.post("/pay-balance", {"card": session, "item": hour, "idempotency_key": "k" * 10})
    assert again.json()["amount"] == 8000 and customer_credit(player) == 12000  # not twice
    coffee_item = {"kind": "cafe", "cafe_lines": [{"product_id": str(coffee.pk), "quantity": 1}]}
    cup = kiosk.post(
        "/pay-balance", {"card": session, "item": coffee_item, "idempotency_key": "c" * 10}
    ).json()
    assert cup["order"] == CafeOrder.objects.get().number and customer_credit(player) == 10800


def test_r121_a_voucher_at_the_kiosk(
    kiosk: Kiosk, card: Card, player: User, booking: Booking, coffee: CafeProduct
) -> None:
    voucher = issue_voucher(
        SYSTEM,
        player,
        VoucherData(
            kind=VoucherKind.AMOUNT,
            value=5000,
            target=VoucherTarget.BOOKING,
            valid_days=30,
            reason="test",
        ),
        "manual",
    )
    session = session_of(kiosk, card(player))
    hour = {"kind": "booking", "subject_id": str(booking.pk)}
    used = kiosk.post("/voucher", {"card": session, "code": voucher.code, "item": hour}).json()
    assert used == {"amount": 5000}
    assert payments.money_status(payments.due_for_booking(booking)).to_pay == HOUR_PRICE - 5000
    cafe = {"kind": "cafe", "cafe_lines": [{"product_id": str(coffee.pk), "quantity": 1}]}
    wrong = kiosk.post("/voucher", {"card": session, "code": voucher.code, "item": cafe})
    assert error_code(wrong) == "vouchers.wrong_target"
    audit = AuditLog.objects.get(action="payments.received")
    assert audit.actor_device_id == kiosk.device.pk and audit.actor_user_id == player.pk


def test_r081_r086_a_subscription_ordered_and_frozen_at_the_kiosk(
    kiosk: Kiosk, card: Card, player: User, location: Location
) -> None:
    from jungle.subscriptions.models import Subscription, SubscriptionRate

    SubscriptionRate.objects.create(
        location=location, sport="padel", sessions_per_month=4, monthly_price=30000
    )
    # Q53: at the kiosk the club's card identifies the customer (no verified email needed).
    User.objects.filter(pk=player.pk).update(email_verified_at=None)
    session = session_of(kiosk, card(player))
    ordered = kiosk.post(
        "/subscriptions",
        {
            "card": session,
            "selections": [{"sport": "padel", "intensity": "start"}],
            "period": "monthly",
            "starts_on": clock.today_local().isoformat(),
        },
    )
    assert ordered.status_code == 201, ordered.json()
    subscription_id = ordered.json()["id"]
    view = kiosk.post("/session", {"card": session}).json()
    assert [p["kind"] for p in view["payables"]] == ["subscription"]
    item = [{"kind": "subscription", "subject_id": subscription_id}]
    price = ordered.json()["price_total"]
    notes = [200 * LEU] * (price // 20000) + [100 * LEU] * ((price % 20000) // 10000)
    remainder = price % 10000
    assert remainder == 0
    kiosk.buy(session, item, notes)
    assert Subscription.objects.get(pk=subscription_id).status == "active"
    frozen = kiosk.post(
        f"/subscriptions/{subscription_id}/freeze",
        {
            "card": session,
            "starts_on": (clock.today_local() + timedelta(days=2)).isoformat(),
            "days": 5,
        },
    ).json()
    assert frozen["ends_on"] == (clock.today_local() + timedelta(days=7)).isoformat()
    view = kiosk.post("/session", {"card": session}).json()
    assert view["subscriptions"][0]["id"] == subscription_id


def test_debts_first_and_the_share_of_a_partners_booking(
    kiosk: Kiosk,
    card: Card,
    player: User,
    booking: Booking,
    make_user: Callable[..., User],
    location: Location,
) -> None:
    from jungle.league.tests.conftest import at

    missed = Booking.objects.create(
        location=location,
        resource=booking.resource,
        organizer=player,
        created_by=player,
        starts_at=at("2027-04-04 10:00"),
        ends_at=at("2027-04-04 11:00"),
        session_type=SessionType.FREE_RENTAL,
        price_total=16000,
        status=BookingStatus.CANCELLED,
        cancellation_outcome=CancellationOutcome.CHARGED,
    )
    Booking.objects.create(  # cancelled in time: nothing to pay, not shown
        location=location,
        resource=booking.resource,
        organizer=player,
        created_by=player,
        starts_at=at("2027-04-04 12:00"),
        ends_at=at("2027-04-04 13:00"),
        session_type=SessionType.FREE_RENTAL,
        price_total=16000,
        status=BookingStatus.CANCELLED,
        cancellation_outcome=CancellationOutcome.FREE,
    )
    partner = make_user(first_name="Ion", last_name="Dan")
    theirs = Booking.objects.create(
        location=location,
        resource=booking.resource,
        organizer=partner,
        created_by=partner,
        starts_at=at("2027-04-05 16:00"),
        ends_at=at("2027-04-05 17:30"),
        session_type=SessionType.FREE_RENTAL,
        price_total=HOUR_PRICE,
    )
    Scan.objects.create(
        user=player,
        location=location,
        kind=ScanKind.COURT_ENTRY,
        resource=theirs.resource,
        booking=theirs,
        scanned_at=theirs.starts_at,
    )
    view = kiosk.post("/session", {"card": card(player)}).json()
    assert [(p["subject_id"], p["debt"]) for p in view["payables"]] == [
        (str(missed.pk), True),
        (str(booking.pk), False),
    ]
    assert [(p["subject_id"], p["organizer"]) for p in view["shared"]] == [
        (str(theirs.pk), "Ion Dan")
    ]
    assert error_code(kiosk.get(f"/bookings/{uuid.uuid4()}/split")) == "booking.not_found"
    assert error_code(kiosk.get(f"/bookings/{booking.pk}/split", parts=9)) == "validation.invalid"


def test_device_faults_reach_the_staff_once(kiosk: Kiosk) -> None:
    assert kiosk.post("/alerts", {"code": "note_jam"}).json() == {"ok": True}
    kiosk.post("/alerts", {"code": "note_jam"})
    kiosk.post("/alerts", {"code": "low_change"})
    assert error_code(kiosk.post("/alerts", {"code": "format_disk"})) == "validation.invalid"
    kinds = sorted(
        n.payload["code"] for n in StaffNotice.objects.filter(kind="checkout.device_fault")
    )
    assert kinds == ["low_change", "note_jam"]


def test_logout_ends_the_session(kiosk: Kiosk, card: Card, player: User) -> None:
    session = session_of(kiosk, card(player))
    assert kiosk.post("/logout", {"session": session["session"]}).status_code == 204
    assert error_code(kiosk.post("/check-in", {"card": session})) == "devices.session_expired"


def test_the_bridge_marks_as_synced_what_the_server_acknowledged(
    kiosk: Kiosk, card: Card, player: User, booking: Booking
) -> None:
    """ADR-0013: after an outage the page sends `journal.pending` to the server; the signed
    `journal.ack` it gets back lets the bridge stop sending them."""
    kiosk.buy(
        card(player), [{"kind": "booking", "subject_id": str(booking.pk)}], [200 * LEU, 50 * LEU]
    )
    pending = kiosk.ask("journal.pending")["events"]
    assert pending
    answer = kiosk.post("/events", {"events": pending}).json()
    assert sorted(answer["recorded"]) == sorted(e["payload"]["event"] for e in pending)
    assert kiosk.order(answer["ack"])["pending"] == 0
    assert kiosk.post("/events", {"events": []}).json() == {"recorded": [], "ack": None}
