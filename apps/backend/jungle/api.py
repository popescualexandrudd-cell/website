"""The central API, `/api/v1/` (ADR-0003). Errors always have the shape
`{"error": {"code": "<stable code>", "params": {...}}}` (ADR-0018)."""

from __future__ import annotations

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from ninja import NinjaAPI
from ninja.errors import AuthenticationError, HttpError, ValidationError

from jungle.accounts.api import auth_router, me_router
from jungle.accounts.api import staff_router as staff_users_router
from jungle.audit.api import router as audit_router
from jungle.configuration.api import public_router as config_public_router
from jungle.configuration.api import staff_router as config_staff_router
from jungle.core.api import router as health_router
from jungle.core.errors import DomainError, ErrorCode
from jungle.devices.api import router as devices_router
from jungle.legal.api import router as legal_router
from jungle.locations.api import public_router as locations_router
from jungle.locations.api import staff_router as locations_staff_router

api = NinjaAPI(
    title="Jungle Padel API",
    version="1.0.0",
    description='API-ul central Jungle Padel. Erorile: `{"error": {"code", "params"}}`.',
    urls_namespace="api-v1",
    docs_url="/docs" if settings.API_DOCS_ENABLED else None,
    openapi_url="/openapi.json" if settings.API_DOCS_ENABLED else None,
)

api.add_router("/health", health_router)
api.add_router("/auth", auth_router)
api.add_router("/me", me_router)
api.add_router("/locations", locations_router)
api.add_router("/config", config_public_router)
api.add_router("/legal", legal_router)
api.add_router("/staff", staff_users_router)
api.add_router("/staff", locations_staff_router)
api.add_router("/staff", config_staff_router)
api.add_router("/staff/devices", devices_router)
api.add_router("/staff/audit", audit_router)


def _error(
    request: HttpRequest, code: str, status: int, params: dict[str, object] | None = None
) -> HttpResponse:
    return api.create_response(
        request, {"error": {"code": code, "params": params or {}}}, status=status
    )


@api.exception_handler(DomainError)
def on_domain_error(request: HttpRequest, exc: DomainError) -> HttpResponse:
    return _error(request, exc.code.value, exc.status, exc.params)


@api.exception_handler(ValidationError)
def on_validation_error(request: HttpRequest, exc: ValidationError) -> HttpResponse:
    fields = [
        {"loc": [str(p) for p in e.get("loc", [])], "type": str(e.get("type", ""))}
        for e in exc.errors
    ]
    return _error(request, ErrorCode.VALIDATION_INVALID.value, 422, {"errors": fields})


@api.exception_handler(AuthenticationError)
def on_authentication_error(request: HttpRequest, exc: AuthenticationError) -> HttpResponse:
    return _error(request, ErrorCode.AUTH_REQUIRED.value, 401)


@api.exception_handler(HttpError)
def on_http_error(request: HttpRequest, exc: HttpError) -> HttpResponse:
    if exc.status_code == 403 and "CSRF" in str(exc):
        return _error(request, ErrorCode.AUTH_CSRF_FAILED.value, 403)
    code = (
        ErrorCode.NOT_FOUND.value if exc.status_code == 404 else ErrorCode.VALIDATION_INVALID.value
    )
    return _error(request, code, exc.status_code)
