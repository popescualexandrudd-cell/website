"""Price rates: public list (R-053) and staff changes (audited)."""

from __future__ import annotations

import uuid
from datetime import datetime

from django.http import HttpRequest
from ninja import Field, Router, Schema

from jungle.configuration.services import get_config
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.schemas import errors
from jungle.core.security import session_auth
from jungle.locations.models import Location, ResourceKind
from jungle.locations.services import get_location_by_slug
from jungle.pricing import services, split
from jungle.pricing.models import Band, CustomerType, Product, Season

public_router = Router(tags=["pricing"])
staff_router = Router(tags=["staff: pricing"], auth=session_auth)


class RateOut(Schema):
    id: uuid.UUID
    resource_kind: str
    product: str
    season: str
    band: str
    customer_type: str
    amount_per_half_hour: int = Field(description="bani (RON × 100) pentru 30 de minute")
    marker: str = Field(description="CONFIRMED sau TO_SET (DE_STABILIT)")
    note: str
    updated_at: datetime


class RateIn(Schema):
    location_id: uuid.UUID
    resource_kind: ResourceKind
    product: Product
    season: Season = Season.ALL
    band: Band
    customer_type: CustomerType = CustomerType.STANDARD
    amount_per_half_hour: int = Field(ge=0, le=10_000_000)
    confirmed: bool = False
    note: str = Field(default="", max_length=200)


@public_router.get("/{slug}/rates", response={200: list[RateOut], **errors(404)}, auth=None)
def list_rates(request: HttpRequest, slug: str) -> list[RateOut]:
    location = get_location_by_slug(slug)
    return [RateOut.from_orm(r) for r in services.public_rates(location)]


class CourtSplitOut(Schema):
    """§9.2.11: the court in a band, and each player's part (R-060, R-061)."""

    band: str
    season: str
    duration_minutes: int
    durations_minutes: list[int] = Field(description="Duratele permise la rezervare (R-041)")
    total: int = Field(description="bani (RON × 100)")
    shares: list[int] = Field(
        description="partea fiecărui jucător, în bani; primul plătește restul"
    )
    provisional: bool = Field(description="tariful este DE_STABILIT")
    hours: dict[str, list[list[str]]] = Field(description="orele benzii: weekday / weekend")


@public_router.get(
    "/{slug}/split", response={200: CourtSplitOut, **errors(404, 409, 422)}, auth=None
)
def split_view(
    request: HttpRequest, slug: str, band: Band, duration_minutes: int, players: int = 4
) -> CourtSplitOut:
    """The "Împarte ora" simulator of the website: nothing is booked or stored."""
    shown = split.split(get_location_by_slug(slug), band, duration_minutes, players)
    return CourtSplitOut(
        band=shown.band,
        season=shown.season,
        duration_minutes=shown.duration_minutes,
        durations_minutes=get_config("bookings.durations_minutes"),
        total=shown.total,
        shares=shown.shares,
        provisional=shown.provisional,
        hours={day: [list(span) for span in spans] for day, spans in shown.hours.items()},
    )


@staff_router.put("/pricing/rates", response={200: RateOut, **errors(401, 403, 404, 422)})
def set_rate(request: HttpRequest, payload: RateIn) -> RateOut:
    data = payload.dict()
    location = Location.objects.filter(pk=data.pop("location_id")).first()
    if location is None:
        raise DomainError(ErrorCode.LOCATIONS_NOT_FOUND, status=404)
    return RateOut.from_orm(services.set_rate(request, location, services.RateData(**data)))
