"""The users module of the panel (§8.6, R-004): the person's cards, league, recent bookings;
the objection to appearing by name on the screens (Q55, GDPR art. 21)."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

import pytest

from jungle.accounts.models import User
from jungle.audit.models import AuditLog
from jungle.audit.services import SYSTEM
from jungle.bookings.models import Booking, SessionType
from jungle.cards import services as cards
from jungle.conftest import Api, error_code
from jungle.core import clock
from jungle.core.permissions import Role
from jungle.league.models import LevelQuestionnaire
from jungle.screens.models import NameObjection

pytestmark = pytest.mark.django_db


def test_r004_the_persons_cards_league_and_recent_bookings(
    api: Api, staff: Callable[..., User], club: Any, make_user: Callable[..., User]
) -> None:
    staff(Role.RECEPTION, club.location)
    person = make_user()
    old = cards.issue_card(SYSTEM, person)
    for n in range(12):
        start = datetime.fromisoformat("2027-03-16T10:00:00+02:00") + timedelta(days=n)
        Booking.objects.create(
            location=club.location,
            resource=club.court1,
            organizer=person,
            created_by=person,
            starts_at=start,
            ends_at=start + timedelta(minutes=60),
            session_type=SessionType.FREE_RENTAL,
            price_total=0,
        )
    LevelQuestionnaire.objects.create(
        user=person, answers={}, estimated_level=Decimal("3.0"), submitted_at=clock.now()
    )
    found = api.get(f"/staff/panel/users/{person.pk}/profile?location_id={club.location.pk}").json()
    assert found["in_league"] is False and found["level_waiting"] is True
    assert found["level_validated"] is None and found["hidden_on_screens"] is False
    assert old.number in [c["number"] for c in found["cards"]]
    assert len(found["bookings"]) == 10  # the most recent ten
    assert found["bookings"][0]["starts_at"].startswith("2027-03-27")
    LevelQuestionnaire.objects.update(validated_level=Decimal("3.5"), validated_at=clock.now())
    again = api.get(f"/staff/panel/users/{person.pk}/profile?location_id={club.location.pk}")
    assert again.json()["level_validated"] == "3.50" and again.json()["level_waiting"] is False
    missing = api.get(
        f"/staff/panel/users/00000000-0000-0000-0000-000000000000/profile?location_id={club.location.pk}"
    )
    assert error_code(missing) == "accounts.not_found"


def test_q55_reception_notes_do_not_show_my_name(
    api: Api, staff: Callable[..., User], club: Any, make_user: Callable[..., User]
) -> None:
    staff(Role.RECEPTION, club.location)
    person = make_user()
    path = f"/staff/panel/users/{person.pk}/hidden-on-screens"
    body = {"location_id": str(club.location.pk), "hidden": True, "note": " cerere la recepție "}
    assert api.post(path, body).json() == {"hidden_on_screens": True}
    assert NameObjection.objects.get(user=person).note == "cerere la recepție"
    profile = api.get(f"/staff/panel/users/{person.pk}/profile?location_id={club.location.pk}")
    assert profile.json()["hidden_on_screens"] is True
    assert api.post(path, {**body, "hidden": False}).json() == {"hidden_on_screens": False}
    assert not NameObjection.objects.filter(user=person).exists()
    actions = list(AuditLog.objects.values_list("action", flat=True))
    assert "screens.name_objection" in actions and "screens.name_objection_withdrawn" in actions


def test_a_coach_cannot_note_it(
    api: Api, staff: Callable[..., User], club: Any, make_user: Callable[..., User]
) -> None:
    staff(Role.COACH, club.location)
    person = make_user()
    refused = api.post(
        f"/staff/panel/users/{person.pk}/hidden-on-screens",
        {"location_id": str(club.location.pk), "hidden": True},
    )
    assert error_code(refused) == "auth.forbidden"
