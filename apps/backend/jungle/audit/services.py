"""Writing to the audit log. Every change to people, money, league, prices or configuration
goes through `record` (§8.1)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from django.db import models
from django.forms.models import model_to_dict
from django.http import HttpRequest

from jungle.audit.models import ActorKind, AuditLog
from jungle.core.http import client_ip

SENSITIVE_FIELDS = frozenset({"password", "totp_secret", "totp_last_step"})


@dataclass(frozen=True)
class Actor:
    kind: ActorKind
    user_id: uuid.UUID | None = None
    device_id: uuid.UUID | None = None
    label: str = ""
    ip: str | None = None
    request_id: str = ""


SYSTEM = Actor(kind=ActorKind.SYSTEM, label="system")


def actor_from_request(request: HttpRequest) -> Actor:
    user = getattr(request, "user", None)
    ip = client_ip(request)
    request_id = str(getattr(request, "request_id", ""))
    if user is not None and user.is_authenticated:
        return Actor(
            kind=ActorKind.USER,
            user_id=user.pk,
            label=str(user.email or user.pk),
            ip=ip,
            request_id=request_id,
        )
    return Actor(kind=ActorKind.ANONYMOUS, ip=ip, request_id=request_id)


def snapshot(instance: models.Model) -> dict[str, Any]:
    """JSON-safe copy of a model's fields, without secrets."""
    data = model_to_dict(instance)
    data["id"] = instance.pk
    return {k: v for k, v in data.items() if k not in SENSITIVE_FIELDS}


def record(
    actor: Actor,
    action: str,
    *,
    target: models.Model | None = None,
    target_type: str = "",
    target_id: str = "",
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    reason: str = "",
) -> AuditLog:
    if target is not None:
        target_type = target._meta.label_lower
        target_id = str(target.pk)
    return AuditLog.objects.create(
        actor_kind=actor.kind,
        actor_user_id=actor.user_id,
        actor_device_id=actor.device_id,
        actor_label=actor.label[:200],
        action=action,
        target_type=target_type,
        target_id=target_id,
        before=before,
        after=after,
        reason=reason,
        ip=actor.ip,
        request_id=actor.request_id,
    )
