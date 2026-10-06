"""Paying in cash at the Payments Kiosk (§8.3, R-060 … R-067, ADR-0009, ADR-0013).

1. `create`: the customer (card scanned) builds a basket: a booking or their share of it
   (R-060, R-061), debts, a class place, a subscription, a tournament fee, café products.
2. `start`: before any money goes in, the kiosk asked its bridge whether it can give change;
   the customer chose normal change, the exact amount only, or change that the machine
   cannot give going into the account as credit (only with their explicit consent, §8.3).
   The server answers with the command `cash.accept`, signed with its key.
3. `record_events`: every note the bridge accepted, every change it gave, every receipt it
   printed arrives signed by the bridge. Only these count; each is stored once, by its id.
4. `finish`: enough money is in; the server signs `cash.dispense` for the change.
5. `settle`: the ledger gets one cash payment per item (into this kiosk's cash box) and, if
   the machine could not give all the change, credit in the customer's account. The server
   signs the fiscal receipt (`fiscal.print`, R-066) and `cash.close`.

No leu is lost without a trace: money that arrives when it should not (after a cancellation,
after a power cut, for an unknown transaction) is recorded, credited to the customer when
known, and reported to the manager.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from django.db import transaction
from django.db.models import Sum
from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.attendance.models import StaffNotice
from jungle.audit import services as audit
from jungle.audit.models import ActorKind
from jungle.cafe import services as cafe
from jungle.cafe.models import CafeProduct
from jungle.checkout.models import (
    OPEN_STATUSES,
    CashEvent,
    CashEventKind,
    ChangeMode,
    Checkout,
    CheckoutItem,
    CheckoutStatus,
    ItemKind,
)
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.http import client_ip
from jungle.core.permissions import Role
from jungle.devices import bridge, commands
from jungle.devices.auth import device_of
from jungle.devices.kiosk_session import CardIn, acting_as, person
from jungle.devices.models import Device, DeviceKind
from jungle.devices.network import in_club_network
from jungle.ledger import payments
from jungle.ledger.models import AccountKind, LedgerAccount, PaymentMethod, TransactionKind
from jungle.ledger.services import account, post
from jungle.locations.models import Location
from jungle.notifications import services as notifications

# Events that belong to a checkout; the others belong to a staff operation (`cashbox`).
CHECKOUT_EVENTS = (
    CashEventKind.STARTED,
    CashEventKind.ACCEPTED,
    CashEventKind.DISPENSED,
    CashEventKind.CLOSED,
    CashEventKind.INTERRUPTED,
    CashEventKind.FISCAL_PRINTED,
)
MAX_EVENTS = 100  # per request
NOTICE_KIND = "checkout.cash_attention"
FAULT_NOTICE = "checkout.device_fault"


def cash_box(device: Device) -> LedgerAccount:
    """The kiosk's own cash (reconciled against its counted cash, R-064)."""
    return account(AccountKind.CASH, location=device.location, category=f"kiosk:{device.pk}")


def safe(location: Location) -> LedgerAccount:
    """Where staff take the cash emptied from a kiosk and the change they refill it with."""
    return account(AccountKind.CASH, location=location, category="safe")


# ---------------------------------------------------------------- who may pay here
def guard(request: HttpRequest) -> Device:
    """An active Payments Kiosk, on the club's network (refusals are logged)."""
    device = device_of(request)
    current = Device.objects.filter(pk=device.pk).first()
    ip = client_ip(request) or ""
    problem = ""
    if current is None or current.kind != DeviceKind.PAYMENTS_KIOSK or not current.is_active:
        problem = "not_a_payments_kiosk"
    elif not in_club_network(ip):
        problem = "outside_club_network"
    if problem or current is None:
        audit.record(
            audit.actor_from_request(request),
            "checkout.refused",
            after={"problem": problem, "device": str(device.pk), "ip": ip},
        )
        raise DomainError(ErrorCode.CHECKOUT_KIOSK_ONLY, status=403)
    return current


