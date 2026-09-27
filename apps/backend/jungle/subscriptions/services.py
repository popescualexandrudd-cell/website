"""Subscriptions: the 3-step configurator (R-081), buying and activation, sessions used by
lessons and classes (R-083, R-085, R-087), make-up sessions (Q14), freezing (R-086) and
corporate accounts (R-088, Q35)."""

from __future__ import annotations

import uuid
from calendar import monthrange
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

from django.db import IntegrityError, transaction
from django.db.models import Q, QuerySet, Sum
from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.accounts.services.authz import authorize, current_user
from jungle.audit import services as audit
from jungle.bookings.models import (
    Booking,
    CancellationOutcome,
    ClassEnrollment,
    SessionType,
)
from jungle.configuration.models import Marker
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.clock import BUSINESS_TZ
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.ledger.models import RevenueCategory
from jungle.ledger.payments import Due, charge, money_status
from jungle.locations.models import Location, ResourceKind
from jungle.pricing.models import Band
from jungle.pricing.services import band_at
from jungle.rewards import services as rewards
from jungle.subscriptions.models import (
    PERIOD_MONTHS,
    CorporateAccount,
    CorporateMember,
    Period,
    Sport,
    Subscription,
    SubscriptionComponent,
    SubscriptionFreeze,
    SubscriptionMakeup,
    SubscriptionRate,
    SubscriptionStatus,
    SubscriptionUse,
)
from jungle.subscriptions.pricing import PackagePrice, package_price

MAX_START_AHEAD_DAYS = 60


# ---------------------------------------------------------------- dates
def add_months(day: date, months: int) -> date:
    """Same day `months` later; the 31st becomes the last day of a shorter month."""
    month_index = day.month - 1 + months
    year, month = day.year + month_index // 12, month_index % 12 + 1
    return date(year, month, min(day.day, monthrange(year, month)[1]))


def cycle_index(subscription: Subscription, day: date) -> int:
    """The subscription month `day` falls in (0 = the first). Days added by a freeze
    belong to the last month, so they never bring a new monthly quota."""
    months = PERIOD_MONTHS[Period(subscription.period)]
    index = 0
    while index < months - 1 and add_months(subscription.starts_on, index + 1) <= day:
        index += 1
    return index


def _today() -> date:
    return clock.today_local()


# ---------------------------------------------------------------- configurator (R-081 … R-084)
@dataclass(frozen=True)
class Selection:
    sport: str
    intensity: str = ""  # "start" | "active" | "pro" (R-082)
    sessions: int = 0  # "La cerere" (Q12): staff only, with its own monthly price
    monthly_price: int | None = None


@dataclass(frozen=True)
class Component:
    sport: str
    sessions_per_month: int
    monthly_price: int
    peak_allowed: bool
    marker: str


@dataclass(frozen=True)
class SubscriptionQuote:
    components: tuple[Component, ...]
    price: PackagePrice
    provisional: bool

    def as_dict(self) -> dict[str, Any]:
        return {
            "components": [c.__dict__ for c in self.components],
            "monthly_sum": self.price.monthly_sum,
            "months": self.price.months,
            "gross": self.price.gross,
            "discounts": list(self.price.discounts),
            "total": self.price.total,
            "rounding": self.price.rounding,
            "provisional": self.provisional,
        }


def _invalid(field: str) -> DomainError:
    return DomainError(ErrorCode.SUBSCRIPTIONS_INVALID_SELECTION, params={"field": field})


def _component(location: Location, selection: Selection, allow_custom: bool) -> Component:
    if selection.sport not in Sport.values:
        raise _invalid("sport")
    threshold = int(get_config("subscriptions.start_rule_below_sessions"))
    if selection.intensity:
        levels: dict[str, int] = get_config("subscriptions.intensities")
        if selection.intensity not in levels:
            raise _invalid("intensity")
        sessions = levels[selection.intensity]
    elif allow_custom and 1 <= selection.sessions <= 31 and selection.monthly_price is not None:
        # Q12: a custom intensity is agreed with the club; staff enter its monthly price.
        return Component(
            selection.sport,
            selection.sessions,
            selection.monthly_price,
            selection.sessions >= threshold,
            Marker.CONFIRMED,
        )
    else:
        raise _invalid("intensity")
    rate = SubscriptionRate.objects.filter(
        location=location, sport=selection.sport, sessions_per_month=sessions
    ).first()
    if rate is None:
        raise DomainError(
            ErrorCode.PRICING_RATE_MISSING,
            status=409,
            params={"kind": selection.sport, "product": "subscription", "band": "", "season": ""},
        )
    return Component(
        selection.sport, sessions, rate.monthly_price, sessions >= threshold, rate.marker
    )


