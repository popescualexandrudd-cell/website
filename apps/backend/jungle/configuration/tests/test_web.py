"""ADR-0022: after a flag or a setting changes, the website is told to rebuild its pages at the
next visit (`configuration.web`); a failure is logged and never breaks the change."""

from __future__ import annotations

from io import StringIO
from typing import Any

import httpx
import pytest
from django.core.management import CommandError, call_command
from django.test import override_settings

from jungle.audit.models import AuditLog
from jungle.configuration import web
from jungle.configuration.models import ConfigVersion, FeatureFlag, Marker
from jungle.conftest import Api
from jungle.core import clock
from jungle.core.permissions import Role

pytestmark = pytest.mark.django_db
URL = "http://web.internal/api/revalidate"


class Recorder:
    def __init__(self, status: int = 200, fail: bool = False) -> None:
        self.calls: list[dict[str, Any]] = []
        self.status = status
        self.fail = fail

    def __call__(self, url: str, **kwargs: Any) -> httpx.Response:
        self.calls.append({"url": url, **kwargs})
        if self.fail:
            raise httpx.ConnectError("down")
        return httpx.Response(self.status, request=httpx.Request("POST", url))


@pytest.fixture
def recorder(monkeypatch: pytest.MonkeyPatch) -> Recorder:
    rec = Recorder()
    monkeypatch.setattr("jungle.configuration.web.httpx.post", rec)
    return rec


@override_settings(WEB_REVALIDATE_URL=URL, WEB_REVALIDATE_SECRET="s3cret")
def test_a_flag_turned_on_tells_the_website_after_the_commit(
    api: Api, staff: Any, recorder: Recorder, django_capture_on_commit_callbacks: Any
) -> None:
    staff(Role.ADMIN)
    with django_capture_on_commit_callbacks(execute=True):
        response = api.put("/staff/flags/full_site", {"enabled": True, "reason": "lansarea"})
    assert response.status_code == 200
    assert recorder.calls == [
        {
            "url": URL,
            "json": {"tags": ["flags"]},
            "headers": {"X-Revalidate-Secret": "s3cret"},
            "timeout": web.TIMEOUT_SECONDS,
        }
    ]
    assert FeatureFlag.objects.get(key="full_site").enabled is True


@override_settings(WEB_REVALIDATE_URL=URL, WEB_REVALIDATE_SECRET="s3cret")
def test_a_new_setting_version_tells_the_website(
    recorder: Recorder, django_capture_on_commit_callbacks: Any
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        ConfigVersion.objects.create(
            key="screens.qr_url",
            version=1,
            value="/ro/liga",
            marker=Marker.CONFIRMED,
            effective_from=clock.now(),
        )
    assert recorder.calls[0]["json"] == {"tags": ["config"]}


def test_nothing_is_sent_without_the_address_and_the_secret(recorder: Recorder) -> None:
    assert web.revalidate(["flags"]) is False
    with override_settings(WEB_REVALIDATE_URL=URL, WEB_REVALIDATE_SECRET=""):
        assert web.revalidate(["flags"]) is False
    assert recorder.calls == []


@override_settings(WEB_REVALIDATE_URL=URL, WEB_REVALIDATE_SECRET="s3cret")
def test_a_failure_is_logged_not_raised(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    monkeypatch.setattr("jungle.configuration.web.httpx.post", Recorder(fail=True))
    assert web.revalidate(["flags"]) is False
    monkeypatch.setattr("jungle.configuration.web.httpx.post", Recorder(status=401))
    assert web.revalidate(["flags"]) is False
    assert "failed" in caplog.text and "HTTP 401" in caplog.text
    monkeypatch.setattr("jungle.configuration.web.httpx.post", Recorder())
    assert web.revalidate(["flags"]) is True


def test_a_rolled_back_change_tells_nobody(recorder: Recorder) -> None:
    with override_settings(WEB_REVALIDATE_URL=URL, WEB_REVALIDATE_SECRET="s3cret"):
        web.revalidate_after_commit(["flags"])  # inside the test's transaction: never committed
    assert recorder.calls == []


@override_settings(WEB_REVALIDATE_URL=URL, WEB_REVALIDATE_SECRET="s3cret")
def test_the_launch_from_the_server_is_audited_and_tells_the_website(
    recorder: Recorder, django_capture_on_commit_callbacks: Any
) -> None:
    out = StringIO()
    with django_capture_on_commit_callbacks(execute=True):
        call_command("set_flag", "full_site", "on", "--reason", "lansarea", stdout=out)
    assert out.getvalue().strip() == "full_site: on"
    assert FeatureFlag.objects.get(key="full_site").enabled is True
    log = AuditLog.objects.get(action="flags.changed")
    assert (log.reason, log.after) == ("lansarea", {"enabled": True})
    assert recorder.calls[0]["json"] == {"tags": ["flags"]}
    with pytest.raises(CommandError, match="unknown flag"):
        call_command("set_flag", "nope", "on", "--reason", "x")
    with pytest.raises(CommandError, match="reason"):
        call_command("set_flag", "full_site", "off", "--reason", "  ")
