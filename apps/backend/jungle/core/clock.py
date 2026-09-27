"""Single source of time for business logic (ADR-0010).

Storage is UTC (`timestamptz`); business rules use the club time zone. Tests move time
with `time-machine`, which also affects these functions.
"""

from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from django.utils import timezone

BUSINESS_TZ = ZoneInfo("Europe/Bucharest")


def now() -> datetime:
    return timezone.now()


def today_local() -> date:
    return now().astimezone(BUSINESS_TZ).date()


def age_on(birth_date: date, on: date) -> int:
    """Age in full years on a given day (a person born on 29 Feb turns a year older on 1 Mar)."""
    had_birthday = (on.month, on.day) >= (birth_date.month, birth_date.day)
    return on.year - birth_date.year - (0 if had_birthday else 1)
