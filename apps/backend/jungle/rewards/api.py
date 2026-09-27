"""Voucher and referral endpoints (R-120, R-121)."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from django.http import HttpRequest
from ninja import Field, Router, Schema, Status

from jungle.core.schemas import errors
from jungle.core.security import session_auth
from jungle.ledger.api import PaymentOut
from jungle.ledger.payments import Subject
from jungle.rewards import services
from jungle.rewards.models import VoucherKind, VoucherTarget

me_router = Router(tags=["account"], auth=session_auth)
staff_router = Router(tags=["staff: vouchers"], auth=session_auth)


class VoucherOut(Schema):
    id: uuid.UUID
    code: str
    kind: str
    value: int
    target: str
    allowed_bands: list[str]
    valid_from: date
    valid_until: date
    source: str
    reason: str
    status: str
    redeemed_at: datetime | None


class RedeemIn(Schema):
    booking_id: uuid.UUID | None = None
    subscription_id: uuid.UUID | None = None


class CodeOut(Schema):
    code: str


class ClaimIn(Schema):
    code: str = Field(min_length=4, max_length=12)


class VoucherIn(Schema):
    location_id: uuid.UUID
    holder_id: uuid.UUID
    kind: VoucherKind
    value: int = Field(ge=1, le=100_000_000)
    target: VoucherTarget
    valid_days: int = Field(ge=1, le=730)
    reason: str = Field(min_length=1, max_length=250)


class CancelVoucherIn(Schema):
    location_id: uuid.UUID
    reason: str = Field(min_length=1, max_length=250)


@me_router.get("/vouchers", response={200: list[VoucherOut], **errors(401)})
def my_vouchers(request: HttpRequest) -> list[VoucherOut]:
    return [VoucherOut.from_orm(v) for v in services.my_vouchers(request)]


@me_router.post("/vouchers/{code}/redeem", response={201: PaymentOut, **errors(400, 401, 404, 409)})
def redeem(request: HttpRequest, code: str, payload: RedeemIn) -> Status[PaymentOut]:
    payment = services.redeem(
        request,
        code,
        Subject(booking_id=payload.booking_id, subscription_id=payload.subscription_id),
    )
    return Status(201, PaymentOut.from_orm(payment))


@me_router.get("/referral-code", response={200: CodeOut, **errors(401)})
def referral_code(request: HttpRequest) -> CodeOut:
    """R-120: the code to share with friends."""
    return CodeOut(code=services.my_referral_code(request))


@me_router.post("/referral", response={201: CodeOut, **errors(400, 401, 404, 409, 422)})
def claim(request: HttpRequest, payload: ClaimIn) -> Status[CodeOut]:
    """A new member enters a friend's code (before their first subscription)."""
    services.claim_referral(request, payload.code)
    return Status(201, CodeOut(code=payload.code.strip().upper()))


@staff_router.post("/vouchers", response={201: VoucherOut, **errors(400, 401, 403, 404, 422)})
def issue(request: HttpRequest, payload: VoucherIn) -> Status[VoucherOut]:
    voucher = services.issue_manual(
        request,
        payload.location_id,
        payload.holder_id,
        services.VoucherData(
            payload.kind, payload.value, payload.target, payload.valid_days, payload.reason
        ),
    )
    return Status(201, VoucherOut.from_orm(voucher))


@staff_router.post(
    "/vouchers/{voucher_id}/cancel",
    response={200: VoucherOut, **errors(400, 401, 403, 404, 409, 422)},
)
def cancel(request: HttpRequest, voucher_id: uuid.UUID, payload: CancelVoucherIn) -> VoucherOut:
    return VoucherOut.from_orm(
        services.cancel_voucher(request, voucher_id, payload.location_id, payload.reason)
    )
