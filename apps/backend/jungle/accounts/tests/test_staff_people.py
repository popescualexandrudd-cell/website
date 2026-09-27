from datetime import date

import pytest
from django.core import mail

from jungle.accounts.models import AccountType, GuardianLink, User, UserRole
from jungle.audit.models import AuditLog
from jungle.configuration.models import FeatureFlag
from jungle.conftest import Api, error_code, grant
from jungle.core.permissions import Role

pytestmark = pytest.mark.django_db
GUEST = {
    "first_name": "Dan",
    "last_name": "Ionescu",
    "phone": "0744111222",
    "email": "dan@example.test",
}


def test_q8_reception_creates_guest_account_and_claim_email(
    api: Api, staff, django_capture_on_commit_callbacks
) -> None:
    staff(Role.RECEPTION)
    with django_capture_on_commit_callbacks(execute=True):
        response = api.post("/staff/guests", GUEST)
    assert response.status_code == 201
    guest = User.objects.get(email="dan@example.test")
    assert guest.account_type == AccountType.GUEST
    assert not guest.has_usable_password()
    assert mail.outbox[0].subject == "Contul tău Jungle Padel este gata"
    assert "/ro/cont/parola-noua?uid=" in mail.outbox[0].body
    assert error_code(api.post("/staff/guests", GUEST)) == "accounts.email_taken"


def test_q8_guest_accounts_follow_feature_flag(api: Api, staff) -> None:
    staff(Role.RECEPTION)
    FeatureFlag.objects.update_or_create(key="guest_quick_accounts", defaults={"enabled": False})
    response = api.post("/staff/guests", GUEST)
    assert response.status_code == 403
    assert response.json()["error"] == {
        "code": "feature.disabled",
        "params": {"flag": "guest_quick_accounts"},
    }


def test_coach_cannot_create_guests(api: Api, staff) -> None:
    staff(Role.COACH)
    assert error_code(api.post("/staff/guests", GUEST)) == "auth.forbidden"


def test_q7_child_accounts_are_off_until_enabled(api: Api, make_user, client) -> None:
    client.force_login(make_user())
    child = {"first_name": "Mara", "last_name": "Popa", "date_of_birth": "2016-06-01"}
    assert error_code(api.post("/me/children", child)) == "feature.disabled"


def test_q7_guardian_creates_and_lists_children(api: Api, make_user, client) -> None:
    FeatureFlag.objects.update_or_create(key="child_accounts", defaults={"enabled": True})
    parent = make_user(date_of_birth=date(1985, 1, 1))
    client.force_login(parent)
    response = api.post(
        "/me/children", {"first_name": "Mara", "last_name": "Popa", "date_of_birth": "2016-06-01"}
    )
    assert response.status_code == 201
    child = User.objects.get(pk=response.json()["id"])
    assert child.account_type == AccountType.CHILD
    assert child.email is None
    assert GuardianLink.objects.filter(guardian=parent, child=child).exists()
    assert [c["first_name"] for c in api.get("/me/children").json()] == ["Mara"]
    adult = {"first_name": "X", "last_name": "Y", "date_of_birth": "2000-01-01"}
    assert error_code(api.post("/me/children", adult)) == "accounts.child_not_minor"


def test_q7_minor_or_unknown_age_cannot_be_guardian(api: Api, make_user, client) -> None:
    FeatureFlag.objects.update_or_create(key="child_accounts", defaults={"enabled": True})
    client.force_login(make_user(date_of_birth=None))
    body = {"first_name": "Mara", "last_name": "Popa", "date_of_birth": "2016-06-01"}
    assert error_code(api.post("/me/children", body)) == "accounts.guardian_not_adult"


def test_r004_staff_sees_user_details_with_consents(api: Api, staff, make_user) -> None:
    staff(Role.RECEPTION)
    target = make_user(
        "ana@example.test", first_name="Ana", last_name="Zamfir", email_verified_at=None
    )
    page = api.get("/staff/users?q=zamfir").json()
    assert page["total"] == 1
    assert page["items"][0]["email"] == "ana@example.test"
    detail = api.get(f"/staff/users/{target.pk}").json()
    assert detail["created_at"]
    assert detail["email_verified_at"] is None
    assert detail["consents"] == []
    assert (
        error_code(api.get("/staff/users/00000000-0000-0000-0000-000000000000"))
        == "accounts.not_found"
    )


