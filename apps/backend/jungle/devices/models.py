"""Registered club devices (§8, ADR-0012).

A device proves who it is with a token issued at enrollment (only its hash is stored), the
client certificate checked by the proxy (mTLS, from Stage 14 on the real network) and, when it
has a Hardware Bridge, Ed25519 signatures of what its scanner read (Stage 7).
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
    kind = models.CharField("tip", max_length=20, choices=DeviceKind.choices)
    location = models.ForeignKey(
        "locations.Location",
        on_delete=models.PROTECT,
        related_name="devices",
        verbose_name="locație",
    )
    name = models.CharField("nume", max_length=120)
    resource = models.ForeignKey(
        "locations.Resource",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="screens",
        verbose_name="teren",
        help_text="Doar pentru ecranul unui teren (§8.5); fără teren: ecran de lobby.",
    )
    is_active = models.BooleanField("activ", default=True)
    public_key = models.TextField(
        blank=True, help_text="Cheia publică Ed25519 a Hardware Bridge (Etapa 7)."
    )
    certificate_fingerprint = models.CharField(
        max_length=128, blank=True, help_text="SHA-256 al certificatului client (mTLS)."
    )
    token_hash = models.CharField(max_length=64, blank=True, help_text="SHA-256 al tokenului.")
    enrolled_at = models.DateTimeField("înrolat la", null=True, blank=True)
    last_seen_at = models.DateTimeField("ultimul semnal", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["location__name", "kind", "name"]
        verbose_name = "dispozitiv"
        verbose_name_plural = "dispozitive"

    def __str__(self) -> str:
        return f"{self.get_kind_display()}: {self.name}"