def notify(location_id: uuid.UUID, problem: str, **details: Any) -> None:
    """Money that needs a person to look at it (the manager, in the admin)."""
    StaffNotice.objects.create(
        location_id=location_id,
        recipient_role=Role.MANAGER,
        kind=NOTICE_KIND,
        payload={"problem": problem, **{k: str(v) for k, v in details.items()}},
        created_at=clock.now(),
    )


# ---------------------------------------------------------------- the basket
@dataclass(frozen=True)
class ItemData:
    kind: str
    subject_id: uuid.UUID | None = None
    amount: int | None = None  # None: all that is left to pay
    cafe_lines: list[tuple[uuid.UUID, int]] = field(default_factory=list)


@dataclass(frozen=True)
class Prepared:
    kind: str
    subject_id: uuid.UUID | None
    amount: int
    description: str
    cafe_lines: list[dict[str, Any]]


def subject(kind: str, subject_id: uuid.UUID | None) -> payments.Subject:
    if kind == ItemKind.BOOKING:
        return payments.Subject(booking_id=subject_id)
    if kind == ItemKind.ENROLLMENT:
        return payments.Subject(enrollment_id=subject_id)
    if kind == ItemKind.SUBSCRIPTION:
        return payments.Subject(subscription_id=subject_id)
    if kind == ItemKind.TOURNAMENT_ENTRY:
        return payments.Subject(tournament_entry_id=subject_id)
    raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "kind"})


def _holders(due: payments.Due, kind: str) -> set[uuid.UUID]:
    """Who may pay for it here: anyone for a booking (the hour is split, R-060); otherwise
    the holder (for a tournament entry, either player of the pair)."""
    if kind == ItemKind.TOURNAMENT_ENTRY:
        from jungle.league.models import TournamentEntry

        entry = TournamentEntry.objects.get(pk=due.key.split(":", 1)[1])
        return {p for p in (entry.player_a_id, entry.player_b_id) if p is not None}
    return {due.customer.pk}


def _prepare_cafe(location: Location, lines: list[tuple[uuid.UUID, int]]) -> Prepared:
    ids = [product_id for product_id, _ in lines]
    products = {
        p.pk: p
        for p in CafeProduct.objects.filter(pk__in=ids, location=location, is_available=True)
    }
    if (
        not lines
        or len(products) != len(set(ids))
        or any(not 1 <= qty <= cafe.MAX_QUANTITY for _, qty in lines)
    ):
        raise DomainError(ErrorCode.CAFE_PRODUCT_UNAVAILABLE)
    rows: list[dict[str, Any]] = [
        {
            "product_id": str(pid),
            "name": products[pid].name_ro,
            "unit_price": products[pid].price,
            "quantity": qty,
        }
        for pid, qty in lines
    ]
    total = sum(products[pid].price * qty for pid, qty in lines)
    names = ", ".join(f"{r['quantity']} × {r['name']}" for r in rows)
    return Prepared(ItemKind.CAFE, None, total, f"Cafenea: {names}"[:250], rows)


def _prepare(customer: User, location: Location, item: ItemData) -> Prepared:
    if item.kind == ItemKind.CAFE:
        return _prepare_cafe(location, item.cafe_lines)
    due = payments.resolve_due(subject(item.kind, item.subject_id))
    if due.location.pk != location.pk:
        raise DomainError(ErrorCode.CHECKOUT_WRONG_LOCATION)
    if item.kind != ItemKind.BOOKING and customer.pk not in _holders(due, item.kind):
        raise DomainError(ErrorCode.CHECKOUT_NOT_YOURS, status=403)
    to_pay = payments.money_status(due).to_pay
    if to_pay == 0:
        raise DomainError(ErrorCode.PAYMENTS_NOTHING_DUE, status=409)
    amount = to_pay if item.amount is None else item.amount
    if amount <= 0:
        raise DomainError(ErrorCode.PAYMENTS_INVALID_AMOUNT)
    if amount > to_pay:
        raise DomainError(ErrorCode.PAYMENTS_OVERPAY, params={"due": to_pay})
    return Prepared(item.kind, item.subject_id, amount, due.description, [])


