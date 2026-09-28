"""The DEMO command for trying the League Kiosk (Stage 7)."""

from __future__ import annotations

import base64
import json
from io import StringIO
from pathlib import Path
from typing import Any

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from django.core.management import CommandError, call_command
from django.test import Client

from jungle.accounts.models import User
from jungle.bookings.models import Booking
from jungle.devices.models import Device
from jungle.league import services
from jungle.league.models import LeagueSeason, SeasonStatus
from jungle.locations.models import Resource

pytestmark = pytest.mark.django_db


def run(*args: str) -> dict[str, Any]:
    out = StringIO()
    call_command("kiosk_demo", *args, stdout=out, stderr=StringIO())
    result: dict[str, Any] = json.loads(out.getvalue())
    return result


@pytest.fixture
def seeded(time_machine: Any) -> None:
    time_machine.move_to("2027-04-05T12:00:00+03:00", tick=False)
    call_command("seed_initial", "--demo", stdout=StringIO(), stderr=StringIO())


def test_kiosk_demo_prepares_a_kiosk_players_and_a_finished_match(
    seeded: None, tmp_path: Path, settings: Any
) -> None:
    key = Ed25519PrivateKey.generate().public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    public_key = base64.b64encode(key).decode()
    result = run("--public-key", public_key)
    device = Device.objects.get(pk=result["device_id"])
    assert device.public_key == public_key and device.name == "Chioșc Ligă DEMO"
    assert LeagueSeason.objects.get(status=SeasonStatus.ACTIVE).name == result["season"]
    players = [User.objects.get(pk=p["id"]) for p in result["players"]]
    assert all(p.is_demo and services.is_playing(p) for p in players)
    newcomer = User.objects.get(pk=result["newcomer"]["id"])
    assert newcomer.is_demo and not services.is_playing(newcomer)
    assert Booking.objects.get(pk=result["booking"]["id"]).scans.count() == 4

    settings.KIOSK_ALLOW_LOOPBACK = True
    session = Client().post(
        "/api/v1/kiosk/league/session",
        {"card": {"token": result["players"][0]["card"]}},
        content_type="application/json",
        HTTP_X_DEVICE_TOKEN=result["device_token"],
    )
    assert session.status_code == 403  # the kiosk has a bridge: scans must be signed

    # Again (a demo the next day): the same people, a new token, a match on a free court.
    output = tmp_path / "demo.json"
    call_command("kiosk_demo", "--output", str(output), stdout=StringIO(), stderr=StringIO())
    again = json.loads(output.read_text())
    assert again["players"] == result["players"] and again["device_token"] != result["device_token"]
    assert again["booking"]["court"] != result["booking"]["court"]
    unsigned = Client().post(
        "/api/v1/kiosk/league/session",
        {"card": {"token": again["players"][0]["card"]}},
        content_type="application/json",
        HTTP_X_DEVICE_TOKEN=again["device_token"],
    )
    assert unsigned.status_code == 200
    assert len(unsigned.json()["score_chances"]) == 2


def test_kiosk_demo_refusals(time_machine: Any, settings: Any) -> None:
    time_machine.move_to("2027-04-05T12:00:00+03:00", tick=False)
    with pytest.raises(CommandError, match="seed_initial"):
        run()
    call_command("seed_initial", "--demo", stdout=StringIO(), stderr=StringIO())
    with pytest.raises(CommandError, match="devices.key_invalid"):
        run("--public-key", "nu-e-cheie")
    for _ in range(4):
        run()
    Resource.objects.filter(kind="padel_court").exclude(slug="teren-1").update(is_active=False)
    with pytest.raises(CommandError, match="every court is taken"):
        run()
    settings.IS_PRODUCTION_LIKE = True
    with pytest.raises(CommandError, match="development"):
        run()
