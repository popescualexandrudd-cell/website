"""The admin panel's own reads (§8.6): who may do what where, and the live dashboard."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta
from typing import Any

import pytest

from jungle.accounts.models import User
from jungle.attendance.models import StaffNotice
from jungle.audit.services import SYSTEM
from jungle.bookings.models import Booking, SessionType
from jungle.conftest import Api, error_code, grant, set_config
from jungle.core import clock
from jungle.core.permissions import Role
from jungle.devices.models import Device, DeviceKind
from jungle.ledger import payments
from jungle.ledger.models import PaymentMethod
from jungle.locations.models import Location

pytestmark = pytest.mark.django_db


def test_permissions_per_location_and_only_with_2fa(
    api: Api, staff: Callable[..., User], location: Location
) -> None:
    other = Location.objects.create(slug="alt", name="Alt club")
    user = staff(Role.RECEPTION, location)
    grant(user, Role.COACH, None)  # a role without a location counts everywhere
    found = api.get("/staff/panel/permissions").json()
    assert found["user"]["id"] == str(user.pk) and found["roles"] == ["coach", "reception"]
    scopes = {s["location_name"]: set(s["actions"]) for s in found["scopes"]}
    assert "cash.manage" in scopes["Jungle Padel"] and "cash.manage" not in scopes["Alt club"]
    assert "classes.manage" in scopes["Alt club"] and "users.manage" not in scopes["Jungle Padel"]
    assert other.name in scopes


def test_refused_without_a_role_or_without_2fa(
    api: Api, staff: Callable[..., User], make_user: Callable[..., User], client: Any
) -> None:
    assert api.get("/staff/panel/permissions").status_code == 401
    from jungle.conftest import login_as

    login_as(client, make_user())
    assert error_code(api.get("/staff/panel/permissions")) == "auth.forbidden"
    staff(Role.ADMIN, mfa=False)
    assert error_code(api.get("/staff/panel/permissions")) == "auth.mfa_required"


def book(club: Any, resource: Any, start: str, minutes: int, who: User) -> Booking:
    begin = datetime.fromisoformat(start)
    return Booking.objects.create(
        location=club.location,
        resource=resource,
        organizer=who,
        created_by=who,
        starts_at=begin,
        ends_at=begin + timedelta(minutes=minutes),
        session_type=SessionType.FREE_RENTAL,
        price_total=12000,
    )


def test_the_live_dashboard(
    api: Api, staff: Callable[..., User], club: Any, make_user: Callable[..., User]
) -> None:
    """Monday 15.03.2027, 09:00: court 1 busy until 10:30, three hours booked on the two padel
    courts and the tennis court, a cash payment, alerts."""
    manager = staff(Role.MANAGER, club.location)
    player = make_user()
    busy = book(club, club.court1, "2027-03-15T08:30:00+02:00", 120, player)
    book(club, club.court2, "2027-03-15T18:00:00+02:00", 60, player)
    book(club, club.court1, "2027-03-16T18:00:00+02:00", 60, player)  # tomorrow
    payments.pay(
        SYSTEM,
        payments.due_for_booking(busy),
        payments.PaymentData(
            payer_id=player.pk,
            amount=12000,
            method=PaymentMethod.CASH,
            tendered=12000,
            idempotency_key="panel-1",
        ),
    )
    now = clock.now()
    StaffNotice.objects.create(location=club.location, recipient=manager, kind="x", created_at=now)
    StaffNotice.objects.create(
        location=club.location, recipient_role="manager", kind="y", created_at=now
    )
    StaffNotice.objects.create(
        location=club.location, recipient_role="coach", kind="z", created_at=now
    )
    Device.objects.create(
        location=club.location, kind=DeviceKind.SCREEN, name="Ecran vechi", is_active=False
    )
    board = api.get(f"/staff/panel/dashboard?location_id={club.location.pk}").json()
    assert board["day"] == "2027-03-15" and board["bookings_today"] == 2
    # 180 booked minutes of 3 courts × 15 hours = 6.67% → 7
    assert board["occupancy_percent"] == 7
    assert board["cash_taken_today"] == 12000 and board["revenue_today"] >= 0
    assert board["unread_notices"] == 2 and board["inactive_devices"] == 1
    assert board["pending_decisions"] > 0
    courts = {c["name"]: c for c in board["courts"]}
    assert courts["teren-1"]["busy"] is True and courts["teren-1"]["until"].startswith(
        "2027-03-15T08:30:00"
    )
    assert courts["teren-2"]["busy"] is False and courts["teren-2"]["booked_minutes_today"] == 60
    assert courts["teren-1"]["booked_minutes_today"] == 120
    assert courts["tenis-1"]["open_minutes_today"] == 15 * 60


def test_weekend_hours_an_empty_club_and_who_may_see_it(
    api: Api,
    staff: Callable[..., User],
    location: Location,
    time_machine: Any,
) -> None:
    time_machine.move_to("2027-03-20T12:00:00+02:00", tick=False)  # a Saturday
    set_config(
        "bookings.opening_hours", {"weekday": ["08:00", "23:00"], "weekend": ["09:00", "21:00"]}
    )
    staff(Role.COACH, location)
    board = api.get(f"/staff/panel/dashboard?location_id={location.pk}").json()
    assert board["courts"] == [] and board["occupancy_percent"] == 0
    assert board["cash_taken_today"] == 0 and board["revenue_today"] == 0
    other = Location.objects.create(slug="alt", name="Alt club")
    staff(Role.RECEPTION, other)
    refused = api.get(f"/staff/panel/dashboard?location_id={location.pk}")
    assert error_code(refused) == "auth.forbidden"
    scopes = api.get("/staff/panel/permissions").json()["scopes"]
    assert [s["location_name"] for s in scopes] == ["Alt club"]  # only where the role counts
