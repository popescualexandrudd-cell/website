"""`manage.py panel_demo`: demo staff passwords without 2FA (their first sign-in sets it up) and
demo bookings tomorrow, for trying the admin panel; never in production."""

from __future__ import annotations

import json
from io import StringIO
from pathlib import Path
from typing import Any

import pytest
from django.core.management import CommandError, call_command
from django.test import override_settings

from jungle.accounts.models import User
from jungle.bookings.models import Booking

pytestmark = pytest.mark.django_db
PASSWORD = "parola-demo-lunga-2027"


def seed() -> None:
    call_command("seed_initial", "--demo", stdout=StringIO(), stderr=StringIO())


def run(*args: str) -> dict[str, Any]:
    out = StringIO()
    call_command("panel_demo", *args, stdout=out, stderr=StringIO())
    return dict(json.loads(out.getvalue()))


def test_demo_staff_and_bookings(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    seed()
    monkeypatch.setenv("JUNGLE_DEMO_PASSWORD", PASSWORD)
    manager = User.objects.get(email="manager@demo.invalid")
    manager.totp_secret = "x"
    manager.save(update_fields=["totp_secret"])
    data = run()
    manager.refresh_from_db()
    assert manager.check_password(PASSWORD) and manager.totp_secret == ""
    assert [b["court"] for b in data["bookings"]] == ["Teren 1", "Teren 2"]
    again = tmp_path / "panel.json"
    call_command("panel_demo", "--output", str(again), stdout=StringIO())
    assert json.loads(again.read_text())["bookings"] == data["bookings"]  # the same bookings
    assert Booking.objects.count() == 2


def test_refusals(monkeypatch: pytest.MonkeyPatch) -> None:
    with pytest.raises(CommandError, match="12"):
        run()
    monkeypatch.setenv("JUNGLE_DEMO_PASSWORD", PASSWORD)
    with pytest.raises(CommandError, match="seed_initial"):
        run()
    with override_settings(IS_PRODUCTION_LIKE=True), pytest.raises(CommandError, match="demos"):
        run()
