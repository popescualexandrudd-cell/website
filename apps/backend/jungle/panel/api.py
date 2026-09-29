"""The admin panel's own reads (§8.6): permissions per location, the live dashboard, and what
the modules list (resources, subscriptions, classes, money, café). Every change goes through the
staff API of its domain, which checks the permission again."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from django.http import HttpRequest, HttpResponse
from ninja import Field, Router, Schema

from jungle.accounts.services.authz import authorize
from jungle.core.permissions import Action
from jungle.core.schemas import errors
from jungle.core.security import session_auth
from jungle.league.api import SeasonOut
from jungle.locations.api import ResourceOut
from jungle.panel import catalog, insights, money, people, services

router = Router(tags=["staff: panel"], auth=session_auth)


class ScopeOut(Schema):
    location_id: uuid.UUID
    location_name: str
    location_slug: str
    actions: list[str]


class PanelUserOut(Schema):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: str | None


class PermissionsOut(Schema):
    user: PanelUserOut
    roles: list[str]
    scopes: list[ScopeOut]


class CourtNowOut(Schema):
    id: uuid.UUID
    name: str
    busy: bool
    until: datetime | None
    session_type: str
    booked_minutes_today: int
    open_minutes_today: int


class DashboardOut(Schema):
    day: str
    bookings_today: int
    occupancy_percent: int
    cash_taken_today: int
    revenue_today: int
    unread_notices: int
    pending_decisions: int
    inactive_devices: int
    courts: list[CourtNowOut]


@router.get("/permissions", response={200: PermissionsOut, **errors(401, 403)})
def permissions(request: HttpRequest) -> PermissionsOut:
    found = services.permissions(request)
    user = found.user
    return PermissionsOut(
        user=PanelUserOut(
            id=user.pk, first_name=user.first_name, last_name=user.last_name, email=user.email
        ),
        roles=found.roles,
        scopes=[ScopeOut(**vars(s)) for s in found.scopes],
    )


@router.get("/dashboard", response={200: DashboardOut, **errors(401, 403, 422)})
def dashboard(request: HttpRequest, location_id: uuid.UUID) -> services.Dashboard:
    return services.dashboard(request, location_id)


# ---------------------------------------------------------------- users (R-004)
class PanelCardOut(Schema):
    id: uuid.UUID
    number: str
    status: str
    issued_at: datetime
    revoked_at: datetime | None
    revoke_reason: str


class PanelBookingOut(Schema):
    id: uuid.UUID
    resource: str
    starts_at: datetime
    ends_at: datetime
    status: str
    session_type: str


class PanelProfileOut(Schema):
    in_league: bool
    level_validated: str | None
    level_waiting: bool
    hidden_on_screens: bool
    cards: list[PanelCardOut]
    bookings: list[PanelBookingOut]


class PanelHiddenIn(Schema):
    location_id: uuid.UUID
    hidden: bool
    note: str = Field(default="", max_length=200)


class PanelHiddenOut(Schema):
    hidden_on_screens: bool


@router.get(
    "/users/{user_id}/profile", response={200: PanelProfileOut, **errors(401, 403, 404, 422)}
)
def profile(request: HttpRequest, user_id: uuid.UUID, location_id: uuid.UUID) -> people.Profile:
    return people.profile(request, user_id, location_id)


@router.post(
    "/users/{user_id}/hidden-on-screens",
    response={200: PanelHiddenOut, **errors(401, 403, 404, 422)},
)
def hidden_on_screens(
    request: HttpRequest, user_id: uuid.UUID, payload: PanelHiddenIn
) -> PanelHiddenOut:
    """Q55 (GDPR art. 21): "do not show my name on the screens", noted at the person's request."""
    hidden = people.set_hidden_on_screens(
        request, user_id, payload.location_id, payload.hidden, payload.note.strip()
    )
    return PanelHiddenOut(hidden_on_screens=hidden)


# ---------------------------------------------------------------- operations (calendar, classes)
class PanelPersonOut(Schema):
    id: uuid.UUID
    name: str


@router.get("/resources", response={200: list[ResourceOut], **errors(401, 403, 422)})
def resources(request: HttpRequest, location_id: uuid.UUID) -> list[ResourceOut]:
    """Every resource of the location, the inactive ones included."""
    return [ResourceOut.from_orm(r) for r in catalog.resources(request, location_id)]


