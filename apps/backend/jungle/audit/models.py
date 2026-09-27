"""Immutable audit log (§8.1, R-004). Rows can only be inserted (database trigger)."""

from __future__ import annotations

from django.core.serializers.json import DjangoJSONEncoder
from django.db import models


class ActorKind(models.TextChoices):
    USER = "user", "Utilizator"
    DEVICE = "device", "Dispozitiv"
    SYSTEM = "system", "Sistem"
    AI = "ai", "AI"
    ANONYMOUS = "anonymous", "Anonim"


class AuditLog(models.Model):
    occurred_at = models.DateTimeField(auto_now_add=True, db_index=True)
    actor_kind = models.CharField(max_length=12, choices=ActorKind.choices)
    # Plain identifiers (no foreign keys): the log must never change or block deletions.
    actor_user_id = models.UUIDField(null=True, blank=True, db_index=True)
    actor_device_id = models.UUIDField(null=True, blank=True)
    actor_label = models.CharField(max_length=200, blank=True)
    action = models.CharField(max_length=100, db_index=True)
    target_type = models.CharField(max_length=60, blank=True)
    target_id = models.CharField(max_length=64, blank=True)
    before = models.JSONField(null=True, blank=True, encoder=DjangoJSONEncoder)
    after = models.JSONField(null=True, blank=True, encoder=DjangoJSONEncoder)
    reason = models.TextField(blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    request_id = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-occurred_at", "-id"]
        verbose_name = "înregistrare de audit"
        verbose_name_plural = "jurnal de audit"
        indexes = [models.Index(fields=["target_type", "target_id"])]

    def __str__(self) -> str:
        when = f"{self.occurred_at:%Y-%m-%d %H:%M:%S}"
        return f"{when} {self.action} {self.target_type}:{self.target_id}"
