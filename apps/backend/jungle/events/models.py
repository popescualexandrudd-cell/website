"""The club's public calendar (R-110, §9.2.12): DJ nights, social padel evenings, club days.

Published from the panel by whoever manages the events (`events.manage`); the website reads it
together with the league's tournaments (§6.14, their own model), which are never copied here.
An event on the calendar is not a booking: the courts or the room it uses are booked apart.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class EventKind(models.TextChoices):
    DJ_NIGHT = "dj_night", "Seară cu DJ"
    SOCIAL = "social", "Padel social (Americano, Mexicano)"
    CLUB = "club", "Eveniment al clubului"


class ClubEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey(
        "locations.Location", on_delete=models.PROTECT, related_name="club_events"
    )
    kind = models.CharField(max_length=10, choices=EventKind.choices)
    # RO + EN complete (§10): both titles are required, the short texts are optional.
    title_ro = models.CharField(max_length=120)
    title_en = models.CharField(max_length=120)
    text_ro = models.CharField(max_length=500, blank=True)
    text_en = models.CharField(max_length=500, blank=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    published = models.BooleanField(default=False)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancel_reason = models.CharField(max_length=500, blank=True)
    # Demo data (seed_initial --demo) is shown as such on the website (invariant 12).
    is_demo = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["starts_at"]
        indexes = [models.Index(fields=["location", "starts_at"], name="club_event_by_start")]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(ends_at__gt=models.F("starts_at")),
                name="club_event_ends_after_start",
            ),
        ]
        verbose_name = "eveniment în calendar"
        verbose_name_plural = "calendarul evenimentelor"

    def __str__(self) -> str:
        return f"{self.title_ro} ({self.starts_at:%Y-%m-%d %H:%M} UTC)"