class PanelHoursOut(Schema):
    opens: str
    closes: str


@router.get("/hours", response={200: PanelHoursOut, **errors(401, 403, 422)})
def hours(request: HttpRequest, location_id: uuid.UUID, day: date) -> PanelHoursOut:
    """The day's opening hours in club time (Q3), for the calendar's rows."""
    authorize(request, Action.BOOKINGS_VIEW, location_id)
    opens, closes = services.opening_hours(day)
    return PanelHoursOut(opens=opens, closes=closes)


@router.get("/coaches", response={200: list[PanelPersonOut], **errors(401, 403, 422)})
def coaches(request: HttpRequest, location_id: uuid.UUID) -> list[catalog.Person]:
    return catalog.coaches(request, location_id)


class PanelUsageOut(Schema):
    sport: str
    sessions_per_month: int
    used_this_month: int
    makeups_available: int
    peak_allowed: bool


class PanelSubscriptionOut(Schema):
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    corporate: str
    period: str
    starts_on: date
    ends_on: date
    status: str
    custom: bool
    price_total: int
    price_provisional: bool
    frozen_days: int
    usage: list[PanelUsageOut]


@router.get("/subscriptions", response={200: list[PanelSubscriptionOut], **errors(401, 403, 422)})
def subscription_list(
    request: HttpRequest, location_id: uuid.UUID, status: str = ""
) -> list[catalog.SubscriptionView]:
    """The latest subscriptions of the location (at most 200), optionally of one status."""
    return catalog.subscription_list(request, location_id, status)


class PanelCorporateOut(Schema):
    id: uuid.UUID
    name: str
    registration_code: str
    billing_email: str
    is_active: bool
    members: list[PanelPersonOut]


@router.get("/corporate", response={200: list[PanelCorporateOut], **errors(401, 403, 422)})
def corporate_list(request: HttpRequest, location_id: uuid.UUID) -> list[catalog.CorporateView]:
    return catalog.corporate_list(request, location_id)


class PanelClassOut(Schema):
    id: uuid.UUID
    kind: str
    studio_id: uuid.UUID
    studio: str
    instructor_id: uuid.UUID
    instructor: str
    starts_at: datetime
    ends_at: datetime
    capacity: int
    enrolled: int
    waiting: int
    status: str
    price_total: int
    price_provisional: bool


@router.get("/classes", response={200: list[PanelClassOut], **errors(401, 403, 422)})
def week_classes(
    request: HttpRequest, location_id: uuid.UUID, week_of: date
) -> list[catalog.ClassView]:
    """The seven days from `week_of` (club time), cancelled classes included."""
    return catalog.week_classes(request, location_id, week_of)


# ---------------------------------------------------------------- money (ADR-0009)
class PanelEntryOut(Schema):
    account: str
    kind: str
    amount: int


class PanelTransactionOut(Schema):
    id: uuid.UUID
    kind: str
    description: str
    reason: str
    actor: str
    subject: str
    created_at: datetime
    reverses_id: uuid.UUID | None
    reversed: bool
    entries: list[PanelEntryOut]


@router.get("/transactions", response={200: list[PanelTransactionOut], **errors(401, 403, 422)})
def transactions(
    request: HttpRequest, location_id: uuid.UUID, day: date
) -> list[money.TransactionView]:
    """The ledger transactions of a club day (at most 200), with their entries."""
    return money.transactions(request, location_id, day)


class PanelKioskCashOut(Schema):
    device_id: uuid.UUID
    name: str
    is_active: bool
    in_box: int
    received_today: int
    change_given_today: int
    moved_today: int


class PanelOperationOut(Schema):
    id: uuid.UUID
    device: str
    kind: str
    staff: str
    amount: int | None
    ledger_amount: int | None
    difference: int | None
    result: dict[str, Any]
    created_at: datetime
    completed_at: datetime | None


class PanelCashOut(Schema):
    safe: int
    kiosks: list[PanelKioskCashOut]
    operations: list[PanelOperationOut]


@router.get("/cash", response={200: PanelCashOut, **errors(401, 403, 404, 422)})
def cash(request: HttpRequest, location_id: uuid.UUID) -> money.CashView:
    """The kiosks' cash boxes, the safe, and the latest staff operations with the Z reports."""
    return money.cash(request, location_id)


