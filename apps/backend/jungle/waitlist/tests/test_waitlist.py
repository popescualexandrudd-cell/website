import re
from urllib.parse import unquote

import pytest
from django.core import mail
from django.core.management import CommandError, call_command
from django.db import IntegrityError, transaction

from jungle.audit.models import AuditLog
from jungle.audit.services import SYSTEM
from jungle.conftest import Api, error_code
from jungle.core.permissions import Role
from jungle.legal.models import DocumentKind
from jungle.legal.services import publish_document
from jungle.waitlist.models import Status, WaitlistEntry
from jungle.waitlist.services import csv_safe, purge_unconfirmed

pytestmark = pytest.mark.django_db


@pytest.fixture
def notice(db: None) -> None:
    for lang in ("ro", "en"):
        publish_document(SYSTEM, DocumentKind.WAITLIST_NOTICE, lang, f"Nota {lang}", f"text {lang}")


def body(**overrides: object) -> dict[str, object]:
    data: dict[str, object] = {
        "email": "Maria@Example.test",
        "name": "Maria Ionescu",
        "level": "intermediate",
        "language": "ro",
        "notice_version": 1,
        "accepted_notice": True,
        "source": "instagram",
    }
    data.update(overrides)
    return data


def signup(api: Api, capture, **overrides: object):
    with capture(execute=True):
        return api.post("/waitlist", body(**overrides))


def token_from(message: object, path: str) -> str:
    match = re.search(re.escape(path) + r"\?token=([^\s]+)", str(message))
    assert match is not None
    return unquote(match.group(1))


def test_signup_is_pending_until_email_confirmed(
    api: Api, notice: None, django_capture_on_commit_callbacks
) -> None:
    response = signup(api, django_capture_on_commit_callbacks)
    assert response.status_code == 202
    assert response.json() == {"status": "check_email"}
    entry = WaitlistEntry.objects.get()
    assert entry.status == Status.PENDING
    assert entry.email == "maria@example.test"
    assert entry.level == "intermediate"
    assert entry.notice_sha256 == entry.notice.sha256
    assert entry.consent_ip == "127.0.0.1"
    assert mail.outbox[0].subject == "Confirmă înscrierea pe lista Jungle Padel"
    assert "/ro/lista/dezabonare?token=" in mail.outbox[0].body


def test_confirm_then_welcome_email(
    api: Api, notice: None, django_capture_on_commit_callbacks
) -> None:
    signup(api, django_capture_on_commit_callbacks)
    token = token_from(mail.outbox[0].body, "/ro/lista/confirmare")
    with django_capture_on_commit_callbacks(execute=True):
        response = api.post("/waitlist/confirm", {"token": token})
    assert response.json() == {"status": "confirmed", "language": "ro"}
    assert WaitlistEntry.objects.get().confirmed_at is not None
    assert mail.outbox[1].subject.startswith("Ești pe listă")
    assert api.post("/waitlist/confirm", {"token": token}).status_code == 200  # idempotent
    assert len(mail.outbox) == 2


def test_english_signup_gets_english_email(
    api: Api, notice: None, django_capture_on_commit_callbacks
) -> None:
    signup(api, django_capture_on_commit_callbacks, language="en")
    assert mail.outbox[0].subject == "Confirm your spot on the Jungle Padel list"
    assert "/en/waitlist/confirm?token=" in mail.outbox[0].body


def test_confirmation_link_expires_after_7_days(
    api: Api, notice: None, django_capture_on_commit_callbacks, time_machine
) -> None:
    time_machine.move_to("2026-10-01T10:00:00+03:00", tick=False)
    signup(api, django_capture_on_commit_callbacks)
    token = token_from(mail.outbox[0].body, "/ro/lista/confirmare")
    time_machine.move_to("2026-10-08T10:00:01+03:00", tick=False)
    assert error_code(api.post("/waitlist/confirm", {"token": token})) == "waitlist.token_expired"
    assert (
        error_code(api.post("/waitlist/confirm", {"token": "garbage"})) == "waitlist.token_invalid"
    )


