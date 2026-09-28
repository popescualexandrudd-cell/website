"""§8.3 "niciun leu nu se pierde fără urmă": change the machine cannot give, the exact-amount
mode, cancelling with a refund, a power cut, late or unknown money, stale baskets."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest
from jungle_bridge.drivers.simulator import simulated
from jungle_bridge.server import build

from jungle.accounts.models import User
from jungle.attendance.models import StaffNotice
from jungle.audit.services import SYSTEM
from jungle.bookings.models import Booking
from jungle.cafe.models import CafeProduct
from jungle.checkout.models import CashEvent, Checkout, CheckoutStatus
from jungle.checkout.services import cash_box, unidentified
from jungle.checkout.tests.conftest import HOUR_PRICE, LEU, Kiosk
from jungle.conftest import error_code
from jungle.core import clock
from jungle.ledger import payments
from jungle.ledger.models import AccountKind
from jungle.ledger.services import account, balance, customer_credit, post

pytestmark = pytest.mark.django_db
Card = Callable[[User], dict[str, Any]]


NORMAL = "normal"


def open_session(kiosk: Kiosk, card: dict[str, Any]) -> dict[str, Any]:
    return {"session": kiosk.post("/session", {"card": card}).json()["session"]}


def start(kiosk: Kiosk, card: dict[str, Any], items: list[dict[str, Any]], mode: str) -> str:
    created = kiosk.post("/checkouts", {"card": card, "items": items}).json()
    started = kiosk.post(
        f"/checkouts/{created['id']}/start", {"card": card, "change_mode": mode}
    ).json()
    assert kiosk.order(started["command"])["ok"]
    return str(created["id"])


def notices(problem: str) -> int:
    return StaffNotice.objects.filter(payload__problem=problem).count()


def hour(booking: Booking, amount: int | None = None) -> dict[str, Any]:
    return {"kind": "booking", "subject_id": str(booking.pk), "amount": amount}


def test_change_the_machine_cannot_give_becomes_credit_with_consent(
    kiosk: Kiosk, card: Card, player: User, booking: Booking
) -> None:
    session = open_session(kiosk, card(player))
    kiosk.cash.stock = {LEU: 3, 5 * LEU: 0, 10 * LEU: 0, 50 * LEU: 0}
    quote = kiosk.ask("cash.quote", amount=HOUR_PRICE)
    assert quote["change_guaranteed"] is False  # the kiosk warns BEFORE any money (§8.3)
    checkout_id = start(kiosk, session, [hour(booking, 12000)], "credit")
    accepted = kiosk.insert(200 * LEU)
    finished = kiosk.post(f"/checkouts/{checkout_id}/finish", {"events": accepted}).json()
    change = kiosk.order(finished["dispense"])
    assert change["given"] == 3 * LEU  # all the machine had
    early = kiosk.post(f"/checkouts/{checkout_id}/settle", {"events": []})
    assert error_code(early) == "checkout.waiting_change"
    settled = kiosk.post(f"/checkouts/{checkout_id}/settle", {"events": [change["signed"]]}).json()
    assert settled["checkout"]["credited"] == 8000 - 300
    assert customer_credit(player) == 7700
    assert balance(cash_box(kiosk.device)) == 20000 - 300
    assert notices("change_not_given") == 0  # the customer agreed to it


def test_change_that_fails_without_consent_is_credited_and_reported(
    kiosk: Kiosk, card: Card, player: User, booking: Booking
) -> None:
    session = open_session(kiosk, card(player))
    checkout_id = start(kiosk, session, [hour(booking, 12000)], "normal")
    accepted = kiosk.insert(50 * LEU, 50 * LEU, 50 * LEU)
    finished = kiosk.post(f"/checkouts/{checkout_id}/finish", {"events": accepted}).json()
    kiosk.cash.fail("note_jam")
    jammed = kiosk.order(finished["dispense"])
    assert jammed["given"] == 0
    kiosk.post(f"/checkouts/{checkout_id}/settle", {"events": [jammed["signed"]]})
    assert customer_credit(player) == 3000
    assert notices("change_not_given") == 1


def test_exact_amount_only(kiosk: Kiosk, card: Card, player: User, booking: Booking) -> None:
    session = open_session(kiosk, card(player))
    checkout_id = start(kiosk, session, [hour(booking, 5000)], "exact")
    accepted = kiosk.insert(100 * LEU, 50 * LEU)  # the 100 goes back: it would need change
    assert [e["payload"]["amount"] for e in accepted] == [50 * LEU]
    assert kiosk.cash.returned == [100 * LEU]
    finished = kiosk.post(f"/checkouts/{checkout_id}/finish", {"events": accepted}).json()
    assert finished["dispense"] is None and finished["settled"]["checkout"]["status"] == "settled"
    # With bani in the amount, notes cannot pay it exactly.
    created = kiosk.post("/checkouts", {"card": session, "items": [hour(booking, 1234)]}).json()
    refused = kiosk.post(
        f"/checkouts/{created['id']}/start", {"card": session, "change_mode": "exact"}
    )
    assert error_code(refused) == "checkout.exact_impossible"


def test_cancelling_gives_the_money_back(
    kiosk: Kiosk, card: Card, player: User, booking: Booking
) -> None:
    session = open_session(kiosk, card(player))
    checkout_id = start(kiosk, session, [hour(booking)], "normal")
    accepted = kiosk.insert(50 * LEU, 10 * LEU)
    kiosk.post("/events", {"events": accepted})
    cancelled = kiosk.post(f"/checkouts/{checkout_id}/cancel", {"events": []}).json()
    assert kiosk.order(cancelled["stop"])["ok"]
    # Only one 10-lei note left for change: 10 comes back, the other 50 becomes credit.
    kiosk.cash.stock = {LEU: 0, 5 * LEU: 0, 10 * LEU: 1, 50 * LEU: 0}
    refund = kiosk.order(cancelled["refund"])
    assert refund["given"] == 10 * LEU  # the machine gives what it can
    done = kiosk.post(f"/checkouts/{checkout_id}/refunded", {"events": [refund["signed"]]}).json()
    assert done["credited"] == 5000 and customer_credit(player) == 5000
    assert kiosk.order(done["close"])["ok"]
    checkout = Checkout.objects.get(pk=checkout_id)
    assert checkout.status == CheckoutStatus.CANCELLED
    assert payments.money_status(payments.due_for_booking(booking)).to_pay == HOUR_PRICE
    assert notices("refund_not_given") == 1
    again = kiosk.post(f"/checkouts/{checkout_id}/refunded", {"events": []}).json()
    assert again["credited"] == 5000  # safe to repeat


def test_cancelling_before_any_money(
    kiosk: Kiosk, card: Card, player: User, booking: Booking
) -> None:
    session = open_session(kiosk, card(player))
    created = kiosk.post("/checkouts", {"card": session, "items": [hour(booking)]}).json()
    basket = kiosk.post(f"/checkouts/{created['id']}/cancel", {"events": []}).json()
    assert basket == {"stop": None, "refund": None, "close": None}
    checkout_id = start(kiosk, session, [hour(booking)], "normal")
    empty = kiosk.post(f"/checkouts/{checkout_id}/cancel", {"events": []}).json()
    assert empty["refund"] is None and kiosk.order(empty["stop"])["ok"]
    assert kiosk.order(empty["close"])["ok"]
    for path in ("cancel", "finish", "settle"):
        late = kiosk.post(f"/checkouts/{checkout_id}/{path}", {"events": []})
        assert error_code(late) == "checkout.state_invalid"


def test_a_refund_waits_for_the_machines_report(
    kiosk: Kiosk, card: Card, player: User, booking: Booking
) -> None:
    session = open_session(kiosk, card(player))
    checkout_id = start(kiosk, session, [hour(booking)], "normal")
    kiosk.post("/events", {"events": kiosk.insert(10 * LEU)})
    kiosk.post(f"/checkouts/{checkout_id}/cancel", {"events": []})
    waiting = kiosk.post(f"/checkouts/{checkout_id}/refunded", {"events": []})
    assert error_code(waiting) == "checkout.waiting_change"


def test_after_a_power_cut_the_money_becomes_credit(
    kiosk: Kiosk, card: Card, player: User, booking: Booking, tmp_path: Any
) -> None:
    session = open_session(kiosk, card(player))
    checkout_id = start(kiosk, session, [hour(booking)], "normal")
    accepted = kiosk.insert(100 * LEU)
    # The power goes before the page tells the server; at restart the bridge closes the
    # transaction and its journal still holds the note, signed.
    kiosk.bridge.journal.close()
    bridge = build(kiosk.bridge.settings, simulated(str(tmp_path)), clock.now)
    pending = [e.envelope for e in bridge.journal.pending()]
    recorded = kiosk.post("/events", {"events": pending}).json()["recorded"]
    assert len(recorded) == len(pending) == 3  # started, the note, interrupted
    checkout = Checkout.objects.get(pk=checkout_id)
    assert checkout.status == CheckoutStatus.INTERRUPTED
    assert (checkout.inserted, checkout.credited) == (10000, 10000)
    assert customer_credit(player) == 10000 and notices("interrupted") == 1
    # The page, reloaded, sends the note too: nothing is counted twice.
    kiosk.post("/events", {"events": accepted})
    assert customer_credit(player) == 10000
    assert kiosk.get(f"/checkouts/{checkout_id}").json()["status"] == "interrupted"
    # A second interruption report for a finished checkout changes nothing.
    assert CashEvent.objects.filter(checkout=checkout).count() == 3
    bridge.journal.close()


def test_late_and_unknown_money_is_kept_and_reported(
    kiosk: Kiosk, card: Card, player: User, booking: Booking
) -> None:
    session = open_session(kiosk, card(player))
    settled = kiosk.buy(session, [hour(booking, 5000)], [50 * LEU])
    checkout_id = settled["checkout"]["id"]
    # A note signed for this transaction after it ended (should not happen): the customer
    # gets it as credit, the manager is told.
    late = kiosk.bridge.journal.append(checkout_id, "cash.accepted", 10 * LEU)
    late_change = kiosk.bridge.journal.append(checkout_id, "cash.dispensed", LEU)
    kiosk.post("/events", {"events": [late.envelope, late_change.envelope]})
    assert customer_credit(player) == 1000
    assert notices("late_cash") == 1 and notices("late_change") == 1
    # Money for a transaction the server never saw.
    stranger = kiosk.bridge.journal.append("0" * 8 + "-unknown-txn", "cash.accepted", 20 * LEU)
    nothing = kiosk.bridge.journal.append("f" * 36, "cash.started", 0)
    kiosk.post("/events", {"events": [stranger.envelope, nothing.envelope]})
    assert balance(unidentified(kiosk.device.location)) == -2000
    assert notices("unknown_transaction") == 1


def test_the_amount_changed_before_the_money(
    kiosk: Kiosk, card: Card, player: User, booking: Booking, coffee: CafeProduct
) -> None:
    session = open_session(kiosk, card(player))
    created = kiosk.post("/checkouts", {"card": session, "items": [hour(booking)]}).json()
    # A partner pays part of the hour from their credit in the meantime.
    post(
        "credit",
        [
            (account(AccountKind.CASH, location=booking.location), 1000),
            (account(AccountKind.CUSTOMER_BALANCE, user=player), -1000),
        ],
        description="test credit",
        actor=SYSTEM,
    )
    payments.pay(
        SYSTEM,
        payments.due_for_booking(booking),
        payments.PaymentData(
            payer_id=player.pk, amount=1000, method="balance", idempotency_key="partner-1"
        ),
    )
    stale = kiosk.post(
        f"/checkouts/{created['id']}/start", {"card": session, "change_mode": "normal"}
    )
    assert error_code(stale) == "checkout.stale"
    cafe = {"kind": "cafe", "cafe_lines": [{"product_id": str(coffee.pk), "quantity": 1}]}
    created = kiosk.post("/checkouts", {"card": session, "items": [cafe]}).json()
    CafeProduct.objects.filter(pk=coffee.pk).update(price=1500)
    stale = kiosk.post(
        f"/checkouts/{created['id']}/start", {"card": session, "change_mode": "normal"}
    )
    assert error_code(stale) == "checkout.stale"
    CafeProduct.objects.filter(pk=coffee.pk).update(is_available=False)
    stale = kiosk.post(
        f"/checkouts/{created['id']}/start", {"card": session, "change_mode": "normal"}
    )
    assert error_code(stale) == "checkout.stale"
