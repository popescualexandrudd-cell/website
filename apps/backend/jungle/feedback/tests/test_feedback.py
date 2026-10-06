"""Q71 (06.10.2026): one question after the first game, "would you recommend us?" (0–10), asked
once, only to those who turned on the club's news; answered once from the account; the NPS for
the owner's side (`reports.view`)."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime
from typing import Any

import pytest
from django.test import Client

from jungle.accounts.models import User
from jungle.attendance.models import Scan, ScanKind
from jungle.conftest import Api, error_code, login_as
from jungle.core.errors import DomainError
from jungle.core.permissions import Role
from jungle.feedback import services
from jungle.feedback.models import Feedback
from jungle.notifications.models import Notification, Preference
from jungle.privacy.services import export_data

pytestmark = pytest.mark.django_db
Maker = Callable[..., User]
YESTERDAY_EVENING = "2027-03-14T19:00:00+02:00"  # the club fixture's "now" is 15.03, 09:00


def scan(club: Any, user: User, at: str, kind: str = ScanKind.COURT_ENTRY) -> Scan:
    return Scan.objects.create(
        user=user,
        location=club.location,
        kind=kind,
        resource=club.court1,
        scanned_at=datetime.fromisoformat(at),
    )


def news_on(user: User, channel: str = "email") -> User:
    Preference.objects.create(user=user, category="club", channel=channel, enabled=True)
    return user


def test_asked_once_the_day_after_the_first_game_only_with_the_news_on(
    club: Any, make_user: Maker
) -> None:
    first = news_on(make_user())
    scan(club, first, YESTERDAY_EVENING)
    scan(club, first, "2027-03-14T21:00:00+02:00")  # a second game the same evening
    veteran = news_on(make_user())  # played before yesterday: not a first game
    scan(club, veteran, "2027-03-01T10:00:00+02:00")
    scan(club, veteran, YESTERDAY_EVENING)
    no_news = make_user()  # the news are off by default (opt-in, Q67)
    scan(club, no_news, YESTERDAY_EVENING)
    pilates = news_on(make_user())  # a class is not a game on a court
    scan(club, pilates, YESTERDAY_EVENING, kind=ScanKind.CLASS_ENTRY)
    push_only = news_on(make_user(), channel="push")  # no push subscription: nothing to send on
    scan(club, push_only, YESTERDAY_EVENING)

    assert services.ask_after_first_game() == 1
    feedback = Feedback.objects.get()
    assert (feedback.user, feedback.location, feedback.score) == (first, club.location, None)
    message = Notification.objects.get(event="club.feedback")
    assert message.user == first and message.context["url"] == "/ro/cont"
    assert services.ask_after_first_game() == 0  # never twice
    assert services._ask(first, Scan.objects.filter(user=first).first()) == 0  # type: ignore[arg-type]
    assert str(feedback).endswith("· —")


def test_answered_once_from_the_account(
    api: Api, client: Client, club: Any, make_user: Maker
) -> None:
    person = news_on(make_user())
    login_as(client, person)
    assert api.get("/feedback").json() == {"asked": False, "answered": False}
    assert error_code(api.post("/feedback", {"score": 9})) == "feedback.not_asked"
    scan(club, person, YESTERDAY_EVENING)
    services.ask_after_first_game()
    assert api.get("/feedback").json() == {"asked": True, "answered": False}
    assert api.post("/feedback", {"score": 11}).status_code == 422
    assert api.post("/feedback", {"score": 9}).json() == {"asked": True, "answered": True}
    again = api.post("/feedback", {"score": 3})
    assert again.status_code == 409 and error_code(again) == "feedback.answered"
    assert Feedback.objects.get().score == 9
    assert export_data(person)["feedback"][0]["score"] == 9  # in the person's export (GDPR)


def test_the_score_is_checked_in_the_service_too(client: Client, make_user: Maker) -> None:
    from jungle.league.tests.conftest import staff_request

    with pytest.raises(DomainError):
        services.answer(staff_request(make_user()), -1)


def test_the_nps_for_the_owners_side(
    api: Api, club: Any, make_user: Maker, staff: Callable[..., User]
) -> None:
    url = f"/staff/feedback/summary?location_id={club.location.id}"
    staff(Role.RECEPTION, club.location)
    assert error_code(api.get(url)) == "auth.forbidden"
    staff(Role.MANAGER, club.location)
    empty = api.get(url).json()
    assert (empty["asked"], empty["answers"], empty["nps"]) == (0, 0, None)
    assert (empty["first"], empty["last"]) == ("2026-12-16", "2027-03-15")
    now = datetime.fromisoformat("2027-03-15T08:00:00+02:00")
    for score in (10, 9, 7, 3, None):
        Feedback.objects.create(
            user=make_user(),
            location=club.location,
            asked_at=now,
            score=score,
            answered_at=None if score is None else now,
        )
    old = Feedback.objects.create(  # outside the 90 days
        user=make_user(),
        location=club.location,
        asked_at=datetime.fromisoformat("2026-11-01T10:00:00+02:00"),
        score=0,
        answered_at=now,
    )
    assert old.score == 0
    result = api.get(url).json()
    assert {k: result[k] for k in ("asked", "answers", "promoters", "passives", "detractors")} == {
        "asked": 5,
        "answers": 4,
        "promoters": 2,
        "passives": 1,
        "detractors": 1,
    }
    assert result["nps"] == 25
    assert api.get(url + "&days=366").json()["detractors"] == 2
    assert error_code(api.get(url + "&days=0")) == "validation.invalid"


@pytest.mark.parametrize(
    ("promoters", "detractors", "answers", "expected"),
    [(1, 0, 8, 13), (0, 1, 8, -13), (1, 1, 3, 0), (3, 0, 3, 100), (0, 0, 0, None)],
)
def test_the_nps_is_rounded_half_away_from_zero(
    promoters: int, detractors: int, answers: int, expected: int | None
) -> None:
    assert services.nps(promoters, detractors, answers) == expected
