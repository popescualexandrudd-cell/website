"""Cash at the Payments Kiosk (§8.3, R-062, R-066, ADR-0013).

A **checkout** is one purchase at the kiosk: what the customer pays for (bookings or their
share of one, debts, a subscription, café products), the cash inserted, the change given and
the fiscal receipt. The money counts only from **cash events** signed by the kiosk's Hardware
Bridge (a note accepted, change given, a receipt printed); each event is stored once, by its
id, and never changed. The ledger gets the payments only when the checkout is settled.

The kiosk's **cash box** has its own ledger account: refills and emptying move money between
it and the safe; a signed count is compared with the ledger (reconciliation); the day is
closed with the register's Z report.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class CheckoutStatus(models.TextChoices):
    OPEN = "open", "Coș (fără bani)"
    COLLECTING = "collecting", "Se primesc bani"
    PAID = "paid", "Plătit, se dă restul"
    SETTLED = "settled", "Încheiat"
    CANCELLED = "cancelled", "Anulat"
    INTERRUPTED = "interrupted", "Întrerupt (reconciliat)"


OPEN_STATUSES = (CheckoutStatus.OPEN, CheckoutStatus.COLLECTING, CheckoutStatus.PAID)


class ChangeMode(models.TextChoices):
    NORMAL = "normal", "Cu rest"
    EXACT = "exact", "Doar suma exactă"
    CREDIT = "credit", "Restul pe care aparatul nu-l poate da intră în cont (cu acordul clientului)"


class ItemKind(models.TextChoices):
    BOOKING = "booking", "Rezervare (sau partea din ea)"
    ENROLLMENT = "enrollment", "Loc la clasă"
    SUBSCRIPTION = "subscription", "Abonament"
    TOURNAMENT_ENTRY = "tournament_entry", "Taxă de turneu"
    CAFE = "cafe", "Cafenea"


class Checkout(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    device = models.ForeignKey("devices.Device", on_delete=models.PROTECT, related_name="+")
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    status = models.CharField(
        max_length=12, choices=CheckoutStatus.choices, default=CheckoutStatus.OPEN
    )
    change_mode = models.CharField(
        max_length=8, choices=ChangeMode.choices, default=ChangeMode.NORMAL
    )
    amount_due = models.PositiveBigIntegerField(help_text="bani")
    # From the signed cash events (bani): what went in, what came out as change, and what the
    # machine could not give back and went into the customer's account as credit.
    inserted = models.PositiveBigIntegerField(default=0)
    dispensed = models.PositiveBigIntegerField(default=0)
    credited = models.PositiveBigIntegerField(default=0)
    fiscal_receipt = models.CharField(max_length=60, blank=True)
    created_at = models.DateTimeField()
    collecting_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "plată la chioșc"
        verbose_name_plural = "plăți la chioșc"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(dispensed__lte=models.F("inserted")),
                name="checkout_change_le_inserted",
            )
        ]

    def __str__(self) -> str:
        return f"{self.get_status_display()} {self.amount_due}"


class CheckoutItem(models.Model):
    id = models.BigAutoField(primary_key=True)
    checkout = models.ForeignKey(Checkout, on_delete=models.PROTECT, related_name="items")
    position = models.PositiveSmallIntegerField()
    kind = models.CharField(max_length=20, choices=ItemKind.choices)
    subject_id = models.UUIDField(null=True, blank=True)
    amount = models.PositiveBigIntegerField(help_text="bani")
    description = models.CharField(max_length=250)
    cafe_lines = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["position"]
        verbose_name = "ce se plătește"
        verbose_name_plural = "ce se plătește"
        constraints = [
            models.UniqueConstraint(fields=["checkout", "position"], name="checkout_item_position")
        ]

    def __str__(self) -> str:
        return self.description


class CashEventKind(models.TextChoices):
    STARTED = "cash.started", "Plată începută"
    ACCEPTED = "cash.accepted", "Bancnotă primită"
    DISPENSED = "cash.dispensed", "Rest dat"
    CLOSED = "cash.closed", "Plată încheiată"
    INTERRUPTED = "cash.interrupted", "Plată întreruptă (cădere de curent)"
    REFILLED = "cash.refilled", "Rest alimentat"
    EMPTIED = "cash.emptied", "Casetă golită"
    COUNTED = "cash.counted", "Numărare"
    FISCAL_PRINTED = "fiscal.printed", "Bon fiscal tipărit"
    Z_REPORT = "fiscal.z", "Raport Z"


class CashEvent(models.Model):
    """What the kiosk's Hardware Bridge signed (append-only, one row per event id)."""

    id = models.UUIDField(primary_key=True, help_text="ID-ul evenimentului, din Bridge")
    device = models.ForeignKey("devices.Device", on_delete=models.PROTECT, related_name="+")
    checkout = models.ForeignKey(
        Checkout, on_delete=models.PROTECT, null=True, blank=True, related_name="events"
    )
    operation = models.ForeignKey(
        "checkout.CashOperation",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="events",
    )
    kind = models.CharField(max_length=20, choices=CashEventKind.choices)
    amount = models.BigIntegerField(default=0)
    envelope = models.JSONField(help_text="Mesajul semnat, așa cum a venit")
    happened_at = models.DateTimeField(help_text="Ora de pe aparat")
    received_at = models.DateTimeField()

    class Meta:
        ordering = ["happened_at", "received_at"]
        verbose_name = "eveniment de numerar"
        verbose_name_plural = "evenimente de numerar"

    def __str__(self) -> str:
        return f"{self.kind} {self.amount}"


class OperationKind(models.TextChoices):
    REFILL = "refill", "Alimentare rest"
    EMPTY = "empty", "Golire casetă"
    COUNT = "count", "Numărare"
    DAY_CLOSE = "day_close", "Închidere de zi (raport Z)"


class CashOperation(models.Model):
    """A staff operation on the kiosk's cash box, started in staff mode (PIN + card)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey("devices.Device", on_delete=models.PROTECT, related_name="+")
    location = models.ForeignKey("locations.Location", on_delete=models.PROTECT)
    kind = models.CharField(max_length=12, choices=OperationKind.choices)
    staff = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    requested = models.JSONField(default=dict, blank=True, help_text="Ce a cerut personalul")
    result = models.JSONField(default=dict, blank=True, help_text="Ce a raportat aparatul")
    amount = models.BigIntegerField(null=True, blank=True, help_text="bani (după aparat)")
    ledger_amount = models.BigIntegerField(
        null=True, blank=True, help_text="bani: ce arată registrul pentru acest aparat"
    )
    difference = models.BigIntegerField(null=True, blank=True, help_text="aparat − registru")
    created_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "operațiune de casă"
        verbose_name_plural = "operațiuni de casă"

    def __str__(self) -> str:
        return f"{self.get_kind_display()} {self.created_at:%Y-%m-%d %H:%M}"


class KioskPin(models.Model):
    """A staff member's PIN for the kiosk's staff mode (with their card). Only a hash is kept;
    after too many wrong tries the PIN is locked for a while (Q54)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, primary_key=True, related_name="+"
    )
    pin_hash = models.CharField(max_length=200)
    failures = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField()

    class Meta:
        verbose_name = "PIN de chioșc"
        verbose_name_plural = "PIN-uri de chioșc"

    def __str__(self) -> str:
        return str(self.user_id)
