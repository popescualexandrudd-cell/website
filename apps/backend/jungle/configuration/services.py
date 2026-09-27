"""Reading and changing feature flags and versioned configuration (ADR-0022)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from django.db import connection, transaction
from django.http import HttpRequest

from jungle.audit import services as audit
from jungle.configuration.models import ConfigVersion, FeatureFlag, Marker
from jungle.configuration.registry import CONFIG, FLAGS
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action

__all__ = ["CONFIG", "FLAGS"]


# ---------------------------------------------------------------- feature flags
def ensure_flag_rows(**_: Any) -> None:
    """Create a row (with the registry default) for every known flag. Idempotent."""
    existing = set(FeatureFlag.objects.values_list("key", flat=True))
    FeatureFlag.objects.bulk_create(
        [FeatureFlag(key=k, enabled=s.default) for k, s in FLAGS.items() if k not in existing]
    )


def is_enabled(key: str) -> bool:
    spec = FLAGS[key]  # unknown keys are programming errors
    row = FeatureFlag.objects.filter(key=key).first()
    return spec.default if row is None else row.enabled


def require_flag(key: str) -> None:
    if not is_enabled(key):
        raise DomainError(ErrorCode.FEATURE_DISABLED, status=403, params={"flag": key})


def list_flags() -> list[tuple[str, bool, str]]:
    rows = dict(FeatureFlag.objects.values_list("key", "enabled"))
    return [(k, rows.get(k, s.default), s.description) for k, s in FLAGS.items()]


def set_flag(request: HttpRequest, key: str, enabled: bool, reason: str) -> FeatureFlag:
    from jungle.accounts.services.authz import authorize

    user = authorize(request, Action.FLAGS_MANAGE)
    if key not in FLAGS:
        raise DomainError(ErrorCode.FLAGS_UNKNOWN, status=404, params={"flag": key})
    with transaction.atomic():
        flag, _ = FeatureFlag.objects.select_for_update().get_or_create(
            key=key, defaults={"enabled": FLAGS[key].default}
        )
        before = {"enabled": flag.enabled}
        flag.enabled = enabled
        flag.updated_by_id = user.pk
        flag.save()
        audit.record(
            audit.actor_from_request(request),
            "flags.changed",
            target=flag,
            before=before,
            after={"enabled": enabled},
            reason=reason,
        )
    return flag


# ---------------------------------------------------------------- configuration
@dataclass(frozen=True)
class ConfigValue:
    key: str
    value: Any
    marker: Marker
    version: int  # 0 = registry default, never published
    effective_from: datetime | None


def get_value(key: str, at: datetime | None = None) -> ConfigValue:
    spec = CONFIG[key]  # unknown keys are programming errors
    moment = at or clock.now()
    row = (
        ConfigVersion.objects.filter(key=key, effective_from__lte=moment)
        .order_by("-effective_from", "-version")
        .first()
    )
    if row is None:
        return ConfigValue(key, spec.default, spec.marker, 0, None)
    return ConfigValue(key, row.value, Marker(row.marker), row.version, row.effective_from)


def get_config(key: str, at: datetime | None = None) -> Any:
    return get_value(key, at).value


def publish_config(
    request: HttpRequest,
    key: str,
    value: Any,
    marker: Marker,
    reason: str,
    effective_from: datetime | None = None,
) -> ConfigVersion:
    from jungle.accounts.services.authz import authorize

    user = authorize(request, Action.CONFIG_MANAGE)
    spec = CONFIG.get(key)
    if spec is None:
        raise DomainError(ErrorCode.CONFIG_UNKNOWN_KEY, status=404, params={"key": key})
    if not spec.validator(value):
        raise DomainError(ErrorCode.CONFIG_INVALID_VALUE, params={"key": key})
    with transaction.atomic():
        with connection.cursor() as cursor:
            # Serialise publishers of the same key so version numbers never collide.
            cursor.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", [f"config:{key}"])
        last = ConfigVersion.objects.filter(key=key).order_by("-version").first()
        before = get_value(key)
        row = ConfigVersion.objects.create(
            key=key,
            version=(last.version if last else 0) + 1,
            value=value,
            marker=marker,
            effective_from=effective_from or clock.now(),
            reason=reason,
            created_by_id=user.pk,
        )
        audit.record(
            audit.actor_from_request(request),
            "config.published",
            target=row,
            before={"value": before.value, "marker": before.marker, "version": before.version},
            after={
                "value": value,
                "marker": marker,
                "version": row.version,
                "effective_from": row.effective_from,
            },
            reason=reason,
        )
    return row


def list_config() -> list[ConfigValue]:
    return [get_value(k) for k in CONFIG]


def pending_decisions() -> list[tuple[ConfigValue, str, str]]:
    """Values still marked DE_CONFIRMAT / DE_STABILIT, with description and question ID."""
    result = []
    for key, spec in CONFIG.items():
        current = get_value(key)
        if current.marker in (Marker.TO_CONFIRM, Marker.TO_SET):
            result.append((current, spec.description, spec.question))
    return result
