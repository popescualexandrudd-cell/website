"""Shared test fixtures."""

from __future__ import annotations

import json
from collections.abc import Callable
from datetime import UTC, date, datetime
from typing import Any

import pyotp
import pytest
from django.core.cache import cache
from django.test import Client

from jungle.accounts.models import User, UserRole
from jungle.accounts.services.authz import MFA_SESSION_KEY
from jungle.audit.services import SYSTEM
from jungle.core.crypto import encrypt
from jungle.core.permissions import Role
from jungle.legal.models import DocumentKind
from jungle.legal.services import publish_document
from jungle.locations.models import Location

API = "/api/v1"


class Api:
    """Thin JSON wrapper around the Django test client."""

    def __init__(self, client: Client):
        self.client = client

    def _call(self, method: str, path: str, body: Any = None, **extra: Any) -> Any:
        kwargs: dict[str, Any] = {"content_type": "application/json", **extra}
        if body is not None:
            kwargs["data"] = json.dumps(body, default=str)
        return getattr(self.client, method)(f"{API}{path}", **kwargs)

    def get(self, path: str, **extra: Any) -> Any:
        return self.client.get(f"{API}{path}", **extra)

    def post(self, path: str, body: Any = None, **extra: Any) -> Any:
        return self._call("post", path, body, **extra)

    def patch(self, path: str, body: Any = None, **extra: Any) -> Any:
        return self._call("patch", path, body, **extra)

    def put(self, path: str, body: Any = None, **extra: Any) -> Any:
        return self._call("put", path, body, **extra)


def error_code(response: Any) -> str:
    return str(response.json()["error"]["code"])


@pytest.fixture(autouse=True)
def _clear_cache() -> None:
    cache.clear()


@pytest.fixture
def api(client: Client) -> Api:
    return Api(client)


@pytest.fixture
def location(db: None) -> Location:
    return Location.objects.create(slug="jungle-padel", name="Jungle Padel")


@pytest.fixture
def legal_docs(db: None) -> None:
    for kind in (DocumentKind.TERMS, DocumentKind.PRIVACY):
        for lang in ("ro", "en"):
            publish_document(SYSTEM, kind, lang, f"{kind} {lang}", f"text {kind} {lang}")


@pytest.fixture
def make_user(db: None) -> Callable[..., User]:
    counter = iter(range(1, 10_000))

    def factory(
        email: str | None = None, password: str | None = "Parola-Sigura-2026", **fields: Any
    ) -> User:
        n = next(counter)
        fields.setdefault("first_name", f"Prenume{n}")
        fields.setdefault("last_name", f"Nume{n}")
        fields.setdefault("date_of_birth", date(1990, 1, 1))
        fields.setdefault("email_verified_at", datetime(2026, 1, 1, tzinfo=UTC))
        return User.objects.create_user(email or f"user{n}@example.test", password, **fields)

    return factory


def grant(user: User, role: Role, location: Location | None = None) -> UserRole:
    return UserRole.objects.create(user=user, role=role, location=location)


def enable_totp(user: User) -> pyotp.TOTP:
    from jungle.core import clock

    secret = pyotp.random_base32()
    user.totp_secret = encrypt(secret)
    user.totp_confirmed_at = clock.now()
    user.save()
    return pyotp.TOTP(secret)


def login_as(client: Client, user: User, mfa: bool = True) -> None:
    client.force_login(user)
    session = client.session
    session[MFA_SESSION_KEY] = mfa
    session.save()


@pytest.fixture
def staff(make_user: Callable[..., User], client: Client) -> Callable[..., User]:
    """Create a staff member with the given role, logged in with 2FA verified."""

    def factory(
        role: Role = Role.ADMIN, location: Location | None = None, mfa: bool = True
    ) -> User:
        user = make_user()
        grant(user, role, location)
        login_as(client, user, mfa=mfa)
        return user

    return factory


