import pytest
from django.core import mail
from django.test import Client

from jungle.accounts.models import MfaRecoveryCode, User
from jungle.accounts.services.authz import MFA_SESSION_KEY
from jungle.audit.models import AuditLog
from jungle.conftest import Api, enable_totp, error_code, grant
from jungle.core.permissions import Role

pytestmark = pytest.mark.django_db
PASSWORD = "Parola-Sigura-2026"


def login(api: Api, email: str, password: str = PASSWORD, otp: str | None = None):
    return api.post("/auth/login", {"email": email, "password": password, "otp_code": otp})


def test_client_login_and_logout(api: Api, make_user) -> None:
    make_user("client@example.test")
    response = login(api, "  CLIENT@example.test ")
    assert response.status_code == 200
    assert response.json()["mfa_setup_required"] is False
    assert api.get("/auth/session").json()["authenticated"] is True
    assert api.post("/auth/logout").status_code == 200
    assert api.get("/auth/session").json() == {"authenticated": False, "user": None}
    assert AuditLog.objects.filter(action="auth.login").exists()
    assert AuditLog.objects.filter(action="auth.logout").exists()


def test_wrong_password_is_generic_and_audited(api: Api, make_user) -> None:
    make_user("client@example.test")
    for email in ("client@example.test", "nobody@example.test"):
        response = login(api, email, "wrong-password")
        assert response.status_code == 401
        assert error_code(response) == "auth.invalid_credentials"
    assert AuditLog.objects.filter(action="auth.login_failed").count() == 2


def test_lockout_after_five_failures_then_unlocks(api: Api, make_user, time_machine) -> None:
    """§12.1: temporary lock after failed attempts (defaults: 5 attempts, 15 minutes)."""
    time_machine.move_to("2026-10-01T10:00:00+03:00", tick=False)
    make_user("client@example.test")
    for _ in range(5):
        assert login(api, "client@example.test", "wrong").status_code == 401
    response = login(api, "client@example.test")  # right password, still locked
    assert response.status_code == 429
    assert response.json()["error"] == {
        "code": "auth.locked",
        "params": {"retry_after_seconds": 900},
    }
    time_machine.move_to("2026-10-01T10:15:01+03:00", tick=False)
    assert login(api, "client@example.test").status_code == 200


def test_ip_limit_blocks_spraying_many_accounts(api: Api, settings) -> None:
    for n in range(50):
        login(api, f"victim{n}@example.test", "wrong")
    assert error_code(login(api, "another@example.test", "wrong")) == "auth.locked"


def test_inactive_and_passwordless_accounts_cannot_log_in(api: Api, make_user) -> None:
    make_user("off@example.test", is_active=False)
    make_user("guest@example.test", password=None)
    assert error_code(login(api, "off@example.test")) == "auth.invalid_credentials"
    assert error_code(login(api, "guest@example.test", "")) in {
        "auth.invalid_credentials",
        "validation.invalid",
    }


def test_staff_without_2fa_gets_limited_session_and_must_enrol(api: Api, make_user) -> None:
    user = make_user("staff@example.test")
    grant(user, Role.ADMIN)
    response = login(api, "staff@example.test")
    assert response.json()["mfa_setup_required"] is True
    assert response.json()["user"]["mfa_verified"] is False
    blocked = api.get("/staff/users")
    assert blocked.status_code == 403
    assert error_code(blocked) == "auth.mfa_required"

    setup = api.post("/auth/mfa/setup").json()
    import pyotp

    totp = pyotp.TOTP(setup["secret"])
    assert "Jungle%20Padel" in setup["otpauth_uri"]
    assert error_code(api.post("/auth/mfa/confirm", {"code": "000000"})) == "auth.mfa_code_invalid"
    codes = api.post("/auth/mfa/confirm", {"code": totp.now()}).json()["recovery_codes"]
    assert len(codes) == 10
    assert len(set(codes)) == 10
    assert api.get("/staff/users").status_code == 200
    assert error_code(api.post("/auth/mfa/setup")) == "mfa.already_enabled"
    assert MfaRecoveryCode.objects.filter(user=user).count() == 10


def test_confirm_without_setup_is_refused(api: Api, make_user, client: Client) -> None:
    client.force_login(make_user())
    assert error_code(api.post("/auth/mfa/confirm", {"code": "123456"})) == "mfa.setup_not_started"


def test_staff_with_2fa_needs_code_and_codes_cannot_be_replayed(
    api: Api, make_user, time_machine, client
) -> None:
    time_machine.move_to("2026-10-01T10:00:00+03:00", tick=False)
    user = make_user("staff@example.test")
    grant(user, Role.MANAGER)
    totp = enable_totp(user)
    assert error_code(login(api, "staff@example.test")) == "auth.mfa_code_required"
    assert error_code(login(api, "staff@example.test", otp="000000")) == "auth.mfa_code_invalid"
    code = totp.now()
    response = login(api, "staff@example.test", otp=code)
    assert response.status_code == 200
    assert response.json()["user"]["mfa_verified"] is True
    assert client.session.get_expiry_age() == 8 * 3600  # short staff sessions
    api.post("/auth/logout")
    assert (
        error_code(login(api, "staff@example.test", otp=code)) == "auth.mfa_code_invalid"
    )  # replay


