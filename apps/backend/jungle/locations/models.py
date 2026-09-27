"""Locations and bookable resources (§2.2, §7, Q20).

The system supports several locations from day one. New resources (courts, rooms,
Reformer machines) are added from the admin, without new code.
"""

from __future__ import annotations

import uuid

from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models

slug_validator = RegexValidator(
    r"^[a-z0-9]+(?:-[a-z0-9]+)*$", "Doar litere mici, cifre și cratime.", code="invalid_slug"
)


class Location(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.CharField(max_length=60, unique=True, validators=[slug_validator])
    name = models.CharField(max_length=120)
    address = models.CharField(max_length=250, blank=True)
    city = models.CharField(max_length=120, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "locație"
        verbose_name_plural = "locații"

    def __str__(self) -> str:
        return self.name


class ResourceKind(models.TextChoices):
    PADEL_COURT = "padel_court", "Teren de padel"
    TENNIS_COURT = "tennis_court", "Teren de tenis"
    PILATES_STUDIO = "pilates_studio", "Sală de pilates"
    REFORMER = "reformer", "Aparat Reformer"
    EVENT_ROOM = "event_room", "Sală de evenimente"


# Which kind of parent each kind requires (None = must have no parent).
REQUIRED_PARENT_KIND: dict[str, str | None] = {
    ResourceKind.PADEL_COURT: None,
    ResourceKind.TENNIS_COURT: None,
    ResourceKind.PILATES_STUDIO: None,
    ResourceKind.REFORMER: ResourceKind.PILATES_STUDIO,
    ResourceKind.EVENT_ROOM: None,
}


class Resource(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name="resources")
    kind = models.CharField(max_length=30, choices=ResourceKind.choices)
    slug = models.CharField(max_length=60, validators=[slug_validator])
    name = models.CharField(max_length=120)
    parent = models.ForeignKey(
        "self", on_delete=models.PROTECT, null=True, blank=True, related_name="children"
    )
    capacity = models.PositiveIntegerField(null=True, blank=True)
    attributes = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["location__name", "kind", "sort_order", "name"]
        verbose_name = "resursă"
        verbose_name_plural = "resurse"
        constraints = [
            models.UniqueConstraint(fields=["location", "slug"], name="resource_slug_per_location"),
            models.CheckConstraint(
                condition=models.Q(capacity__isnull=True) | models.Q(capacity__gte=1),
                name="resource_capacity_positive",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.location})"

    def clean(self) -> None:
        required = REQUIRED_PARENT_KIND.get(self.kind)
        parent = self.parent
        if required is None and parent is not None:
            raise ValidationError({"parent": "Acest tip de resursă nu are resursă-părinte."})
        if required is not None:
            if parent is None or parent.kind != required:
                raise ValidationError(
                    {"parent": "Un aparat Reformer aparține unei săli de pilates."}
                )
            if parent.location_id != self.location_id:
                raise ValidationError(
                    {"parent": "Resursa-părinte trebuie să fie în aceeași locație."}
                )
