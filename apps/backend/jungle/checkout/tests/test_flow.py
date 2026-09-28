"""§8.3 at the Payments Kiosk, end to end with the real Hardware Bridge (simulators): the
basket, the cash, the change, the fiscal receipt, and the ledger (R-060 … R-067)."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest

from jungle.accounts.models import User
from jungle.audit.models import ActorKind, AuditLog
from jungle.bookings.models import Booking
from jungle.cafe.models import CafeOrder, CafeProduct
from jungle.checkout.models import CashEvent, Checkout, CheckoutStatus
from jungle.checkout.services import cash_box
from jungle.checkout.tests.conftest import HOUR_PRICE, LEU, Kiosk
from jungle.ledger import payments
from jungle.ledger.models import Payment
from jungle.ledger.services import balance

pytestmark = pytest.mark.django_db
Card = Callable[[User], dict[str, Any]]


def booking_item(booking: Booking, amount: int | None = None) -> dict[str, Any]:
    return {"kind": "booking", "subject_id": str(booking.pk), "amount": amount}


def test_r060_r066_a_share_of_the_hour_and_a_coffee_in_cash_with_change(
    kiosk: Kiosk, card: Card, player: User, booking: Booking, coffee: CafeProduct
) -> None:
    session = kiosk.post("/session", {"card": card(player)}).json()
    assert session["first_name"] == "Ana"
    assert [p["to_pay"] for p in session["payables"]] == [HOUR_PRICE]
    split = kiosk.get(f"/bookings/{booking.pk}/split", parts=3).json()
    assert split["shares"] == [8000, 8000, 8000] and split["to_pay"] == HOUR_PRICE

    items = [
        booking_item(booking, 8000),
        {"kind": "cafe", "cafe_lines": [{"product_id": str(coffee.pk), "quantity": 2}]},
    ]
    settled = kiosk.buy({"session": session["session"]}, items, [50 * LEU, 50 * LEU, 10 * LEU])
    checkout = Checkout.objects.get(pk=settled["checkout"]["id"])
    assert checkout.status == CheckoutStatus.SETTLED
    assert (checkout.amount_due, checkout.inserted, checkout.dispensed) == (10400, 11000, 600)
    assert checkout.fiscal_receipt == "SIM-000001"
    assert settled["orders"] == [1]
    assert settled["receipt"]["payload"]["lines"][1] == {
        "name": "Espresso",
        "quantity": 2,
        "unit_price": 1200,
        "vat_group": "A",
    }
    # The ledger: the kiosk's own cash box holds what stayed in the machine.
    assert balance(cash_box(kiosk.device)) == 11000 - 600
    status = payments.money_status(payments.due_for_booking(booking))
    assert status.to_pay == HOUR_PRICE - 8000
    payment = Payment.objects.get(
        transaction__metadata__checkout=str(checkout.pk), transaction__kind="payment"
    )
    assert (payment.amount, payment.fiscal_receipt, payment.device_id) == (
        8000,
        "",
        kiosk.device.pk,
    )
    order = CafeOrder.objects.get()
    assert (order.total, order.customer_id, order.device_id) == (2400, player.pk, kiosk.device.pk)
    kinds = sorted(CashEvent.objects.filter(checkout=checkout).values_list("kind", flat=True))
    assert kinds == ["cash.accepted"] * 3 + ["cash.dispensed", "fiscal.printed"]
    settled_log = AuditLog.objects.get(action="checkout.settled")
    assert settled_log.actor_kind == ActorKind.DEVICE and settled_log.actor_user_id == player.pk
    # Settling again does not pay twice nor print a second receipt.
    again = kiosk.post(f"/checkouts/{checkout.pk}/settle", {"events": []}).json()
    assert again["receipt"] is None and Payment.objects.count() == 2  # the hour and the café


def test_r067_an_exact_payment_settles_at_once(
    kiosk: Kiosk, card: Card, player: User, booking: Booking
) -> None:
    settled = kiosk.buy(
        card(player), [booking_item(booking)], [200 * LEU, 10 * LEU, 10 * LEU, 10 * LEU, 10 * LEU]
    )
    assert settled["checkout"]["dispensed"] == 0 and settled["checkout"]["credited"] == 0
    assert payments.money_status(payments.due_for_booking(booking)).to_pay == 0