def _items(customer: User, location: Location, items: list[ItemData]) -> list[Prepared]:
    if not items:
        raise DomainError(ErrorCode.CHECKOUT_EMPTY)
    keys = [(i.kind, i.subject_id) for i in items]
    if len(set(keys)) != len(keys):
        raise DomainError(ErrorCode.CHECKOUT_DUPLICATE_ITEM)
    prepared = [_prepare(customer, location, item) for item in items]
    total = sum(p.amount for p in prepared)
    limit = int(get_config("checkout.max_amount"))
    if total > limit:
        raise DomainError(ErrorCode.CHECKOUT_TOO_MUCH, params={"max": limit // 100})
    return prepared


def create(request: HttpRequest, card: CardIn, items: list[ItemData]) -> Checkout:
    device = guard(request)
    customer = person(request, card)
    actor = audit.actor_from_request(acting_as(request, customer))
    with transaction.atomic():
        Device.objects.select_for_update().get(pk=device.pk)  # one basket at a time per kiosk
        if Checkout.objects.filter(
            device=device, status__in=(CheckoutStatus.COLLECTING, CheckoutStatus.PAID)
        ).exists():
            raise DomainError(ErrorCode.CHECKOUT_BUSY, status=409)
        # A basket left without money (the customer walked away) is dropped.
        Checkout.objects.filter(device=device, status=CheckoutStatus.OPEN).update(
            status=CheckoutStatus.CANCELLED, finished_at=clock.now()
        )
        prepared = _items(customer, device.location, items)
        checkout = Checkout.objects.create(
            location=device.location,
            device=device,
            customer=customer,
            amount_due=sum(p.amount for p in prepared),
            created_at=clock.now(),
        )
        CheckoutItem.objects.bulk_create(
            CheckoutItem(
                checkout=checkout,
                position=n,
                kind=p.kind,
                subject_id=p.subject_id,
                amount=p.amount,
                description=p.description,
                cafe_lines=p.cafe_lines,
            )
            for n, p in enumerate(prepared)
        )
        audit.record(
            actor,
            "checkout.created",
            target=checkout,
            after={"amount": checkout.amount_due, "items": len(prepared)},
        )
    return checkout


def _locked(device: Device, checkout_id: uuid.UUID) -> Checkout:
    checkout = (
        Checkout.objects.select_for_update()
        .select_related("customer", "location", "device")
        .filter(pk=checkout_id, device=device)
        .first()
    )
    if checkout is None:
        raise DomainError(ErrorCode.CHECKOUT_NOT_FOUND, status=404)
    return checkout


def _still_payable(checkout: Checkout) -> None:
    """Between the basket and the money, someone else may have paid (or prices changed)."""
    for item in checkout.items.all():
        if item.kind == ItemKind.CAFE:
            lines = [(uuid.UUID(r["product_id"]), int(r["quantity"])) for r in item.cafe_lines]
            try:
                current = _prepare_cafe(checkout.location, lines).amount
            except DomainError:
                current = -1
        else:
            due = payments.resolve_due(subject(item.kind, item.subject_id))
            current = item.amount if item.amount <= payments.money_status(due).to_pay else -1
        if current != item.amount:
            raise DomainError(ErrorCode.CHECKOUT_STALE, status=409)


def start(
    request: HttpRequest, checkout_id: uuid.UUID, card: CardIn, mode: str
) -> tuple[Checkout, dict[str, Any]]:
    """The customer confirms the amount and how change works; the bridge may take cash."""
    device = guard(request)
    customer = person(request, card)
    if mode not in ChangeMode.values:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "change_mode"})
    with transaction.atomic():
        checkout = _locked(device, checkout_id)
        if checkout.customer_id != customer.pk:
            raise DomainError(ErrorCode.CHECKOUT_NOT_YOURS, status=403)
        if checkout.status != CheckoutStatus.OPEN:
            raise DomainError(ErrorCode.CHECKOUT_STATE_INVALID, status=409)
        if mode == ChangeMode.EXACT and checkout.amount_due % 100:
            raise DomainError(ErrorCode.CHECKOUT_EXACT_IMPOSSIBLE)
        _still_payable(checkout)
        checkout.status = CheckoutStatus.COLLECTING
        checkout.change_mode = mode
        checkout.collecting_at = clock.now()
        checkout.save(update_fields=["status", "change_mode", "collecting_at"])
        audit.record(
            audit.actor_from_request(acting_as(request, customer)),
            "checkout.collecting",
            target=checkout,
            after={"amount": checkout.amount_due, "change_mode": mode},
        )
    command = commands.sign(
        device,
        "cash.accept",
        txn=str(checkout.pk),
        amount=checkout.amount_due,
        exact_only=mode == ChangeMode.EXACT,
    )
    return checkout, command


