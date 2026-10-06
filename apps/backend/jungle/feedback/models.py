"""The client's opinion after the first game (Q71, 06.10.2026): one question, "would you recommend
us to a friend?", 0–10, asked once per person, the day after the first time they played on a
court. Only the score is kept (no text), so it is never someone else's personal data."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class Feedback(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="feedback"
    )
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    booking = models.ForeignKey(
        "bookings.Booking", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    asked_at = models.DateTimeField()
    score = models.PositiveSmallIntegerField(null=True, blank=True)
    answered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-asked_at"]
        verbose_name = "părere (NPS)"
        verbose_name_plural = "păreri (NPS)"
        constraints = [
            models.CheckConstraint(
                condition=Q(score__isnull=True) | Q(score__lte=10), name="feedback_score_0_10"
            ),
            models.CheckConstraint(
                condition=Q(score__isnull=True, answered_at__isnull=True)
                | Q(score__isnull=False, answered_at__isnull=False),
                name="feedback_answered_with_score",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.asked_at:%Y-%m-%d} · {'—' if self.score is None else self.score}"
