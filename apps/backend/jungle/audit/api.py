"""Reading the audit log (staff with AUDIT_VIEW)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Any

from django.http import HttpRequest
from ninja import Field, Router, Schema

from jungle.accounts.services.authz import authorize
from jungle.audit.models import AuditLog
from jungle.core.permissions import Action
from jungle.core.schemas import errors
from jungle.core.security import session_auth

router = Router(tags=["staff: audit"], auth=session_auth)


class AuditOut(Schema):
    id: int
    occurred_at: datetime
    actor_kind: str
    actor_user_id: uuid.UUID | None
    actor_device_id: uuid.UUID | None
    actor_label: str
    action: str
    target_type: str
    target_id: str
    before: Any
    after: Any
    reason: str
    request_id: str


class AuditPageOut(Schema):
    total: int
    items: list[AuditOut]


@router.get("", response={200: AuditPageOut, **errors(401, 403)})
def list_audit(
    request: HttpRequest,
    target_type: str = "",
    target_id: str = "",
    action: str = "",
    limit: Annotated[int, Field(ge=1, le=200)] = 50,
    offset: Annotated[int, Field(ge=0)] = 0,
) -> AuditPageOut:
    authorize(request, Action.AUDIT_VIEW)
    qs = AuditLog.objects.all()
    if target_type:
        qs = qs.filter(target_type=target_type)
    if target_id:
        qs = qs.filter(target_id=target_id)
    if action:
        qs = qs.filter(action=action)
    return AuditPageOut(
        total=qs.count(), items=[AuditOut.from_orm(e) for e in qs[offset : offset + limit]]
    )
