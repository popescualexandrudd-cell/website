"""Feature flags (public read, admin write) and versioned configuration (staff)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from django.http import HttpRequest
from ninja import Field, Router, Schema, Status

from jungle.accounts.services.authz import authorize
from jungle.configuration import services
from jungle.configuration.models import Marker
from jungle.core.permissions import Action
from jungle.core.schemas import errors
from jungle.core.security import session_auth

public_router = Router(tags=["configuration"])
staff_router = Router(tags=["staff: configuration"], auth=session_auth)


class FlagOut(Schema):
    key: str
    enabled: bool
    description: str


class CompanyOut(Schema):
    """Legal identity of the club, shown in every page footer (consumer law, §12.3)."""

    legal_name: str | None
    registration_code: str | None
    trade_register_number: str | None
    address: str | None
    phone: str | None
    email: str | None
    complete: bool


class FlagIn(Schema):
    enabled: bool
    reason: str = Field(min_length=3)


class ConfigOut(Schema):
    key: str
    value: Any
    marker: str
    version: int
    effective_from: datetime | None
    description: str = ""


class ConfigIn(Schema):
    value: Any
    marker: Marker
    reason: str = Field(min_length=3)
    effective_from: datetime | None = None


class PendingDecisionOut(Schema):
    key: str
    value: Any
    marker: str
    description: str
    question: str


def _config_out(v: services.ConfigValue) -> ConfigOut:
    return ConfigOut(
        key=v.key,
        value=v.value,
        marker=v.marker,
        version=v.version,
        effective_from=v.effective_from,
        description=services.CONFIG[v.key].description,
    )


@public_router.get("/flags", response=list[FlagOut], auth=None)
def list_flags(request: HttpRequest) -> list[FlagOut]:
    return [FlagOut(key=k, enabled=e, description=d) for k, e, d in services.list_flags()]


@public_router.get("/company", response=CompanyOut, auth=None)
def company(request: HttpRequest) -> CompanyOut:
    data = services.get_config("club.company") or {}
    out = CompanyOut(
        legal_name=data.get("legal_name"),
        registration_code=data.get("registration_code"),
        trade_register_number=data.get("trade_register_number"),
        address=data.get("address"),
        phone=data.get("phone"),
        email=data.get("privacy_contact_email"),
        complete=False,
    )
    out.complete = all(
        [
            out.legal_name,
            out.registration_code,
            out.trade_register_number,
            out.address,
            out.phone,
            out.email,
        ]
    )
    return out


@staff_router.put("/flags/{key}", response={200: FlagOut, **errors(401, 403, 404, 422)})
def set_flag(request: HttpRequest, key: str, payload: FlagIn) -> FlagOut:
    flag = services.set_flag(request, key, payload.enabled, payload.reason)
    return FlagOut(key=flag.key, enabled=flag.enabled, description=services.FLAGS[key].description)


@staff_router.get("/config", response={200: list[ConfigOut], **errors(401, 403)})
def list_config(request: HttpRequest) -> list[ConfigOut]:
    authorize(request, Action.CONFIG_VIEW)
    return [_config_out(v) for v in services.list_config()]


@staff_router.post("/config/{key}", response={201: ConfigOut, **errors(400, 401, 403, 404, 422)})
def publish_config(request: HttpRequest, key: str, payload: ConfigIn) -> Status[ConfigOut]:
    row = services.publish_config(
        request, key, payload.value, payload.marker, payload.reason, payload.effective_from
    )
    out = ConfigOut(
        key=row.key,
        value=row.value,
        marker=row.marker,
        version=row.version,
        effective_from=row.effective_from,
        description=services.CONFIG[row.key].description,
    )
    return Status(201, out)


@staff_router.get(
    "/pending-decisions", response={200: list[PendingDecisionOut], **errors(401, 403)}
)
def pending_decisions(request: HttpRequest) -> list[PendingDecisionOut]:
    """The admin page „Ce mai trebuie confirmat”: every DE_CONFIRMAT / DE_STABILIT value."""
    authorize(request, Action.CONFIG_VIEW)
    return [
        PendingDecisionOut(key=v.key, value=v.value, marker=v.marker, description=d, question=q)
        for v, d, q in services.pending_decisions()
    ]
