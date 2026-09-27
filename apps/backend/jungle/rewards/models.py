"""Vouchers (R-120, R-121, Q32) and "Bring a friend" referrals (R-120).

A voucher is a promise, not money: nothing moves in the ledger when it is issued. When it is
used, its value is posted as a discount (Dr discounts / Cr what the customer owes), so every
voucher that was worth something appears in the ledger exactly once, with its reason.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class VoucherKind(models.TextChoices):
    HOUR = "hour", "O oră gratuită de padel"
    AMOUNT = "amount", "Sumă fixă"
    PERCENT = "percent", "Reducere procentuală"


class VoucherTarget(models.TextChoices):
    BOOKING = "booking", "Rezervare de teren"
    SUBSCRIPTION = "subscription", "Abonament"
    ANY = "any", "Orice"


class VoucherSource(models.TextChoices):
    REFERRAL = "referral", "Adu un prieten"
    REWARD = "reward", "Recompensă de sezon"
    MANUAL = "manual", "Emis de manager"


class VoucherStatus(models.TextChoices):
    ACTIVE = "active", "Activ"
    REDEEMED = "redeemed", "Folosit"
    CANCELLED = "cancelled", "Anulat"


class Voucher(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    holder = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="vouchers"
    )
    kind = models.CharField(max_length=10, choices=VoucherKind.choices)
    value = models.PositiveIntegerField(help_text="minute (oră), bani (sumă) sau procent")
    target = models.CharField(max_length=15, choices=VoucherTarget.choices)
    allowed_bands = models.JSONField(default=list, blank=True, help_text="Gol = orice bandă (Q32).")
    valid_from = models.DateField()
    valid_until = models.DateField(help_text="Inclusiv.")
    source = models.CharField(max_length=10, choices=VoucherSource.choices)
    reason = models.CharField(max_length=250)
    status = models.CharField(
        max_length=10, choices=VoucherStatus.choices, default=VoucherStatus.ACTIVE
    )
    issued_at = models.DateTimeField()
    redeemed_at = models.DateTimeField(null=True, blank=True)
    redeemed_subject = models.CharField(max_length=80, blank=True)

    class Meta:
        ordering = ["-issued_at"]
        verbose_name = "voucher"
        verbose_name_plural = "vouchere"
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(kind="percent") | models.Q(value__lte=100),
                name="voucher_percent_le_100",
            )
        ]

    def __str__(self) -> str:
        return self.code


class ReferralStatus(models.TextChoices):
    PENDING = "pending", "Așteaptă primul abonament"
    REWARDED = "rewarded", "Vouchere acordate"


class Referral(models.Model):
    """R-120: one referral per new person, ever (unique on the referred person)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+"
    )
    referred = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="referral"
    )
    status = models.CharField(
        max_length=10, choices=ReferralStatus.choices, default=ReferralStatus.PENDING
    )
    created_at = models.DateTimeField()
    rewarded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "recomandare"
        verbose_name_plural = "recomandări"

    def __str__(self) -> str:
        return f"{self.referrer_id} → {self.referred_id}"


class ReferralCode(models.Model):
    """The personal code a member shares with friends (created on first request)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="referral_code",
    )
    code = models.CharField(max_length=12, unique=True)
    created_at = models.DateTimeField()

    class Meta:
        verbose_name = "cod de recomandare"
        verbose_name_plural = "coduri de recomandare"

    def __str__(self) -> str:
        return self.code
