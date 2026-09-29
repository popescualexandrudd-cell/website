"""`manage.py screens_demo`: the court screen of §8.5, exactly (DEMO, never in production)."""

from __future__ import annotations

import json
from io import StringIO
from pathlib import Path
from typing import Any

import pytest
from django.core.management import CommandError, call_command
from django.test import override_settings

from jungle.bookings.models import Booking, BookingStatus
from jungle.core.errors import DomainError, ErrorCode
from jungle.devices.models import Device
from jungle.league.management.commands.kiosk_demo import Command as KioskDemo
from jungle.locations.models import Resource
from jungle.screens.tests.conftest import Screen

pytestmark = pytest.mark.django_db


def run(*args: str) -> dict[str, Any]:
    out = StringIO()
    call_command("screens_demo", *args, stdout=out, stderr=StringIO())
    result: dict[str, Any] = json.loads(out.getvalue())
    return result


@pytest.fixture
def seeded(time_machine: Any) -> None:
    time_machine.move_to("2027-04-05T14:43:00+03:00", tick=False)  # 47 min left (§8.5)
    call_command("seed_initial", "--demo", stdout=StringIO(), stderr=StringIO())


def screen(result: dict[str, Any], which: str) -> Screen:
    return Screen(Device.objects.get(pk=result[which]["device_id"]))


def test_the_court_screen_of_section_8_5(seeded: None, tmp_path: Path) -> None:
    result = run()
    state = screen(result, "court").state()
    current = state["court"]["current"]
    assert state["court"]["name"] == "Teren 4"
    assert (current["starts_at"][:16], current["ends_at"][:16]) == (
        "2027-04-05T11:00",  # 14:00 in Bucharest
        "2027-04-05T12:30",
    )
    assert (current["minutes"], current["session_type"]) == (90, "official_match")
    assert current["match_of_the_day"] is True
    shown = [
        [(p["name"], p["tier"], p["division"], p["lp"], p["level"]) for p in team]
        for team in current["teams"]
    ]
    assert shown == [
        [
            ("Popescu Alexandru Daniel", "diamond", "II", 67, 5.2),
            ("Moșteanu Rareș", "diamond", "III", 12, 5.0),
        ],
        [("Jucător 3", "platinum", "I", 88, 4.8), ("Jucător 4", "diamond", "IV", 40, 4.9)],
    ]
    assert state["court"]["next"] == {
        "starts_at": "2027-04-05T12:30:00Z",
        "session_type": "training",
    }
    lobby = screen(result, "lobby").state()
    assert lobby["kind"] == "lobby" and lobby["league"]["match_of_the_day_court"] == "Teren 4"
    assert result["players"][0] == "Popescu Alexandru Daniel"

    # Again: the same people, the demo bookings replaced, new tokens.
    target = tmp_path / "screens.json"
    call_command("screens_demo", output=str(target), stdout=StringIO(), stderr=StringIO())
    again = json.loads(target.read_text(encoding="utf-8"))
    assert again["court"]["device_id"] == result["court"]["device_id"]
    assert again["court"]["device_token"] != result["court"]["device_token"]
    assert Booking.objects.filter(pk=result["booking"]["id"], status=BookingStatus.CANCELLED)
    now_on_court = screen(again, "court").state()["court"]["current"]
    assert now_on_court["booking_id"] == again["booking"]["id"]


def test_refused_in_production_without_seed_or_on_a_taken_court(
    seeded: None, monkeypatch: pytest.MonkeyPatch, settings: Any
) -> None:
    with override_settings(IS_PRODUCTION_LIKE=True), pytest.raises(CommandError):
        run()
    court = Resource.objects.get(name="Teren 4")
    real = Booking.objects.filter(resource=court).exclude(organizer__is_demo=True)
    assert not real.exists()
    first = run()
    booking = Booking.objects.get(pk=first["booking"]["id"])
    booking.organizer.is_demo = False
    booking.organizer.save(update_fields=["is_demo"])  # as if a customer had booked it
    with pytest.raises(CommandError, match="taken"):
        run()

    def refuse(*args: Any) -> None:
        raise DomainError(ErrorCode.AUTH_FORBIDDEN, status=403)

    monkeypatch.setattr(KioskDemo, "_season", refuse)
    with pytest.raises(CommandError, match="auth.forbidden"):
        run()


def test_needs_the_initial_data(time_machine: Any) -> None:
    with pytest.raises(CommandError, match="seed_initial"):
        run()
