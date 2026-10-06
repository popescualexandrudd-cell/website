"""ADR-0017, Stage 14C: log lines carry the request's id (JSON in production), the backend's
errors go to GlitchTip only when a DSN is set, and the browsers and devices report their errors
to the backend, limited per address."""

from __future__ import annotations

import json
import logging
import sys
from typing import Any

import pytest

from jungle.conftest import Api
from jungle.core import observability
from jungle.core.observability import JsonFormatter, RequestIdFilter, init_error_tracking


def record(message: str = "hello %s", args: tuple[Any, ...] = ("there",)) -> logging.LogRecord:
    return logging.LogRecord("jungle.test", logging.INFO, __file__, 1, message, args, None)


def test_a_log_line_is_json_with_the_request_id() -> None:
    token = observability.request_id.set("abc123def")
    try:
        line = record()
        assert RequestIdFilter().filter(line)
    finally:
        observability.request_id.reset(token)
    data = json.loads(JsonFormatter().format(line))
    assert (data["level"], data["logger"], data["message"]) == (
        "INFO",
        "jungle.test",
        "hello there",
    )
    assert data["request_id"] == "abc123def" and "error" not in data
    try:
        raise ValueError("boom")
    except ValueError:
        failed = logging.LogRecord("x", logging.ERROR, __file__, 1, "failed", (), sys.exc_info())
    data = json.loads(JsonFormatter().format(failed))
    assert data["request_id"] == "-" and "ValueError: boom" in data["error"]


def test_the_middleware_names_the_request_in_the_logs(api: Api, db: None) -> None:
    seen: list[str] = []

    class Spy(logging.Handler):
        def emit(self, line: logging.LogRecord) -> None:
            seen.append(getattr(line, "request_id", "?"))

    spy = Spy()
    spy.addFilter(RequestIdFilter())
    logger = logging.getLogger("jungle.client_errors")
    logger.addHandler(spy)
    try:
        response = api.client.post(
            "/api/v1/client-errors",
            {"app": "web", "message": "x"},
            content_type="application/json",
            HTTP_X_REQUEST_ID="req-0123456789",
        )
    finally:
        logger.removeHandler(spy)
    assert response.status_code == 204 and seen == ["req-0123456789"]
    assert observability.request_id.get() == "-"  # reset after the request


def test_error_tracking_starts_only_with_a_dsn(monkeypatch: pytest.MonkeyPatch) -> None:
    import sentry_sdk

    started: list[dict[str, Any]] = []
    monkeypatch.setattr(sentry_sdk, "init", lambda **options: started.append(options))
    assert init_error_tracking("", "prod", "v1") is False and started == []
    assert init_error_tracking("https://key@erori.example.test/1", "prod", "v1.0.0")
    assert started[0]["send_default_pii"] is False and started[0]["release"] == "v1.0.0"


def test_browsers_and_devices_report_their_errors(
    api: Api, db: None, settings: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    import sentry_sdk

    sent: list[str] = []
    monkeypatch.setattr(sentry_sdk, "capture_message", lambda text, level: sent.append(text))
    settings.SENTRY_DSN = ""
    body = {"app": "admin", "message": "TypeError: x is undefined", "where": "/users"}
    assert api.post("/client-errors", body).status_code == 204
    assert sent == []  # logged only
    settings.SENTRY_DSN = "https://key@erori.example.test/1"
    assert api.post("/client-errors", {**body, "digest": "123"}).status_code == 204
    assert sent == ["[admin] TypeError: x is undefined"]
    assert api.post("/client-errors", {"app": "printer", "message": "x"}).status_code == 422
    for _ in range(observability.CLIENT_ERRORS_PER_HOUR):
        api.post("/client-errors", body)
    # 30 reports an hour from one address: the first one (logged only) counted too
    assert len(sent) == observability.CLIENT_ERRORS_PER_HOUR - 1
