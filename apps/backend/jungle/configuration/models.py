"""Feature flags and versioned configuration (ADR-0022)."""

from __future__ import annotations

from django.core.serializers.json import DjangoJSONEncoder
from django.db import models


class Marker(models.TextChoices):
    CONFIRMED = "confirmed", "Confirmat de proprietar"
    DEFAULT = "default", "Valoare tehnică implicită"
    TO_CONFIRM = "to_confirm", "DE_CONFIRMAT"
    TO_SET = "to_set", "DE_STABILIT"


class FeatureFlag(models.Model):
    key = models.CharField(max_length=60, primary_key=True)
    enabled = models.BooleanField("activ", default=False)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by_id = models.UUIDField(null=True, blank=True)

    class Meta:
        ordering = ["key"]
        verbose_name = "feature flag"
        verbose_name_plural = "feature flags"

    def __str__(self) -> str:
        return f"{self.key}={'on' if self.enabled else 'off'}"


class ConfigVersion(models.Model):
    """One immutable version of one configuration key (append-only table)."""

    key = models.CharField(max_length=80, db_index=True)
    version = models.PositiveIntegerField()
    value = models.JSONField(encoder=DjangoJSONEncoder, null=True)
    marker = models.CharField(max_length=12, choices=Marker.choices)
    effective_from = models.DateTimeField()
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by_id = models.UUIDField(null=True, blank=True)

    class Meta:
        ordering = ["key", "-version"]
        verbose_name = "versiune de configurare"
        verbose_name_plural = "versiuni de configurare"
        constraints = [
            models.UniqueConstraint(fields=["key", "version"], name="config_key_version_unique")
        ]

    def __str__(self) -> str:
        return f"{self.key} v{self.version}"
