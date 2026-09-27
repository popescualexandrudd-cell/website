"""Check-in, court-entry scans and automatic attendance (R-030 … R-032), no-show blocks
(R-073) and the staff notices they raise."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class ScanKind(models.TextChoices):
    ARRIVAL = "arrival", "Check-in la sosire"  # R-030
    COURT_ENTRY = "court_entry", "Intrare pe teren"  # R-031
    CLASS_ENTRY = "class_entry", "Intrare la clasă"  # R-032


class Scan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="scans"
    )
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    kind = models.CharField(max_length=15, choices=ScanKind.choices)
    resource = models.ForeignKey(
        "locations.Resource", on_delete=models.PROTECT, null=True, blank=True
    )
    device = models.ForeignKey("devices.Device", on_delete=models.PROTECT, null=True, blank=True)
    booking = models.ForeignKey(
        "bookings.Booking", on_delete=models.SET_NULL, null=True, blank=True, related_name="scans"
    )
    enrollment = models.ForeignKey(
        "bookings.ClassEnrollment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scans",
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    scanned_at = models.DateTimeField()

    class Meta:
        ordering = ["-scanned_at"]
        verbose_name = "scanare"
        verbose_name_plural = "scanări"
        indexes = [models.Index(fields=["user", "scanned_at"])]

    def __str__(self) -> str:
        return f"{self.kind} {self.scanned_at:%Y-%m-%d %H:%M}"


class BookingRestriction(models.Model):
    """R-073: bookings blocked after repeated no-shows, until a coach or manager lifts it."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="booking_restrictions"
    )
    reason = models.CharField(max_length=250)
    no_show_count = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField()
    lifted_at = models.DateTimeField(null=True, blank=True)
    lifted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    lift_reason = models.CharField(max_length=250, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "blocare rezervări"
        verbose_name_plural = "blocări rezervări"
        constraints = [
            models.UniqueConstraint(
                fields=["user"], condition=models.Q(lifted_at__isnull=True), name="one_active_block"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user_id} ({self.no_show_count})"


class StaffNotice(models.Model):
    """An in-platform message for staff (R-073: the responsible coach decides)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="+"
    )
    recipient_role = models.CharField(max_length=20, blank=True)
    kind = models.CharField(max_length=40)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField()
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "notificare pentru personal"
        verbose_name_plural = "notificări pentru personal"

    def __str__(self) -> str:
        return f"{self.kind} {self.created_at:%Y-%m-%d %H:%M}"
