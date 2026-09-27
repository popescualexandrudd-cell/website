from datetime import date

import pytest
from django.conf import settings

from jungle.conftest import Api
from jungle.core import clock
from jungle.core.crypto import decrypt, encrypt
from jungle.core.http import client_ip


def test_business_time_zone_is_bucharest() -> None:
    """ADR-0010: a single business time zone."""
    assert settings.TIME_ZONE == "Europe/Bucharest"
    assert settings.USE_TZ is True
    assert str(clock.BUSINESS_TZ) == "Europe/Bucharest"


@pytest.mark.parametrize(
    ("birth", "on", "age"),
    [
        (date(2000, 5, 10), date(2018, 5, 9), 17),
        (date(2000, 5, 10), date(2018, 5, 10), 18),
        (date(2004, 2, 29), date(2022, 2, 28), 17),
        (date(2004, 2, 29), date(2022, 3, 1), 18),
    ],
)
def test_age_on(birth: date, on: date, age: int) -> None:
    """R-006: age is computed in full years (league is 18+)."""
    assert clock.age_on(birth, on) == age


def test_today_local_uses_bucharest_date(time_machine) -> None:
    """ADR-0010: 22:30 UTC on 31 Dec is already 1 Jan in Bucharest."""
    time_machine.move_to("2026-12-31T22:30:00+00:00")
    assert clock.today_local() == date(2027, 1, 1)


def test_encryption_round_trip() -> None:
    token = encrypt("JBSWY3DPEHPK3PXP")
    assert token != "JBSWY3DPEHPK3PXP"
    assert decrypt(token) == "JBSWY3DPEHPK3PXP"


def test_production_password_hasher_is_argon2() -> None:
    """ADR-0011: Argon2 first in the real settings module."""
    from jungle import settings as real

    assert real.PASSWORD_HASHERS[0].endswith("Argon2PasswordHasher")


def test_client_ip_trusts_only_configured_proxies(rf, settings) -> None:
    request = rf.get("/", HTTP_X_FORWARDED_FOR="6.6.6.6, 1.2.3.4", REMOTE_ADDR="10.0.0.1")
    settings.TRUSTED_PROXY_COUNT = 0
    assert client_ip(request) == "10.0.0.1"
    settings.TRUSTED_PROXY_COUNT = 1
    assert client_ip(request) == "1.2.3.4"
    settings.TRUSTED_PROXY_COUNT = 5
    assert client_ip(request) == "10.0.0.1"


@pytest.mark.django_db
def test_health(api: Api) -> None:
    response = api.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}
    assert len(response["X-Request-ID"]) >= 8


@pytest.mark.django_db
def test_request_id_is_echoed_when_valid(api: Api) -> None:
    assert (
        api.get("/health", HTTP_X_REQUEST_ID="abc12345-trace")["X-Request-ID"] == "abc12345-trace"
    )
    assert api.get("/health", HTTP_X_REQUEST_ID="bad id!")["X-Request-ID"] != "bad id!"


@pytest.mark.django_db
def test_health_reports_database_failure(api: Api, monkeypatch: pytest.MonkeyPatch) -> None:
    from jungle.core import api as core_api

    class Broken:
        def cursor(self) -> None:
            raise RuntimeError("down")

    monkeypatch.setattr(core_api, "connection", Broken())
    response = api.get("/health")
    assert response.status_code == 503
    assert response.json()["database"] == "unavailable"


@pytest.mark.django_db
def test_validation_errors_use_stable_shape(api: Api) -> None:
    """ADR-0018: errors are codes + params, never free text."""
    response = api.post("/auth/login", {"email": "x@example.test"})
    assert response.status_code == 422
    body = response.json()["error"]
    assert body["code"] == "validation.invalid"
    assert {"loc": ["body", "payload", "password"], "type": "missing"} in body["params"]["errors"]


@pytest.mark.django_db
def test_unauthenticated_access_returns_auth_required(api: Api) -> None:
    response = api.get("/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "auth.required"


@pytest.mark.django_db
def test_query_parameter_limits_are_enforced(api: Api, staff) -> None:
    from jungle.core.permissions import Role

    staff(Role.ADMIN)
    assert api.get("/staff/users?limit=500").status_code == 422
    assert api.get("/staff/audit?offset=-1").status_code == 422
    assert api.get("/legal/documents/terms?language=de").status_code == 422
    assert api.get("/staff/users?limit=100").status_code == 200