def corporate_discount(corporate: CorporateAccount) -> int:
    if corporate.discount_percent is not None:
        return corporate.discount_percent
    return int(get_config("corporate.default_discount_percent"))


def quote(
    location: Location,
    selections: list[Selection],
    period: str,
    corporate: CorporateAccount | None = None,
    *,
    allow_custom: bool = False,
) -> SubscriptionQuote:
    """R-081: sports → intensity → period; the price follows automatically (R-084)."""
    sports = [s.sport for s in selections]
    if not 1 <= len(selections) <= 3 or len(set(sports)) != len(sports):
        raise _invalid("sports")
    if period not in Period.values:
        raise _invalid("period")
    components = tuple(_component(location, s, allow_custom) for s in selections)
    bundle: dict[str, int] = get_config("subscriptions.bundle_discounts")
    periods: dict[str, int] = get_config("subscriptions.period_discounts")
    discounts = [bundle[str(len(components))], periods[period]]
    if corporate is not None:
        discounts.append(corporate_discount(corporate))
    price = package_price(
        [c.monthly_price for c in components], PERIOD_MONTHS[Period(period)], discounts
    )
    return SubscriptionQuote(components, price, any(c.marker == Marker.TO_SET for c in components))


def public_rates(location: Location) -> list[SubscriptionRate]:
    return list(SubscriptionRate.objects.filter(location=location))


def set_rate(
    request: HttpRequest,
    location: Location,
    sport: str,
    sessions: int,
    monthly_price: int,
    confirmed: bool,
) -> SubscriptionRate:
    authorize(request, Action.PRICING_MANAGE, location.pk)
    if sport not in Sport.values or not 1 <= sessions <= 31 or monthly_price < 0:
        raise _invalid("rate")
    with transaction.atomic():
        rate, created = SubscriptionRate.objects.select_for_update().get_or_create(
            location=location,
            sport=sport,
            sessions_per_month=sessions,
            defaults={"monthly_price": monthly_price},
        )
        before = None if created else audit.snapshot(rate)
        rate.monthly_price = monthly_price
        rate.marker = Marker.CONFIRMED if confirmed else Marker.TO_SET
        rate.save()
        audit.record(
            audit.actor_from_request(request),
            "subscriptions.rate_set",
            target=rate,
            before=before,
            after=audit.snapshot(rate),
        )
    return rate


# ---------------------------------------------------------------- buying
@dataclass(frozen=True)
class Order:
    location_id: uuid.UUID
    selections: list[Selection]
    period: str
    starts_on: date


def _location(location_id: uuid.UUID) -> Location:
    location = Location.objects.filter(pk=location_id, is_active=True).first()
    if location is None:
        raise DomainError(ErrorCode.LOCATIONS_NOT_FOUND, status=404)
    return location


def _check_start(starts_on: date) -> None:
    today = _today()
    if not today <= starts_on <= today + timedelta(days=MAX_START_AHEAD_DAYS):
        raise DomainError(ErrorCode.SUBSCRIPTIONS_INVALID_START)


def _create(
    user: User,
    location: Location,
    priced: SubscriptionQuote,
    order: Order,
    created_by: User,
    corporate: CorporateAccount | None,
    custom: bool,
) -> Subscription:
    subscription = Subscription.objects.create(
        user=user,
        location=location,
        corporate=corporate,
        period=order.period,
        starts_on=order.starts_on,
        ends_on=add_months(order.starts_on, PERIOD_MONTHS[Period(order.period)]),
        custom=custom,
        price_total=priced.price.total,
        price_breakdown=priced.as_dict(),
        price_provisional=priced.provisional,
        created_by=created_by,
        created_at=clock.now(),
    )
    SubscriptionComponent.objects.bulk_create(
        SubscriptionComponent(
            subscription=subscription,
            sport=c.sport,
            sessions_per_month=c.sessions_per_month,
            peak_allowed=c.peak_allowed,
            monthly_price=c.monthly_price,
        )
        for c in priced.components
    )
    return subscription