class PanelVoucherOut(Schema):
    id: uuid.UUID
    code: str
    holder_id: uuid.UUID
    holder: str
    kind: str
    value: int
    target: str
    valid_from: date
    valid_until: date
    source: str
    reason: str
    status: str
    issued_at: datetime
    redeemed_at: datetime | None


@router.get("/vouchers", response={200: list[PanelVoucherOut], **errors(401, 403, 422)})
def vouchers(
    request: HttpRequest, location_id: uuid.UUID, status: str = ""
) -> list[money.VoucherView]:
    return money.vouchers(request, location_id, status)


class PanelProductOut(Schema):
    id: uuid.UUID
    name_ro: str
    name_en: str
    price: int
    marker: str
    is_available: bool
    sort_order: int


class PanelCategoryOut(Schema):
    id: uuid.UUID
    name_ro: str
    name_en: str
    sort_order: int
    products: list[PanelProductOut]


@router.get("/cafe/menu", response={200: list[PanelCategoryOut], **errors(401, 403, 422)})
def cafe_menu(request: HttpRequest, location_id: uuid.UUID) -> list[money.CategoryView]:
    """The café's whole menu, the products taken off it included."""
    return money.cafe_menu(request, location_id)


# ---------------------------------------------------------------- league (§6)
@router.get("/league/seasons", response={200: list[SeasonOut], **errors(401, 403, 422)})
def league_seasons(request: HttpRequest, location_id: uuid.UUID) -> list[SeasonOut]:
    """Every season, the planned ones included, for the league's administration."""
    return [SeasonOut.from_orm(s) for s in catalog.seasons(request, location_id)]


# ---------------------------------------------------------------- reports (owner's side)
class PanelCourtUseOut(Schema):
    name: str
    booked_minutes: int
    open_minutes: int
    percent: int


class PanelReportOut(Schema):
    first: date
    last: date
    revenue_total: int
    revenue: dict[str, int]
    discounts: int
    cash_taken: int
    bookings: dict[str, int]
    cancelled: int
    no_shows: int
    courts: list[PanelCourtUseOut]
    class_places: int
    class_attended: int
    new_accounts: int


@router.get("/reports", response={200: PanelReportOut, **errors(401, 403, 422)})
def report(
    request: HttpRequest, location_id: uuid.UUID, first: date, last: date
) -> insights.Report:
    """The period's revenue per category, bookings, occupancy and classes (club days)."""
    return insights.report(request, location_id, first, last)


@router.get("/reports/export.csv", response={200: str, **errors(401, 403, 422)})
def export_csv(
    request: HttpRequest, location_id: uuid.UUID, kind: str, first: date, last: date
) -> HttpResponse:
    """`kind=transactions` (the ledger entries, for the accountant) or `kind=bookings`."""
    body = insights.export_csv(request, location_id, kind, first, last)
    response = HttpResponse(body, content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{kind}-{first}-{last}.csv"'
    return response


# ---------------------------------------------------------------- staff and system
class PanelStaffRoleOut(Schema):
    id: int
    role: str
    location: str


class PanelStaffMemberOut(Schema):
    id: uuid.UUID
    name: str
    email: str
    mfa_enabled: bool
    is_active: bool
    roles: list[PanelStaffRoleOut]


class PanelStaffOut(Schema):
    matrix: dict[str, list[str]]
    people: list[PanelStaffMemberOut]


@router.get("/staff", response={200: PanelStaffOut, **errors(401, 403, 422)})
def staff(request: HttpRequest, location_id: uuid.UUID) -> insights.StaffOverview:
    """Who holds a staff role here, and what each role may do (§8.1)."""
    return insights.staff_overview(request, location_id)


class PanelDeviceHealthOut(Schema):
    id: uuid.UUID
    name: str
    kind: str
    is_active: bool
    enrolled: bool
    online: bool
    last_seen_at: datetime | None


class PanelSystemOut(Schema):
    version: str
    server_time: datetime
    time_zone: str
    database: bool
    cache: bool
    pending_decisions: int
    devices: list[PanelDeviceHealthOut]


@router.get("/system", response={200: PanelSystemOut, **errors(401, 403, 404, 422)})
def system(request: HttpRequest, location_id: uuid.UUID) -> insights.SystemStatus:
    """The release, the server's clock, the database and cache, the location's devices."""
    return insights.system_status(request, location_id)
