"""The internal ledger (R-064, ADR-0009): double entry, integers in bani, append-only.

Sign convention: an entry's `amount` is positive for a debit and negative for a credit;
the entries of one transaction always sum to zero (checked in code and by a deferred
database trigger). Nothing is ever updated or deleted: a correction is a new transaction
that reverses the old one, with a reason and an author.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class AccountKind(models.TextChoices):
    CASH = "cash", "Numerar (casierie / chioșc)"  # asset
    CARD = "card", "Card (POS / online)"  # asset, adapters activated later (R-062, Q9)
    RECEIVABLE = "receivable", "Datorii ale clientului"  # asset: what a customer owes
    CUSTOMER_BALANCE = "customer_balance", "Sold (credit) al clientului"  # liability
    VOUCHERS = "vouchers", "Vouchere emise"  # liability
    REVENUE = "revenue", "Venituri"
    DISCOUNTS = "discounts", "Reduceri și recompense acordate"  # contra-revenue


class RevenueCategory(models.TextChoices):
    """ADR-0009 §3: revenue per category, for the reports."""

    PADEL = "padel", "Padel"
    TENNIS = "tennis", "Tenis"
    PILATES = "pilates", "Pilates"
    LESSONS = "lessons", "Lecții"
    SUBSCRIPTIONS = "subscriptions", "Abonamente"
    CAFE = "cafe", "Cafenea"
    EVENTS = "events", "Evenimente"
    TOURNAMENTS = "tournaments", "Turnee"
    FEES = "fees", "Taxe (anulare tardivă, neprezentare)"


class LedgerAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=120, unique=True)
    kind = models.CharField(max_length=20, choices=AccountKind.choices)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True
    )
    location = models.ForeignKey(
        "locations.Location", on_delete=models.PROTECT, null=True, blank=True
    )
    category = models.CharField(max_length=60, blank=True)
    currency = models.CharField(max_length=3, default="RON")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "cont contabil"
        verbose_name_plural = "conturi contabile"

    def __str__(self) -> str:
        return self.code


class TransactionKind(models.TextChoices):
    CHARGE = "charge", "Sumă datorată (rezervare, clasă, taxă)"
    PAYMENT = "payment", "Plată"
    CREDIT = "credit", "Credit în cont"
    REFUND = "refund", "Rambursare"
    REVERSAL = "reversal", "Corecție (înregistrare inversă)"
    SALE = "sale", "Vânzare (abonament, cafenea)"
    VOUCHER_ISSUE = "voucher_issue", "Voucher emis"
    VOUCHER_REDEEM = "voucher_redeem", "Voucher folosit"


class LedgerTransaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=20, choices=TransactionKind.choices)
    # R-067: one key per money operation; a retry returns the first result.
    idempotency_key = models.CharField(max_length=200, unique=True, null=True, blank=True)
    request_hash = models.CharField(max_length=64, blank=True)
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT, null=True)
    booking = models.ForeignKey(
        "bookings.Booking", on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    enrollment = models.ForeignKey(
        "bookings.ClassEnrollment",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="+",
    )
    # What the money is for: "booking:<id>", "enrollment:<id>", "subscription:<id>", …
    subject = models.CharField(max_length=80, blank=True, db_index=True)
    reverses = models.OneToOneField(
        "self", on_delete=models.PROTECT, null=True, blank=True, related_name="reversed_by"
    )
    description = models.CharField(max_length=250)
    reason = models.CharField(max_length=500, blank=True)
    actor = models.JSONField(default=dict)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "tranzacție"
        verbose_name_plural = "tranzacții"
        indexes = [models.Index(fields=["booking"]), models.Index(fields=["enrollment"])]

    def __str__(self) -> str:
        return f"{self.kind} {self.created_at:%Y-%m-%d %H:%M}"


class LedgerEntry(models.Model):
    id = models.BigAutoField(primary_key=True)
    transaction = models.ForeignKey(
        LedgerTransaction, on_delete=models.PROTECT, related_name="entries"
    )
    account = models.ForeignKey(LedgerAccount, on_delete=models.PROTECT, related_name="entries")
    amount = models.BigIntegerField(help_text="bani; + debit, − credit")

    class Meta:
        ordering = ["id"]
        verbose_name = "înregistrare"
        verbose_name_plural = "înregistrări"
        constraints = [
            models.CheckConstraint(condition=~models.Q(amount=0), name="ledger_entry_not_zero")
        ]

    def __str__(self) -> str:
        return f"{self.account_id} {self.amount}"


class PaymentMethod(models.TextChoices):
    CASH = "cash", "Numerar"
    CARD = "card", "Card"
    BALANCE = "balance", "Sold în cont"
    VOUCHER = "voucher", "Voucher"


class Payment(models.Model):
    """What a customer paid, in the terms of the receipt: tendered, change, fiscal receipt.
    The money itself moves in the linked ledger transaction."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.OneToOneField(LedgerTransaction, on_delete=models.PROTECT)
    payer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    method = models.CharField(max_length=10, choices=PaymentMethod.choices)
    amount = models.PositiveBigIntegerField()
    tendered = models.PositiveBigIntegerField(default=0)
    change = models.PositiveBigIntegerField(default=0)
    fiscal_receipt = models.CharField(max_length=60, blank=True)
    device = models.ForeignKey("devices.Device", on_delete=models.PROTECT, null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "plată"
        verbose_name_plural = "plăți"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(change__lte=models.F("tendered")),
                name="payment_change_le_tendered",
            )
        ]

    def __str__(self) -> str:
        return f"{self.method} {self.amount}"
