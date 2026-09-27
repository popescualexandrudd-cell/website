"""Shared test fixtures."""

from __future__ import annotations

import json
from collections.abc import Callable
from datetime import date
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