# ---------------------------------------------------------------- what the bridge signed
def _amount(payload: dict[str, Any]) -> int:
    value = payload.get("amount", 0)
    if not isinstance(value, int) or isinstance(value, bool) or value < 0:
        raise DomainError(ErrorCode.CHECKOUT_EVENT_INVALID)
    return value


def _when(payload: dict[str, Any]) -> datetime:
    try:
        made = datetime.fromisoformat(str(payload.get("at")))
    except ValueError:
        made = clock.now()
    return made if made.tzinfo is not None else clock.now()


def _uuid(value: Any) -> uuid.UUID | None:
    try:
        return uuid.UUID(str(value))
    except ValueError:
        return None


def _total(checkout: Checkout, kind: str) -> int:
    rows = CashEvent.objects.filter(checkout=checkout, kind=kind)
    return int(rows.aggregate(total=Sum("amount"))["total"] or 0)


def record_events(request: HttpRequest, envelopes: list[Any]) -> list[str]:
    """Stores what the bridge signed and applies it; returns the ids now recorded (sending
    an event twice is harmless)."""
    return _record_all(guard(request), envelopes)


def _record_all(device: Device, envelopes: list[Any]) -> list[str]:
    if len(envelopes) > MAX_EVENTS:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "events"})
    recorded = []
    for envelope in envelopes:
        payload = bridge.verify_event(device, envelope, tuple(CashEventKind.values))
        with transaction.atomic():
            _record(device, envelope, payload)
        recorded.append(str(payload["event"]))
    return recorded


def _record(device: Device, envelope: dict[str, Any], payload: dict[str, Any]) -> None:
    event_id = uuid.UUID(str(payload["event"]))
    if CashEvent.objects.filter(pk=event_id).exists():
        return
    kind = str(payload["type"])
    amount = _amount(payload)
    txn = _uuid(payload.get("txn"))
    checkout = operation = None
    if kind in CHECKOUT_EVENTS:
        checkout = (
            Checkout.objects.select_for_update().filter(pk=txn, device=device).first()
            if txn
            else None
        )
    else:
        from jungle.checkout.models import CashOperation

        operation = (
            CashOperation.objects.select_for_update().filter(pk=txn, device=device).first()
            if txn
            else None
        )
    event = CashEvent.objects.create(
        id=event_id,
        device=device,
        checkout=checkout,
        operation=operation,
        kind=kind,
        amount=amount,
        envelope=envelope,
        happened_at=_when(payload),
        received_at=clock.now(),
    )
    if checkout is not None:
        _apply(checkout, event, payload)
    elif operation is not None:
        from jungle.checkout import cashbox

        cashbox.apply(operation, event, payload)
    elif amount:
        _unknown(device, event)


def unidentified(location: Location) -> LedgerAccount:
    """Money the kiosk signed for a transaction the server does not know (held until the
    manager finds whose it is)."""
    return account(AccountKind.CUSTOMER_BALANCE, location=location, category="unidentified")


def _unknown(device: Device, event: CashEvent) -> None:
    """Real money for a transaction the server does not know (e.g. after restoring a backup):
    recorded as it moved, and reported."""
    into_box = event.kind in (CashEventKind.ACCEPTED, CashEventKind.REFILLED)
    sign = 1 if into_box else -1
    post(
        TransactionKind.CREDIT,
        [
            (cash_box(device), sign * event.amount),
            (unidentified(device.location), -sign * event.amount),
        ],
        description="Numerar neidentificat la chioșc",
        actor=audit.Actor(kind=ActorKind.DEVICE, device_id=device.pk, label=device.name),
        reason="Eveniment semnat de aparat pentru o tranzacție necunoscută",
        idempotency_key=f"cash-event:{event.pk}",
        location=device.location,
        metadata={"purpose": "unknown_cash", "event": str(event.pk)},
    )
    notify(device.location_id, "unknown_transaction", event=event.pk, amount=event.amount)


