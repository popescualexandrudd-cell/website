import re
from datetime import date, timedelta

import pytest
from django.core import mail

from jungle.accounts.models import AccountType, User
from jungle.audit.models import AuditLog
from jungle.conftest import Api, error_code
from jungle.core import clock
from jungle.legal.models import Consent, ConsentAction, LegalDocument

pytestmark = pytest.mark.django_db


def payload(**overrides: object) -> dict[str, object]:
    data: dict[str, object] = {
        "email": "Ana.Popa@Example.test",
        "password": "Jungla-Padel-2026!",
        "first_name": " Ana ",
        "last_name": "Popa",
        "phone": "0722 123 456",
        "date_of_birth": "1995-04-12",
        "preferred_language": "ro",
        "accepted_documents": [
            {"kind": "terms", "version": 1, "language": "ro"},
            {"kind": "privacy", "version": 1, "language": "ro"},
        ],
    }
    data.update(overrides)
    return data


def test_r001_r002_register_creates_account_logs_in_and_sends_verification(
    api: Api, legal_docs: None, django_capture_on_commit_callbacks
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        response = api.post("/auth/register", payload())
    assert response.status_code == 201, response.json()
    body = response.json()
    assert body["email"] == "ana.popa@example.test"  # normalised
    assert body["first_name"] == "Ana"
    assert body["phone"] == "+40722123456"  # E.164
    assert body["account_type"] == AccountType.FULL
    assert body["email_verified"] is False
    assert api.get("/me").json()["id"] == body["id"]  # logged in
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["ana.popa@example.test"]
    assert "https://www.example.test/ro/cont/verificare-email?token=" in mail.outbox[0].body
    assert AuditLog.objects.filter(action="accounts.registered", target_id=body["id"]).exists()


def test_r011_mechanism_consents_recorded_with_version_hash_and_language(
    api: Api, legal_docs: None
) -> None:
    body = api.post("/auth/register", payload()).json()
    consents = Consent.objects.filter(user_id=body["id"]).select_related("document")
    assert {c.document.kind for c in consents} == {"terms", "privacy"}
    for consent in consents:
        assert consent.action == ConsentAction.GRANTED
        assert consent.text_sha256 == consent.document.sha256
        assert consent.language == "ro"
        assert consent.ip == "127.0.0.1"


def test_register_in_english_sends_english_email(
    api: Api, legal_docs: None, django_capture_on_commit_callbacks
) -> None:
    docs = [
        {"kind": "terms", "version": 1, "language": "en"},
        {"kind": "privacy", "version": 1, "language": "en"},
    ]
    with django_capture_on_commit_callbacks(execute=True):
        response = api.post(
            "/auth/register", payload(preferred_language="en", accepted_documents=docs)
        )
    assert response.status_code == 201
    assert mail.outbox[0].subject.startswith("Confirm your email")
    assert "/en/account/verify-email?token=" in mail.outbox[0].body


def test_email_is_unique_case_insensitive(api: Api, legal_docs: None, make_user) -> None:
    make_user("ana.popa@example.test")
    response = api.post("/auth/register", payload())
    assert response.status_code == 409
    assert error_code(response) == "accounts.email_taken"


@pytest.mark.parametrize(
    ("field", "value", "code"),
    [
        ("email", "not-an-email", "accounts.email_invalid"),
        ("phone", "12345", "accounts.phone_invalid"),
        ("phone", "abcd", "accounts.phone_invalid"),
        ("password", "short", "accounts.password_weak"),
        ("password", "1234567890123", "accounts.password_weak"),
        ("date_of_birth", "1890-01-01", "accounts.birth_date_invalid"),
    ],
)
def test_invalid_input_is_refused(
    api: Api, legal_docs: None, field: str, value: str, code: str
) -> None:
    response = api.post("/auth/register", payload(**{field: value}))
    assert response.status_code == 400
    assert error_code(response) == code
    assert not User.objects.exists()


def test_birth_date_in_future_is_refused(api: Api, legal_docs: None) -> None:
    tomorrow = clock.today_local() + timedelta(days=1)
    response = api.post("/auth/register", payload(date_of_birth=tomorrow.isoformat()))
    assert error_code(response) == "accounts.birth_date_invalid"


def test_q43_under_minimum_age_must_use_guardian_account(api: Api, legal_docs: None) -> None:
    today = clock.today_local()
    thirteen = date(today.year - 13, today.month, min(today.day, 28))
    response = api.post("/auth/register", payload(date_of_birth=thirteen.isoformat()))
    assert response.status_code == 400
    assert response.json()["error"] == {
        "code": "accounts.too_young_for_self_registration",
        "params": {"min_age": 14},
    }


def test_registration_requires_current_terms_and_privacy(api: Api, legal_docs: None) -> None:
    only_terms = [{"kind": "terms", "version": 1, "language": "ro"}]
    assert (
        error_code(api.post("/auth/register", payload(accepted_documents=only_terms)))
        == "legal.consent_missing"
    )
    outdated = [
        {"kind": "terms", "version": 0, "language": "ro"},
        {"kind": "privacy", "version": 1, "language": "ro"},
    ]
    response = api.post("/auth/register", payload(accepted_documents=outdated))
    assert response.json()["error"] == {
        "code": "legal.consent_outdated",
        "params": {"kind": "terms", "current_version": 1},
    }


def test_registration_blocked_when_no_legal_documents_are_published(api: Api) -> None:
    response = api.post("/auth/register", payload())
    assert response.status_code == 404
    assert error_code(response) == "legal.document_unavailable"


def test_register_requires_csrf_token(client, legal_docs: None) -> None:
    """§12.1: CSRF protection on unauthenticated state-changing endpoints."""
    client.handler.enforce_csrf_checks = True
    api = Api(client)
    response = api.post("/auth/register", payload())
    assert response.status_code == 403
    assert error_code(response) == "auth.csrf_failed"
    token = api.get("/auth/csrf").json()["csrf_token"]
    assert api.post("/auth/register", payload(), HTTP_X_CSRFTOKEN=token).status_code == 201


def test_r002_verify_email_with_link_token(
    api: Api, legal_docs: None, django_capture_on_commit_callbacks
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        api.post("/auth/register", payload())
    match = re.search(r"token=([^\s]+)", str(mail.outbox[0].body))
    assert match is not None
    token = match.group(1)
    from urllib.parse import unquote

    response = api.post("/auth/verify-email", {"token": unquote(token)})
    assert response.status_code == 200
    user = User.objects.get(email="ana.popa@example.test")
    assert user.email_verified_at is not None
    first = user.email_verified_at
    assert (
        api.post("/auth/verify-email", {"token": unquote(token)}).status_code == 200
    )  # idempotent
    user.refresh_from_db()
    assert user.email_verified_at == first
    assert AuditLog.objects.filter(action="accounts.email_verified").count() == 1


def test_verification_token_expires_after_48_hours(api: Api, make_user, time_machine) -> None:
    from jungle.accounts.services.emails import make_verification_token

    time_machine.move_to("2026-10-01T10:00:00+03:00")
    token = make_verification_token(make_user("x@example.test"))
    time_machine.move_to("2026-10-03T10:01:00+03:00")
    assert error_code(api.post("/auth/verify-email", {"token": token})) == "accounts.token_expired"


def test_verification_token_for_old_email_or_tampered_is_invalid(api: Api, make_user) -> None:
    from jungle.accounts.services.emails import make_verification_token

    user = make_user("old@example.test")
    token = make_verification_token(user)
    assert (
        error_code(api.post("/auth/verify-email", {"token": token + "x"}))
        == "accounts.token_invalid"
    )
    user.email = "new@example.test"
    user.save()
    assert error_code(api.post("/auth/verify-email", {"token": token})) == "accounts.token_invalid"


def test_resend_verification_is_rate_limited(api: Api, make_user, client) -> None:
    user = make_user("r@example.test")
    client.force_login(user)
    assert api.post("/auth/verify-email/resend").status_code == 200
    assert len(mail.outbox) == 1
    response = api.post("/auth/verify-email/resend")
    assert response.status_code == 429
    assert error_code(response) == "auth.rate_limited"
    user.email_verified_at = clock.now()
    user.save()
    assert api.post("/auth/verify-email/resend").status_code == 200  # already verified: no email
    assert len(mail.outbox) == 1


def test_published_legal_document_is_readable_and_immutable(api: Api, legal_docs: None) -> None:
    body = api.get("/legal/documents/privacy?language=en").json()
    assert body["kind"] == "privacy"
    assert body["version"] == 1
    assert body["language"] == "en"
    from django.db import DatabaseError, transaction

    with pytest.raises(DatabaseError), transaction.atomic():
        LegalDocument.objects.filter(kind="privacy").update(body="changed")


def test_registrations_are_limited_per_ip(api: Api, legal_docs: None) -> None:
    """§12.1: rate limiting against mass account creation (10 per hour per IP)."""
    for n in range(10):
        assert api.post("/auth/register", payload(email=f"u{n}@example.test")).status_code == 201
        api.post("/auth/logout")
    response = api.post("/auth/register", payload(email="u10@example.test"))
    assert response.status_code == 429
    assert error_code(response) == "auth.rate_limited"
