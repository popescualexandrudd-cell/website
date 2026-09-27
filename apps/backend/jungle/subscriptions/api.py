"""Subscription endpoints: the public configurator (R-081, R-089), the customer's
subscriptions, and the staff tools (custom intensities, corporate accounts)."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from django.http import HttpRequest
from ninja import Field, Router, Schema, Status

from jungle.configuration.services import get_config
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.schemas import OkOut, errors
from jungle.core.security import session_auth
from jungle.locations.models import Location
from jungle.locations.services import get_location_by_slug
from jungle.subscriptions import services
from jungle.subscriptions.models import (
    Period,
    Sport,
    Subscription,
    SubscriptionRate,
)

public_router = Router(tags=["subscriptions"])
me_router = Router(tags=["subscriptions"], auth=session_auth)
staff_router = Router(tags=["staff: subscriptions"], auth=session_auth)


class SelectionIn(Schema):
    sport: Sport
    intensity: str = Field(default="", pattern=r"^(|start|active|pro)$")


class CustomSelectionIn(SelectionIn):
    sessions: int = Field(default=0, ge=0, le=31)
    monthly_price: int | None = Field(default=None, ge=0, le=100_000_000)


class QuoteIn(Schema):
    location: str = Field(max_length=60)
    selections: list[SelectionIn] = Field(min_length=1, max_length=3)
    period: Period


class ComponentOut(Schema):
    sport: str
    sessions_per_month: int
    monthly_price: int
    peak_allowed: bool
    marker: str


class QuoteOut(Schema):
    components: list[ComponentOut]
    monthly_sum: int
    months: int
    gross: int
    discounts: list[int]
    total: int = Field(description="bani, rotunjit la leu întreg (R-084)")
    rounding: int
    provisional: bool = Field(description="cel puțin un tarif este DE_STABILIT")


class RateOut(Schema):
    sport: str
    sessions_per_month: int
    monthly_price: int
    marker: str


class OptionsOut(Schema):
    intensities: dict[str, int]
    bundle_discounts: dict[str, int]
    period_discounts: dict[str, int]
    start_rule_below_sessions: int
    rates: list[RateOut]


class OrderIn(Schema):
    location_id: uuid.UUID
    selections: list[SelectionIn] = Field(min_length=1, max_length=3)
    period: Period
    starts_on: date


class StaffOrderIn(Schema):
    location_id: uuid.UUID
    user_id: uuid.UUID
    corporate_id: uuid.UUID | None = None
    selections: list[CustomSelectionIn] = Field(min_length=1, max_length=3)
    period: Period
    starts_on: date


class UsageOut(Schema):
    sport: str
    sessions_per_month: int
    used_this_month: int
    makeups_available: int
    peak_allowed: bool


class SubscriptionOut(Schema):
    id: uuid.UUID
    user_id: uuid.UUID
    location_id: uuid.UUID
    corporate_id: uuid.UUID | None
    period: str
    starts_on: date
    ends_on: date
    status: str
    custom: bool
    price_total: int
    price_provisional: bool
    activated_at: datetime | None
    usage: list[UsageOut]


class FreezeIn(Schema):
    starts_on: date
    days: int = Field(ge=1, le=60)


class FreezeOut(Schema):
    starts_on: date
    ends_on: date


class RateIn(Schema):
    location_id: uuid.UUID
    sport: Sport
    sessions_per_month: int = Field(ge=1, le=31)
    monthly_price: int = Field(ge=0, le=100_000_000)
    confirmed: bool = False


class CorporateIn(Schema):
    location_id: uuid.UUID
    name: str = Field(min_length=1, max_length=200)
    registration_code: str = Field(default="", max_length=20)
    billing_email: str = Field(default="", max_length=254)


class CorporateOut(Schema):
    id: uuid.UUID
    location_id: uuid.UUID
    name: str
    registration_code: str
    billing_email: str
    is_active: bool


class MemberIn(Schema):
    user_id: uuid.UUID


class MemberUsageOut(Schema):
    user_id: uuid.UUID
    name: str
    sessions: dict[str, int]


class ReportOut(Schema):
    account_id: uuid.UUID
    year: int
    month: int
    members: list[MemberUsageOut]
    billed: int


def _selections(items: list[SelectionIn] | list[CustomSelectionIn]) -> list[services.Selection]:
    return [
        services.Selection(
            sport=item.sport,
            intensity=item.intensity,
            sessions=getattr(item, "sessions", 0),
            monthly_price=getattr(item, "monthly_price", None),
        )
        for item in items
    ]


def subscription_out(s: Subscription) -> SubscriptionOut:
    return SubscriptionOut(
        id=s.id,
        user_id=s.user_id,
        location_id=s.location_id,
        corporate_id=s.corporate_id,
        period=s.period,
        starts_on=s.starts_on,
        ends_on=s.ends_on,
        status=s.status,
        custom=s.custom,
        price_total=s.price_total,
        price_provisional=s.price_provisional,
        activated_at=s.activated_at,
        usage=[UsageOut(**u.__dict__) for u in services.usage(s)],
    )


def _rate(r: SubscriptionRate) -> RateOut:
    return RateOut(
        sport=r.sport,
        sessions_per_month=r.sessions_per_month,
        monthly_price=r.monthly_price,
        marker=r.marker,
    )


# ---------------------------------------------------------------- public configurator
@public_router.get("/options", response={200: OptionsOut, **errors(404)}, auth=None)
def options(request: HttpRequest, location: str) -> OptionsOut:
    """What the 3-step configurator offers (R-081, R-082, R-084)."""
    place = get_location_by_slug(location)
    return OptionsOut(
        intensities=get_config("subscriptions.intensities"),
        bundle_discounts=get_config("subscriptions.bundle_discounts"),
        period_discounts=get_config("subscriptions.period_discounts"),
        start_rule_below_sessions=get_config("subscriptions.start_rule_below_sessions"),
        rates=[_rate(r) for r in services.public_rates(place)],
    )


@public_router.post("/quote", response={200: QuoteOut, **errors(400, 404, 409, 422)}, auth=None)
def get_quote(request: HttpRequest, payload: QuoteIn) -> QuoteOut:
    place = get_location_by_slug(payload.location)
    priced = services.quote(place, _selections(payload.selections), payload.period)
    return QuoteOut(**priced.as_dict())


# ---------------------------------------------------------------- the customer
@me_router.post("", response={201: SubscriptionOut, **errors(400, 401, 403, 404, 409, 422)})
def order(request: HttpRequest, payload: OrderIn) -> Status[SubscriptionOut]:
    subscription = services.order_subscription(
        request,
        services.Order(
            payload.location_id, _selections(payload.selections), payload.period, payload.starts_on
        ),
    )
    return Status(201, subscription_out(subscription))


@me_router.get("/mine", response={200: list[SubscriptionOut], **errors(401)})
def mine(request: HttpRequest) -> list[SubscriptionOut]:
    return [subscription_out(s) for s in services.my_subscriptions(request)]


@me_router.post(
    "/{subscription_id}/cancel", response={200: SubscriptionOut, **errors(401, 403, 404, 409)}
)
def cancel(request: HttpRequest, subscription_id: uuid.UUID) -> SubscriptionOut:
    return subscription_out(services.cancel_pending(request, subscription_id))


@me_router.post(
    "/{subscription_id}/freeze", response={201: FreezeOut, **errors(400, 401, 403, 404, 409, 422)}
)
def freeze(
    request: HttpRequest, subscription_id: uuid.UUID, payload: FreezeIn
) -> Status[FreezeOut]:
    record = services.freeze(request, subscription_id, payload.starts_on, payload.days)
    return Status(201, FreezeOut(starts_on=record.starts_on, ends_on=record.ends_on))


# ---------------------------------------------------------------- staff
@staff_router.post(
    "/subscriptions", response={201: SubscriptionOut, **errors(400, 401, 403, 404, 409, 422)}
)
def staff_create(request: HttpRequest, payload: StaffOrderIn) -> Status[SubscriptionOut]:
    subscription = services.staff_create(
        request,
        services.Order(
            payload.location_id, _selections(payload.selections), payload.period, payload.starts_on
        ),
        payload.user_id,
        payload.corporate_id,
    )
    return Status(201, subscription_out(subscription))


@staff_router.put(
    "/subscriptions/rates", response={200: RateOut, **errors(400, 401, 403, 404, 422)}
)
def set_rate(request: HttpRequest, payload: RateIn) -> RateOut:
    location = Location.objects.filter(pk=payload.location_id).first()
    if location is None:
        raise DomainError(ErrorCode.LOCATIONS_NOT_FOUND, status=404)
    rate = services.set_rate(
        request,
        location,
        payload.sport,
        payload.sessions_per_month,
        payload.monthly_price,
        payload.confirmed,
    )
    return _rate(rate)


@staff_router.post("/corporate", response={201: CorporateOut, **errors(400, 401, 403, 404, 422)})
def create_corporate(request: HttpRequest, payload: CorporateIn) -> Status[CorporateOut]:
    account = services.create_corporate(request, services.CorporateData(**payload.dict()))
    return Status(201, CorporateOut.from_orm(account))


@staff_router.post(
    "/corporate/{account_id}/members", response={201: OkOut, **errors(401, 403, 404, 409, 422)}
)
def add_member(request: HttpRequest, account_id: uuid.UUID, payload: MemberIn) -> Status[OkOut]:
    services.add_member(request, account_id, payload.user_id)
    return Status(201, OkOut())


@staff_router.post(
    "/corporate/{account_id}/members/{user_id}/remove",
    response={200: OkOut, **errors(400, 401, 403, 404)},
)
def remove_member(request: HttpRequest, account_id: uuid.UUID, user_id: uuid.UUID) -> OkOut:
    services.remove_member(request, account_id, user_id)
    return OkOut()


@staff_router.get(
    "/corporate/{account_id}/report", response={200: ReportOut, **errors(400, 401, 403, 404, 422)}
)
def report(request: HttpRequest, account_id: uuid.UUID, year: int, month: int) -> ReportOut:
    result = services.monthly_report(request, account_id, year, month)
    return ReportOut(
        account_id=result.account.pk,
        year=result.year,
        month=result.month,
        members=[MemberUsageOut(**m.__dict__) for m in result.members],
        billed=result.billed,
    )
