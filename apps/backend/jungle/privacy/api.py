"""Data-subject rights (§12.2) and the league consent status, withdrawal (R-011)."""

from __future__ import annotations

import json
import uuid

from django.http import HttpRequest, HttpResponse
from ninja import Field, Router, Schema

from jungle.accounts.services.authz import current_user
from jungle.core.schemas import OkOut, errors
from jungle.core.security import session_auth
from jungle.privacy import league_consent, services

me_router = Router(tags=["privacy"], auth=session_auth)
staff_router = Router(tags=["staff: privacy"], auth=session_auth)


class ConsentStatusOut(Schema):
    signed: bool
    version: int | None
    current_version: int | None
    outdated: bool
    signed_at: str | None


class DeleteIn(Schema):
    password: str = Field(min_length=1, max_length=200)
    forfeit_credit: bool = False


class StaffEraseIn(Schema):
    reason: str = Field(min_length=1, max_length=500)
    forfeit_credit: bool = False


@me_router.get("/export", response={200: dict, **errors(401)})
def export(request: HttpRequest) -> HttpResponse:
    """GDPR art. 15 and 20: everything we hold about you, as a JSON file."""
    body = json.dumps(services.export_mine(request), ensure_ascii=False, indent=2)
    response = HttpResponse(body, content_type="application/json; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="jungle-padel-datele-mele.json"'
    response["Cache-Control"] = "no-store"
    return response


@me_router.post("/delete-account", response={200: OkOut, **errors(401, 403, 409, 422)})
def delete_account(request: HttpRequest, payload: DeleteIn) -> OkOut:
    """§12.2: personal data is removed; you stay as "Jucător retras" in others' history."""
    services.erase_mine(request, payload.password, payload.forfeit_credit)
    return OkOut()


@me_router.get("/league-consent", response={200: ConsentStatusOut, **errors(401)})
def consent_status(request: HttpRequest, language: str = "ro") -> ConsentStatusOut:
    return ConsentStatusOut(**league_consent.status(current_user(request), language).__dict__)


@me_router.post("/league-consent/withdraw", response={200: OkOut, **errors(401, 409)})
def withdraw(request: HttpRequest) -> OkOut:
    league_consent.withdraw(request)
    return OkOut()


@staff_router.post(
    "/users/{user_id}/erase", response={200: OkOut, **errors(400, 401, 403, 404, 409, 422)}
)
def erase(request: HttpRequest, user_id: uuid.UUID, payload: StaffEraseIn) -> OkOut:
    services.erase_by_staff(request, user_id, payload.reason, payload.forfeit_credit)
    return OkOut()
