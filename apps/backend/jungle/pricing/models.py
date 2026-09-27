"""Price rates (R-051): one rate per 30 minutes for every combination the club prices.

All money is in bani (RON × 100), integers only (invariant 5). A rate that is not decided
by the owner is marked DE_STABILIT (`Marker.TO_SET`) and listed in the admin (Q21).
"""

from __future__ import annotations

import uuid

from django.db import models

from jungle.configuration.models import Marker
from jungle.locations.models import ResourceKind


class Season(models.TextChoices):
    ALL = "all", "Tot anul"
    SUMMER = "summer", "Vară"
    WINTER = "winter", "Iarnă"


class Band(models.TextChoices):
    PEAK = "peak", "Vârf"
    SEMI_PEAK = "semi_peak", "Semi-vârf"
    OFF_PEAK = "off_peak", "În afara vârfului"


class CustomerType(models.TextChoices):
    STANDARD = "standard", "Neabonat"
    MEMBER = "member", "Abonat"
    CORPORATE = "corporate", "Corporate"


class Product(models.TextChoices):
    RENTAL = "rental", "Închiriere"
    LESSON = "lesson", "Lecție cu antrenor"
    CLASS = "class", "Clasă"
    EVENT = "event", "Eveniment"


class PriceRate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey(
        "locations.Location", on_delete=models.PROTECT, related_name="price_rates"
    )
    resource_kind = models.CharField("resursă", max_length=30, choices=ResourceKind.choices)
    product = models.CharField("produs", max_length=20, choices=Product.choices)
    season = models.CharField("sezon", max_length=10, choices=Season.choices, default=Season.ALL)
    band = models.CharField("bandă orară", max_length=10, choices=Band.choices)
    customer_type = models.CharField(
        "tip client", max_length=12, choices=CustomerType.choices, default=CustomerType.STANDARD
    )
    amount_per_half_hour = models.PositiveIntegerField("preț pe 30 de minute (bani)")
    marker = models.CharField(max_length=12, choices=Marker.choices, default=Marker.TO_SET)
    note = models.CharField("notă", max_length=200, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["location", "resource_kind", "product", "season", "band", "customer_type"]
        verbose_name = "tarif"
        verbose_name_plural = "tarife"
        constraints = [
            models.UniqueConstraint(
                fields=["location", "resource_kind", "product", "season", "band", "customer_type"],
                name="price_rate_unique_combination",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.resource_kind}/{self.product}/{self.season}/{self.band}/{self.customer_type}"
