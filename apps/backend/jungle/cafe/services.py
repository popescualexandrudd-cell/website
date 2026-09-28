"""The café (R-111, R-112, Q33).

Orders are paid when they are placed: in cash at the payments kiosk (Stage 8, same
`place_order`, with the kiosk as the device) or from the customer's credit. Each paid
order gets a number for the day; the bar moves it new → preparing → ready → picked up,
and the lobby screens show only the numbers that are ready (no names, R-012).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date
from typing import Any

from django.db import connection, transaction
from django.db.models import Max, QuerySet
from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.accounts.services.authz import authorize
from jungle.audit import services as audit
from jungle.cafe.models import CafeCategory, CafeOrder, CafeOrderLine, CafeProduct, OrderStatus
from jungle.configuration.models import Marker
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.ledger import fiscal
from jungle.ledger.models import (
    AccountKind,
    LedgerAccount,
    LedgerTransaction,
    Payment,
    PaymentMethod,
    RevenueCategory,
    TransactionKind,
)
from jungle.ledger.services import (
    account,
    customer_credit,
    existing,
    post,
    request_hash,
    reverse_as,
)
from jungle.locations.models import Location

MAX_QUANTITY = 20
NEXT_STATUS = {
    OrderStatus.NEW: OrderStatus.PREPARING,
    OrderStatus.PREPARING: OrderStatus.READY,
    OrderStatus.READY: OrderStatus.PICKED_UP,
}


# ---------------------------------------------------------------- menu (R-112)
def menu(location: Location) -> list[tuple[CafeCategory, list[CafeProduct]]]:
    products = CafeProduct.objects.filter(location=location, is_available=True).select_related(
        "category"
    )
    by_category: dict[uuid.UUID, list[CafeProduct]] = {}
    for p in products:
        by_category.setdefault(p.category_id, []).append(p)
    categories = CafeCategory.objects.filter(location=location, pk__in=by_category)
    return [(c, by_category[c.pk]) for c in categories]


@dataclass(frozen=True)
class ProductData:
    category_id: uuid.UUID
    name_ro: str
    name_en: str
    price: int
    confirmed: bool = False
    is_available: bool = True
    sort_order: int = 0


def create_category(
    request: HttpRequest, location: Location, name_ro: str, name_en: str, sort_order: int
) -> CafeCategory:
    authorize(request, Action.CAFE_MANAGE, location.pk)
    category = CafeCategory.objects.create(
        location=location, name_ro=name_ro, name_en=name_en, sort_order=sort_order
    )
    audit.record(audit.actor_from_request(request), "cafe.category_created", target=category)
    return category


def save_product(
    request: HttpRequest, location: Location, data: ProductData, product_id: uuid.UUID | None = None
) -> CafeProduct:
    """Creates or changes a product (price, availability, names); audited."""
    authorize(request, Action.CAFE_MANAGE, location.pk)
    category = CafeCategory.objects.filter(pk=data.category_id, location=location).first()
    if category is None:
        raise DomainError(ErrorCode.NOT_FOUND, status=404)
    with transaction.atomic():
        if product_id is None:
            product = CafeProduct(location=location)
            before = None
        else:
            found = (
                CafeProduct.objects.select_for_update()
                .filter(pk=product_id, location=location)
                .first()
            )
            if found is None:
                raise DomainError(ErrorCode.NOT_FOUND, status=404)
            product, before = found, audit.snapshot(found)
        product.category = category
        product.name_ro, product.name_en = data.name_ro, data.name_en
        product.price = data.price
        product.marker = Marker.CONFIRMED if data.confirmed else Marker.TO_SET
        product.is_available = data.is_available
        product.sort_order = data.sort_order
        product.save()
        audit.record(
            audit.actor_from_request(request),
            "cafe.product_saved",
            target=product,
            before=before,
            after=audit.snapshot(product),
        )
    return product


# ---------------------------------------------------------------- ordering (R-111)
@dataclass(frozen=True)
class OrderLine:
    product_id: uuid.UUID
    quantity: int


@dataclass(frozen=True)
class OrderData:
    lines: list[OrderLine]
    method: str
    tendered: int = 0
    customer_id: uuid.UUID | None = None
    idempotency_key: str = ""
    reason: str = ""


def _next_number(location: Location, day: date) -> int:
    with connection.cursor() as cursor:  # one numbering at a time per location and day
        cursor.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", [f"cafe:{location.pk}:{day}"])
    last = CafeOrder.objects.filter(location=location, day=day).aggregate(n=Max("number"))["n"]
    return int(last or 0) + 1


def place_order(
    actor: audit.Actor,
    location: Location,
    data: OrderData,
    *,
    device_id: uuid.UUID | None = None,
    cash_account: LedgerAccount | None = None,
    fiscal_receipt: str | None = None,
    extra: dict[str, Any] | None = None,
) -> CafeOrder:
    """A paid order (R-067: the same key never charges twice). At the Payments Kiosk the cash
    goes into the kiosk's cash box and the kiosk prints the fiscal receipt (`jungle.checkout`)."""
    if not data.idempotency_key:
        raise DomainError(ErrorCode.PAYMENTS_IDEMPOTENCY_REQUIRED)
    if not data.lines:
        raise DomainError(ErrorCode.CAFE_EMPTY_ORDER)
    fingerprint = request_hash(
        {
            "location": location.pk,
            "lines": [(line.product_id, line.quantity) for line in data.lines],
            "method": data.method,
            "tendered": data.tendered,
            "customer": data.customer_id,
        }
    )
    with transaction.atomic():
        earlier = existing(data.idempotency_key, fingerprint)
        if earlier is not None:
            return CafeOrder.objects.get(transaction=earlier)
        ids = [line.product_id for line in data.lines]
        products = {
            p.pk: p
            for p in CafeProduct.objects.filter(pk__in=ids, location=location, is_available=True)
        }
        if len(products) != len(set(ids)) or any(
            not 1 <= line.quantity <= MAX_QUANTITY for line in data.lines
        ):
            raise DomainError(ErrorCode.CAFE_PRODUCT_UNAVAILABLE)
        total = sum(products[line.product_id].price * line.quantity for line in data.lines)
        if total <= 0:
            raise DomainError(ErrorCode.PAYMENTS_INVALID_AMOUNT)
        customer = None
        if data.customer_id is not None:
            customer = User.objects.filter(pk=data.customer_id, is_active=True).first()
            if customer is None:
                raise DomainError(ErrorCode.ACCOUNTS_NOT_FOUND, status=404)
        tendered = change = 0
        receipt = ""
        source: LedgerAccount
        if data.method == PaymentMethod.CASH:
            if data.tendered < total:
                raise DomainError(ErrorCode.PAYMENTS_INSUFFICIENT_CASH)
            tendered, change = data.tendered, data.tendered - total
            source = cash_account or account(AccountKind.CASH, location=location)
            receipt = (
                fiscal_receipt
                if fiscal_receipt is not None
                else fiscal.printer().print_receipt(
                    [
                        fiscal.ReceiptLine(
                            f"{line.quantity} × {products[line.product_id].name_ro}",
                            products[line.product_id].price * line.quantity,
                        )
                        for line in data.lines
                    ],
                    tendered,
                )
            )
        elif data.method == PaymentMethod.BALANCE and customer is not None:
            source = account(AccountKind.CUSTOMER_BALANCE, user=customer)
            LedgerAccount.objects.select_for_update().get(pk=source.pk)
            if customer_credit(customer) < total:
                raise DomainError(ErrorCode.PAYMENTS_INSUFFICIENT_BALANCE)
        else:
            raise DomainError(ErrorCode.PAYMENTS_METHOD_UNAVAILABLE, params={"method": data.method})
        day = clock.today_local()
        number = _next_number(location, day)
        tx = post(
            TransactionKind.SALE,
            [
                (source, total),
                (
                    account(AccountKind.REVENUE, location=location, category=RevenueCategory.CAFE),
                    -total,
                ),
            ],
            description=f"Cafenea, comanda {number}",
            actor=actor,
            reason=data.reason,
            idempotency_key=data.idempotency_key,
            fingerprint=fingerprint,
            location=location,
            subject=f"cafe:{location.pk}:{day}:{number}",
            metadata={
                **(extra or {}),
                "purpose": "sale",
                "payer": str(customer.pk) if customer else "",
            },
        )
        Payment.objects.create(
            transaction=tx,
            payer=customer,
            method=data.method,
            amount=total,
            tendered=tendered,
            change=change,
            fiscal_receipt=receipt,
            device_id=device_id,
            created_at=clock.now(),
        )
        order = CafeOrder.objects.create(
            location=location,
            day=day,
            number=number,
            customer=customer,
            total=total,
            transaction=tx,
            device_id=device_id,
            created_at=clock.now(),
        )
        CafeOrderLine.objects.bulk_create(
            CafeOrderLine(
                order=order,
                product=products[line.product_id],
                name=products[line.product_id].name_ro,
                unit_price=products[line.product_id].price,
                quantity=line.quantity,
            )
            for line in data.lines
        )
        audit.record(
            actor, "cafe.order_placed", target=order, after={"number": number, "total": total}
        )
    return order


