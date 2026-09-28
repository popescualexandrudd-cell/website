"""The café display (§8.7): the bar sees today's paid orders and taps them through; only an
active café display of the club, on the club's network, may do it."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest
from django.test import Client

from jungle.accounts.models import User
from jungle.audit.models import AuditLog
from jungle.cafe.models import CafeOrder, CafeProduct
from jungle.checkout.tests.conftest import Kiosk
from jungle.checkout.tests.test_kiosk_other import give_credit, session_of
from jungle.conftest import error_code
from jungle.devices import auth
from jungle.devices.models import Device, DeviceKind
from jungle.locations.models import Location

pytestmark = pytest.mark.django_db
BASE = "/api/v1/device/cafe"


class Display:
    def __init__(self, device: Device, ip: str = "10.0.0.9") -> None:
        secret = auth.new_secret()
        Device.objects.filter(pk=device.pk).update(token_hash=auth.hash_secret(secret))
        self.token = f"{device.pk}.{secret}"
        self.ip = ip
        self.client = Client()

    def get(self, path: str) -> Any:
        return self.client.get(f"{BASE}{path}", HTTP_X_DEVICE_TOKEN=self.token, REMOTE_ADDR=self.ip)

    def advance(self, order: CafeOrder, status: str) -> Any:
        return self.client.post(
            f"{BASE}/orders/{order.pk}/advance",
            {"status": status},
            content_type="application/json",
            HTTP_X_DEVICE_TOKEN=self.token,
            REMOTE_ADDR=self.ip,
        )


@pytest.fixture
def display(location: Location) -> Display:
    return Display(
        Device.objects.create(kind=DeviceKind.CAFE_DISPLAY, location=location, name="Bar")
    )


@pytest.fixture
def order(
    kiosk: Kiosk,
    card: Callable[[User], dict[str, Any]],
    player: User,
    coffee: CafeProduct,
    location: Location,
) -> CafeOrder:
    give_credit(player, location, 5000)
    item = {"kind": "cafe", "cafe_lines": [{"product_id": str(coffee.pk), "quantity": 2}]}
    body = {"card": session_of(kiosk, card(player)), "item": item, "idempotency_key": "cafe-1234"}
    assert kiosk.post("/pay-balance", body).status_code == 200
    return CafeOrder.objects.get()


def test_the_bar_taps_an_order_through(display: Display, order: CafeOrder) -> None:
    queue = display.get("/queue").json()
    assert [(o["number"], o["status"], o["total"]) for o in queue] == [(order.number, "new", 2400)]
    assert queue[0]["lines"] == [{"name": "Espresso", "unit_price": 1200, "quantity": 2}]
    assert error_code(display.advance(order, "ready")) == "cafe.invalid_transition"
    for status in ("preparing", "ready"):
        assert display.advance(order, status).json()["status"] == status
    assert display.get("/queue").json()[0]["ready_at"] is not None
    assert display.advance(order, "picked_up").json()["status"] == "picked_up"
    assert display.get("/queue").json() == []  # picked up: off the screen
    order.refresh_from_db()
    assert order.picked_up_at is not None
    advanced = AuditLog.objects.filter(action="cafe.order_advanced")
    assert advanced.count() == 3 and advanced.first().actor_device_id is not None  # type: ignore[union-attr]


def test_only_a_cafe_display_on_the_club_network(
    display: Display, order: CafeOrder, kiosk: Kiosk, location: Location
) -> None:
    other_club = Location.objects.create(slug="alt", name="Alt")
    elsewhere = Display(
        Device.objects.create(kind=DeviceKind.CAFE_DISPLAY, location=other_club, name="Bar 2")
    )
    assert error_code(elsewhere.advance(order, "preparing")) == "cafe.order_not_found"
    assert elsewhere.get("/queue").json() == []
    outside = Display(
        Device.objects.get(kind=DeviceKind.CAFE_DISPLAY, location=location), "8.8.8.8"
    )
    assert error_code(outside.get("/queue")) == "auth.forbidden"
    assert Client().get(f"{BASE}/queue").status_code == 401
    payments = Client().get(
        f"{BASE}/queue", HTTP_X_DEVICE_TOKEN=kiosk.token, REMOTE_ADDR=kiosk.ip
    )  # a Payments Kiosk is not a café display
    assert error_code(payments) == "auth.forbidden"
    assert AuditLog.objects.filter(action="cafe.display_refused").count() == 2
    assert outside.advance(order, "cooking").status_code == 422  # checked before the device
