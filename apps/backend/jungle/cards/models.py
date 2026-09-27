"""Member cards (R-020 … R-025).

A card is a random, revocable token shown as a QR code: on the physical card, in the
email, in Apple Wallet and in Google Wallet. It holds no personal data. A person has at
most one active card; reissuing a card revokes every older one (R-022).
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class CardStatus(models.TextChoices):
    ACTIVE = "active", "Activ"
    REVOKED = "revoked", "Blocat"


class MemberCard(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cards"
    )
    token = models.CharField(
        max_length=64, unique=True, help_text="Conținutul codului QR (aleatoriu)."
    )
    number = models.CharField(max_length=12, unique=True, help_text="Număr scurt, tipărit pe card.")
    status = models.CharField(max_length=10, choices=CardStatus.choices, default=CardStatus.ACTIVE)
    wallet_auth_token = models.CharField(max_length=64, help_text="Cheia serviciului Apple Wallet.")
    issued_at = models.DateTimeField()
    updated_at = models.DateTimeField(help_text="Ultima schimbare vizibilă pe card (R-023).")
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoke_reason = models.CharField(max_length=250, blank=True)

    class Meta:
        ordering = ["-issued_at"]
        verbose_name = "card de membru"
        verbose_name_plural = "carduri de membru"
        constraints = [
            models.UniqueConstraint(
                fields=["user"], condition=models.Q(status="active"), name="one_active_card"
            )
        ]

    def __str__(self) -> str:
        return self.number


class PrintReason(models.TextChoices):
    NEW_MEMBER = "new_member", "Membru nou"
    REISSUE = "reissue", "Reemitere (card pierdut sau deteriorat)"
    DIAMOND = "diamond", "Promovare în Diamant (R-024)"


class PrintStatus(models.TextChoices):
    QUEUED = "queued", "De tipărit"
    PRINTED = "printed", "Tipărit"
    HANDED_OVER = "handed_over", "Predat"
    CANCELLED = "cancelled", "Anulat"


class PhysicalCardRequest(models.Model):
    """R-021: the queue of cards the club prints itself."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    card = models.ForeignKey(MemberCard, on_delete=models.CASCADE, related_name="print_requests")
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    reason = models.CharField(max_length=12, choices=PrintReason.choices)
    emblem = models.CharField(max_length=30, blank=True, help_text="R-024, Q1: emblema aleasă.")
    status = models.CharField(
        max_length=12, choices=PrintStatus.choices, default=PrintStatus.QUEUED
    )
    created_at = models.DateTimeField()
    printed_at = models.DateTimeField(null=True, blank=True)
    handed_over_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "card de tipărit"
        verbose_name_plural = "carduri de tipărit"

    def __str__(self) -> str:
        return f"{self.card_id} ({self.status})"


class AppleDeviceRegistration(models.Model):
    """A device that added the card to Apple Wallet (for automatic updates, R-023)."""

    id = models.BigAutoField(primary_key=True)
    card = models.ForeignKey(
        MemberCard, on_delete=models.CASCADE, related_name="apple_registrations"
    )
    device_library_id = models.CharField(max_length=128)
    push_token = models.CharField(max_length=256)
    created_at = models.DateTimeField()

    class Meta:
        verbose_name = "dispozitiv Apple Wallet"
        verbose_name_plural = "dispozitive Apple Wallet"
        constraints = [
            models.UniqueConstraint(
                fields=["card", "device_library_id"], name="apple_registration_once"
            )
        ]

    def __str__(self) -> str:
        return self.device_library_id[:12]
