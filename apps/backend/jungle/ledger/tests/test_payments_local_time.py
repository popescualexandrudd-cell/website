"""ADR-0010: what people read (the description on the receipt, the statement, the kiosk) is in
club time, not the UTC stored in the database."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

from jungle.accounts.models import User
from jungle.bookings.models import Booking, SessionType
from jungle.ledger import payments
from jungle.locations.models import Location, Resource, ResourceKind

pytestmark = pytest.mark.django_db


def test_the_description_of_a_booking_is_in_club_time(
    location: Location, make_user: Callable[..., User]
) -> None:
    court = Resource.objects.create(
        location=location, slug="t1", name="Teren 1", kind=ResourceKind.PADEL_COURT
    )
    player = make_user()
    starts = datetime(2027, 3, 28, 9, 0, tzinfo=ZoneInfo("Europe/Bucharest"))  # summer time
    booking = Booking.objects.create(
        location=location,
        resource=court,
        organizer=player,
        created_by=player,
        starts_at=starts,
        ends_at=starts.replace(hour=10, minute=30),
        session_type=SessionType.FREE_RENTAL,
        price_total=24000,
    )
    booking.refresh_from_db()  # as stored: UTC
    assert payments.due_for_booking(booking).description == "Teren 1 2027-03-28 09:00"
