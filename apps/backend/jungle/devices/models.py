"""Registered club devices (§8, ADR-0012).

Stage 1A stores the device identity. Certificate (mTLS) authentication and bridge keys
are wired in Stages 7 and 14.
"""

from __future__ import annotations

import uuid

from django.db import models


class DeviceKind(models.TextChoices):
    LEAGUE_KIOSK = "league_kiosk", "Chioșc Ligă"
    PAYMENTS_KIOSK = "payments_kiosk", "Chioșc Plăți"
    SCREEN = "screen", "Ecran (teren / lobby)"
    CAFE_DISPLAY = "cafe_display", "Afișaj cafenea"


class Device(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=20, choices=DeviceKind.choices)
    location = models.ForeignKey(
        "locations.Location", on_delete=models.PROTECT, related_name="devices"
    )
    name = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)
    public_key = models.TextField(
        blank=True, help_text="Cheia publică Ed25519 a Hardware Bridge (Etapa 7)."
    )
    certificate_fingerprint = models.CharField(max_length=128, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["location__name", "kind", "name"]
        verbose_name = "dispozitiv"
        verbose_name_plural = "dispozitive"

    def __str__(self) -> str:
        return f"{self.get_kind_display()}: {self.name}"