def staff_order(request: HttpRequest, location: Location, data: OrderData) -> CafeOrder:
    """Q10, R-111: the café sells through the kiosk; staff record an exception, with a reason."""
    authorize(request, Action.PAYMENTS_RECORD, location.pk)
    if not data.reason.strip():
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "reason"})
    return place_order(audit.actor_from_request(request), location, data)


# ---------------------------------------------------------------- the bar (§8.7)
def _order(request: HttpRequest, order_id: uuid.UUID, action: Action) -> CafeOrder:
    order = CafeOrder.objects.select_for_update().filter(pk=order_id).first()
    if order is None:
        raise DomainError(ErrorCode.CAFE_ORDER_NOT_FOUND, status=404)
    authorize(request, action, order.location_id)
    return order


def advance(request: HttpRequest, order_id: uuid.UUID, to_status: str) -> CafeOrder:
    """new → preparing → ready → picked up, one step at a time."""
    with transaction.atomic():
        order = _order(request, order_id, Action.CAFE_ORDERS)
        if NEXT_STATUS.get(OrderStatus(order.status)) != to_status:
            raise DomainError(ErrorCode.CAFE_INVALID_TRANSITION, status=409)
        order.status = to_status
        now = clock.now()
        if to_status == OrderStatus.READY:
            order.ready_at = now
        elif to_status == OrderStatus.PICKED_UP:
            order.picked_up_at = now
        order.save()
    return order