def order_subscription(request: HttpRequest, order: Order) -> Subscription:
    """The customer orders a standard package; it becomes active once paid (R-089)."""
    user = current_user(request)
    if user.email_verified_at is None:
        raise DomainError(ErrorCode.BOOKING_EMAIL_NOT_VERIFIED, status=403)
    location = _location(order.location_id)
    _check_start(order.starts_on)
    priced = quote(location, order.selections, order.period)
    with transaction.atomic():
        subscription = _create(user, location, priced, order, user, None, False)
        audit.record(
            audit.actor_from_request(request),
            "subscriptions.ordered",
            target=subscription,
            after={"total": subscription.price_total, "period": subscription.period},
        )
    return subscription


def staff_create(
    request: HttpRequest,
    order: Order,
    user_id: uuid.UUID,
    corporate_id: uuid.UUID | None = None,
) -> Subscription:
    """Reception/manager: custom intensities (Q12) and corporate subscriptions (R-088).
    A corporate subscription is billed to the company and active at once (Q35)."""
    location = _location(order.location_id)
    staff = authorize(request, Action.SUBSCRIPTIONS_MANAGE, location.pk)
    user = User.objects.filter(pk=user_id, is_active=True).first()
    if user is None:
        raise DomainError(ErrorCode.ACCOUNTS_NOT_FOUND, status=404)
    _check_start(order.starts_on)
    corporate = None
    if corporate_id is not None:
        corporate = CorporateAccount.objects.filter(pk=corporate_id, is_active=True).first()
        if corporate is None:
            raise DomainError(ErrorCode.CORPORATE_NOT_FOUND, status=404)
        if not CorporateMember.objects.filter(
            account=corporate, user=user, removed_at__isnull=True
        ).exists():
            raise DomainError(ErrorCode.CORPORATE_NOT_MEMBER)
    custom = any(not s.intensity for s in order.selections)
    priced = quote(location, order.selections, order.period, corporate, allow_custom=True)
    with transaction.atomic():
        subscription = _create(user, location, priced, order, staff, corporate, custom)
        if corporate is not None:
            charge(due_for_subscription(subscription), audit.actor_from_request(request))
            _activate(subscription)
        audit.record(
            audit.actor_from_request(request),
            "subscriptions.created",
            target=subscription,
            after={
                "total": subscription.price_total,
                "custom": custom,
                "corporate": str(corporate_id),
            },
        )
    return subscription


def get_subscription(subscription_id: uuid.UUID) -> Subscription:
    subscription = (
        Subscription.objects.select_related("user", "location").filter(pk=subscription_id).first()
    )
    if subscription is None:
        raise DomainError(ErrorCode.SUBSCRIPTIONS_NOT_FOUND, status=404)
    return subscription


def due_for_subscription(subscription: Subscription) -> Due:
    return Due(
        key=f"subscription:{subscription.pk}",
        customer=subscription.user,
        location=subscription.location,
        amount=subscription.price_total,
        category=RevenueCategory.SUBSCRIPTIONS,
        description=(
            f"Abonament {subscription.get_period_display().lower()} "
            f"din {subscription.starts_on:%d.%m.%Y}"
        ),
        active=subscription.status != SubscriptionStatus.CANCELLED,
        debtor_category=f"corporate:{subscription.corporate_id}"
        if subscription.corporate_id
        else "",
        lock_on=(Subscription, subscription.pk),
    )


def _activate(subscription: Subscription) -> None:
    today = _today()
    if subscription.starts_on < today:  # paid after the chosen start: the full period from today
        subscription.starts_on = today
        subscription.ends_on = add_months(today, PERIOD_MONTHS[Period(subscription.period)])
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.activated_at = clock.now()
    subscription.save()


def activate_if_paid(subscription_id: uuid.UUID) -> Subscription:
    with transaction.atomic():
        subscription = Subscription.objects.select_for_update().get(pk=subscription_id)
        if (
            subscription.status == SubscriptionStatus.PENDING_PAYMENT
            and money_status(due_for_subscription(subscription)).to_pay == 0
        ):
            _activate(subscription)
            audit.record(audit.SYSTEM, "subscriptions.activated", target=subscription)
            rewards.on_subscription_activated(subscription.user)  # R-120
    return subscription


