"""The central API, `/api/v1/` (ADR-0003). Errors always have the shape
`{"error": {"code": "<stable code>", "params": {...}}}` (ADR-0018)."""

from __future__ import annotations

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from ninja import NinjaAPI
from ninja.errors import AuthenticationError, HttpError, ValidationError

from jungle.accounts.api import auth_router, me_router
from jungle.accounts.api import staff_router as staff_users_router
from jungle.ai.api import public_router as ai_router
from jungle.ai.api import staff_router as ai_staff_router
from jungle.attendance.api import staff_router as attendance_staff_router
from jungle.audit.api import router as audit_router
from jungle.blog.api import public_router as blog_router
from jungle.blog.api import staff_router as blog_staff_router
from jungle.bookings.api import classes_router, events_router
from jungle.bookings.api import me_router as bookings_router
from jungle.bookings.api import public_router as bookings_public_router
from jungle.bookings.api import staff_router as bookings_staff_router
from jungle.cafe.api import public_router as cafe_router
from jungle.cafe.api import staff_router as cafe_staff_router
from jungle.cards.api import me_router as cards_router
from jungle.cards.api import public_router as cards_public_router
from jungle.cards.api import staff_router as cards_staff_router
from jungle.cards.wallet_api import router as apple_wallet_router
from jungle.checkout.api import display_router as cafe_display_router
from jungle.checkout.api import router as payments_kiosk_router
from jungle.checkout.api import staff_router as checkout_staff_router
from jungle.configuration.api import public_router as config_public_router
from jungle.configuration.api import staff_router as config_staff_router
from jungle.content.api import public_router as content_router
from jungle.content.api import staff_router as content_staff_router
from jungle.core.api import router as health_router
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.observability import router as client_errors_router
from jungle.devices.api import device_router
from jungle.devices.api import router as devices_router
from jungle.events.api import public_router as club_events_router
from jungle.events.api import staff_router as club_events_staff_router
from jungle.feedback.api import me_router as feedback_router
from jungle.feedback.api import staff_router as feedback_staff_router
from jungle.league.api import me_router as league_me_router
from jungle.league.api import public_router as league_public_router
from jungle.league.api import staff_router as league_staff_router
from jungle.league.kiosk_api import router as league_kiosk_router
from jungle.ledger.api import me_router as account_router
from jungle.ledger.api import staff_router as payments_staff_router
from jungle.legal.api import router as legal_router
from jungle.locations.api import public_router as locations_router
from jungle.locations.api import staff_router as locations_staff_router
from jungle.notifications.api import me_router as notifications_router
from jungle.notifications.api import staff_router as notifications_staff_router
from jungle.panel.api import router as panel_router
from jungle.pricing.api import public_router as pricing_router
from jungle.pricing.api import staff_router as pricing_staff_router
from jungle.privacy.api import me_router as privacy_router
from jungle.privacy.api import staff_router as privacy_staff_router
from jungle.rewards.api import me_router as rewards_router
from jungle.rewards.api import staff_router as rewards_staff_router
from jungle.screens.api import router as screens_router
from jungle.subscriptions.api import me_router as subscriptions_router
from jungle.subscriptions.api import public_router as subscriptions_public_router
from jungle.subscriptions.api import staff_router as subscriptions_staff_router
from jungle.waitlist.api import public_router as waitlist_router
from jungle.waitlist.api import staff_router as waitlist_staff_router

api = NinjaAPI(
    title="Jungle Padel API",
    version="1.0.0",
    description='API-ul central Jungle Padel. Erorile: `{"error": {"code", "params"}}`.',
    urls_namespace="api-v1",
    docs_url="/docs" if settings.API_DOCS_ENABLED else None,
    openapi_url="/openapi.json" if settings.API_DOCS_ENABLED else None,
)

api.add_router("/health", health_router)
api.add_router("/client-errors", client_errors_router)
api.add_router("/auth", auth_router)
api.add_router("/me", me_router)
api.add_router("/locations", locations_router)
api.add_router("/config", config_public_router)
api.add_router("/legal", legal_router)
api.add_router("/staff", staff_users_router)
api.add_router("/staff", locations_staff_router)
api.add_router("/staff", config_staff_router)
api.add_router("/staff/devices", devices_router)
api.add_router("/device", device_router)
api.add_router("/staff/audit", audit_router)
api.add_router("/staff/panel", panel_router)
api.add_router("/waitlist", waitlist_router)
api.add_router("/staff/waitlist", waitlist_staff_router)
api.add_router("/bookings", bookings_public_router)
api.add_router("/bookings", bookings_router)
api.add_router("/classes", classes_router)
api.add_router("/events", events_router)
api.add_router("/events", club_events_router)
api.add_router("/pricing", pricing_router)
api.add_router("/staff", bookings_staff_router)
api.add_router("/staff", club_events_staff_router)
api.add_router("/blog", blog_router)
api.add_router("/staff", blog_staff_router)
api.add_router("/content", content_router)
api.add_router("/staff", content_staff_router)
api.add_router("/feedback", feedback_router)
api.add_router("/staff", feedback_staff_router)
api.add_router("/notifications", notifications_router)
api.add_router("/staff", notifications_staff_router)
api.add_router("/ai", ai_router)
api.add_router("/staff", ai_staff_router)
api.add_router("/staff", attendance_staff_router)
api.add_router("/staff", pricing_staff_router)
api.add_router("/account", account_router)
api.add_router("/staff", payments_staff_router)
api.add_router("/subscriptions", subscriptions_public_router)
api.add_router("/subscriptions", subscriptions_router)
api.add_router("/staff", subscriptions_staff_router)
api.add_router("/account", rewards_router)
api.add_router("/staff", rewards_staff_router)
api.add_router("/cafe", cafe_router)
api.add_router("/staff", cafe_staff_router)
api.add_router("/cards", cards_public_router)
api.add_router("/cards", cards_router)
api.add_router("/staff", cards_staff_router)
api.add_router("/wallet/apple", apple_wallet_router)
api.add_router("/privacy", privacy_router)
api.add_router("/staff", privacy_staff_router)
api.add_router("/league", league_public_router)
api.add_router("/league", league_me_router)
api.add_router("/staff", league_staff_router)
api.add_router("/kiosk/league", league_kiosk_router)
api.add_router("/kiosk/payments", payments_kiosk_router)
api.add_router("/staff", checkout_staff_router)
api.add_router("/device/cafe", cafe_display_router)
api.add_router("/device/screen", screens_router)


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