def _apply(checkout: Checkout, event: CashEvent, payload: dict[str, Any]) -> None:
    if event.kind == CashEventKind.ACCEPTED:
        checkout.inserted = _total(checkout, CashEventKind.ACCEPTED)
        checkout.save(update_fields=["inserted"])
        if checkout.status not in OPEN_STATUSES:
            # A note after the checkout ended: the money is real, it goes to the customer.
            _credit(checkout, event.amount, f"late:{event.pk}", "Bancnotă primită după încheiere")
            notify(checkout.location_id, "late_cash", checkout=checkout.pk, amount=event.amount)
    elif event.kind == CashEventKind.DISPENSED:
        checkout.dispensed = _total(checkout, CashEventKind.DISPENSED)
        checkout.save(update_fields=["dispensed"])
        if checkout.status not in OPEN_STATUSES:
            notify(checkout.location_id, "late_change", checkout=checkout.pk, amount=event.amount)
    elif event.kind == CashEventKind.INTERRUPTED:
        _interrupted(checkout, payload)
    elif event.kind == CashEventKind.FISCAL_PRINTED:
        checkout.fiscal_receipt = str(payload.get("receipt", ""))[:60]
        checkout.save(update_fields=["fiscal_receipt"])


def _credit(checkout: Checkout, amount: int, key: str, reason: str) -> None:
    """Cash the customer left in the machine becomes credit in their account (R-065)."""
    post(
        TransactionKind.CREDIT,
        [
            (cash_box(checkout.device), amount),
            (account(AccountKind.CUSTOMER_BALANCE, user=checkout.customer), -amount),
        ],
        description="Credit în cont din numerar la chioșc",
        actor=_actor(checkout),
        reason=reason,
        idempotency_key=f"checkout:{checkout.pk}:{key}",
        location=checkout.location,
        metadata={"purpose": "cash_credit", "checkout": str(checkout.pk)},
        subject=f"checkout:{checkout.pk}",
    )


def _actor(checkout: Checkout) -> audit.Actor:
    return audit.Actor(
        kind=ActorKind.DEVICE,
        user_id=checkout.customer_id,
        device_id=checkout.device_id,
        label=checkout.device.name,
    )


def _interrupted(checkout: Checkout, payload: dict[str, Any]) -> None:
    """After a power cut the bridge closes the open transaction with what went in and what
    came out. Nothing is bought automatically (the customer may be gone): what stayed in the
    machine becomes credit in their account, and the manager is told."""
    if checkout.status not in OPEN_STATUSES:
        return
    inserted = max(checkout.inserted, _amount(payload))
    reported = _amount({"amount": payload.get("dispensed", 0)})
    dispensed = min(max(checkout.dispensed, reported), inserted)
    left = inserted - dispensed
    if left:
        _credit(checkout, left, "interrupted", "Plată întreruptă: numerarul rămas devine credit")
    checkout.inserted, checkout.dispensed, checkout.credited = inserted, dispensed, left
    checkout.status = CheckoutStatus.INTERRUPTED
    checkout.finished_at = clock.now()
    checkout.save()
    notify(checkout.location_id, "interrupted", checkout=checkout.pk, credited=left)
    audit.record(
        _actor(checkout),
        "checkout.interrupted",
        target=checkout,
        after={"inserted": inserted, "dispensed": dispensed, "credited": left},
    )


