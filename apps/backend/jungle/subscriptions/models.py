"""Subscriptions (R-080 … R-089), make-up sessions (Q14) and corporate accounts (R-088, Q35).

A subscription holds, per sport, a number of sessions per month (trainings: lessons and
classes, R-083). A month is a cycle counted from the start date. Unused sessions do not
carry over (R-085); a session cancelled in time becomes a make-up session valid until the
end of the subscription (Q14). Money lives in the ledger; prices are in bani.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from jungle.configuration.models import Marker


class Sport(models.TextChoices):
    PADEL = "padel", "Padel"
    TENNIS = "tennis", "Tenis"
    PILATES = "pilates", "Pilates (Reformer)"


class Period(models.TextChoices):
    MONTHLY = "monthly", "Lunar"
    QUARTERLY = "quarterly", "Trimestrial"
    ANNUAL = "annual", "Anual"


PERIOD_MONTHS = {Period.MONTHLY: 1, Period.QUARTERLY: 3, Period.ANNUAL: 12}


class SubscriptionRate(models.Model):
    """Monthly price of one sport at one intensity (R-081, R-082). DE_STABILIT until the
    owner sets it (Q21)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    sport = models.CharField(max_length=10, choices=Sport.choices)
    sessions_per_month = models.PositiveSmallIntegerField()
    monthly_price = models.PositiveIntegerField("preț pe lună (bani)")
    marker = models.CharField(max_length=12, choices=Marker.choices, default=Marker.TO_SET)
    note = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["sport", "sessions_per_month"]
        verbose_name = "tarif abonament"
        verbose_name_plural = "tarife abonamente"
        constraints = [
            models.UniqueConstraint(
                fields=["location", "sport", "sessions_per_month"], name="subscription_rate_unique"
            )
        ]

    def __str__(self) -> str:
        return f"{self.sport} × {self.sessions_per_month}"


class CorporateAccount(models.Model):
    """R-088, Q35: a company buys subscriptions for its employees; invoiced to the company.
    One company package for everyone (owner, 27.09.2026): the discount is a single setting."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    name = models.CharField(max_length=200)
    registration_code = models.CharField("CUI", max_length=20, blank=True)
    billing_email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "cont corporate"
        verbose_name_plural = "conturi corporate"

    def __str__(self) -> str:
        return self.name


class CorporateMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(CorporateAccount, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    added_at = models.DateTimeField()
    removed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["added_at"]
        verbose_name = "angajat corporate"
        verbose_name_plural = "angajați corporate"
        constraints = [
            models.UniqueConstraint(
                fields=["account", "user"],
                condition=models.Q(removed_at__isnull=True),
                name="corporate_member_once",
            )
        ]

    def __str__(self) -> str:
        return f"{self.account_id} {self.user_id}"


class SubscriptionStatus(models.TextChoices):
    PENDING_PAYMENT = "pending_payment", "Așteaptă plata"
    ACTIVE = "active", "Activ"
    CANCELLED = "cancelled", "Anulat"


class Subscription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="subscriptions"
    )
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    corporate = models.ForeignKey(
        CorporateAccount,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="subscriptions",
    )
    period = models.CharField(max_length=10, choices=Period.choices)
    starts_on = models.DateField()
    ends_on = models.DateField(help_text="Exclusiv; se prelungește cu zilele de înghețare (R-086).")
    status = models.CharField(
        max_length=16,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.PENDING_PAYMENT,
    )
    custom = models.BooleanField(default=False, help_text="Intensitate „La cerere” (Q12).")
    price_total = models.PositiveIntegerField("preț total (bani)")
    price_breakdown = models.JSONField(default=dict)
    price_provisional = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    created_at = models.DateTimeField()
    activated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "abonament"
        verbose_name_plural = "abonamente"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(ends_on__gt=models.F("starts_on")), name="subscription_positive"
            )
        ]

    def __str__(self) -> str:
        return f"{self.user_id} {self.starts_on} ({self.status})"


class SubscriptionComponent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(
        Subscription, on_delete=models.CASCADE, related_name="components"
    )
    sport = models.CharField(max_length=10, choices=Sport.choices)
    sessions_per_month = models.PositiveSmallIntegerField()
    peak_allowed = models.BooleanField(
        help_text="R-087: Start (sub prag) nu intră în orele de vârf."
    )
    monthly_price = models.PositiveIntegerField("preț pe lună (bani)")

    class Meta:
        ordering = ["sport"]
        verbose_name = "sport din abonament"
        verbose_name_plural = "sporturi din abonament"
        constraints = [
            models.UniqueConstraint(
                fields=["subscription", "sport"], name="subscription_sport_once"
            )
        ]

    def __str__(self) -> str:
        return f"{self.sport} × {self.sessions_per_month}"


class SubscriptionFreeze(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name="freezes")
    starts_on = models.DateField()
    ends_on = models.DateField(help_text="Exclusiv.")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    created_at = models.DateTimeField()

    class Meta:
        ordering = ["starts_on"]
        verbose_name = "înghețare"
        verbose_name_plural = "înghețări"

    def __str__(self) -> str:
        return f"{self.starts_on} – {self.ends_on}"


class SubscriptionMakeup(models.Model):
    """Q14: a session cancelled in time, usable until the end of the subscription."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    component = models.ForeignKey(
        SubscriptionComponent, on_delete=models.CASCADE, related_name="makeups"
    )
    expires_on = models.DateField()
    created_at = models.DateTimeField()

    class Meta:
        ordering = ["expires_on", "created_at"]
        verbose_name = "sesiune de recuperare"
        verbose_name_plural = "sesiuni de recuperare"

    def __str__(self) -> str:
        return f"{self.component_id} → {self.expires_on}"


class SubscriptionUse(models.Model):
    """One session taken from a subscription, by a lesson booking or a class place."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    component = models.ForeignKey(
        SubscriptionComponent, on_delete=models.PROTECT, related_name="uses"
    )
    cycle = models.PositiveSmallIntegerField(help_text="Luna abonamentului (0 = prima).")
    booking = models.OneToOneField(
        "bookings.Booking",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="subscription_use",
    )
    enrollment = models.OneToOneField(
        "bookings.ClassEnrollment",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="subscription_use",
    )
    makeup = models.OneToOneField(
        SubscriptionMakeup, on_delete=models.PROTECT, null=True, blank=True, related_name="use"
    )
    created_at = models.DateTimeField()
    released_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "sesiune folosită"
        verbose_name_plural = "sesiuni folosite"

    def __str__(self) -> str:
        return f"{self.component_id} cycle {self.cycle}"
