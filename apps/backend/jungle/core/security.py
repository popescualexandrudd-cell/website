"""API authentication helpers for Django Ninja (ADR-0011)."""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.http import HttpRequest
from ninja.security import APIKeyCookie
from ninja.utils import check_csrf

from jungle.core.errors import DomainError, ErrorCode


class SessionUserAuth(APIKeyCookie):
    """Session cookie authentication; Ninja enforces CSRF on unsafe methods."""

    param_name = settings.SESSION_COOKIE_NAME

    def authenticate(self, request: HttpRequest, key: str | None) -> Any:
        user = request.user
        if user.is_authenticated and user.is_active:
            return user
        return None


session_auth = SessionUserAuth()


def require_csrf(request: HttpRequest) -> None:
    """CSRF check for endpoints that do not require login (login, register, reset)."""
    if check_csrf(request) is not None:
        raise DomainError(ErrorCode.AUTH_CSRF_FAILED, status=403)