# ---------------------------------------------------------------- paid: change and ledger
def finish(request: HttpRequest, checkout_id: uuid.UUID, envelopes: list[Any]) -> dict[str, Any]:
    """Enough money is in (per the signed events). Returns the signed change command, or
    settles at once when there is no change to give."""
    device = guard(request)
    _record_all(device, envelopes)
    with transaction.atomic():
        checkout = _locked(device, checkout_id)
        if checkout.status != CheckoutStatus.COLLECTING:
            raise DomainError(ErrorCode.CHECKOUT_STATE_INVALID, status=409)
        if checkout.inserted < checkout.amount_due:
            raise DomainError(
                ErrorCode.CHECKOUT_NOT_ENOUGH,
                status=409,
                params={"inserted": checkout.inserted / 100, "due": checkout.amount_due / 100},
            )
        checkout.status = CheckoutStatus.PAID
        checkout.save(update_fields=["status"])
        change = checkout.inserted - checkout.amount_due
    if change == 0:
        return {"dispense": None, **settle(request, checkout_id, [])}
    return {
        "dispense": commands.sign(
            device, "cash.dispense", txn=str(checkout.pk), amount=change, allow_partial=True
        )
    }


def settle(request: HttpRequest, checkout_id: uuid.UUID, envelopes: list[Any]) -> dict[str, Any]:
    """Posts the purchase to the ledger once, then returns the signed receipt and close
    commands. When there was change to give, the bridge's signed report of what it gave
    (possibly 0) must have arrived first."""
    device = guard(request)
    _record_all(device, envelopes)
    with transaction.atomic():
        checkout = _locked(device, checkout_id)
        if checkout.status == CheckoutStatus.PAID:
            change = checkout.inserted - checkout.amount_due
            if (
                change
                and not CashEvent.objects.filter(
                    checkout=checkout, kind=CashEventKind.DISPENSED
                ).exists()
            ):
                raise DomainError(ErrorCode.CHECKOUT_WAITING_CHANGE, status=409)
            _post(checkout, change)
        elif checkout.status != CheckoutStatus.SETTLED:
            raise DomainError(ErrorCode.CHECKOUT_STATE_INVALID, status=409)
        orders = _order_numbers(checkout)
    receipt = None
    if not checkout.fiscal_receipt:  # printed once (the bridge also refuses a second one)
        receipt = commands.sign(
            device,
            "fiscal.print",
            txn=str(checkout.pk),
            lines=receipt_lines(checkout),
            paid={"cash": checkout.amount_due},
        )
    return {
        "checkout": checkout,
        "orders": orders,
        "receipt": receipt,
        "close": commands.sign(device, "cash.close", txn=str(checkout.pk)),
    }


def _post(checkout: Checkout, change: int) -> None:
    owed = change - checkout.dispensed
    if owed < 0:  # the machine reports more change than it was told to give
        notify(checkout.location_id, "too_much_change", checkout=checkout.pk, amount=-owed)
        owed = 0
    credited = owed
    if owed and checkout.change_mode != ChangeMode.CREDIT:
        # The machine could not give the change it promised: the customer is not left short;
        # the money goes into their account and the manager is told.
        notify(checkout.location_id, "change_not_given", checkout=checkout.pk, amount=owed)
    for item in checkout.items.all():
        credited += _pay_item(checkout, item)
    if credited:
        _credit(checkout, credited, "credit", "Rest nedat de aparat sau plată imposibilă")
    checkout.credited = credited
    checkout.status = CheckoutStatus.SETTLED
    checkout.finished_at = clock.now()
    checkout.save(update_fields=["credited", "status", "finished_at"])
    audit.record(
        _actor(checkout),
        "checkout.settled",
        target=checkout,
        after={
            "amount": checkout.amount_due,
            "inserted": checkout.inserted,
            "dispensed": checkout.dispensed,
            "credited": credited,
        },
    )


