"""What the scheduler watches besides its own jobs (ADR-0017, Stage 14C):

- `devices_offline`: a kiosk, a screen or the café display that has not called the API for 10
  minutes while the club is open (`bookings.opening_hours`) — they all call it at least every
  minute when they work — goes to the managers of its location (`staff.device_offline`), once per
  silence (the same device silent again later is a new message);
- `disk_low`: the server's disk (the volume of the backups, mounted read-only in the scheduler at
  `DISK_WATCH_PATH`) filled above `DISK_ALERT_PERCENT` goes to the managers and admins
  (`staff.disk_low`), once a day while it lasts.
"""

from __future__ import annotations

import shutil
from collections.abc import Callable
from datetime import datetime, timedelta
from typing import NamedTuple

from django.conf import settings

from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.devices.models import Device
from jungle.locations.models import Location
from jungle.notifications.services import notify_staff

OFFLINE_AFTER = timedelta(minutes=10)
GIB = 1024**3


def club_open(now: datetime) -> bool:
    local = clock.local(now)
    hours = get_config("bookings.opening_hours")["weekend" if local.weekday() >= 5 else "weekday"]
    return bool(hours[0] <= local.strftime("%H:%M") < hours[1])


def devices_offline(now: datetime | None = None) -> list[Device]:
    now = now or clock.now()
    if not club_open(now):
        return []
    silent = list(
        Device.objects.filter(
            is_active=True,
            enrolled_at__isnull=False,
            last_seen_at__lt=now - OFFLINE_AFTER,
        ).order_by("name")
    )
    for device in silent:
        seen = device.last_seen_at or now  # never empty here (filtered above)
        notify_staff(
            device.location_id,
            "staff.device_offline",
            {"device": device.name, "since": clock.local(seen).strftime("%H:%M")},
            subject=f"{device.pk}:{seen.isoformat()}",
        )
    return silent


class Usage(NamedTuple):
    total: int
    used: int
    free: int


def _disk_usage(path: str) -> Usage:
    total, used, free = shutil.disk_usage(path)
    return Usage(total, used, free)


def disk_low(
    now: datetime | None = None, usage: Callable[[str], Usage] = _disk_usage
) -> int | None:
    """The disk's use in percent (None where nothing is watched); an alert above the limit."""
    path = settings.DISK_WATCH_PATH
    if not path:
        return None
    now = now or clock.now()
    total, used, free = usage(path)
    percent = used * 100 // total
    if percent >= settings.DISK_ALERT_PERCENT:
        day = clock.local(now).date().isoformat()
        for location_id in Location.objects.values_list("id", flat=True):
            notify_staff(
                location_id,
                "staff.disk_low",
                {"percent": percent, "free": f"{free // GIB} GB"},
                subject=f"disk-{day}",
            )
    return percent
