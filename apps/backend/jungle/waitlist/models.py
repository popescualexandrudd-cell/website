"""Pre-launch waitlist (Stage 1B) with double opt-in.

A person is only contacted after confirming the email address. Unsubscribing erases the
personal data; only a hash of the address is kept (proof of withdrawal, no re-contact).
"""

from __future__ import annotations

import uuid

from django.db import models


class Level(models.TextChoices):
    """Self-declared playing level (optional). Data minimisation: nothing else is asked."""

    BEGINNER = "beginner", "Începător"
    INTERMEDIATE = "intermediate", "Intermediar"
    ADVANCED = "advanced", "Avansat"
    COMPETITIVE = "competitive", "Competiție"


class Status(models.TextChoices):
    PENDING = "pending", "Neconfirmat"
    CONFIRMED = "confirmed", "Confirmat"
    WITHDRAWN = "withdrawn", "Dezabonat"


class WaitlistEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField("email", max_length=254, unique=True, null=True, blank=True)
    email_sha256 = models.CharField(max_length=64, unique=True)
    name = models.CharField("nume", max_length=150, blank=True)
    level = models.CharField("nivel de joc", max_length=15, choices=Level.choices, blank=True)
    language = models.CharField("limba", max_length=5, default="ro")
    source = models.CharField("sursa", max_length=60, blank=True)
    status = models.CharField(
        "stare", max_length=10, choices=Status.choices, default=Status.PENDING
    )
    notice = models.ForeignKey(
        "legal.LegalDocument",
        on_delete=models.PROTECT,
        related_name="+",
        verbose_name="nota de informare",
    )
    notice_sha256 = models.CharField(max_length=64)
    consent_ip = models.GenericIPAddressField(null=True, blank=True)
    consent_user_agent = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField("înscris la", auto_now_add=True)
    confirmation_sent_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField("confirmat la", null=True, blank=True)
    withdrawn_at = models.DateTimeField("dezabonat la", null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "înscriere pe lista de așteptare"
        verbose_name_plural = "lista de așteptare"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(status="withdrawn") | models.Q(email__isnull=False),
                name="waitlist_email_required_unless_withdrawn",
            )
        ]

    def __str__(self) -> str:
        return f"{self.email or '(dezabonat)'} — {self.get_status_display()}"
