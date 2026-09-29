"""`manage.py payments_demo`: DEMO data for trying the Payments Kiosk and the café display."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings

from jungle.accounts.models import User
from jungle.bookings.models import Booking
from jungle.checkout.models import KioskPin
from jungle.devices.models import Device, DeviceKind
from jungle.ledger.services import customer_credit
from jungle.locations.models import Location, Resource, ResourceKind

pytestmark = pytest.mark.django_db


def run(tmp_path: Path, **options: Any) -> dict[str, Any]:
    target = tmp_path / "demo.json"
    call_command("payments_demo", output=str(target), **options)
    return dict(json.loads(target.read_text(encoding="utf-8")))


def test_prepares_the_devices_and_demo_people(tmp_path: Path, location: Location, now: Any) -> None:
    Resource.objects.create(
        location=location, slug="teren-1", name="Teren 1", kind=ResourceKind.PADEL_COURT
    )
    first = run(tmp_path)
    kiosk = Device.objects.get(pk=first["kiosk"]["device_id"])
    assert kiosk.kind == DeviceKind.PAYMENTS_KIOSK and kiosk.is_active
    assert Device.objects.get(pk=first["display"]["device_id"]).kind == DeviceKind.CAFE_DISPLAY
    customer = User.objects.get(pk=first["customer"]["id"])
    assert customer.is_demo and first["credit"] == customer_credit(customer) == 5000
    booking = Booking.objects.get(pk=first["booking"]["id"])
    assert (booking.organizer_id, booking.price_total) == (customer.pk, 24000)
    assert KioskPin.objects.filter(user_id=first["receptionist"]["id"]).exists()
    assert first["receptionist"]["pin"] == "480913" and len(first["voucher"]) >= 4
    # Again: the same people and booking, new device tokens, no second credit.
    second = run(tmp_path)
    assert second["booking"]["id"] == first["booking"]["id"]
    assert second["kiosk"]["device_token"] != first["kiosk"]["device_token"]
    assert second["credit"] == 5000


def test_takes_the_next_free_court(tmp_path: Path, location: Location, now: Any) -> None:
    from datetime import timedelta

    from jungle.core import clock

    court = Resource.objects.create(
        location=location, slug="teren-1", name="Teren 1", kind=ResourceKind.PADEL_COURT
    )
    other = User.objects.create_user("x@example.test", None, first_name="X", last_name="Y")
    start = clock.now().replace(minute=0, second=0, microsecond=0) + timedelta(hours=2)
    Booking.objects.create(
        location=location,
        resource=court,
        organizer=other,
        created_by=other,
        starts_at=start,
        ends_at=start + timedelta(minutes=90),
        session_type="free_rental",
        price_total=0,
    )
    demo = run(tmp_path)
    assert Booking.objects.get(pk=demo["booking"]["id"]).starts_at >= start + timedelta(minutes=90)


def test_refusals(tmp_path: Path, location: Location, now: Any, capsys: Any) -> None:
    with pytest.raises(CommandError, match="no free court"):
        run(tmp_path)
    with pytest.raises(CommandError, match="devices.key_invalid"):
        run(tmp_path, public_key="nu-e-cheie")
    with override_settings(IS_PRODUCTION_LIKE=True), pytest.raises(CommandError, match="demos"):
        run(tmp_path)
    Location.objects.filter(pk=location.pk).update(slug="alt")
    with pytest.raises(CommandError, match="seed_initial"):
        call_command("payments_demo")


def test_prints_to_stdout(location: Location, now: Any, capsys: Any) -> None:
    Resource.objects.create(
        location=location, slug="teren-1", name="Teren 1", kind=ResourceKind.PADEL_COURT
    )
    call_command("payments_demo")
    assert json.loads(capsys.readouterr().out)["receptionist"]["pin"] == "480913"
