"""Logs and errors for the monitoring (ADR-0017, Stage 14C).

- Every log line carries the request's correlation id (`RequestIdMiddleware` keeps it in a
  context variable); in production the lines are JSON (`LOG_FORMAT=json`), one per line, so they
  can be searched; no personal data is added here.
- With `SENTRY_DSN` set (the club's GlitchTip, self-hosted), the backend's errors go there, with
  the environment and the release, without personal data (`send_default_pii=False`).
- `POST /api/v1/client-errors`: the website, the panel and the club's devices report their own
  errors to the backend (no third-party script in the browser); limited per address, always 204.
"""

from __future__ import annotations

import json
import logging
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Literal

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from ninja import Field, Router, Schema

from jungle.core.http import client_ip
from jungle.core.ratelimit import increment

request_id: ContextVar[str] = ContextVar("request_id", default="-")
log = logging.getLogger("jungle.client_errors")

CLIENT_ERRORS_PER_HOUR = 30
App = Literal["web", "admin", "kiosk-league", "kiosk-payments", "court-screens", "cafe-display"]


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id.get()
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        data = {
            "time": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        if record.exc_info:
            data["error"] = self.formatException(record.exc_info)
        return json.dumps(data, ensure_ascii=False)


def init_error_tracking(dsn: str, environment: str, release: str) -> bool:
    if not dsn:
        return False
    import sentry_sdk

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release,
        send_default_pii=False,
        traces_sample_rate=0,
    )
    return True


router = Router(tags=["monitoring"])


class ClientErrorIn(Schema):
    app: App
    message: str = Field(max_length=500)
    where: str = Field(default="", max_length=300, description="the page or screen")
    digest: str = Field(default="", max_length=64, description="Next.js error digest")


@router.post("", response={204: None}, auth=None)
def client_error(request: HttpRequest, payload: ClientErrorIn) -> HttpResponse:
    """An error seen by a person's browser or by a club device; logged, then sent to GlitchTip."""
    if increment(f"client-errors:{client_ip(request)}", 3600) > CLIENT_ERRORS_PER_HOUR:
        return HttpResponse(status=204)
    log.warning(
        "client error: %s · %s · %s · %s",
        payload.app,
        payload.where[:120],
        payload.digest,
        payload.message[:300],
    )
    if settings.SENTRY_DSN:
        import sentry_sdk

        with sentry_sdk.new_scope() as scope:
            scope.set_tag("app", payload.app)
            scope.set_extra("where", payload.where)
            scope.set_extra("digest", payload.digest)
            sentry_sdk.capture_message(f"[{payload.app}] {payload.message}", level="error")
    return HttpResponse(status=204)
