"""The teams the players chose themselves at the League Kiosk (Q55, 29.09.2026): before a score
is entered, the four players on a court may say who plays with whom; the screens show it."""

from __future__ import annotations

from django.conf import settings
from django.db import models


class CourtLineup(models.Model):
    booking = models.OneToOneField(
        "bookings.Booking", on_delete=models.CASCADE, related_name="lineup"
    )
    team_a = models.JSONField(default=list, help_text="Id-urile jucătorilor din prima echipă.")
    team_b = models.JSONField(default=list, help_text="Id-urile jucătorilor din a doua echipă.")
    set_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    device = models.ForeignKey(
        "devices.Device", on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    updated_at = models.DateTimeField()

    class Meta:
        verbose_name = "echipele de pe teren"
        verbose_name_plural = "echipele de pe teren"

    def __str__(self) -> str:
        return f"{self.booking_id}"


class NameObjection(models.Model):
    """GDPR art. 21 (Q55): someone who does not want to appear by name on the screens appears
    as "Jucător". Recorded by the staff at the person's request (at the reception or by email);
    the page in the staff admin comes with Stage 10."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="screen_objection"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    note = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = "fără nume pe ecrane"
        verbose_name_plural = "fără nume pe ecrane"

    def __str__(self) -> str:
        return str(self.user_id)
