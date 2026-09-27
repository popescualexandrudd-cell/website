import json

import pytest
from django.core import mail
from django.core.management import call_command

from jungle.notifications.email import LANGUAGES, TEMPLATES, send_templated_email


def test_export_openapi_contains_every_public_area(tmp_path) -> None:
    """ADR-0007: the TypeScript client is generated from this schema."""
    target = tmp_path / "openapi.json"
    call_command("export_openapi", output=str(target))
    schema = json.loads(target.read_text(encoding="utf-8"))
    paths = set(schema["paths"])
    for expected in (
        "/api/v1/health",
        "/api/v1/auth/login",
        "/api/v1/me",
        "/api/v1/locations",
        "/api/v1/staff/users",
        "/api/v1/staff/pending-decisions",
        "/api/v1/legal/documents/{kind}",
    ):
        assert expected in paths


def test_export_openapi_to_stdout(capsys) -> None:
    call_command("export_openapi", output="-")
    assert json.loads(capsys.readouterr().out)["info"]["title"] == "Jungle Padel API"


@pytest.mark.parametrize("template", TEMPLATES)
@pytest.mark.parametrize("language", LANGUAGES)
def test_r140_every_email_exists_in_ro_and_en(template: str, language: str) -> None:
    send_templated_email(
        template,
        "x@example.test",
        language,
        {"first_name": "Ana", "link": "https://x", "ttl_hours": 48},
    )
    message = mail.outbox[-1]
    assert message.subject
    assert "\n" not in message.subject
    assert "Ana" in message.body
    assert "https://x" in message.body


def test_unknown_language_falls_back_to_romanian_and_unknown_template_fails() -> None:
    send_templated_email(
        "verify_email", "x@example.test", "de", {"first_name": "A", "link": "L", "ttl_hours": 1}
    )
    assert mail.outbox[-1].subject.startswith("Confirmă")
    with pytest.raises(ValueError, match="unknown email template"):
        send_templated_email("nope", "x@example.test", "ro", {})
