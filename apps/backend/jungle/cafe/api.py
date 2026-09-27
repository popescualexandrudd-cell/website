"""Café endpoints: the public menu and the lobby's ready numbers, and the staff tools
(menu management, the bar queue, exceptions)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from django.http import HttpRequest
from ninja import Field, Header, Router, Schema, Status

from jungle.cafe import services
from jungle.cafe.models import CafeOrder, OrderStatus
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.schemas import errors
from jungle.core.security import session_auth
from jungle.ledger.models import PaymentMethod
from jungle.locations.models import Location
from jungle.locations.services import get_location_by_slug

public_router = Router(tags=["cafe"])
staff_router = Router(tags=["staff: cafe"], auth=session_auth)


class ProductOut(Schema):
    id: uuid.UUID
    name_ro: str
    name_en: str
    price: int
    marker: str


class CategoryOut(Schema):
    id: uuid.UUID
    name_ro: str
    name_en: str
    products: list[ProductOut]


class ReadyOut(Schema):
    numbers: list[int]


class CategoryIn(Schema):
    location_id: uuid.UUID
    name_ro: str = Field(min_length=1, max_length=80)
    name_en: str = Field(min_length=1, max_length=80)
    sort_order: int = Field(default=0, ge=0, le=1000)


class ProductIn(Schema):
    location_id: uuid.UUID
    category_id: uuid.UUID
    name_ro: str = Field(min_length=1, max_length=120)
    name_en: str = Field(min_length=1, max_length=120)
    price: int = Field(ge=0, le=10_000_000)
    confirmed: bool = False
    is_available: bool = True
    sort_order: int = Field(default=0, ge=0, le=1000)


class LineIn(Schema):
    product_id: uuid.UUID
    quantity: int = Field(ge=1, le=20)


class OrderIn(Schema):
    location_id: uuid.UUID
    lines: list[LineIn] = Field(min_length=1, max_length=30)
    method: PaymentMethod
    tendered: int = Field(default=0, ge=0, le=10_000_000)
    customer_id: uuid.UUID | None = None
    reason: str = Field(min_length=1, max_length=500)


class LineOut(Schema):
    name: str
    unit_price: int
    quantity: int


class OrderOut(Schema):
    id: uuid.UUID
    number: int
    status: str
    total: int
    created_at: datetime
    ready_at: datetime | None
    lines: list[LineOut]


class AdvanceIn(Schema):
    status: OrderStatus


class CancelIn(Schema):
    reason: str = Field(min_length=1, max_length=500)


def _location(location_id: uuid.UUID) -> Location:
    location = Location.objects.filter(pk=location_id).first()
    if location is None:
        raise DomainError(ErrorCode.LOCATIONS_NOT_FOUND, status=404)
    return location


def order_out(order: CafeOrder) -> OrderOut:
    return OrderOut(
        id=order.id,
        number=order.number,
        status=order.status,
        total=order.total,
        created_at=order.created_at,
        ready_at=order.ready_at,
        lines=[
            LineOut(name=line.name, unit_price=line.unit_price, quantity=line.quantity)
            for line in order.lines.all()
        ],
    )


# ---------------------------------------------------------------- public
@public_router.get("/menu", response={200: list[CategoryOut], **errors(404)}, auth=None)
def menu(request: HttpRequest, location: str) -> list[CategoryOut]:
    place = get_location_by_slug(location)
    return [
        CategoryOut(
            id=c.id,
            name_ro=c.name_ro,
            name_en=c.name_en,
            products=[ProductOut.from_orm(p) for p in products],
        )
        for c, products in services.menu(place)
    ]


@public_router.get("/ready", response={200: ReadyOut, **errors(404)}, auth=None)
def ready(request: HttpRequest, location: str) -> ReadyOut:
    """Lobby screens (§8.5): the numbers of the orders ready to collect, nothing else."""
    return ReadyOut(numbers=services.ready_numbers(get_location_by_slug(location)))


# ---------------------------------------------------------------- staff
@staff_router.post("/cafe/categories", response={201: CategoryOut, **errors(401, 403, 404, 422)})
def create_category(request: HttpRequest, payload: CategoryIn) -> Status[CategoryOut]:
    c = services.create_category(
        request,
        _location(payload.location_id),
        payload.name_ro,
        payload.name_en,
        payload.sort_order,
    )
    return Status(201, CategoryOut(id=c.id, name_ro=c.name_ro, name_en=c.name_en, products=[]))


def _product_data(payload: ProductIn) -> services.ProductData:
    return services.ProductData(
        category_id=payload.category_id,
        name_ro=payload.name_ro,
        name_en=payload.name_en,
        price=payload.price,
        confirmed=payload.confirmed,
        is_available=payload.is_available,
        sort_order=payload.sort_order,
    )


@staff_router.post("/cafe/products", response={201: ProductOut, **errors(401, 403, 404, 422)})
def create_product(request: HttpRequest, payload: ProductIn) -> Status[ProductOut]:
    product = services.save_product(request, _location(payload.location_id), _product_data(payload))
    return Status(201, ProductOut.from_orm(product))


@staff_router.put(
    "/cafe/products/{product_id}", response={200: ProductOut, **errors(401, 403, 404, 422)}
)
def update_product(request: HttpRequest, product_id: uuid.UUID, payload: ProductIn) -> ProductOut:
    product = services.save_product(
        request, _location(payload.location_id), _product_data(payload), product_id
    )
    return ProductOut.from_orm(product)


@staff_router.post("/cafe/orders", response={201: OrderOut, **errors(400, 401, 403, 404, 409, 422)})
def place_order(
    request: HttpRequest,
    payload: OrderIn,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key", max_length=200)],
) -> Status[OrderOut]:
    order = services.staff_order(
        request,
        _location(payload.location_id),
        services.OrderData(
            lines=[services.OrderLine(line.product_id, line.quantity) for line in payload.lines],
            method=payload.method,
            tendered=payload.tendered,
            customer_id=payload.customer_id,
            idempotency_key=f"staff-cafe:{idempotency_key}",
            reason=payload.reason,
        ),
    )
    return Status(201, order_out(order))


@staff_router.get("/cafe/queue", response={200: list[OrderOut], **errors(401, 403, 422)})
def queue(request: HttpRequest, location_id: uuid.UUID) -> list[OrderOut]:
    return [order_out(o) for o in services.queue(request, location_id)]


@staff_router.post(
    "/cafe/orders/{order_id}/status", response={200: OrderOut, **errors(401, 403, 404, 409, 422)}
)
def advance(request: HttpRequest, order_id: uuid.UUID, payload: AdvanceIn) -> OrderOut:
    return order_out(services.advance(request, order_id, payload.status))


@staff_router.post(
    "/cafe/orders/{order_id}/cancel",
    response={200: OrderOut, **errors(400, 401, 403, 404, 409, 422)},
)
def cancel(request: HttpRequest, order_id: uuid.UUID, payload: CancelIn) -> OrderOut:
    return order_out(services.cancel(request, order_id, payload.reason))
