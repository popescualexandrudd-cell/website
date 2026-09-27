"""Staff endpoints for scans, no-show blocks and staff notices (R-030 … R-032, R-073)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from django.http import HttpRequest
from ninja import Field, Router, Schema, Status

from jungle.attendance import services
from jungle.attendance.models import ScanKind
from jungle.core.schemas import errors
from jungle.core.security import session_auth

staff_router = Router(tags=["staff: attendance"], auth=session_auth)


class ScanIn(Schema):
    """Either the scanned card code (R-025) or, for reception, the person's id."""

    location_id: uuid.UUID
    user_id: uuid.UUID | None = None
    card_token: str = Field(default="", max_length=64)
    kind: ScanKind
    resource_id: uuid.UUID | None = None
    class_session_id: uuid.UUID | None = None


class ScanOut(Schema):
    id: uuid.UUID
    user_id: uuid.UUID
    kind: str
    resource_id: uuid.UUID | None
    booking_id: uuid.UUID | None
    enrollment_id: uuid.UUID | None
    scanned_at: datetime


class RestrictionOut(Schema):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    no_show_count: int
    created_at: datetime
    lifted_at: datetime | None


class LiftIn(Schema):
    location_id: uuid.UUID
    reason: str = Field(min_length=1, max_length=250)


class NoticeOut(Schema):
    id: uuid.UUID
    kind: str
    payload: dict[str, Any]
    created_at: datetime
    read_at: datetime | None


@staff_router.post("/scans", response={201: ScanOut, **errors(401, 403, 404, 422)})
def record_scan(request: HttpRequest, payload: ScanIn) -> Status[ScanOut]:
    scan = services.record_scan(request, services.ScanData(**payload.dict()))
    return Status(201, ScanOut.from_orm(scan))


@staff_router.get("/restrictions", response={200: list[RestrictionOut], **errors(401, 403, 422)})
def list_restrictions(request: HttpRequest, location_id: uuid.UUID) -> list[RestrictionOut]:
    return [
        RestrictionOut(
            id=r.id,
            user_id=r.user_id,
            name=f"{r.user.first_name} {r.user.last_name}",
            no_show_count=r.no_show_count,
            created_at=r.created_at,
            lifted_at=r.lifted_at,
        )
        for r in services.active_restrictions(request, location_id)
    ]


@staff_router.post(
    "/restrictions/{restriction_id}/lift",
    response={200: RestrictionOut, **errors(400, 401, 403, 404, 422)},
)
def lift_restriction(
    request: HttpRequest, restriction_id: uuid.UUID, payload: LiftIn
) -> RestrictionOut:
    r = services.lift_restriction(request, restriction_id, payload.location_id, payload.reason)
    return RestrictionOut(
        id=r.id,
        user_id=r.user_id,
        name=f"{r.user.first_name} {r.user.last_name}",
        no_show_count=r.no_show_count,
        created_at=r.created_at,
        lifted_at=r.lifted_at,
    )


@staff_router.get("/notices", response={200: list[NoticeOut], **errors(401, 403, 422)})
def list_notices(request: HttpRequest, location_id: uuid.UUID) -> list[NoticeOut]:
    return [NoticeOut.from_orm(n) for n in services.my_notices(request, location_id)]


@staff_router.post(
    "/notices/{notice_id}/read", response={200: NoticeOut, **errors(401, 403, 404, 422)}
)
def read_notice(request: HttpRequest, notice_id: uuid.UUID, location_id: uuid.UUID) -> NoticeOut:
    return NoticeOut.from_orm(services.mark_notice_read(request, notice_id, location_id))
