"""A Payments Kiosk in the tests: the real Hardware Bridge code with its simulators plays the
machine (it signs scans and cash events with its own key and checks the server's commands),
and the kiosk page is played by these helpers, calling the API with the device token."""

from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import Callable, Iterator
from datetime import date
from pathlib import Path
from typing import Any

import pytest
from django.test import Client
from jungle_bridge import config as bridge_config
from jungle_bridge.bridge import Bridge
from jungle_bridge.drivers.simulator import SimCash, simulated
from jungle_bridge.server import build

from jungle.accounts.models import User
from jungle.audit.services import SYSTEM
from jungle.bookings.models import Booking, SessionType
from jungle.cafe.models import CafeCategory, CafeProduct
from jungle.cards import services as cards
from jungle.core import clock
from jungle.devices import auth, commands
from jungle.devices.models import Device, DeviceKind
from jungle.locations.models import Location, Resource, ResourceKind

BASE = "/api/v1/kiosk/payments"
LEU = 100
HOUR_PRICE = 24000  # 240 RON for 90 minutes (demo value)


class Kiosk:
    def __init__(self, device: Device, tmp_path: Path, ip: str = "10.0.0.7") -> None:
        secret = auth.new_secret()
        self.loop = asyncio.new_event_loop()
        settings = bridge_config.load(
            {
                "BRIDGE_DEVICE_ID": str(device.pk),
                "BRIDGE_DATA_DIR": str(tmp_path / f"bridge-{device.pk}"),
                "BRIDGE_ALLOWED_ORIGINS": "http://localhost:5175",
                "BRIDGE_SERVER_PUBLIC_KEY": commands.public_key(),
                "BRIDGE_SIMULATOR_CONTROL": "1",
            }
        )
        self.bridge: Bridge = build(settings, simulated(str(tmp_path)), clock.now)
        Device.objects.filter(pk=device.pk).update(
            token_hash=auth.hash_secret(secret), public_key=self.bridge.signer.public_key
        )
        device.refresh_from_db()
        self.device = device
        self.token = f"{device.pk}.{secret}"
        self.ip = ip
        self.client = Client()
        self.pushed: list[dict[str, Any]] = []
        self.bridge.clients.add(self._receive)

    async def _receive(self, text: str) -> None:
        self.pushed.append(json.loads(text))

    @property
    def cash(self) -> SimCash:
        cash = self.bridge.devices.cash
        assert isinstance(cash, SimCash)
        return cash

    # the API, as the kiosk page calls it
    def post(self, path: str, body: Any = None) -> Any:
        return self.client.post(
            f"{BASE}{path}",
            json.dumps(body or {}, default=str),
            content_type="application/json",
            HTTP_X_DEVICE_TOKEN=self.token,
            REMOTE_ADDR=self.ip,
        )

    def get(self, path: str, **params: Any) -> Any:
        return self.client.get(
            f"{BASE}{path}", params, HTTP_X_DEVICE_TOKEN=self.token, REMOTE_ADDR=self.ip
        )

    # the machine
    def run(self, seconds: float = 0.01) -> None:
        self.loop.run_until_complete(asyncio.sleep(seconds))

    def ask(self, op: str, **fields: Any) -> dict[str, Any]:
        reply = self.loop.run_until_complete(
            self.bridge.handle(json.dumps({"op": op, **fields}, default=str))
        )
        self.run()
        return reply

    def order(self, command: dict[str, Any]) -> dict[str, Any]:
        """Passes a command the server signed to the bridge, as the page does."""
        return self.ask(str(command["payload"]["type"]), command=command)

    def scan(self, token: str) -> dict[str, Any]:
        return {"signed": self.bridge.signer.sign("scan", code=token)}

    def insert(self, *notes: int) -> list[dict[str, Any]]:
        """Notes pushed into the acceptor; returns the signed events the bridge pushed."""
        before = len(self.pushed)
        for value in notes:
            self.cash.insert(value)
            self.run()
        return [e["signed"] for e in self.pushed[before:] if e.get("event") == "cash.accepted"]

    def close(self) -> None:
        if self.bridge.collecting is not None:
            self.bridge.collecting.cancel()
            self.run()
        self.bridge.journal.close()
        self.loop.close()

    # a whole purchase, the happy path
    def buy(self, card: dict[str, Any], items: list[dict[str, Any]], notes: list[int]) -> Any:
        if "signed" in card:  # a signed scan is good once: the page opens a session with it
            card = {"session": self.post("/session", {"card": card}).json()["session"]}
        created = self.post("/checkouts", {"card": card, "items": items}).json()
        started = self.post(
            f"/checkouts/{created['id']}/start", {"card": card, "change_mode": "normal"}
        ).json()
        assert "command" in started, started
        assert self.order(started["command"])["ok"]
        accepted = self.insert(*notes)
        finished = self.post(f"/checkouts/{created['id']}/finish", {"events": accepted}).json()
        if finished["dispense"] is not None:
            change = self.order(finished["dispense"])
            settled = self.post(
                f"/checkouts/{created['id']}/settle", {"events": [change["signed"]]}
            ).json()
        else:
            settled = finished["settled"]
        printed = self.order(settled["receipt"])
        self.post("/events", {"events": [printed["signed"]]})
        assert self.order(settled["close"])["ok"]
        return settled


@pytest.fixture
def now(time_machine: Any) -> Any:
    time_machine.move_to("2027-04-05T18:00:00+03:00", tick=False)
    return time_machine


@pytest.fixture
def kiosk_device(location: Location) -> Device:
    return Device.objects.create(
        kind=DeviceKind.PAYMENTS_KIOSK, location=location, name="Chioșc Plăți 1"
    )


@pytest.fixture
def kiosk(kiosk_device: Device, tmp_path: Path, now: Any) -> Iterator[Kiosk]:
    built = Kiosk(kiosk_device, tmp_path)
    yield built
    built.close()


@pytest.fixture
def court(location: Location) -> Resource:
    return Resource.objects.create(
        location=location, slug="teren-1", name="Teren 1", kind=ResourceKind.PADEL_COURT
    )


@pytest.fixture
def player(make_user: Callable[..., User]) -> User:
    return make_user(first_name="Ana", last_name="Pop", date_of_birth=date(1990, 1, 1))


@pytest.fixture
def card(kiosk: Kiosk) -> Callable[[User], dict[str, Any]]:
    tokens: dict[uuid.UUID, str] = {}

    def factory(user: User) -> dict[str, Any]:
        if user.pk not in tokens:
            tokens[user.pk] = cards.issue_card(SYSTEM, user).token
        return kiosk.scan(tokens[user.pk])

    return factory


@pytest.fixture
def booking(court: Resource, player: User) -> Booking:
    from jungle.league.tests.conftest import at

    return Booking.objects.create(
        location=court.location,
        resource=court,
        organizer=player,
        created_by=player,
        starts_at=at("2027-04-05 19:00"),
        ends_at=at("2027-04-05 20:30"),
        session_type=SessionType.FREE_RENTAL,
        price_total=HOUR_PRICE,
    )


@pytest.fixture
def coffee(location: Location) -> CafeProduct:
    category = CafeCategory.objects.create(location=location, name_ro="Cafea", name_en="Coffee")
    return CafeProduct.objects.create(
        location=location, category=category, name_ro="Espresso", name_en="Espresso", price=1200
    )