# ---------------------------------------------------------------- Stage 3: a small club
# Monday 15.03.2027, 09:00 club time; DST starts on Sunday 28.03.2027 (ADR-0010).
CLUB_NOW = "2027-03-15T09:00:00+02:00"


@pytest.fixture
def club(location: Location, make_user: Callable[..., User], time_machine: Any) -> Any:
    """Two padel courts, a tennis court, a Pilates studio with 4 active Reformers (Q46),
    the event room, a coach and demo rates (DE_STABILIT, except tennis: R-051)."""
    from types import SimpleNamespace

    from jungle.configuration.models import Marker
    from jungle.locations.models import Resource, ResourceKind
    from jungle.pricing.models import Band, PriceRate, Product

    time_machine.move_to(CLUB_NOW, tick=False)

    def resource(slug: str, kind: str, **fields: Any) -> Resource:
        return Resource.objects.create(location=location, slug=slug, name=slug, kind=kind, **fields)

    court1 = resource("teren-1", ResourceKind.PADEL_COURT)
    court2 = resource("teren-2", ResourceKind.PADEL_COURT)
    tennis = resource("tenis-1", ResourceKind.TENNIS_COURT)
    studio = resource("sala-pilates", ResourceKind.PILATES_STUDIO, capacity=6)
    for n in range(1, 6):
        resource(f"reformer-{n}", ResourceKind.REFORMER, parent=studio, is_active=n <= 4)
    reformer = Resource.objects.get(slug="reformer-1")
    room = resource("sala-evenimente", ResourceKind.EVENT_ROOM, capacity=20)
    rates: list[tuple[str, str, dict[str, int]]] = [
        (
            ResourceKind.PADEL_COURT,
            Product.RENTAL,
            {Band.PEAK: 6000, Band.SEMI_PEAK: 5000, Band.OFF_PEAK: 4000},
        ),
        (ResourceKind.PADEL_COURT, Product.LESSON, dict.fromkeys(Band.values, 9000)),
        (ResourceKind.REFORMER, Product.LESSON, dict.fromkeys(Band.values, 7500)),
        (ResourceKind.PILATES_STUDIO, Product.CLASS, dict.fromkeys(Band.values, 4000)),
        (ResourceKind.EVENT_ROOM, Product.EVENT, dict.fromkeys(Band.values, 10000)),
    ]
    for kind, product, bands in rates:
        for band, amount in bands.items():
            PriceRate.objects.create(
                location=location,
                resource_kind=kind,
                product=product,
                band=band,
                amount_per_half_hour=amount,
            )
    for band in Band.values:  # tennis: 120 RON/hour (R-051), a known price
        PriceRate.objects.create(
            location=location,
            resource_kind=ResourceKind.TENNIS_COURT,
            product=Product.RENTAL,
            band=band,
            amount_per_half_hour=6000,
            marker=Marker.CONFIRMED,
        )
    coach = make_user(first_name="Mihai")
    grant(coach, Role.COACH)
    return SimpleNamespace(
        location=location,
        court1=court1,
        court2=court2,
        tennis=tennis,
        studio=studio,
        reformer=reformer,
        room=room,
        coach=coach,
    )


def booking_body(
    resource: Any,
    starts_at: str,
    minutes: int = 60,
    session_type: str = "free_rental",
    **extra: Any,
) -> dict[str, Any]:
    return {
        "resource_id": str(resource.id),
        "starts_at": starts_at,
        "duration_minutes": minutes,
        "session_type": session_type,
        **extra,
    }


def set_config(key: str, value: Any) -> None:
    """Publishes a configuration value directly (tests only), effective now."""
    from jungle.configuration.models import ConfigVersion, Marker
    from jungle.core import clock

    last = ConfigVersion.objects.filter(key=key).order_by("-version").first()
    ConfigVersion.objects.create(
        key=key,
        version=(last.version if last else 0) + 1,
        value=value,
        marker=Marker.CONFIRMED,
        effective_from=clock.now(),
        reason="test",
    )