def _own_or_staff(request: HttpRequest, subscription: Subscription) -> User:
    user = current_user(request)
    if subscription.user_id != user.pk:
        authorize(request, Action.SUBSCRIPTIONS_MANAGE, subscription.location_id)
    return user


def cancel_pending(request: HttpRequest, subscription_id: uuid.UUID) -> Subscription:
    """An order not paid yet can be dropped; a paid subscription is not refundable here."""
    with transaction.atomic():
        subscription = Subscription.objects.select_for_update().filter(pk=subscription_id).first()
        if subscription is None:
            raise DomainError(ErrorCode.SUBSCRIPTIONS_NOT_FOUND, status=404)
        _own_or_staff(request, subscription)
        if (
            subscription.status != SubscriptionStatus.PENDING_PAYMENT
            or money_status(due_for_subscription(subscription)).paid > 0
        ):
            raise DomainError(ErrorCode.SUBSCRIPTIONS_NOT_CANCELLABLE, status=409)
        subscription.status = SubscriptionStatus.CANCELLED
        subscription.save(update_fields=["status"])
        audit.record(
            audit.actor_from_request(request), "subscriptions.cancelled", target=subscription
        )
    return subscription


# ---------------------------------------------------------------- freezing (R-086)
def is_frozen(subscription: Subscription, day: date) -> bool:
    return subscription.freezes.filter(starts_on__lte=day, ends_on__gt=day).exists()


def freeze_days_used(user: User, year: int) -> int:
    total = 0
    for f in SubscriptionFreeze.objects.filter(subscription__user=user, starts_on__year=year):
        total += (f.ends_on - f.starts_on).days
    return total


def freeze(
    request: HttpRequest, subscription_id: uuid.UUID, starts_on: date, days: int
) -> SubscriptionFreeze:
    """R-086: up to 2 weeks a year; the subscription is extended by the same number of days."""
    with transaction.atomic():
        subscription = Subscription.objects.select_for_update().filter(pk=subscription_id).first()
        if subscription is None:
            raise DomainError(ErrorCode.SUBSCRIPTIONS_NOT_FOUND, status=404)
        actor = _own_or_staff(request, subscription)
        if subscription.status != SubscriptionStatus.ACTIVE:
            raise DomainError(ErrorCode.SUBSCRIPTIONS_NOT_ACTIVE, status=409)
        if not (_today() <= starts_on < subscription.ends_on) or days < 1:
            raise DomainError(ErrorCode.SUBSCRIPTIONS_INVALID_START)
        limit = int(get_config("subscriptions.freeze_days_per_year"))
        remaining = limit - freeze_days_used(subscription.user, starts_on.year)
        if days > remaining:
            raise DomainError(
                ErrorCode.SUBSCRIPTIONS_FREEZE_LIMIT, params={"remaining": max(0, remaining)}
            )
        ends_on = starts_on + timedelta(days=days)
        if subscription.freezes.filter(starts_on__lt=ends_on, ends_on__gt=starts_on).exists():
            raise DomainError(ErrorCode.SUBSCRIPTIONS_FREEZE_OVERLAP, status=409)
        if _uses_between(subscription, starts_on, ends_on):
            raise DomainError(ErrorCode.SUBSCRIPTIONS_FREEZE_CONFLICT, status=409)
        record = SubscriptionFreeze.objects.create(
            subscription=subscription,
            starts_on=starts_on,
            ends_on=ends_on,
            created_by=actor,
            created_at=clock.now(),
        )
        subscription.ends_on += timedelta(days=days)
        subscription.save(update_fields=["ends_on"])
        audit.record(
            audit.actor_from_request(request),
            "subscriptions.frozen",
            target=subscription,
            after={"from": starts_on, "days": days, "ends_on": subscription.ends_on},
        )
    return record


def _local_bounds(first: date, last_exclusive: date) -> tuple[datetime, datetime]:
    start = datetime.combine(first, datetime.min.time(), tzinfo=BUSINESS_TZ)
    end = datetime.combine(last_exclusive, datetime.min.time(), tzinfo=BUSINESS_TZ)
    return start, end


