"""The Payments Kiosk's staff mode (§8.3, Q54): the PIN, card + PIN at the kiosk, and the cash
box operations the bridge carries out and signs (refill, empty, count, Z report, R-064)."""

from __future__ import annotations

import uuid
from collections.abc import Callable
from datetime import timedelta
from typing import Any

import pytest
from django.test import Client

from jungle.accounts.models import User, UserRole
from jungle.attendance.models import StaffNotice
from jungle.audit.models import AuditLog
from jungle.bookings.models import Booking
from jungle.checkout.models import CashOperation, KioskPin
from jungle.checkout.services import cash_box, safe
from jungle.checkout.tests.conftest import HOUR_PRICE, LEU, Kiosk
from jungle.conftest import error_code, grant, login_as, set_config
from jungle.core.permissions import Role
from jungle.ledger.services import balance
from jungle.locations.models import Location

pytestmark = pytest.mark.django_db
Card = Callable[[User], dict[str, Any]]
PIN = "480913"
PIN_URL = "/api/v1/staff/kiosk-pin"


@pytest.fixture
def cashier(make_user: Callable[..., User], location: Location, client: Client) -> User:
    """Reception staff with a PIN (set through the API, logged in with 2FA)."""
    user = make_user(first_name="Radu")
    grant(user, Role.RECEPTION, location)
    login_as(client, user)
    response = client.post(PIN_URL, {"pin": PIN}, content_type="application/json")
    assert response.json() == {"ok": True}
    return user


def staff_token(kiosk: Kiosk, card: Card, user: User, pin: str = PIN) -> Any:
    return kiosk.post("/staff/login", {"card": card(user), "pin": pin})


def login(kiosk: Kiosk, card: Card, user: User) -> str:
    response = staff_token(kiosk, card, user)
    assert response.status_code == 200, response.json()
    return str(response.json()["token"])


def run(
    kiosk: Kiosk, token: str, kind: str, notes: dict[str, int] | None = None, now: Any = None
) -> Any:
    """Starts an operation, lets the bridge do it and sends back what it signed."""
    if now is not None:
        now.shift(timedelta(minutes=1))
    started = kiosk.post("/staff/operations", {"token": token, "kind": kind, "notes": notes})
    assert started.status_code == 201, started.json()
    done = kiosk.order(started.json()["command"])
    assert "signed" in done, done
    kiosk.post("/events", {"events": [done["signed"]]})
    return CashOperation.objects.get(pk=started.json()["operation"]["id"])


# ---------------------------------------------------------------- the PIN
def test_q54_only_cash_staff_with_2fa_set_a_pin(
    client: Client, make_user: Callable[..., User], location: Location
) -> None:
    def status(pin: str) -> str:
        return error_code(client.post(PIN_URL, {"pin": pin}, content_type="application/json"))

    coach = make_user()
    grant(coach, Role.COACH, location)
    login_as(client, coach)
    assert status(PIN) == "checkout.staff_only"
    reception = make_user()
    grant(reception, Role.RECEPTION, location)
    login_as(client, reception, mfa=False)
    assert status(PIN) == "checkout.staff_only"
    login_as(client, reception)
    for weak in ("111111", "123456", "987654", "12a456"):
        assert status(weak) == "checkout.pin_format", weak
    assert client.post(PIN_URL, {"pin": PIN}, content_type="application/json").status_code == 200
    assert KioskPin.objects.get(user=reception).pin_hash != PIN
    assert AuditLog.objects.filter(action="checkout.pin_set").count() == 1


def test_q54_card_and_pin_at_the_kiosk(
    kiosk: Kiosk, card: Card, cashier: User, player: User, make_user: Callable[..., User], now: Any
) -> None:
    assert error_code(staff_token(kiosk, card, player)) == "checkout.staff_only"
    no_pin = make_user()
    grant(no_pin, Role.MANAGER)
    assert error_code(staff_token(kiosk, card, no_pin)) == "checkout.pin_wrong"
    set_config("checkout.pin_max_failures", 3)
    for _ in range(3):
        assert error_code(staff_token(kiosk, card, cashier, "000001")) == "checkout.pin_wrong"
    locked = staff_token(kiosk, card, cashier)  # even the right PIN, for 15 minutes
    assert error_code(locked) == "checkout.pin_locked"
    assert locked.json()["error"]["params"] == {"minutes": 15}
    now.shift(timedelta(minutes=15, seconds=1))
    token = login(kiosk, card, cashier)
    assert KioskPin.objects.get(user=cashier).failures == 0
    problems = sorted(
        (a.after or {})["problem"] for a in AuditLog.objects.filter(action="checkout.staff_refused")
    )
    assert problems == ["no_role", "pin", "pin", "pin", "pin", "pin"]
    assert kiosk.post("/staff/operations/list", {"token": token}).json() == []
    # The session ends at logout, or when the role is taken away.
    assert kiosk.post("/staff/logout", {"token": token}).status_code == 204
    expired = kiosk.post("/staff/operations/list", {"token": token})
    assert error_code(expired) == "devices.session_expired"
    token = login(kiosk, card, cashier)
    UserRole.objects.filter(user=cashier).delete()
    expired = kiosk.post("/staff/operations/list", {"token": token})
    assert error_code(expired) == "devices.session_expired"


def test_a_successful_pin_clears_the_failures(kiosk: Kiosk, card: Card, cashier: User) -> None:
    assert error_code(staff_token(kiosk, card, cashier, "000001")) == "checkout.pin_wrong"
    assert KioskPin.objects.get(user=cashier).failures == 1
    login(kiosk, card, cashier)
    assert KioskPin.objects.get(user=cashier).failures == 0


