"""Waitlist endpoints: public sign-up / confirm / unsubscribe, staff list / stats / CSV."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from django.http import HttpRequest, HttpResponse
from ninja import Field, Router, Schema, Status

from jungle.core.schemas import OkOut, errors
from jungle.core.security import session_auth
from jungle.waitlist import services
from jungle.waitlist.models import Level

public_router = Router(tags=["waitlist"])
staff_router = Router(tags=["staff: waitlist"], auth=session_auth)


class SignupIn(Schema):
    email: str = Field(max_length=254)
    name: str = Field(min_length=1, max_length=150)
    level: Level | None = None
    language: str = Field(default="ro", pattern=r"^(ro|en)$")
    notice_version: int = Field(ge=1)
    accepted_notice: bool
    source: str = Field(default="", max_length=60)
    website: str = Field(default="", max_length=200, description="Honeypot: must stay empty.")


class SignupOut(Schema):
    status: str = "check_email"


class TokenIn(Schema):
    token: str = Field(max_length=500)


class ConfirmOut(Schema):
    status: str
    language: str


class EntryOut(Schema):
    id: uuid.UUID
    email: str | None
    name: str
    level: str
    language: str
    source: str
    status: str
    created_at: datetime
    confirmed_at: datetime | None


class EntryPageOut(Schema):
    total: int
    items: list[EntryOut]


class StatsOut(Schema):
    by_status: dict[str, int]
    confirmed_by_level: dict[str, int]


@public_router.post("", response={202: SignupOut, **errors(400, 404, 422, 429)}, auth=None)
def signup(request: HttpRequest, payload: SignupIn) -> Status[SignupOut]:
    """Double opt-in: the answer is the same whether or not the address is already listed."""
    if not payload.accepted_notice:
        from jungle.core.errors import DomainError, ErrorCode

        raise DomainError(ErrorCode.LEGAL_CONSENT_MISSING, params={"kind": "waitlist_notice"})
    services.signup(
        request,
        services.SignupData(
            email=payload.email,
            name=payload.name,
            level=str(payload.level or ""),
            language=payload.language,
            notice_version=payload.notice_version,
            source=payload.source,
            honeypot=payload.website,
        ),
    )
    return Status(202, SignupOut())


@public_router.post("/confirm", response={200: ConfirmOut, **errors(400, 422)}, auth=None)
def confirm(request: HttpRequest, payload: TokenIn) -> ConfirmOut:
    entry = services.confirm(request, payload.token)
    return ConfirmOut(status=entry.status, language=entry.language)


@public_router.post("/unsubscribe", response={200: OkOut, **errors(400, 422)}, auth=None)
def unsubscribe(request: HttpRequest, payload: TokenIn) -> OkOut:
    services.unsubscribe(request, payload.token)
    return OkOut()


@staff_router.get("", response={200: EntryPageOut, **errors(401, 403)})
def list_entries(
    request: HttpRequest,
    status: Annotated[str, Field(pattern=r"^(|pending|confirmed|withdrawn)$")] = "",
    limit: Annotated[int, Field(ge=1, le=200)] = 50,
    offset: Annotated[int, Field(ge=0)] = 0,
) -> EntryPageOut:
    qs = services.staff_entries(request, status)
    return EntryPageOut(
        total=qs.count(), items=[EntryOut.from_orm(e) for e in qs[offset : offset + limit]]
    )


@staff_router.get("/stats", response={200: StatsOut, **errors(401, 403)})
def stats(request: HttpRequest) -> StatsOut:
    return StatsOut(**services.stats(request))  # type: ignore[arg-type]


@staff_router.get("/export.csv", response={200: str, **errors(401, 403)})
def export_csv(request: HttpRequest) -> HttpResponse:
    response = HttpResponse(services.export_csv(request), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="lista-asteptare.csv"'
    return response
