"""Live updates (ADR-0005): a one-time ticket opens the screen's WebSocket; after a change is
committed, the screens of that location hear "changed" and reload their state."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

import pytest
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.test import override_settings

from jungle.accounts.models import User
from jungle.asgi import application
from jungle.bookings.models import SessionType
from jungle.cafe.models import CafeOrder
from jungle.core import clock
from jungle.devices.models import Device, DeviceKind
from jungle.league import store
from jungle.league.models import LeagueSeason, MatchOfTheDay
from jungle.league.tests.conftest import at
from jungle.ledger.models import LedgerTransaction
from jungle.locations.models import Location, Resource
from jungle.screens import realtime, signals
from jungle.screens.tests.conftest import book, enter

pytestmark = pytest.mark.django_db
MEMORY = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}


@pytest.fixture(autouse=True)
def _memory_layer() -> Any:
    with override_settings(CHANNEL_LAYERS=MEMORY):
        yield


def communicator(ticket: str) -> WebsocketCommunicator:
    return WebsocketCommunicator(application, f"/ws/screens/?ticket={ticket}")


def test_adr0005_a_ticket_opens_the_live_connection_once(location: Location) -> None:
    device = Device.objects.create(kind=DeviceKind.SCREEN, location=location, name="Lobby")
    ticket = realtime.issue_ticket(device)

    async def scenario() -> None:
        screen = communicator(ticket)
        connected, _ = await screen.connect()
        assert connected
        assert await screen.receive_json_from() == {"type": "hello"}
        await screen.send_json_to({"type": "ping"})
        assert await screen.receive_json_from() == {"type": "pong"}
        await screen.send_json_to(["not", "a", "ping"])
        await screen.send_json_to({"type": "other"})
        assert await screen.receive_nothing()
        layer = get_channel_layer()
        await layer.group_send(realtime.group(location.pk), {"type": "screens.changed"})
        assert await screen.receive_json_from() == {"type": "changed", "topic": ""}
        await layer.group_send(
            realtime.group("another-location"), {"type": "screens.changed", "topic": "cafe"}
        )
        assert await screen.receive_nothing()  # only its own location
        await screen.disconnect()

        again = communicator(ticket)  # a ticket is good once
        assert await again.connect() == (False, 4401)

    async_to_sync(scenario)()


@pytest.mark.parametrize("path", ["/ws/screens/", "/ws/screens/?ticket=", "/ws/screens/?x"])
def test_without_a_valid_ticket_the_connection_is_refused(path: str) -> None:
    async def scenario() -> None:
        screen = WebsocketCommunicator(application, path)
        assert await screen.connect() == (False, 4401)

    async_to_sync(scenario)()


def test_a_refused_connection_leaves_no_group() -> None:
    consumer = realtime.ScreenConsumer()
    consumer.disconnect(4401)  # never joined a location's group: nothing to leave
    assert consumer.location == ""


def test_tickets_are_short_and_single_use(location: Location) -> None:
    device = Device.objects.create(kind=DeviceKind.SCREEN, location=location, name="Lobby")
    ticket = realtime.issue_ticket(device)
    assert realtime.redeem("x" * 65) is None
    assert realtime.redeem(ticket) == {"device": str(device.pk), "location": str(location.pk)}
    assert realtime.redeem(ticket) is None


class Layer:
    def __init__(self, fail: bool = False) -> None:
        self.sent: list[tuple[str, dict[str, Any]]] = []
        self.fail = fail

    async def group_send(self, group: str, message: dict[str, Any]) -> None:
        if self.fail:
            raise ConnectionError("redis is away")
        self.sent.append((group, message))


def test_changes_are_announced_after_the_commit_only(
    location: Location,
    monkeypatch: pytest.MonkeyPatch,
    django_capture_on_commit_callbacks: Callable[..., Any],
    caplog: pytest.LogCaptureFixture,
) -> None:
    layer = Layer()
    monkeypatch.setattr(realtime, "get_channel_layer", lambda: layer)
    with django_capture_on_commit_callbacks(execute=False) as waiting:
        realtime.changed(location.pk, "bookings")
        realtime.changed(None, "league")  # no location: nothing to tell
    assert layer.sent == [] and len(waiting) == 1  # not before the commit
    waiting[0]()
    assert layer.sent == [
        (f"screens.{location.pk}", {"type": "screens.changed", "topic": "bookings"})
    ]
    layer.fail = True
    with caplog.at_level(logging.WARNING), django_capture_on_commit_callbacks(execute=True):
        realtime.changed(location.pk, "cafe")  # the write goes on; the screens refresh anyway
    assert "could not announce" in caplog.text


def test_what_makes_the_screens_reload(
    season: LeagueSeason,
    join: Callable[..., User],
    location: Location,
    court: Resource,
    manager: User,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    heard: list[tuple[str, str]] = []
    monkeypatch.setattr(signals, "changed", lambda where, topic: heard.append((str(where), topic)))
    here = str(location.pk)
    player = join()
    heard.clear()
    booking = book(court, player, at("2027-04-05 08:30"), 60, SessionType.FREE_RENTAL)
    assert heard == [(here, "bookings")]
    enter(booking, player)
    assert heard[-1] == (here, "players")
    MatchOfTheDay.objects.create(
        location=location,
        day=clock.today_local(),
        booking=booking,
        chosen_by=manager,
        reason="Derby",
        created_at=clock.now(),
    )
    assert heard[-1] == (here, "league")
    CafeOrder.objects.create(
        location=location,
        day=clock.today_local(),
        number=1,
        total=1200,
        transaction=LedgerTransaction.objects.create(
            kind="sale", description="café", actor={}, created_at=clock.now()
        ),
        created_at=clock.now(),
    )
    assert heard[-1] == (here, "cafe")
    heard.clear()
    store.rebuild(season)  # every applied league event saves the snapshot
    assert (here, "league") in heard
    other = book(court, player, at("2027-04-05 18:00"), 60, SessionType.FREE_RENTAL)
    heard.clear()
    other.delete()
    assert heard == [(here, "bookings")]