def _uses_between(subscription: Subscription, first: date, last_exclusive: date) -> bool:
    start, end = _local_bounds(first, last_exclusive)
    return (
        SubscriptionUse.objects.filter(
            component__subscription=subscription, released_at__isnull=True
        )
        .filter(
            Q(booking__starts_at__gte=start, booking__starts_at__lt=end)
            | Q(enrollment__session__starts_at__gte=start, enrollment__session__starts_at__lt=end)
        )
        .exists()
    )


# ---------------------------------------------------------------- sessions (R-083, R-085, R-087)
SPORT_BY_RESOURCE = {
    ResourceKind.PADEL_COURT: Sport.PADEL,
    ResourceKind.TENNIS_COURT: Sport.TENNIS,
    ResourceKind.REFORMER: Sport.PILATES,
}


def cover(
    user: User,
    sport: str,
    starts_at: datetime,
    *,
    booking: Booking | None = None,
    enrollment: ClassEnrollment | None = None,
) -> SubscriptionUse | None:
    """Takes one session from the customer's active subscription, if one covers it:
    this month's sessions first, then a make-up session. None = pay as usual."""
    day = starts_at.astimezone(BUSINESS_TZ).date()
    candidates = (
        Subscription.objects.select_for_update()
        .filter(user=user, status=SubscriptionStatus.ACTIVE, starts_on__lte=day, ends_on__gt=day)
        .order_by("ends_on")
    )
    for subscription in candidates:
        component = subscription.components.filter(sport=sport).first()
        if component is None or is_frozen(subscription, day):
            continue
        if not component.peak_allowed and band_at(starts_at) == Band.PEAK:
            continue  # R-087 / Q13: Start is not valid in peak hours
        cycle = cycle_index(subscription, day)
        used = component.uses.filter(cycle=cycle, makeup__isnull=True).count()
        makeup = None
        if used >= component.sessions_per_month:
            makeup = component.makeups.filter(expires_on__gt=day, use__isnull=True).first()
            if makeup is None:
                continue
        return SubscriptionUse.objects.create(
            component=component,
            cycle=cycle,
            booking=booking,
            enrollment=enrollment,
            makeup=makeup,
            created_at=clock.now(),
        )
    return None


def cover_booking(booking: Booking) -> SubscriptionUse | None:
    """R-083: lessons with a coach are subscription sessions; court rental is not."""
    sport = SPORT_BY_RESOURCE.get(ResourceKind(booking.resource.kind))
    if booking.session_type != SessionType.LESSON or sport is None:
        return None
    return cover(booking.organizer, sport, booking.starts_at, booking=booking)


def cover_enrollment(enrollment: ClassEnrollment) -> SubscriptionUse | None:
    return cover(
        enrollment.user, Sport.PILATES, enrollment.session.starts_at, enrollment=enrollment
    )


def on_cancelled(
    outcome: str, *, booking: Booking | None = None, enrollment: ClassEnrollment | None = None
) -> None:
    """Q14: a session cancelled in time is not lost — it becomes a make-up session valid
    until the end of the subscription. A late cancellation uses the session (R-071)."""
    use = (
        SubscriptionUse.objects.select_related("component__subscription")
        .filter(Q(booking=booking) if booking is not None else Q(enrollment=enrollment))
        .first()
    )
    if use is None or use.released_at is not None:
        return
    if outcome not in (CancellationOutcome.FREE, CancellationOutcome.WAIVED):
        return
    now = clock.now()
    use.released_at = now
    use.save(update_fields=["released_at"])
    SubscriptionMakeup.objects.create(
        component=use.component,
        expires_on=use.component.subscription.ends_on,
        created_at=now,
    )


@dataclass(frozen=True)
class Usage:
    sport: str
    sessions_per_month: int
    used_this_month: int
    makeups_available: int
    peak_allowed: bool


def usage(subscription: Subscription, day: date | None = None) -> list[Usage]:
    day = day or _today()
    cycle = cycle_index(subscription, max(day, subscription.starts_on))
    return [
        Usage(
            sport=c.sport,
            sessions_per_month=c.sessions_per_month,
            used_this_month=c.uses.filter(cycle=cycle, makeup__isnull=True).count(),
            makeups_available=c.makeups.filter(expires_on__gt=day, use__isnull=True).count(),
            peak_allowed=c.peak_allowed,
        )
        for c in subscription.components.all()
    ]


def my_subscriptions(request: HttpRequest) -> QuerySet[Subscription]:
    return Subscription.objects.filter(user=current_user(request)).prefetch_related("components")


