"""Fixtures for the screens (§8.5): the league fixtures (a season, players who joined), a court,
an enrolled court screen and a lobby screen, bookings with check-ins on court."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import pytest
from django.test import Client

from jungle.accounts.models import User
from jungle.attendance.models import Scan, ScanKind
from jungle.bookings.models import Booking, SessionType
from jungle.devices import auth
from jungle.devices.models import Device, DeviceKind
from jungle.league.tests.conftest import (  # noqa: F401 (fixtures)
    join,
    kiosk,
    league_text,
    manager,
    new_season,
    now,
    season,
)
from jungle.locations.models import Location, Resource, ResourceKind

BASE = "/api/v1/device/screen"


class Screen:
    """A screen's browser: its device token, from the club's network by default."""

    def __init__(self, device: Device, ip: str = "10.0.0.20") -> None:
        secret = auth.new_secret()
        Device.objects.filter(pk=device.pk).update(token_hash=auth.hash_secret(secret))
        self.device = device
        self.token = f"{device.pk}.{secret}"
        self.ip = ip
        self.client = Client()

    def get(self, path: str = "/state") -> Any:
        return self.client.get(f"{BASE}{path}", HTTP_X_DEVICE_TOKEN=self.token, REMOTE_ADDR=self.ip)

    def post(self, path: str) -> Any:
        return self.client.post(
            f"{BASE}{path}", HTTP_X_DEVICE_TOKEN=self.token, REMOTE_ADDR=self.ip
        )

    def state(self) -> dict[str, Any]:
        response = self.get()
        assert response.status_code == 200, response.content
        return dict(response.json())


@pytest.fixture
def court(location: Location) -> Resource:
    return Resource.objects.create(
        location=location,
        slug="teren-4",
        name="Teren 4",
        kind=ResourceKind.PADEL_COURT,
        sort_order=4,
    )


@pytest.fixture
def court_screen(location: Location, court: Resource) -> Screen:
    return Screen(
        Device.objects.create(
            kind=DeviceKind.SCREEN, location=location, name="Ecran Teren 4", resource=court
        )
    )


@pytest.fixture
def lobby_screen(location: Location) -> Screen:
    return Screen(Device.objects.create(kind=DeviceKind.SCREEN, location=location, name="Lobby"))


def book(
    court: Resource,
    organizer: User,
    start: datetime,
    minutes: int = 90,
    session_type: str = SessionType.OFFICIAL_MATCH,
) -> Booking:
    return Booking.objects.create(
        location=court.location,
        resource=court,
        organizer=organizer,
        created_by=organizer,
        starts_at=start,
        ends_at=start + timedelta(minutes=minutes),
        session_type=session_type,
        price_total=0,
    )


def enter(booking: Booking, *players: User) -> None:
    """Check-ins on court, in this order."""
    for offset, player in enumerate(players):
        Scan.objects.create(
            user=player,
            location=booking.location,
            kind=ScanKind.COURT_ENTRY,
            resource=booking.resource,
            booking=booking,
            scanned_at=booking.starts_at + timedelta(seconds=offset),
        )
