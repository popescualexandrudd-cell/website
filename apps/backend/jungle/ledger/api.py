"""Money endpoints: the customer's account (credit, debts, history), payment status and the
split of an hour, and the staff exceptions (Q10) and corrections (R-064)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from django.http import HttpRequest
from ninja import Field, Header, Router, Schema, Status

from jungle.accounts.models import User
from jungle.accounts.services.authz import authorize, current_user
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.core.schemas import errors
from jungle.core.security import session_auth
from jungle.ledger import payments, services
from jungle.ledger.models import AccountKind, LedgerEntry, PaymentMethod

me_router = Router(tags=["account"], auth=session_auth)
staff_router = Router(tags=["staff: payments"], auth=session_auth)


class AccountOut(Schema):
    credit: int = Field(description="bani: credit în cont (R-065)")
    debt: int = Field(description="bani: datorii (R-065)")


class EntryOut(Schema):
    transaction_id: uuid.UUID
    created_at: datetime
    kind: str
    account: str = Field(description="customer_balance sau receivable")
    amount: int = Field(description="bani; + debit, − credit")
    description: str
    booking_id: uuid.UUID | None
    enrollment_id: uuid.UUID | None


class MoneyOut(Schema):
    price: int
    charged: int
    paid: int
    refunded: int
    to_pay: int


class SplitOut(Schema):
    to_pay: int
    shares: list[int] = Field(description="R-061: primul participant plătește restul de bani")


class PaymentIn(Schema):
    booking_id: uuid.UUID | None = None
    enrollment_id: uuid.UUID | None = None
    payer_id: uuid.UUID
    amount: int = Field(gt=0, le=100_000_000)
    method: PaymentMethod
    tendered: int = Field(default=0, ge=0, le=100_000_000)
    reason: str = Field(min_length=1, max_length=500)


class PaymentOut(Schema):
    id: uuid.UUID
    transaction_id: uuid.UUID
    method: str
    amount: int
    tendered: int
    change: int
    fiscal_receipt: str
    created_at: datetime


class ReverseIn(Schema):
    reason: str = Field(min_length=1, max_length=500)


class TransactionOut(Schema):
    id: uuid.UUID
    kind: str
    description: str
    reason: str
    reverses_id: uuid.UUID | None
    created_at: datetime


def _account(user: User) -> AccountOut:
    return AccountOut(credit=services.customer_credit(user), debt=services.customer_debt(user))


def _entries(user: User) -> list[EntryOut]:
    rows = (
        LedgerEntry.objects.filter(
            account__user=user,
            account__kind__in=(AccountKind.CUSTOMER_BALANCE, AccountKind.RECEIVABLE),
        )
        .select_related("transaction", "account")
        .order_by("-transaction__created_at", "-id")[:200]
    )
    return [
        EntryOut(
            transaction_id=e.transaction_id,
            created_at=e.transaction.created_at,
            kind=e.transaction.kind,
            account=e.account.kind,
            amount=e.amount,
            description=e.transaction.description,
            booking_id=e.transaction.booking_id,
            enrollment_id=e.transaction.enrollment_id,
        )
        for e in rows
    ]


def _money(status: payments.MoneyStatus) -> MoneyOut:
    return MoneyOut(
        price=status.price,
        charged=status.charged,
        paid=status.paid,
        refunded=status.refunded,
        to_pay=status.to_pay,
    )


# ---------------------------------------------------------------- the customer
@me_router.get("", response={200: AccountOut, **errors(401)})
def my_account(request: HttpRequest) -> AccountOut:
    return _account(current_user(request))


@me_router.get("/entries", response={200: list[EntryOut], **errors(401)})
def my_entries(request: HttpRequest) -> list[EntryOut]:
    return _entries(current_user(request))


@me_router.get("/payment-status", response={200: MoneyOut, **errors(400, 401, 403, 404)})
def payment_status(
    request: HttpRequest,
    booking_id: uuid.UUID | None = None,
    enrollment_id: uuid.UUID | None = None,
) -> MoneyOut:
    return _money(payments.status_for(request, booking_id, enrollment_id))


@me_router.get("/split", response={200: SplitOut, **errors(400, 401, 403, 404)})
def split(
    request: HttpRequest,
    parts: int,
    booking_id: uuid.UUID | None = None,
    enrollment_id: uuid.UUID | None = None,
) -> SplitOut:
    """R-060, R-061: "Împarte ora cu partenerii" — each player's share of what is left."""
    if not 1 <= parts <= 8:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "parts"})
    status = payments.status_for(request, booking_id, enrollment_id)
    return SplitOut(to_pay=status.to_pay, shares=services.split_amount(status.to_pay, parts))


# ---------------------------------------------------------------- staff
@staff_router.post("/payments", response={201: PaymentOut, **errors(400, 401, 403, 404, 409, 422)})
def record_payment(
    request: HttpRequest,
    payload: PaymentIn,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key", max_length=200)],
) -> Status[PaymentOut]:
    """Q10: a payment recorded by staff (exception, with a reason). R-067: send the same
    `Idempotency-Key` again after a timeout — it is never charged twice."""
    payment = payments.record_payment(
        request,
        payload.booking_id,
        payload.enrollment_id,
        payments.PaymentData(
            payer_id=payload.payer_id,
            amount=payload.amount,
            method=payload.method,
            tendered=payload.tendered,
            idempotency_key=f"staff:{idempotency_key}",
            reason=payload.reason,
        ),
    )
    return Status(201, PaymentOut.from_orm(payment))


@staff_router.get(
    "/customers/{user_id}/account", response={200: AccountOut, **errors(401, 403, 404, 422)}
)
def customer_account(
    request: HttpRequest, user_id: uuid.UUID, location_id: uuid.UUID
) -> AccountOut:
    authorize(request, Action.PAYMENTS_VIEW, location_id)
    user = User.objects.filter(pk=user_id).first()
    if user is None:
        raise DomainError(ErrorCode.ACCOUNTS_NOT_FOUND, status=404)
    return _account(user)


@staff_router.get(
    "/customers/{user_id}/entries", response={200: list[EntryOut], **errors(401, 403, 404, 422)}
)
def customer_entries(
    request: HttpRequest, user_id: uuid.UUID, location_id: uuid.UUID
) -> list[EntryOut]:
    authorize(request, Action.PAYMENTS_VIEW, location_id)
    user = User.objects.filter(pk=user_id).first()
    if user is None:
        raise DomainError(ErrorCode.ACCOUNTS_NOT_FOUND, status=404)
    return _entries(user)


@staff_router.post(
    "/ledger/transactions/{transaction_id}/reverse",
    response={201: TransactionOut, **errors(401, 403, 404, 409, 422)},
)
def reverse_transaction(
    request: HttpRequest, transaction_id: uuid.UUID, payload: ReverseIn
) -> Status[TransactionOut]:
    tx = services.reverse(request, transaction_id, payload.reason)
    return Status(201, TransactionOut.from_orm(tx))
