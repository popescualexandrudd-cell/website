"""The Payments Kiosk's API (§8.3, Stage 8), for enrolled Payments Kiosks only (device token,
client certificate in production); every call checks again that it is an active Payments
Kiosk of the club, on the club's network. The customer identifies with their card (signed by
the kiosk's Hardware Bridge); cash counts only from the bridge's signed events.

Also: the staff PIN (set from the staff account, with 2FA) and the café display's API.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from django.http import HttpRequest
from ninja import Field, Router, Schema, Status

from jungle.attendance.services import record_arrival_at_device
from jungle.cafe import services as cafe_services
from jungle.cafe.api import CategoryOut, OrderOut, ProductOut, order_out
from jungle.checkout import cashbox, services, views
from jungle.checkout.models import ChangeMode, Checkout, ItemKind, OperationKind
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.schemas import errors
from jungle.core.security import session_auth
from jungle.devices.auth import device_auth
from jungle.devices.kiosk_session import (
    CardIn,
    LogoutIn,
    acting_as,
    end_session,
    open_session,
    person,
)
from jungle.rewards import services as rewards
from jungle.subscriptions import services as subscriptions
from jungle.subscriptions.api import FreezeIn, SelectionIn, _selections
from jungle.subscriptions.models import Period

router = Router(tags=["kiosk: payments"], auth=device_auth)
staff_router = Router(tags=["staff: kiosk"], auth=session_auth)


# ---------------------------------------------------------------- schemas
class PaymentsIdleOut(Schema):
    location_slug: str
    location_name: str
    menu: list[CategoryOut]


class PayableOut(Schema):
    kind: str
    subject_id: uuid.UUID
    description: str
    price: int
    to_pay: int
    debt: bool
    starts_at: datetime | None
    organizer: str


class PaymentsVoucherOut(Schema):
    code: str
    kind: str
    value: int
    target: str
    valid_until: str


class ActiveSubscriptionOut(Schema):
    id: str
    description: str
    ends_on: str


class PaymentsSessionOut(Schema):
    session: str
    first_name: str
    last_name: str
    language: str
    credit: int
    payables: list[PayableOut]
    shared: list[PayableOut]
    vouchers: list[PaymentsVoucherOut]
    subscriptions: list[ActiveSubscriptionOut]


class PaymentsCardOnlyIn(Schema):
    card: CardIn


class PaymentsCheckInOut(Schema):
    scanned_at: datetime
    first_name: str


class PaymentsSplitOut(Schema):
    price: int
    paid: int
    to_pay: int
    shares: list[int]


class CafeLineIn(Schema):
    product_id: uuid.UUID
    quantity: int = Field(ge=1, le=20)


class ItemIn(Schema):
    kind: ItemKind
    subject_id: uuid.UUID | None = None
    amount: int | None = Field(default=None, ge=1, le=100_000_000)
    cafe_lines: list[CafeLineIn] = Field(default=[], max_length=30)


class CheckoutIn(Schema):
    card: CardIn
    items: list[ItemIn] = Field(min_length=1, max_length=10)


class ItemOut(Schema):
    kind: str
    subject_id: uuid.UUID | None
    amount: int
    description: str


class CheckoutOut(Schema):
    id: uuid.UUID
    status: str
    change_mode: str
    amount_due: int
    inserted: int
    dispensed: int
    credited: int
    fiscal_receipt: str
    items: list[ItemOut]


class StartIn(Schema):
    card: CardIn
    change_mode: ChangeMode


class Envelope(Schema):
    payload: dict[str, Any]
    signature: str = Field(max_length=200)


class EventsIn(Schema):
    events: list[Envelope] = Field(default=[], max_length=100)


class RecordedOut(Schema):
    recorded: list[str]


class Command(Schema):
    payload: dict[str, Any]
    signature: str


class StartOut(Schema):
    checkout: CheckoutOut
    command: Command


class SettledOut(Schema):
    checkout: CheckoutOut
    orders: list[int]
    receipt: Command | None
    close: Command


class FinishOut(Schema):
    dispense: Command | None
    settled: SettledOut | None


class CancelOut(Schema):
    stop: Command | None
    refund: Command | None
    close: Command | None


class RefundedOut(Schema):
    credited: int
    close: Command


class BalanceIn(Schema):
    card: CardIn
    item: ItemIn
    idempotency_key: str = Field(min_length=8, max_length=80)


class BalanceOut(Schema):
    amount: int
    order: int | None


class PaymentsVoucherIn(Schema):
    card: CardIn
    code: str = Field(min_length=4, max_length=20)
    item: ItemIn


class PaidOut(Schema):
    amount: int


class SubscriptionIn(Schema):
    card: CardIn
    selections: list[SelectionIn] = Field(min_length=1, max_length=3)
    period: Period
    starts_on: date


class SubscriptionOrderedOut(Schema):
    id: uuid.UUID
    price_total: int
    description: str


class KioskFreezeIn(FreezeIn):
    card: CardIn


class FrozenOut(Schema):
    starts_on: date
    ends_on: date


class AlertIn(Schema):
    code: str = Field(pattern=r"^[a-z_]{3,40}$")


class StaffLoginIn(Schema):
    card: CardIn
    pin: str = Field(min_length=6, max_length=6)


class StaffOut(Schema):
    token: str
    first_name: str


class StaffTokenIn(Schema):
    token: str = Field(max_length=64)


class OperationIn(StaffTokenIn):
    kind: OperationKind
    notes: dict[str, int] | None = None


class OperationOut(Schema):
    id: uuid.UUID
    kind: str
    requested: dict[str, Any]
    result: dict[str, Any]
    amount: int | None
    ledger_amount: int | None
    difference: int | None
    created_at: datetime
    completed_at: datetime | None


class OperationStartedOut(Schema):
    operation: OperationOut
    command: Command


class PinIn(Schema):
    pin: str = Field(min_length=6, max_length=6)


class PaymentsOkOut(Schema):
    ok: bool


# ---------------------------------------------------------------- helpers
def checkout_out(checkout: Checkout) -> CheckoutOut:
    return CheckoutOut(
        id=checkout.id,
        status=checkout.status,
        change_mode=checkout.change_mode,
        amount_due=checkout.amount_due,
        inserted=checkout.inserted,
        dispensed=checkout.dispensed,
        credited=checkout.credited,
        fiscal_receipt=checkout.fiscal_receipt,
        items=[
            ItemOut(
                kind=i.kind, subject_id=i.subject_id, amount=i.amount, description=i.description
            )
            for i in checkout.items.all()
        ],
    )


def _item(item: ItemIn) -> services.ItemData:
    return services.ItemData(
        kind=item.kind,
        subject_id=item.subject_id,
        amount=item.amount,
        cafe_lines=[(line.product_id, line.quantity) for line in item.cafe_lines],
    )


def _events(payload: EventsIn) -> list[dict[str, Any]]:
    return [e.dict() for e in payload.events]


def _settled(result: dict[str, Any]) -> SettledOut:
    return SettledOut(
        checkout=checkout_out(result["checkout"]),
        orders=result["orders"],
        receipt=result["receipt"],
        close=result["close"],
    )


def _operation(op: Any) -> OperationOut:
    return OperationOut(
        id=op.id,
        kind=op.kind,
        requested=op.requested,
        result=op.result,
        amount=op.amount,
        ledger_amount=op.ledger_amount,
        difference=op.difference,
        created_at=op.created_at,
        completed_at=op.completed_at,
    )


# ---------------------------------------------------------------- idle and the customer
@router.get("/idle", response={200: PaymentsIdleOut, **errors(401, 403)})
def idle(request: HttpRequest) -> PaymentsIdleOut:
    """The idle screen: the café menu (the subscription offers come from the public
    configurator, by `location_slug`)."""
    device = services.guard(request)
    location = device.location
    return PaymentsIdleOut(
        location_slug=location.slug,
        location_name=location.name,
        menu=[
            CategoryOut(
                id=category.id,
                name_ro=category.name_ro,
                name_en=category.name_en,
                products=[ProductOut.from_orm(p) for p in products],
            )
            for category, products in cafe_services.menu(location)
        ],
    )


@router.post("/session", response={200: PaymentsSessionOut, **errors(401, 403, 404, 422)})
def session(request: HttpRequest, payload: PaymentsCardOnlyIn) -> PaymentsSessionOut:
    device = services.guard(request)
    user, token = open_session(request, payload.card)
    view = views.session(user, device)
    return PaymentsSessionOut(
        session=token,
        first_name=view.first_name,
        last_name=view.last_name,
        language=view.language,
        credit=view.credit,
        payables=[PayableOut(**vars(p)) for p in view.payables],
        shared=[PayableOut(**vars(p)) for p in view.shared],
        vouchers=[PaymentsVoucherOut(**vars(v)) for v in view.vouchers],
        subscriptions=[ActiveSubscriptionOut(**s) for s in view.subscriptions],  # type: ignore[arg-type]
    )


@router.post("/logout", response={204: None, **errors(401, 422)})
def logout(request: HttpRequest, payload: LogoutIn) -> Status[None]:
    end_session(request, payload.session)
    return Status(204, None)


@router.post("/check-in", response={200: PaymentsCheckInOut, **errors(401, 403, 404, 422)})
def check_in(request: HttpRequest, payload: PaymentsCardOnlyIn) -> PaymentsCheckInOut:
    """§8.3 flow 1 (R-030)."""
    device = services.guard(request)
    user = person(request, payload.card)
    scan = record_arrival_at_device(device, user)
    return PaymentsCheckInOut(scanned_at=scan.scanned_at, first_name=user.first_name)


@router.get(
    "/bookings/{booking_id}/split", response={200: PaymentsSplitOut, **errors(401, 403, 404, 422)}
)
def split(request: HttpRequest, booking_id: uuid.UUID, parts: int = 4) -> PaymentsSplitOut:
    """R-060, R-061: the shares of the hour, and what is still to pay, live."""
    device = services.guard(request)
    result = views.split(booking_id, parts, device)
    return PaymentsSplitOut(**vars(result))


# ---------------------------------------------------------------- cash
@router.post("/checkouts", response={201: CheckoutOut, **errors(400, 401, 403, 404, 409, 422)})
def create_checkout(request: HttpRequest, payload: CheckoutIn) -> Status[CheckoutOut]:
    checkout = services.create(request, payload.card, [_item(i) for i in payload.items])
    return Status(201, checkout_out(checkout))


@router.post(
    "/checkouts/{checkout_id}/start",
    response={200: StartOut, **errors(400, 401, 403, 404, 409, 422)},
)
def start(request: HttpRequest, checkout_id: uuid.UUID, payload: StartIn) -> StartOut:
    checkout, command = services.start(request, checkout_id, payload.card, payload.change_mode)
    return StartOut(checkout=checkout_out(checkout), command=command)  # type: ignore[arg-type]


@router.post("/events", response={200: RecordedOut, **errors(400, 401, 403, 422)})
def events(request: HttpRequest, payload: EventsIn) -> RecordedOut:
    """What the bridge signed (notes, change, receipts, staff operations); idempotent."""
    return RecordedOut(recorded=services.record_events(request, _events(payload)))


@router.post(
    "/checkouts/{checkout_id}/finish",
    response={200: FinishOut, **errors(400, 401, 403, 404, 409, 422)},
)
def finish(request: HttpRequest, checkout_id: uuid.UUID, payload: EventsIn) -> FinishOut:
    result = services.finish(request, checkout_id, _events(payload))
    settled = _settled(result) if result["dispense"] is None else None
    return FinishOut(dispense=result["dispense"], settled=settled)


@router.post(
    "/checkouts/{checkout_id}/settle",
    response={200: SettledOut, **errors(400, 401, 403, 404, 409, 422)},
)
def settle(request: HttpRequest, checkout_id: uuid.UUID, payload: EventsIn) -> SettledOut:
    return _settled(services.settle(request, checkout_id, _events(payload)))


@router.post(
    "/checkouts/{checkout_id}/cancel",
    response={200: CancelOut, **errors(400, 401, 403, 404, 409, 422)},
)
def cancel(request: HttpRequest, checkout_id: uuid.UUID, payload: EventsIn) -> CancelOut:
    return CancelOut(**services.cancel(request, checkout_id, _events(payload)))


@router.post(
    "/checkouts/{checkout_id}/refunded",
    response={200: RefundedOut, **errors(400, 401, 403, 404, 409, 422)},
)
def refunded(request: HttpRequest, checkout_id: uuid.UUID, payload: EventsIn) -> RefundedOut:
    return RefundedOut(**services.refunded(request, checkout_id, _events(payload)))


@router.get("/checkouts/{checkout_id}", response={200: CheckoutOut, **errors(401, 403, 404)})
def get_checkout(request: HttpRequest, checkout_id: uuid.UUID) -> CheckoutOut:
    """The kiosk page, restarted, checks what became of a transaction the bridge still has."""
    device = services.guard(request)
    checkout = Checkout.objects.filter(pk=checkout_id, device=device).first()
    if checkout is None:
        raise DomainError(ErrorCode.CHECKOUT_NOT_FOUND, status=404)
    return checkout_out(checkout)


# ---------------------------------------------------------------- without cash
@router.post("/pay-balance", response={200: BalanceOut, **errors(400, 401, 403, 404, 409, 422)})
def pay_balance(request: HttpRequest, payload: BalanceIn) -> BalanceOut:
    """§8.3 flow 6: the credit in the account pays."""
    result = services.pay_with_balance(
        request, payload.card, _item(payload.item), payload.idempotency_key
    )
    return BalanceOut(**result)


@router.post("/voucher", response={200: PaidOut, **errors(400, 401, 403, 404, 409, 422)})
def voucher(request: HttpRequest, payload: PaymentsVoucherIn) -> PaidOut:
    """§8.3 flow 6: a voucher of the card holder, used here (R-121)."""
    services.guard(request)
    user = person(request, payload.card)
    item = _item(payload.item)
    if item.kind == ItemKind.CAFE:
        raise DomainError(ErrorCode.VOUCHERS_WRONG_TARGET)
    payment = rewards.redeem(
        acting_as(request, user), payload.code, services.subject(item.kind, item.subject_id)
    )
    return PaidOut(amount=payment.amount)


@router.post(
    "/subscriptions", response={201: SubscriptionOrderedOut, **errors(400, 401, 403, 404, 409, 422)}
)
def order_subscription(
    request: HttpRequest, payload: SubscriptionIn
) -> Status[SubscriptionOrderedOut]:
    """§8.3 flow 4: the 3-step configurator (R-081); then it is paid like any item."""
    device = services.guard(request)
    user = person(request, payload.card)
    ordered = subscriptions.order_subscription(
        acting_as(request, user),
        subscriptions.Order(
            device.location_id, _selections(payload.selections), payload.period, payload.starts_on
        ),
    )
    due = subscriptions.due_for_subscription(ordered)
    return Status(
        201,
        SubscriptionOrderedOut(
            id=ordered.id, price_total=ordered.price_total, description=due.description
        ),
    )


@router.post(
    "/subscriptions/{subscription_id}/freeze",
    response={200: FrozenOut, **errors(400, 401, 403, 404, 409, 422)},
)
def freeze(request: HttpRequest, subscription_id: uuid.UUID, payload: KioskFreezeIn) -> FrozenOut:
    """§8.3 flow 4: freezing (R-086)."""
    services.guard(request)
    user = person(request, payload.card)
    record = subscriptions.freeze(
        acting_as(request, user), subscription_id, payload.starts_on, payload.days
    )
    return FrozenOut(starts_on=record.starts_on, ends_on=record.ends_on)


@router.post("/alerts", response={200: PaymentsOkOut, **errors(400, 401, 403, 422)})
def alert(request: HttpRequest, payload: AlertIn) -> PaymentsOkOut:
    """A device fault the bridge reported (jam, low change, cassette full, no paper)."""
    services.report_fault(request, payload.code)
    return PaymentsOkOut(ok=True)


# ---------------------------------------------------------------- staff mode
@router.post("/staff/login", response={200: StaffOut, **errors(401, 403, 404, 422)})
def staff_login(request: HttpRequest, payload: StaffLoginIn) -> StaffOut:
    user, token = cashbox.staff_login(request, payload.card, payload.pin)
    return StaffOut(token=token, first_name=user.first_name)


@router.post("/staff/logout", response={204: None, **errors(401, 403, 422)})
def staff_logout(request: HttpRequest, payload: StaffTokenIn) -> Status[None]:
    cashbox.staff_logout(request, payload.token)
    return Status(204, None)


@router.post("/staff/operations", response={201: OperationStartedOut, **errors(400, 401, 403, 422)})
def start_operation(request: HttpRequest, payload: OperationIn) -> Status[OperationStartedOut]:
    started = cashbox.start(request, payload.token, payload.kind, payload.notes)
    return Status(
        201,
        OperationStartedOut(operation=_operation(started.operation), command=started.command),  # type: ignore[arg-type]
    )


@router.post("/staff/operations/list", response={200: list[OperationOut], **errors(401, 403, 422)})
def list_operations(request: HttpRequest, payload: StaffTokenIn) -> list[OperationOut]:
    return [_operation(op) for op in cashbox.operations(request, payload.token)]


@staff_router.post("/kiosk-pin", response={200: PaymentsOkOut, **errors(400, 401, 403, 422)})
def set_pin(request: HttpRequest, payload: PinIn) -> PaymentsOkOut:
    """A staff member who handles cash sets their PIN for the kiosk's staff mode (Q54)."""
    cashbox.set_pin(request, payload.pin)
    return PaymentsOkOut(ok=True)


# ---------------------------------------------------------------- the café display (§8.7)
display_router = Router(tags=["device: café display"], auth=device_auth)


class DisplayAdvanceIn(Schema):
    status: str = Field(pattern=r"^(preparing|ready|picked_up)$")


@display_router.get("/queue", response={200: list[OrderOut], **errors(401, 403)})
def display_queue(request: HttpRequest) -> list[OrderOut]:
    device = cafe_services.display_guard(request)
    return [order_out(o) for o in cafe_services.display_queue(device)]


@display_router.post(
    "/orders/{order_id}/advance", response={200: OrderOut, **errors(401, 403, 404, 409, 422)}
)
def display_advance(
    request: HttpRequest, order_id: uuid.UUID, payload: DisplayAdvanceIn
) -> OrderOut:
    device = cafe_services.display_guard(request)
    return order_out(cafe_services.advance_at_display(request, device, order_id, payload.status))
