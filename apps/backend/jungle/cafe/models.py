"""The café (R-111, R-112, Q33): menu, orders paid at the payments kiosk, and the order
queue shown at the bar and, when ready, on the lobby screens (numbers only).

No stock management at launch (Q33); a product is simply available or not. Prices are
DE_STABILIT until the owner sets them (Q21).
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from jungle.configuration.models import Marker


class CafeCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    name_ro = models.CharField(max_length=80)
    name_en = models.CharField(max_length=80)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name_ro"]
        verbose_name = "categorie cafenea"
        verbose_name_plural = "categorii cafenea"

    def __str__(self) -> str:
        return self.name_ro


class CafeProduct(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    category = models.ForeignKey(CafeCategory, on_delete=models.PROTECT, related_name="products")
    name_ro = models.CharField(max_length=120)
    name_en = models.CharField(max_length=120)
    price = models.PositiveIntegerField("preț (bani)")
    marker = models.CharField(max_length=12, choices=Marker.choices, default=Marker.TO_SET)
    is_available = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name_ro"]
        verbose_name = "produs cafenea"
        verbose_name_plural = "produse cafenea"

    def __str__(self) -> str:
        return self.name_ro


class OrderStatus(models.TextChoices):
    NEW = "new", "Nouă"
    PREPARING = "preparing", "În preparare"
    READY = "ready", "Gata"
    PICKED_UP = "picked_up", "Ridicată"
    CANCELLED = "cancelled", "Anulată"


class CafeOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    day = models.DateField(help_text="Ziua (ora României) pentru numerotare.")
    number = models.PositiveSmallIntegerField(help_text="Numărul comenzii din ziua respectivă.")
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    status = models.CharField(max_length=10, choices=OrderStatus.choices, default=OrderStatus.NEW)
    total = models.PositiveIntegerField("total (bani)")
    transaction = models.OneToOneField(
        "ledger.LedgerTransaction", on_delete=models.PROTECT, related_name="+"
    )
    device = models.ForeignKey("devices.Device", on_delete=models.PROTECT, null=True, blank=True)
    created_at = models.DateTimeField()
    ready_at = models.DateTimeField(null=True, blank=True)
    picked_up_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "comandă cafenea"
        verbose_name_plural = "comenzi cafenea"
        constraints = [
            models.UniqueConstraint(
                fields=["location", "day", "number"], name="cafe_order_number_per_day"
            )
        ]

    def __str__(self) -> str:
        return f"#{self.number} {self.day}"


class CafeOrderLine(models.Model):
    id = models.BigAutoField(primary_key=True)
    order = models.ForeignKey(CafeOrder, on_delete=models.CASCADE, related_name="lines")
    product = models.ForeignKey(CafeProduct, on_delete=models.PROTECT)
    name = models.CharField(max_length=120, help_text="Numele la momentul comenzii.")
    unit_price = models.PositiveIntegerField()
    quantity = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ["id"]
        verbose_name = "produs comandat"
        verbose_name_plural = "produse comandate"
        constraints = [
            models.CheckConstraint(condition=models.Q(quantity__gte=1), name="cafe_line_quantity")
        ]

    def __str__(self) -> str:
        return f"{self.quantity} × {self.name}"