def test_roles_are_granted_and_revoked_by_admin_only(api: Api, staff, make_user, location) -> None:
    staff(Role.ADMIN)
    target = make_user()
    response = api.post(
        f"/staff/users/{target.pk}/roles", {"role": "coach", "location_id": str(location.pk)}
    )
    assert response.status_code == 201
    role_id = response.json()["id"]
    dup = api.post(
        f"/staff/users/{target.pk}/roles", {"role": "coach", "location_id": str(location.pk)}
    )
    assert error_code(dup) == "roles.already_granted"
    assert api.post(f"/staff/roles/{role_id}/revoke", {"reason": "plecat"}).status_code == 200
    assert not UserRole.objects.filter(pk=role_id).exists()
    assert (
        error_code(api.post(f"/staff/roles/{role_id}/revoke", {"reason": "x"})) == "roles.not_found"
    )
    assert AuditLog.objects.filter(action="roles.granted").exists()
    assert AuditLog.objects.filter(action="roles.revoked", reason="plecat").exists()
    bad = api.post(
        f"/staff/users/{target.pk}/roles",
        {"role": "coach", "location_id": "00000000-0000-0000-0000-000000000000"},
    )
    assert error_code(bad) == "locations.not_found"


def test_global_admin_role_duplicate_is_refused_by_database(make_user) -> None:
    from django.db import IntegrityError, transaction

    user = make_user()
    grant(user, Role.ADMIN)
    with pytest.raises(IntegrityError), transaction.atomic():
        grant(user, Role.ADMIN)


def test_manager_cannot_manage_roles(api: Api, staff, make_user) -> None:
    staff(Role.MANAGER)
    assert (
        error_code(api.post(f"/staff/users/{make_user().pk}/roles", {"role": "admin"}))
        == "auth.forbidden"
    )


def test_last_admin_cannot_be_removed_or_deactivated(api: Api, staff) -> None:
    admin = staff(Role.ADMIN)
    role_id = admin.roles.get().pk
    assert (
        error_code(api.post(f"/staff/roles/{role_id}/revoke", {"reason": "x"}))
        == "roles.last_admin"
    )
    response = api.post(f"/staff/users/{admin.pk}/active", {"is_active": False, "reason": "test"})
    assert error_code(response) == "roles.last_admin"


def test_admin_deactivates_and_reactivates_user(api: Api, staff, make_user) -> None:
    staff(Role.ADMIN)
    target = make_user()
    assert (
        api.post(
            f"/staff/users/{target.pk}/active", {"is_active": False, "reason": "cerere"}
        ).json()["is_active"]
        is False
    )
    assert (
        api.post(
            f"/staff/users/{target.pk}/active", {"is_active": True, "reason": "revenire"}
        ).json()["is_active"]
        is True
    )
    assert AuditLog.objects.filter(action="accounts.deactivated", target_id=str(target.pk)).exists()


def test_bootstrap_admin_command(capsys, monkeypatch) -> None:
    from django.core.management import CommandError, call_command

    monkeypatch.setenv("JUNGLE_ADMIN_PASSWORD", "Admin-Jungle-Padel-2026")
    call_command(
        "bootstrap_admin", email="Boss@Example.test", first_name="Boss", last_name="Jungle"
    )
    out = capsys.readouterr().out
    assert "otpauth://totp/" in out
    user = User.objects.get(email="boss@example.test")
    assert user.has_global_admin_role()
    assert user.totp_confirmed_at is not None
    with pytest.raises(CommandError):
        call_command("bootstrap_admin", email="boss@example.test", first_name="B", last_name="J")
    monkeypatch.setenv("JUNGLE_ADMIN_PASSWORD", "123")
    with pytest.raises(CommandError, match="too weak"):
        call_command("bootstrap_admin", email="other@example.test", first_name="B", last_name="J")
    monkeypatch.delenv("JUNGLE_ADMIN_PASSWORD")
    with pytest.raises(CommandError, match="Set the password"):
        call_command("bootstrap_admin", email="x@example.test", first_name="B", last_name="J")