# ---------------------------------------------------------------- corporate (R-088, Q35)
@dataclass(frozen=True)
class CorporateData:
    location_id: uuid.UUID
    name: str
    registration_code: str = ""
    billing_email: str = ""
    discount_percent: int | None = None


def create_corporate(request: HttpRequest, data: CorporateData) -> CorporateAccount:
    location = _location(data.location_id)
    authorize(request, Action.CORPORATE_MANAGE, location.pk)
    if data.discount_percent is not None and not 0 <= data.discount_percent <= 90:
        raise _invalid("discount_percent")
    account = CorporateAccount.objects.create(
        location=location,
        name=data.name,
        registration_code=data.registration_code,
        billing_email=data.billing_email,
        discount_percent=data.discount_percent,
    )
    audit.record(audit.actor_from_request(request), "corporate.created", target=account)
    return account


def _corporate(request: HttpRequest, account_id: uuid.UUID) -> CorporateAccount:
    account = CorporateAccount.objects.filter(pk=account_id).first()
    if account is None:
        raise DomainError(ErrorCode.CORPORATE_NOT_FOUND, status=404)
    authorize(request, Action.CORPORATE_MANAGE, account.location_id)
    return account


def add_member(request: HttpRequest, account_id: uuid.UUID, user_id: uuid.UUID) -> CorporateMember:
    account = _corporate(request, account_id)
    user = User.objects.filter(pk=user_id, is_active=True).first()
    if user is None:
        raise DomainError(ErrorCode.ACCOUNTS_NOT_FOUND, status=404)
    try:
        with transaction.atomic():
            member = CorporateMember.objects.create(
                account=account, user=user, added_at=clock.now()
            )
    except IntegrityError as exc:
        raise DomainError(ErrorCode.CORPORATE_ALREADY_MEMBER, status=409) from exc
    audit.record(audit.actor_from_request(request), "corporate.member_added", target=member)
    return member


def remove_member(request: HttpRequest, account_id: uuid.UUID, user_id: uuid.UUID) -> None:
    account = _corporate(request, account_id)
    updated = CorporateMember.objects.filter(
        account=account, user_id=user_id, removed_at__isnull=True
    ).update(removed_at=clock.now())
    if not updated:
        raise DomainError(ErrorCode.CORPORATE_NOT_MEMBER)
    audit.record(
        audit.actor_from_request(request),
        "corporate.member_removed",
        target=account,
        after={"user": str(user_id)},
    )


@dataclass(frozen=True)
class MemberUsage:
    user_id: uuid.UUID
    name: str
    sessions: dict[str, int]


@dataclass(frozen=True)
class CorporateReport:
    account: CorporateAccount
    year: int
    month: int
    members: list[MemberUsage]
    billed: int  # bani charged to the company for subscriptions starting that month


def monthly_report(
    request: HttpRequest, account_id: uuid.UUID, year: int, month: int
) -> CorporateReport:
    """Q35: sessions used per employee in a calendar month, and what was billed."""
    account = _corporate(request, account_id)
    if not 1 <= month <= 12 or not 2026 <= year <= 2100:
        raise _invalid("month")
    first = date(year, month, 1)
    start, end = _local_bounds(first, add_months(first, 1))
    members = []
    for m in account.members.select_related("user").order_by("added_at"):
        counts: dict[str, int] = {}
        uses = SubscriptionUse.objects.filter(
            component__subscription__user=m.user,
            component__subscription__corporate=account,
            released_at__isnull=True,
        ).filter(
            Q(booking__starts_at__gte=start, booking__starts_at__lt=end)
            | Q(enrollment__session__starts_at__gte=start, enrollment__session__starts_at__lt=end)
        )
        for use in uses.select_related("component"):
            counts[use.component.sport] = counts.get(use.component.sport, 0) + 1
        members.append(MemberUsage(m.user_id, f"{m.user.first_name} {m.user.last_name}", counts))
    billed = (
        Subscription.objects.filter(
            corporate=account, starts_on__gte=first, starts_on__lt=add_months(first, 1)
        )
        .exclude(status=SubscriptionStatus.CANCELLED)
        .aggregate(total=Sum("price_total"))["total"]
        or 0
    )
    return CorporateReport(account, year, month, members, int(billed))
