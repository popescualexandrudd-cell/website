"""The panel's money reads (§8.6, ADR-0009): the day's transactions with their entries and
corrections (reverse entries only), the cash of each Payments Kiosk and the safe with the staff
operations and day closes (R-064), the vouchers issued, the café's whole menu."""

from __future__ import annotations

from collections.abc import Callable
from datetime import date
from typing import Any

import pytest

from jungle.accounts.models import User
from jungle.audit.models import ActorKind
from jungle.audit.services import SYSTEM, Actor
from jungle.cafe.models import CafeCategory, CafeProduct
from jungle.checkout.models import CashOperation, OperationKind
from jungle.checkout.services import cash_box, safe
from jungle.conftest import CLUB_NOW, Api, error_code
from jungle.core import clock
from jungle.core.permissions import Role
from jungle.devices.models import Device, DeviceKind
from jungle.ledger import services as ledger
from jungle.ledger.models import AccountKind, TransactionKind
from jungle.rewards.models import Voucher

pytestmark = pytest.mark.django_db


def test_adr0009_the_days_transactions_with_their_corrections(
    api: Api, staff: Callable[..., User], club: Any, time_machine: Any
) -> None:
    manager = staff(Role.MANAGER, club.location)
    box = ledger.account(AccountKind.CASH, location=club.location, category="safe")
    revenue = ledger.account(AccountKind.REVENUE, location=club.location, category="cafe")
    who = Actor(kind=ActorKind.USER, user_id=manager.pk, label="Manager Club")
    sale = ledger.post(
        TransactionKind.SALE,
        [(box, 1500), (revenue, -1500)],
        description="Cafenea",
        actor=who,
        location=club.location,
    )
    time_machine.move_to("2027-03-15T09:05:00+02:00", tick=False)
    ledger.reverse_as(who, sale, "greșeală la casă")
    time_machine.move_to("2027-03-14T20:00:00+02:00", tick=False)  # yesterday: not listed
    ledger.post(
        TransactionKind.SALE,
        [(box, 700), (revenue, -700)],
        description="Ieri",
        actor=SYSTEM,
        location=club.location,
    )
    time_machine.move_to(CLUB_NOW, tick=False)
    day = clock.today_local()
    found = api.get(f"/staff/panel/transactions?location_id={club.location.pk}&day={day}").json()
    assert [t["kind"] for t in found] == ["reversal", "sale"]
    reversal, original = found
    assert original["reversed"] is True and reversal["reverses_id"] == original["id"]
    assert reversal["reason"] == "greșeală la casă" and original["actor"] == "Manager Club"
    assert {e["kind"]: e["amount"] for e in original["entries"]} == {"cash": 1500, "revenue": -1500}


def test_r064_the_cash_of_the_kiosks_and_the_safe(
    api: Api, staff: Callable[..., User], club: Any
) -> None:
    manager = staff(Role.MANAGER, club.location)
    kiosk = Device.objects.create(
        kind=DeviceKind.PAYMENTS_KIOSK, location=club.location, name="Chioșc Plăți 1"
    )
    Device.objects.create(kind=DeviceKind.SCREEN, location=club.location, name="Ecran")
    revenue = ledger.account(AccountKind.REVENUE, location=club.location, category="padel")
    ledger.post(
        TransactionKind.PAYMENT,
        [(cash_box(kiosk), 10000), (revenue, -10000)],
        description="Plată",
        actor=SYSTEM,
        location=club.location,
    )
    ledger.post(
        TransactionKind.TRANSFER,
        [(cash_box(kiosk), -4000), (safe(club.location), 4000)],
        description="Golire",
        actor=SYSTEM,
        location=club.location,
    )
    CashOperation.objects.create(
        device=kiosk,
        location=club.location,
        kind=OperationKind.DAY_CLOSE,
        staff=manager,
        amount=6000,
        ledger_amount=6000,
        difference=0,
        result={"z_number": 12},
        created_at=clock.now(),
        completed_at=clock.now(),
    )
    found = api.get(f"/staff/panel/cash?location_id={club.location.pk}").json()
    assert found["safe"] == 4000
    assert found["kiosks"] == [
        {
            "device_id": str(kiosk.pk),
            "name": "Chioșc Plăți 1",
            "is_active": True,
            "in_box": 6000,
            "received_today": 10000,
            "change_given_today": 0,
            "moved_today": -4000,
        }
    ]
    assert found["operations"][0]["kind"] == "day_close"
    assert found["operations"][0]["result"] == {"z_number": 12}
    missing = api.get("/staff/panel/cash?location_id=00000000-0000-0000-0000-000000000000")
    assert missing.status_code == 403  # no role there: refused before anything is looked up


def test_the_cash_of_a_location_that_does_not_exist(
    api: Api, staff: Callable[..., User], club: Any
) -> None:
    staff(Role.ADMIN)  # everywhere
    missing = api.get("/staff/panel/cash?location_id=00000000-0000-0000-0000-000000000000")
    assert error_code(missing) == "locations.not_found"


def test_vouchers_and_the_whole_cafe_menu(
    api: Api, staff: Callable[..., User], club: Any, make_user: Callable[..., User]
) -> None:
    staff(Role.MANAGER, club.location)
    holder = make_user(first_name="Ana", last_name="Pop")
    for code, status in (("A1", "active"), ("B2", "cancelled")):
        Voucher.objects.create(
            code=code,
            holder=holder,
            kind="amount",
            value=5000,
            target="any",
            valid_from=date(2027, 3, 15),
            valid_until=date(2027, 6, 15),
            source="manual",
            reason="compensație",
            status=status,
            issued_at=clock.now(),
        )
    where = f"location_id={club.location.pk}"
    found = api.get(f"/staff/panel/vouchers?{where}").json()
    assert {v["code"] for v in found} == {"A1", "B2"} and found[0]["holder"] == "Pop Ana"
    assert [v["code"] for v in api.get(f"/staff/panel/vouchers?{where}&status=active").json()] == [
        "A1"
    ]
    drinks = CafeCategory.objects.create(
        location=club.location, name_ro="Băuturi", name_en="Drinks"
    )
    for name, available, order in (("Limonadă", False, 2), ("Espresso", True, 1)):
        CafeProduct.objects.create(
            location=club.location,
            category=drinks,
            name_ro=name,
            name_en=name,
            price=1200,
            is_available=available,
            sort_order=order,
        )
    menu = api.get(f"/staff/panel/cafe/menu?{where}").json()
    assert [p["name_ro"] for p in menu[0]["products"]] == ["Espresso", "Limonadă"]
    assert menu[0]["products"][1]["is_available"] is False


def test_each_money_read_needs_its_permission(
    api: Api, staff: Callable[..., User], club: Any
) -> None:
    staff(Role.COACH, club.location)
    where = f"location_id={club.location.pk}"
    for path in (f"transactions?{where}&day=2027-03-15", f"cash?{where}", f"vouchers?{where}"):
        assert error_code(api.get(f"/staff/panel/{path}")) == "auth.forbidden"
    assert error_code(api.get(f"/staff/panel/cafe/menu?{where}")) == "auth.forbidden"
