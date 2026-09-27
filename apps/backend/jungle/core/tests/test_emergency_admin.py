"""§8.6: the Django admin is an emergency tool — Admin role and 2FA only; changes audited."""

from typing import Any

import pytest
from django.test import Client

from jungle.audit.models import AuditLog
from jungle.conftest import enable_totp, grant
from jungle.core.permissions import Role
from jungle.locations.models import Location

pytestmark = pytest.mark.django_db
PASSWORD = "Parola-Sigura-2026"


def admin_login(client: Client, email: str, otp: str) -> Any:
    return client.post(
        "/django-admin/login/", {"username": email, "password": PASSWORD, "otp_code": otp}
    )


def test_admin_with_2fa_can_log_in_and_changes_are_audited(
    client: Client, make_user, time_machine
) -> None:
    time_machine.move_to("2026-10-01T10:00:00+03:00", tick=False)
    user = make_user("admin@example.test")
    grant(user, Role.ADMIN)
    totp = enable_totp(user)
    response = admin_login(client, "Admin@example.test", totp.now())
    assert response.status_code == 302
    assert client.get("/django-admin/").status_code == 200
    assert client.get("/django-admin/audit/auditlog/").status_code == 200
    created = client.post(
        "/django-admin/locations/location/add/", {"slug": "noua", "name": "Noua", "is_active": "on"}
    )
    assert created.status_code == 302
    assert AuditLog.objects.filter(action="location.created", reason="django-admin").exists()
    location = Location.objects.get(slug="noua")
    client.post(
        f"/django-admin/locations/location/{location.pk}/change/", {"slug": "noua", "name": "Nouă"}
    )
    assert (AuditLog.objects.get(action="location.updated").before or {})["name"] == "Noua"
    assert client.post(f"/django-admin/locations/location/{location.pk}/delete/").status_code == 403


def test_wrong_code_or_non_admin_is_refused(client: Client, make_user) -> None:
    manager = make_user("manager@example.test")
    grant(manager, Role.MANAGER)
    totp = enable_totp(manager)
    assert admin_login(client, "manager@example.test", totp.now()).status_code == 200  # form error
    admin = make_user("admin@example.test")
    grant(admin, Role.ADMIN)
    enable_totp(admin)
    assert admin_login(client, "admin@example.test", "000000").status_code == 200
    assert client.get("/django-admin/").status_code == 302  # back to login


def test_admin_login_locks_after_failures(client: Client, make_user) -> None:
    admin = make_user("admin@example.test")
    grant(admin, Role.ADMIN)
    totp = enable_totp(admin)
    for _ in range(5):
        client.post(
            "/django-admin/login/",
            {"username": "admin@example.test", "password": "wrong", "otp_code": "1"},
        )
    response = admin_login(client, "admin@example.test", totp.now())
    assert "Prea multe încercări" in response.content.decode()


def test_api_session_without_mfa_cannot_open_admin(client: Client, make_user) -> None:
    from jungle.conftest import login_as

    admin = make_user()
    grant(admin, Role.ADMIN)
    login_as(client, admin, mfa=False)
    assert client.get("/django-admin/").status_code == 302


def test_login_page_shows_the_2fa_field(client: Client) -> None:
    page = client.get("/django-admin/login/").content.decode()
    assert 'name="otp_code"' in page
    assert 'name="username"' in page
    assert 'name="password"' in page