# ---------------------------------------------------------------- the operations
def test_r064_refill_count_empty_and_the_day_close(
    kiosk: Kiosk,
    card: Card,
    cashier: User,
    player: User,
    booking: Booking,
    location: Location,
    now: Any,
) -> None:
    token = login(kiosk, card, cashier)
    box, vault = cash_box(kiosk.device), safe(location)
    # The machine starts with change nobody recorded: the first count finds the difference.
    first = run(kiosk, token, "count", None, now)
    start_amount = 20 * (1 + 5 + 10 + 50) * LEU
    assert (first.amount, first.ledger_amount, first.difference) == (start_amount, 0, start_amount)
    notice = StaffNotice.objects.get(kind="checkout.cash_attention")
    assert notice.payload["problem"] == "count_difference"
    # Refilling moves money from the safe into the box.
    refill = run(kiosk, token, "refill", {"100": 10, "500": 4}, now)
    assert refill.amount == 3000 and refill.requested == {"notes": {"100": 10, "500": 4}}
    assert (balance(box), balance(vault)) == (3000, -3000)
    # A customer pays 240 RON with a 200 and four 10s: the 200 goes to the cassette, the 10s
    # stay in the recycler as change.
    kiosk.buy(
        card(player),
        [{"kind": "booking", "subject_id": str(booking.pk)}],
        [200 * LEU, 10 * LEU, 10 * LEU, 10 * LEU, 10 * LEU],
    )
    assert balance(box) == 3000 + HOUR_PRICE
    emptied = run(kiosk, token, "empty", None, now)
    assert emptied.amount == 200 * LEU and balance(box) == 3000 + 40 * LEU
    counted = run(kiosk, token, "count", None, now)
    assert counted.difference == start_amount  # the unrecorded change is still there
    # After the manager records the unexplained change, the count matches.
    from jungle.audit.services import SYSTEM
    from jungle.ledger.models import TransactionKind
    from jungle.ledger.services import post

    post(
        TransactionKind.TRANSFER,
        [(box, start_amount), (vault, -start_amount)],
        description="Rest inițial înregistrat",
        actor=SYSTEM,
    )
    matched = run(kiosk, token, "count", None, now)
    assert matched.difference == 0
    assert StaffNotice.objects.filter(kind="checkout.cash_attention").count() == 2
    closed = run(kiosk, token, "day_close", None, now)
    assert closed.result["day"] == {
        "received": HOUR_PRICE,
        "change_given": 0,
        "moved_to_or_from_safe": 3000 - 200 * LEU + start_amount,
        "in_box": 3000 + 40 * LEU + start_amount,
    }
    assert closed.result["number"]
    listed = kiosk.post("/staff/operations/list", {"token": token}).json()
    assert [op["kind"] for op in listed] == [
        "day_close",
        "count",
        "count",
        "empty",
        "refill",
        "count",
    ]
    audit = AuditLog.objects.filter(action="checkout.cash_operation")
    assert {a.actor_user_id for a in audit} == {cashier.pk}


@pytest.mark.parametrize(
    "notes",
    [None, {}, {"200": 5}, {"abc": 5}, {"100": 0}, {"100": 501}],
)
def test_a_refill_needs_valid_notes(
    kiosk: Kiosk, card: Card, cashier: User, notes: dict[str, int] | None
) -> None:
    token = login(kiosk, card, cashier)
    body = {"token": token, "kind": "refill", "notes": notes}
    assert error_code(kiosk.post("/staff/operations", body)) == "checkout.operation_invalid"


def test_an_unknown_operation_kind(kiosk: Kiosk, card: Card, cashier: User) -> None:
    from django.test import RequestFactory

    from jungle.checkout import cashbox
    from jungle.core.errors import DomainError

    token = login(kiosk, card, cashier)
    assert kiosk.post("/staff/operations", {"token": token, "kind": "rob"}).status_code == 422
    request = RequestFactory().get("/", REMOTE_ADDR=kiosk.ip)
    request.auth = kiosk.device  # type: ignore[attr-defined]
    with pytest.raises(DomainError, match="operation_invalid"):
        cashbox.start(request, token, "rob")


def test_events_that_do_not_fit_the_operation(
    kiosk: Kiosk, card: Card, cashier: User, location: Location
) -> None:
    token = login(kiosk, card, cashier)
    started = kiosk.post(
        "/staff/operations", {"token": token, "kind": "refill", "notes": {"100": 1}}
    )
    operation_id = started.json()["operation"]["id"]
    done = kiosk.order(started.json()["command"])
    kiosk.post("/events", {"events": [done["signed"]]})
    wrong = kiosk.bridge.journal.append(operation_id, "cash.counted", 0)
    again = kiosk.bridge.journal.append(operation_id, "cash.refilled", 100)
    kiosk.post("/events", {"events": [wrong.envelope, again.envelope]})
    problems = [
        n.payload["problem"] for n in StaffNotice.objects.filter(kind="checkout.cash_attention")
    ]
    assert problems == ["unexpected_operation_event", "unexpected_operation_event"]
    assert balance(cash_box(kiosk.device)) == 100  # moved once
    # Money for an operation the server does not know is recorded and reported.
    lost = kiosk.bridge.journal.append(str(uuid.uuid4()), "cash.refilled", 500)
    kiosk.post("/events", {"events": [lost.envelope]})
    assert balance(cash_box(kiosk.device)) == 600
    assert StaffNotice.objects.filter(kind="checkout.cash_attention").count() == 3
    assert balance(safe(location)) == -100