def test_recovery_code_works_once(api: Api, make_user) -> None:
    from jungle.accounts.services.mfa import issue_recovery_codes

    user = make_user("staff@example.test")
    grant(user, Role.RECEPTION)
    enable_totp(user)
    code = issue_recovery_codes(user)[0]
    assert login(api, "staff@example.test", otp=code.lower()).status_code == 200
    api.post("/auth/logout")
    assert error_code(login(api, "staff@example.test", otp=code)) == "auth.mfa_code_invalid"


def test_reset_mfa_command_removes_second_factor(make_user) -> None:
    from django.core.management import call_command

    user = make_user("staff@example.test")
    enable_totp(user)
    call_command("reset_mfa", email="staff@example.test", reason="telefon pierdut")
    user.refresh_from_db()
    assert user.totp_confirmed_at is None
    assert user.totp_secret == ""
    assert AuditLog.objects.filter(action="mfa.reset", reason="telefon pierdut").exists()


def test_password_reset_does_not_reveal_accounts(api: Api, make_user) -> None:
    make_user("client@example.test")
    assert api.post("/auth/password-reset", {"email": "nobody@example.test"}).status_code == 202
    assert len(mail.outbox) == 0
    assert api.post("/auth/password-reset", {"email": "Client@example.test"}).status_code == 202
    assert len(mail.outbox) == 1
    for _ in range(5):
        api.post("/auth/password-reset", {"email": "client@example.test"})
    assert len(mail.outbox) == 3  # at most 3 per hour, silently


def test_password_reset_confirm_sets_password_verifies_email_and_is_single_use(
    api: Api, make_user
) -> None:
    from jungle.accounts.services.emails import password_reset_params

    user = make_user("client@example.test")
    params = password_reset_params(user)
    body = {**params, "new_password": "Noua-Parola-Jungle-9"}
    assert api.post("/auth/password-reset/confirm", body).status_code == 200
    user.refresh_from_db()
    assert user.check_password("Noua-Parola-Jungle-9")
    assert user.email_verified_at is not None
    assert error_code(api.post("/auth/password-reset/confirm", body)) == "accounts.token_invalid"


def test_password_reset_confirm_rejects_bad_uid_and_weak_password(api: Api, make_user) -> None:
    from jungle.accounts.services.emails import password_reset_params

    user = make_user("client@example.test")
    params = password_reset_params(user)
    bad = {"uid": "!!", "token": params["token"], "new_password": "Noua-Parola-Jungle-9"}
    assert error_code(api.post("/auth/password-reset/confirm", bad)) == "accounts.token_invalid"
    weak = {**params, "new_password": "123"}
    assert error_code(api.post("/auth/password-reset/confirm", weak)) == "accounts.password_weak"


def test_change_password_keeps_session(api: Api, make_user, client: Client) -> None:
    user = make_user("client@example.test")
    client.force_login(user)
    wrong = {"current_password": "nope", "new_password": "Alta-Parola-Buna-7"}
    assert error_code(api.post("/me/password", wrong)) == "accounts.current_password_incorrect"
    ok = {"current_password": PASSWORD, "new_password": "Alta-Parola-Buna-7"}
    assert api.post("/me/password", ok).status_code == 200
    assert api.get("/me").status_code == 200
    user.refresh_from_db()
    assert user.check_password("Alta-Parola-Buna-7")


def test_update_own_profile(api: Api, make_user, client: Client) -> None:
    client.force_login(make_user("client@example.test"))
    response = api.patch(
        "/me", {"first_name": "Ion", "phone": "+40 733 000 111", "preferred_language": "en"}
    )
    assert response.status_code == 200
    assert response.json()["first_name"] == "Ion"
    assert response.json()["phone"] == "+40733000111"
    assert response.json()["preferred_language"] == "en"
    assert error_code(api.patch("/me", {"phone": "12345"})) == "accounts.phone_invalid"
    assert AuditLog.objects.filter(action="accounts.profile_updated").count() == 1


def test_deactivated_user_loses_access(api: Api, make_user, client: Client) -> None:
    user = make_user()
    client.force_login(user)
    User.objects.filter(pk=user.pk).update(is_active=False)
    assert api.get("/me").status_code == 401


def test_session_mfa_flag_is_not_settable_by_client(api: Api, make_user, client: Client) -> None:
    user = make_user()
    grant(user, Role.ADMIN)
    client.force_login(user)
    assert client.session.get(MFA_SESSION_KEY) is None
    assert error_code(api.get("/staff/users")) == "auth.mfa_required"