def cancel(request: HttpRequest, order_id: uuid.UUID, reason: str) -> CafeOrder:
    """Before it is ready, a manager can cancel an order: the sale is reversed (the money
    goes back the way it came: cash, or credit in the account)."""
    if not reason.strip():
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "reason"})
    with transaction.atomic():
        order = _order(request, order_id, Action.CAFE_MANAGE)
        if order.status not in (OrderStatus.NEW, OrderStatus.PREPARING):
            raise DomainError(ErrorCode.CAFE_INVALID_TRANSITION, status=409)
        reverse_as(
            audit.actor_from_request(request),
            LedgerTransaction.objects.get(pk=order.transaction_id),
            reason,
        )
        order.status = OrderStatus.CANCELLED
        order.save(update_fields=["status"])
        audit.record(
            audit.actor_from_request(request), "cafe.order_cancelled", target=order, reason=reason
        )
    return order


def queue(request: HttpRequest, location_id: uuid.UUID) -> QuerySet[CafeOrder]:
    authorize(request, Action.CAFE_ORDERS, location_id)
    return (
        CafeOrder.objects.filter(
            location_id=location_id,
            day=clock.today_local(),
            status__in=(OrderStatus.NEW, OrderStatus.PREPARING, OrderStatus.READY),
        )
        .prefetch_related("lines")
        .order_by("created_at")
    )


def ready_numbers(location: Location) -> list[int]:
    """For the lobby screens: only the numbers (R-012)."""
    return list(
        CafeOrder.objects.filter(
            location=location, day=clock.today_local(), status=OrderStatus.READY
        )
        .order_by("ready_at")
        .values_list("number", flat=True)
    )
