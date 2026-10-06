"""Request correlation ID (ADR-0017): echoed in responses and stored in audit entries."""

from __future__ import annotations

import re
import uuid
from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

from jungle.core.observability import request_id as current_request_id

_VALID_ID = re.compile(r"^[A-Za-z0-9._-]{8,64}$")


class RequestIdMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        incoming = request.META.get("HTTP_X_REQUEST_ID", "")
        request_id = incoming if _VALID_ID.match(incoming) else uuid.uuid4().hex
        request.request_id = request_id  # type: ignore[attr-defined]
        token = current_request_id.set(request_id)  # every log line of this request names it
        try:
            response = self.get_response(request)
        finally:
            current_request_id.reset(token)
        response["X-Request-ID"] = request_id
        return response
