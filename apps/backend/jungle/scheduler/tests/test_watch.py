"""ADR-0017, Stage 14C: a device silent for 10 minutes while the club is open reaches the managers
of its location once per silence; the server's disk above the limit reaches them once a day."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta
from io import StringIO
from typing import Any

import pytest
from django.core.management import call_command

from jungle.accounts.models import User
from jungle.conftest import grant
from jungle.core.permissions import Role
from jungle.devices.models import Device, DeviceKind
from jungle.locations.models import Location
from jungle.notifications.models import Notification
from jungle.scheduler import watch
from jungle.scheduler.watch import Usage

pytestmark = pytest.mark.django_db
OPEN = "2027-03-15T18:00:00+02:00"  # a Monday evening


@pytest.fixture
def manager(location: Location, make_user: Callable[..., User]) -> User:
    user = make_user()
    grant(user, Role.MANAGER, location)
    return user


def messages(event: str) -> list[Notification]:
    return list(Notification.objects.filter(event=event, channel="email").order_by("created_at"))


def device(location: Location, name: str, minutes_ago: int | None, **fields: Any) -> Device:
    now = datetime.fromisoformat(OPEN)
    return Device.objects.create(
        kind=DeviceKind.SCREEN,
        location=location,
        name=name,
        enrolled_at=now - timedelta(days=1),
        last_seen_at=None if minutes_ago is None else now - timedelta(minutes=minutes_ago),
        **fields,
    )


def test_a_silent_device_reaches_the_managers_once_per_silence(
    manager: User, location: Location, time_machine: Any
) -> None:
    time_machine.move_to(OPEN, tick=False)
    silent = device(location, "Ecran Teren 1", 12)
    device(location, "Chioșc Ligă", 2)  # answered 2 minutes ago
    device(location, "Ecran vechi", 60, is_active=False)  # taken out of service
    device(location, "Ecran nou", None)  # never answered yet: nothing to compare
    assert [d.name for d in watch.devices_offline()] == ["Ecran Teren 1"]
    [message] = messages("staff.device_offline")
    assert message.user == manager
    assert message.context == {
        "first_name": manager.first_name,
        "device": "Ecran Teren 1",
        "since": "17:48",
    }
    watch.devices_offline()
    assert len(messages("staff.device_offline")) == 1  # the same silence: not twice
    silent.last_seen_at = datetime.fromisoformat(OPEN) - timedelta(minutes=11, seconds=30)
    silent.save()
    watch.devices_offline()
    assert len(messages("staff.device_offline")) == 2  # back, then silent again: a new message


def test_no_alarm_while_the_club_is_closed(
    location: Location, manager: User, time_machine: Any
) -> None:
    time_machine.move_to("2027-03-15T23:30:00+02:00", tick=False)  # after 23:00
    device(location, "Ecran Teren 1", 120)
    assert watch.devices_offline() == []
    time_machine.move_to("2027-03-20T07:30:00+02:00", tick=False)  # Saturday, before 08:00
    assert watch.devices_offline() == []


def test_the_disk_above_the_limit_reaches_them_once_a_day(
    manager: User, settings: Any, time_machine: Any
) -> None:
    time_machine.move_to(OPEN, tick=False)
    settings.DISK_WATCH_PATH = ""
    assert watch.disk_low() is None
    settings.DISK_WATCH_PATH = "/var/lib/pgbackrest"
    settings.DISK_ALERT_PERCENT = 85
    gib = watch.GIB

    def half(path: str) -> Usage:
        return Usage(100 * gib, 50 * gib, 50 * gib)

    def full(path: str) -> Usage:
        return Usage(100 * gib, 91 * gib, 9 * gib)

    assert watch.disk_low(usage=half) == 50 and messages("staff.disk_low") == []
    assert watch.disk_low(usage=full) == 91
    assert watch.disk_low(usage=full) == 91
    [message] = messages("staff.disk_low")
    assert (message.context["percent"], message.context["free"]) == (91, "9 GB")


def test_the_commands(
    manager: User, settings: Any, time_machine: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    time_machine.move_to(OPEN, tick=False)
    out = StringIO()
    call_command("watch_devices", stdout=out)
    assert out.getvalue().strip() == "Aparate care nu răspund: 0."
    settings.DISK_WATCH_PATH = ""
    out = StringIO()
    call_command("check_disk", stdout=out)
    assert out.getvalue().strip() == "Discul nu e urmărit aici."
    settings.DISK_WATCH_PATH = "/"
    settings.DISK_ALERT_PERCENT = 101
    out = StringIO()
    call_command("check_disk", stdout=out)
    assert out.getvalue().startswith("Disc ocupat: ")