def test_unsubscribe_erases_personal_data_and_allows_new_signup(
    api: Api, notice: None, django_capture_on_commit_callbacks
) -> None:
    """§12.2: withdrawing consent erases the data; only the email hash remains."""
    signup(api, django_capture_on_commit_callbacks)
    unsubscribe = token_from(mail.outbox[0].body, "/ro/lista/dezabonare")
    confirm = token_from(mail.outbox[0].body, "/ro/lista/confirmare")
    assert api.post("/waitlist/unsubscribe", {"token": unsubscribe}).status_code == 200
    entry = WaitlistEntry.objects.get()
    assert entry.status == Status.WITHDRAWN
    assert (entry.email, entry.name, entry.level) == (None, "", "")
    assert entry.email_sha256
    assert (
        api.post("/waitlist/unsubscribe", {"token": unsubscribe}).status_code == 200
    )  # idempotent
    assert error_code(api.post("/waitlist/confirm", {"token": confirm})) == "waitlist.token_invalid"
    signup(api, django_capture_on_commit_callbacks)
    entry.refresh_from_db()
    assert entry.status == Status.PENDING
    assert WaitlistEntry.objects.count() == 1


def test_repeated_signup_reveals_nothing_and_does_not_spam(
    api: Api, notice: None, django_capture_on_commit_callbacks, time_machine
) -> None:
    time_machine.move_to("2026-10-01T10:00:00+03:00", tick=False)
    signup(api, django_capture_on_commit_callbacks)
    assert signup(api, django_capture_on_commit_callbacks).json() == {"status": "check_email"}
    assert len(mail.outbox) == 1  # resend cooldown 10 minutes
    time_machine.move_to("2026-10-01T10:11:00+03:00", tick=False)
    signup(api, django_capture_on_commit_callbacks)
    assert len(mail.outbox) == 2
    WaitlistEntry.objects.update(status=Status.CONFIRMED)
    assert signup(api, django_capture_on_commit_callbacks).status_code == 202
    assert len(mail.outbox) == 2


def test_honeypot_and_rate_limit(
    api: Api, notice: None, django_capture_on_commit_callbacks
) -> None:
    assert signup(api, django_capture_on_commit_callbacks, website="http://spam").status_code == 202
    assert not WaitlistEntry.objects.exists()
    for n in range(5):
        signup(api, django_capture_on_commit_callbacks, email=f"p{n}@example.test")
    response = signup(api, django_capture_on_commit_callbacks, email="p6@example.test")
    assert response.status_code == 429
    assert error_code(response) == "auth.rate_limited"


def test_consent_and_input_are_validated(
    api: Api, notice: None, django_capture_on_commit_callbacks
) -> None:
    assert (
        error_code(signup(api, django_capture_on_commit_callbacks, accepted_notice=False))
        == "legal.consent_missing"
    )
    outdated = signup(api, django_capture_on_commit_callbacks, notice_version=2)
    assert error_code(outdated) == "legal.consent_outdated"
    assert (
        error_code(signup(api, django_capture_on_commit_callbacks, email="nope"))
        == "accounts.email_invalid"
    )
    assert signup(api, django_capture_on_commit_callbacks, level="pro").status_code == 422
    assert (
        signup(
            api, django_capture_on_commit_callbacks, level=None, email="nolevel@example.test"
        ).status_code
        == 202
    )


def test_signup_without_published_notice_is_refused(api: Api) -> None:
    response = api.post("/waitlist", body())
    assert error_code(response) == "legal.document_unavailable"


def test_purge_deletes_only_stale_unconfirmed(
    notice: None, time_machine, api: Api, django_capture_on_commit_callbacks
) -> None:
    time_machine.move_to("2026-10-01T10:00:00+03:00", tick=False)
    signup(api, django_capture_on_commit_callbacks, email="old@example.test")
    signup(api, django_capture_on_commit_callbacks, email="kept@example.test")
    WaitlistEntry.objects.filter(email="kept@example.test").update(status=Status.CONFIRMED)
    time_machine.move_to("2026-10-09T10:00:00+03:00", tick=False)
    assert purge_unconfirmed(SYSTEM) == 1
    assert list(WaitlistEntry.objects.values_list("email", flat=True)) == ["kept@example.test"]
    assert AuditLog.objects.filter(action="waitlist.purged_unconfirmed").exists()
    call_command("purge_waitlist")