def _pay_item(checkout: Checkout, item: CheckoutItem) -> int:
    """Pays one item from the cash; returns what could not be paid (it becomes credit)."""
    key = f"checkout:{checkout.pk}:{item.position}"
    extra = {"checkout": str(checkout.pk)}
    try:
        with transaction.atomic():
            if item.kind == ItemKind.CAFE:
                lines = [(uuid.UUID(r["product_id"]), int(r["quantity"])) for r in item.cafe_lines]
                if _prepare_cafe(checkout.location, lines).amount != item.amount:
                    raise DomainError(ErrorCode.CHECKOUT_STALE, status=409)
                cafe.place_order(
                    _actor(checkout),
                    checkout.location,
                    cafe.OrderData(
                        lines=[cafe.OrderLine(pid, qty) for pid, qty in lines],
                        method=PaymentMethod.CASH,
                        tendered=item.amount,
                        customer_id=checkout.customer_id,
                        idempotency_key=key,
                    ),
                    device_id=checkout.device_id,
                    cash_account=cash_box(checkout.device),
                    fiscal_receipt="",
                    extra=extra,
                )
            else:
                target = subject(item.kind, item.subject_id)
                payments.pay_for(
                    _actor(checkout),
                    target,
                    payments.resolve_due(target),
                    payments.PaymentData(
                        payer_id=checkout.customer_id,
                        amount=item.amount,
                        method=PaymentMethod.CASH,
                        tendered=item.amount,
                        idempotency_key=key,
                    ),
                    cash_account=cash_box(checkout.device),
                    fiscal_receipt="",
                    extra=extra,
                    device_id=checkout.device_id,
                )
    except DomainError as exc:
        # Paid by someone else in the meantime, or no longer sold: the money is not lost.
        notify(
            checkout.location_id,
            "item_not_paid",
            checkout=checkout.pk,
            item=item.description,
            code=exc.code.value,
        )
        return item.amount
    return 0


def _order_numbers(checkout: Checkout) -> list[int]:
    from jungle.cafe.models import CafeOrder

    return list(
        CafeOrder.objects.filter(transaction__metadata__checkout=str(checkout.pk))
        .order_by("number")
        .values_list("number", flat=True)
    )


def receipt_lines(checkout: Checkout) -> list[dict[str, Any]]:
    """The fiscal receipt's lines (R-066), with the VAT group of each revenue category
    (confirmed with the club's accountant, Q53)."""
    groups: dict[str, str] = get_config("checkout.vat_groups")
    lines: list[dict[str, Any]] = []
    for item in checkout.items.all():
        if item.kind == ItemKind.CAFE:
            lines.extend(
                {
                    "name": str(r["name"])[:40],
                    "quantity": int(r["quantity"]),
                    "unit_price": int(r["unit_price"]),
                    "vat_group": groups["cafe"],
                }
                for r in item.cafe_lines
            )
        else:
            due = payments.resolve_due(subject(item.kind, item.subject_id))
            lines.append(
                {
                    "name": item.description[:40],
                    "quantity": 1,
                    "unit_price": item.amount,
                    "vat_group": groups.get(due.category, "A"),
                }
            )
    return lines


# ---------------------------------------------------------------- cancelling
def cancel(request: HttpRequest, checkout_id: uuid.UUID, envelopes: list[Any]) -> dict[str, Any]:
    """Before the purchase is paid in full. With money already in, the machine gives it back
    (`refund`); whatever it cannot give back becomes credit (`refunded`)."""
    device = guard(request)
    _record_all(device, envelopes)
    with transaction.atomic():
        checkout = _locked(device, checkout_id)
        txn = str(checkout.pk)
        if checkout.status == CheckoutStatus.OPEN:
            checkout.status = CheckoutStatus.CANCELLED
            checkout.finished_at = clock.now()
            checkout.save(update_fields=["status", "finished_at"])
            return {"stop": None, "refund": None, "close": None}
        if checkout.status != CheckoutStatus.COLLECTING:
            raise DomainError(ErrorCode.CHECKOUT_STATE_INVALID, status=409)
        stop = commands.sign(device, "cash.stop", txn=txn)
        if checkout.inserted == 0:
            _cancelled(checkout, 0)
            return {
                "stop": stop,
                "refund": None,
                "close": commands.sign(device, "cash.close", txn=txn),
            }
    refund = commands.sign(
        device, "cash.dispense", txn=txn, amount=checkout.inserted, allow_partial=True
    )
    return {"stop": stop, "refund": refund, "close": None}


