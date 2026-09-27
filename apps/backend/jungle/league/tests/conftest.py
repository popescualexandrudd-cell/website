"""League fixtures: a club with an active season, players who joined the league."""

from __future__ import annotations

import uuid
from collections.abc import Callable
from datetime import datetime
from decimal import Decimal
from typing import Any

import pytest
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory

from jungle.accounts.models import User
from jungle.accounts.services.authz import MFA_SESSION_KEY
from jungle.audit.services import SYSTEM
from jungle.conftest import grant
from jungle.core import clock
from jungle.core.permissions import Role
from jungle.devices.models import Device, DeviceKind
from jungle.league import services, store
from jungle.league.models import EventKind, LeagueEvent, LeagueSeason, LevelQuestionnaire
from jungle.legal.models import DocumentKind
from jungle.legal.services import publish_document
from jungle.locations.models import Location
from jungle.privacy import league_consent

# Monday 05.04.2027, after the change to summer time (ADR-0010).
NOW = "2027-04-05T09:00:00+03:00"
SEASON_START = datetime.fromisoformat("2027-04-01T00:00:00+03:00")
SEASON_END = datetime.fromisoformat("2027-07-01T00:00:00+03:00")
WIN_A = {"sets": [{"a": 6, "b": 3}, {"a": 6, "b": 4}]}
WIN_B = {"sets": [{"a": 3, "b": 6}, {"a": 4, "b": 6}]}


def staff_request(user: User) -> Any:
    """A request from a logged-in staff member with 2FA verified."""
    request = RequestFactory().post("/", REMOTE_ADDR="10.0.0.9")
    request.user = user
    request.session = {MFA_SESSION_KEY: True}  # type: ignore[assignment]
    return request


def kiosk_request() -> Any:
    request = RequestFactory().post("/", REMOTE_ADDR="10.0.0.5", HTTP_USER_AGENT="LeagueKiosk/1.0")
    request.user = AnonymousUser()
    return request


def at(text: str) -> datetime:
    """A moment in club time, e.g. at("2027-04-05 18:30")."""
    return datetime.fromisoformat(f"{text}:00+03:00")


def play(
    season: LeagueSeason,
    team_a: tuple[User, ...],
    team_b: tuple[User, ...],
    when: datetime,
    score: dict[str, Any] | None = None,
    ref: str | None = None,
) -> LeagueEvent:
    return store.record(
        season,
        EventKind.MATCH,
        when,
        ref or f"m-{uuid.uuid4()}",
        {
            "team_a": [str(p.pk) for p in team_a],
            "team_b": [str(p.pk) for p in team_b],
            "score": score or WIN_A,
        },
        SYSTEM,
    )


def placed(season: LeagueSeason, join: Callable[..., User]) -> tuple[User, User, User, User]:
    """Four players after the five placement matches (ranked in doubles and pairs)."""
    a, b, c, d = (join() for _ in range(4))
    days = ("2027-04-05 10:00", "2027-04-05 12:00", "2027-04-05 14:00")
    for n, when in enumerate((*days, "2027-04-06 10:00", "2027-04-06 12:00")):
        play(season, (a, b), (c, d), at(when), WIN_A if n % 2 == 0 else WIN_B)
    return a, b, c, d


@pytest.fixture
def league_text(db: None) -> None:
    for language in ("ro", "en"):
        publish_document(
            SYSTEM, DocumentKind.LEAGUE_GDPR, language, "Acord ligă", f"text {language}"
        )


@pytest.fixture
def kiosk(location: Location) -> Device:
    return Device.objects.create(
        kind=DeviceKind.LEAGUE_KIOSK, location=location, name="Chioșc Ligă 1"
    )


@pytest.fixture
def manager(make_user: Callable[..., User], location: Location) -> User:
    user = make_user(first_name="Ana")
    grant(user, Role.MANAGER, location)
    return user


@pytest.fixture
def now(time_machine: Any) -> Any:
    time_machine.move_to(NOW, tick=False)
    return time_machine


@pytest.fixture
def new_season(location: Location, manager: User, now: Any) -> Callable[..., LeagueSeason]:
    def factory(number: int = 1, activate: bool = True) -> LeagueSeason:
        season = services.create_season(
            staff_request(manager),
            services.SeasonData(
                location_id=location.id,
                number=number,
                name=f"Sezonul {number}",
                starts_at=SEASON_START,
                ends_at=SEASON_END,
            ),
        )
        return services.activate_season(staff_request(manager), season.id) if activate else season

    return factory


@pytest.fixture
def season(new_season: Callable[..., LeagueSeason]) -> LeagueSeason:
    return new_season()


@pytest.fixture
def join(
    make_user: Callable[..., User], kiosk: Device, league_text: None, now: Any
) -> Callable[..., User]:
    """An adult with a validated level who signs the consent at the kiosk (and so joins)."""

    def factory(level: str = "3.00", **fields: Any) -> User:
        user = make_user(**fields)
        LevelQuestionnaire.objects.create(
            user=user,
            answers={
                "band": "3.0",
                "years_playing": 2,
                "racket_background": "none",
                "tournaments": "none",
            },
            estimated_level=Decimal(level),
            submitted_at=clock.now(),
            validated_level=Decimal(level),
            validated_at=clock.now(),
        )
        league_consent.sign(kiosk_request(), user, kiosk, "ro")
        return user

    return factory
