"""The website's texts changed from the panel (§8.6, Stage 11): a draft, then publication with a
reason, the default text back; only `web.…` texts, only with `content.manage`, every step audited,
the website asked to refresh after a published change."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest

from jungle.accounts.models import User
from jungle.audit.models import AuditLog
from jungle.configuration import web
from jungle.conftest import Api, error_code
from jungle.content.models import TextOverride
from jungle.core.permissions import Role

pytestmark = pytest.mark.django_db
Staff = Callable[..., User]
KEY = "web.site.hero.title"


@pytest.fixture
def refreshed(monkeypatch: pytest.MonkeyPatch) -> list[list[str]]:
    calls: list[list[str]] = []

    def revalidate(tags: list[str]) -> bool:
        calls.append(tags)
        return True

    monkeypatch.setattr(web, "revalidate", revalidate)
    return calls


def body(club: Any, **fields: Any) -> dict[str, Any]:
    return {"location_id": str(club.location.id), "key": KEY, "language": "ro", **fields}


def test_a_draft_then_published_then_the_default_back(
    api: Api,
    club: Any,
    staff: Staff,
    refreshed: list[list[str]],
    django_capture_on_commit_callbacks: Any,
) -> None:
    manager = staff(Role.MANAGER, club.location)
    saved = api.post("/staff/content/texts", body(club, text="  Intră în junglă!  ")).json()
    assert saved["draft"] == "Intră în junglă!" and saved["published"] == ""
    assert saved["updated_by"] == manager.full_name
    assert api.get("/content/texts?language=ro").json() == {}  # a draft is not on the website

    no_reason = api.post("/staff/content/texts/publish", body(club))
    assert error_code(no_reason) == "validation.invalid"
    with django_capture_on_commit_callbacks(execute=True):
        live = api.post("/staff/content/texts/publish", body(club, reason="Campania")).json()
    assert (live["published"], live["draft"]) == ("Intră în junglă!", "")
    assert live["published_at"] is not None and refreshed == [["content"]]
    assert api.get("/content/texts?language=ro").json() == {KEY: "Intră în junglă!"}
    assert api.get("/content/texts?language=en").json() == {}
    again = api.post("/staff/content/texts/publish", body(club, reason="Încă o dată"))
    assert again.status_code == 409 and error_code(again) == "content.no_draft"

    # a second draft over a published text, discarded: the published one stays
    api.post("/staff/content/texts", body(club, text="Alt titlu"))
    [row] = api.get(f"/staff/content/texts?location_id={club.location.id}").json()
    assert (row["draft"], row["published"]) == ("Alt titlu", "Intră în junglă!")
    assert api.post("/staff/content/texts/discard", body(club)).status_code == 200
    assert TextOverride.objects.get().draft == ""
    nothing = api.post("/staff/content/texts/discard", body(club))
    assert error_code(nothing) == "content.no_draft"

    with django_capture_on_commit_callbacks(execute=True):
        restored = api.post("/staff/content/texts/restore", body(club, reason="Revenim"))
    assert restored.status_code == 200 and not TextOverride.objects.exists()
    assert refreshed == [["content"], ["content"]]
    assert error_code(api.post("/staff/content/texts/restore", body(club, reason="x"))) == (
        "content.not_found"
    )
    actions = sorted(
        AuditLog.objects.filter(action__startswith="content.").values_list("action", flat=True)
    )
    assert actions == [
        "content.draft_discarded",
        "content.draft_saved",
        "content.draft_saved",
        "content.published",
        "content.restored",
    ]
    assert str(TextOverride(key=KEY, language="en")) == f"{KEY} (en)"


def test_a_draft_never_published_disappears_and_restoring_it_does_not_refresh(
    api: Api,
    club: Any,
    staff: Staff,
    refreshed: list[list[str]],
    django_capture_on_commit_callbacks: Any,
) -> None:
    staff(Role.MANAGER, club.location)
    api.post("/staff/content/texts", body(club, language="en", text="Into the jungle"))
    assert api.post("/staff/content/texts/discard", body(club, language="en")).status_code == 200
    assert not TextOverride.objects.exists()
    api.post("/staff/content/texts", body(club, language="en", text="Into the jungle"))
    with django_capture_on_commit_callbacks(execute=True):
        api.post("/staff/content/texts/restore", body(club, language="en", reason="Nu"))
    assert refreshed == [] and not TextOverride.objects.exists()
    missing = api.post("/staff/content/texts/publish", body(club, reason="x"))
    assert missing.status_code == 404 and error_code(missing) == "content.not_found"


def test_only_the_websites_texts_and_only_with_content_manage(
    api: Api, club: Any, staff: Staff
) -> None:
    staff(Role.RECEPTION, club.location)
    assert error_code(api.post("/staff/content/texts", body(club, text="x"))) == "auth.forbidden"
    assert error_code(api.get(f"/staff/content/texts?location_id={club.location.id}")) == (
        "auth.forbidden"
    )
    staff(Role.MANAGER, club.location)
    for key in ("admin.ai.title", "errors.x", "web", "web..x", "web.<script>", "web.legal.title"):
        assert error_code(api.post("/staff/content/texts", body(club, key=key, text="x"))) == (
            "validation.invalid"
        )
    assert error_code(api.post("/staff/content/texts", body(club, text="   "))) == (
        "validation.invalid"
    )
    for path in ("publish", "discard", "restore"):
        bad = api.post(f"/staff/content/texts/{path}", body(club, key="admin.x", reason="x"))
        assert error_code(bad) == "validation.invalid"
    assert error_code(api.post("/staff/content/texts/restore", body(club))) == "validation.invalid"
    assert api.get("/content/texts?language=de").status_code == 422


def test_the_services_check_the_language_too(club: Any, staff: Staff) -> None:
    from jungle.content import services
    from jungle.core.errors import DomainError
    from jungle.league.tests.conftest import staff_request

    manager = staff(Role.MANAGER, club.location)
    with pytest.raises(DomainError):
        services.published("de")
    with pytest.raises(DomainError):
        services.save_draft(
            staff_request(manager), club.location.id, services.TextChange(KEY, "de", "x")
        )
    with pytest.raises(DomainError):
        services.save_draft(
            staff_request(manager), club.location.id, services.TextChange(KEY, "ro", "x" * 2001)
        )