def test_staff_list_stats_and_csv_export(
    api: Api, notice: None, staff, django_capture_on_commit_callbacks
) -> None:
    signup(api, django_capture_on_commit_callbacks, name="=HYPERLINK(1)")
    WaitlistEntry.objects.update(status=Status.CONFIRMED)
    staff(Role.MANAGER)
    assert api.get("/staff/waitlist?status=confirmed").json()["total"] == 1
    stats = api.get("/staff/waitlist/stats").json()
    assert stats["by_status"]["confirmed"] == 1
    assert stats["confirmed_by_level"]["intermediate"] == 1
    assert stats["confirmed_by_level"]["unspecified"] == 0
    csv_response = api.get("/staff/waitlist/export.csv")
    assert csv_response["Content-Type"].startswith("text/csv")
    text = csv_response.content.decode()
    assert text.splitlines()[0] == "email,name,level,language,source,confirmed_at"
    assert "'=HYPERLINK(1)" in text  # formula injection neutralised
    assert AuditLog.objects.filter(action="waitlist.exported").exists()


def test_reception_cannot_see_waitlist(api: Api, staff) -> None:
    staff(Role.RECEPTION)
    assert error_code(api.get("/staff/waitlist")) == "auth.forbidden"
    assert error_code(api.get("/staff/waitlist/export.csv")) == "auth.forbidden"


def test_csv_safe() -> None:
    assert csv_safe("=1+1") == "'=1+1"
    assert csv_safe("@cmd") == "'@cmd"
    assert csv_safe("Maria") == "Maria"


def test_email_hash_is_unique_in_database(notice: None) -> None:
    from jungle.legal.models import LegalDocument

    doc = LegalDocument.objects.get(kind=DocumentKind.WAITLIST_NOTICE, language="ro")
    WaitlistEntry.objects.create(
        email="a@example.test", email_sha256="x", notice=doc, notice_sha256="y"
    )
    with pytest.raises(IntegrityError), transaction.atomic():
        WaitlistEntry.objects.create(
            email="b@example.test", email_sha256="x", notice=doc, notice_sha256="y"
        )


def test_publish_legal_document_command_refuses_placeholders(tmp_path) -> None:
    from django.conf import settings

    source = (
        settings.REPO_ROOT
        / "docs/07-securitate-gdpr-legal/texte/nota-informare-lista-asteptare.ro.md"
    )
    with pytest.raises(CommandError, match="DE_CONFIRMAT"):
        call_command(
            "publish_legal_document", kind="waitlist_notice", language="ro", file=str(source)
        )
    call_command(
        "publish_legal_document", kind="waitlist_notice", language="ro", file=str(source), demo=True
    )
    bad = tmp_path / "bad.md"
    bad.write_text("no marker")
    with pytest.raises(CommandError, match="missing"):
        call_command("publish_legal_document", kind="terms", language="ro", file=str(bad))
    bad.write_text("<!-- PUBLIC TEXT BELOW -->\nno title")
    with pytest.raises(CommandError, match="title"):
        call_command("publish_legal_document", kind="terms", language="ro", file=str(bad))
    good = tmp_path / "good.md"
    good.write_text("<!-- PUBLIC TEXT BELOW -->\n# Titlu\nText final.")
    call_command("publish_legal_document", kind="terms", language="ro", file=str(good))


def test_data_minimisation_only_name_email_and_optional_level(
    api: Api, notice: None, django_capture_on_commit_callbacks
) -> None:
    """Owner's request 27.09.2026: the pre-registration asks for nothing more."""
    assert {f.name for f in WaitlistEntry._meta.get_fields()}.isdisjoint({"phone", "interests"})
    response = signup(
        api, django_capture_on_commit_callbacks, phone="0722111222", interests=["padel"]
    )
    assert response.status_code == 202  # unknown fields are ignored, never stored


def test_service_rejects_unknown_level() -> None:
    from django.test import RequestFactory

    from jungle.core.errors import DomainError
    from jungle.waitlist.services import SignupData
    from jungle.waitlist.services import signup as do_signup

    request = RequestFactory().post("/")
    data = SignupData(
        email="a@example.test", name="A", level="pro", language="ro", notice_version=1
    )
    with pytest.raises(DomainError):
        do_signup(request, data)