def refunded(request: HttpRequest, checkout_id: uuid.UUID, envelopes: list[Any]) -> dict[str, Any]:
    """After the refund: what the machine could not give back becomes credit."""
    device = guard(request)
    _record_all(device, envelopes)
    with transaction.atomic():
        checkout = _locked(device, checkout_id)
        if checkout.status == CheckoutStatus.COLLECTING:
            if not CashEvent.objects.filter(
                checkout=checkout, kind=CashEventKind.DISPENSED
            ).exists():
                raise DomainError(ErrorCode.CHECKOUT_WAITING_CHANGE, status=409)
            left = max(0, checkout.inserted - checkout.dispensed)
            if left:
                _credit(checkout, left, "refund", "Anulare: numerarul negdat înapoi devine credit")
                notify(checkout.location_id, "refund_not_given", checkout=checkout.pk, amount=left)
            _cancelled(checkout, left)
        elif checkout.status != CheckoutStatus.CANCELLED:
            raise DomainError(ErrorCode.CHECKOUT_STATE_INVALID, status=409)
    return {
        "credited": checkout.credited,
        "close": commands.sign(device, "cash.close", txn=str(checkout.pk)),
    }


def _cancelled(checkout: Checkout, credited: int) -> None:
    checkout.status = CheckoutStatus.CANCELLED
    checkout.credited = credited
    checkout.finished_at = clock.now()
    checkout.save(update_fields=["status", "credited", "finished_at"])
    audit.record(
        _actor(checkout),
        "checkout.cancelled",
        target=checkout,
        after={
            "inserted": checkout.inserted,
            "dispensed": checkout.dispensed,
            "credited": credited,
        },
    )


# ---------------------------------------------------------------- without cash
def pay_with_balance(
    request: HttpRequest, card: CardIn, item: ItemData, idempotency_key: str
) -> dict[str, Any]:
    """§8.3 action 6: the credit in the account pays an item (no cash, no change)."""
    device = guard(request)
    customer = person(request, card)
    actor = audit.actor_from_request(acting_as(request, customer))
    prepared = _prepare(customer, device.location, item)
    key = f"kiosk-balance:{idempotency_key}"
    if item.kind == ItemKind.CAFE:
        order = cafe.place_order(
            actor,
            device.location,
            cafe.OrderData(
                lines=[cafe.OrderLine(pid, qty) for pid, qty in item.cafe_lines],
                method=PaymentMethod.BALANCE,
                customer_id=customer.pk,
                idempotency_key=key,
            ),
            device_id=device.pk,
        )
        return {"amount": order.total, "order": order.number}
    target = subject(item.kind, item.subject_id)
    payment = payments.pay_for(
        actor,
        target,
        payments.resolve_due(target),
        payments.PaymentData(
            payer_id=customer.pk,
            amount=prepared.amount,
            method=PaymentMethod.BALANCE,
            idempotency_key=key,
        ),
        device_id=device.pk,
    )
    return {"amount": payment.amount, "order": None}


# ---------------------------------------------------------------- device faults
FAULTS = frozenset(
    {
        "note_jam",
        "insufficient_change",
        "low_change",
        "cassette_full",
        "power_loss",
        "paper_out",
        "offline",
        "note_rejected",
    }
)
FAULT_REPEAT = timedelta(minutes=30)
CHANGE_FAULTS = {  # the staff's language is Romanian (the panel)
    "low_change": "rest scăzut în casete",
    "insufficient_change": "nu a putut da restul complet",
}


def report_fault(request: HttpRequest, code: str) -> None:
    """§8.3: "rest scăzut", "casetă plină", "blocaj bancnotă"… reach the staff (once per half
    hour per device and fault, so a jam does not flood them)."""
    device = guard(request)
    if code not in FAULTS:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "code"})
    recent = StaffNotice.objects.filter(
        location_id=device.location_id,
        kind=FAULT_NOTICE,
        payload__device=str(device.pk),
        payload__code=code,
        created_at__gte=clock.now() - FAULT_REPEAT,
    )
    if not recent.exists():
        StaffNotice.objects.create(
            location_id=device.location_id,
            recipient_role=Role.RECEPTION,
            kind=FAULT_NOTICE,
            payload={"device": str(device.pk), "device_name": device.name, "code": code},
            created_at=clock.now(),
        )
        if code in CHANGE_FAULTS:  # §11 "rest scăzut": also by email and push to the managers
            notifications.notify_staff(
                device.location_id,
                "staff.cash_low",
                {"device": device.name, "detail": CHANGE_FAULTS[code]},
                subject=f"{device.pk}:{code}:{clock.now().isoformat()}",
            )
