"""Request helpers."""

from __future__ import annotations

from django.conf import settings
from django.http import HttpRequest


def client_ip(request: HttpRequest) -> str | None:
    """Client IP, trusting exactly TRUSTED_PROXY_COUNT reverse proxies (Caddy in production)."""
    proxies = settings.TRUSTED_PROXY_COUNT
    if proxies > 0:
        forwarded = [p.strip() for p in request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")]
        forwarded = [p for p in forwarded if p]
        if len(forwarded) >= proxies:
            return str(forwarded[-proxies])
    remote = request.META.get("REMOTE_ADDR")
    return str(remote) if remote else None


def user_agent(request: HttpRequest) -> str:
    return str(request.META.get("HTTP_USER_AGENT", ""))[:300]
