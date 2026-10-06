"""The club's public calendar (R-110, §9.2.12).

Staff (`events.manage`, per location) add an event, change it, publish or withdraw it and cancel
it with a reason; every change is in the audit log, and the website is asked to refresh after the
change is saved (`configuration.web`, tag "events"). The public calendar joins the published events
with the league's open tournaments (§6.14), in time order; a cancelled event stays on it, marked,
until its end, so nobody comes for it.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from typing import Any

from django.db import transaction
from django.db.models import Count, Q, QuerySet
from django.http import HttpRequest

from jungle.accounts.services.authz import authorize
from jungle.audit import services as audit
from jungle.configuration import web
from jungle.configuration.models import Marker
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.events.models import ClubEvent
from jungle.league.models import EntryStatus, Tournament, TournamentStatus
from jungle.locations.models import Location, Resource, ResourceKind
from jungle.notifications import services as notifications
from jungle.notifications.catalog import Category
from jungle.pricing.models import Band, CustomerType, Product
from jungle.pricing.services import rate_for, season_on

MAX_LENGTH = timedelta(hours=24)  # an evening or a day; a longer happening is two entries
CALENDAR_DAYS = 120  # the website shows about four months ahead
CALENDAR_LIMIT = 30
STAFF_PAST_DAYS = 30  # the panel also lists the last month, for reference
STAFF_LIMIT = 200


@dataclass(frozen=True)
class EventData:
    kind: str
    title_ro: str
    title_en: str
    text_ro: str
    text_en: str
    starts_at: datetime
    ends_at: datetime


@dataclass(frozen=True)
class CalendarTournament:
    format: str
    status: str
    registration_closes_at: datetime
    places_left: int


@dataclass(frozen=True)
class CalendarItem:
    id: uuid.UUID
    kind: str
    title_ro: str
    title_en: str
    text_ro: str
    text_en: str
    starts_at: datetime
    ends_at: datetime | None
    cancelled: bool
    demo: bool
    tournament: CalendarTournament | None = None


@dataclass(frozen=True)
class EventRoom:
    capacity: int | None
    price_per_hour: int | None
    provisional: bool


@dataclass(frozen=True)
class Calendar:
    items: list[CalendarItem]
    room: EventRoom | None


# ---------------------------------------------------------------- staff
def _clean(data: EventData) -> EventData:
    data = replace(
        data,
        title_ro=data.title_ro.strip(),
        title_en=data.title_en.strip(),
        text_ro=data.text_ro.strip(),
        text_en=data.text_en.strip(),
    )
    if not data.title_ro or not data.title_en:
        raise DomainError(ErrorCode.VALIDATION_INVALID, status=422, params={"field": "title"})
    if data.ends_at <= data.starts_at or data.ends_at - data.starts_at > MAX_LENGTH:
        raise DomainError(ErrorCode.EVENTS_INVALID_TIME, status=422)
    return data


def _snapshot(event: ClubEvent) -> dict[str, Any]:
    return {
        "kind": event.kind,
        "title_ro": event.title_ro,
        "title_en": event.title_en,
        "text_ro": event.text_ro,
        "text_en": event.text_en,
        "starts_at": event.starts_at.isoformat(),
        "ends_at": event.ends_at.isoformat(),
        "published": event.published,
    }


def _refresh_site(event: ClubEvent, was_public: bool) -> None:
    """Only a change the visitors could see asks the website to rebuild its pages."""
    if was_public or event.published:
        web.revalidate_after_commit([web.EVENTS_TAG])


def _announce(event: ClubEvent) -> None:
    """§11 "eveniment nou": once per event, to the clients who asked for the club's news (an
    opt-in category); not for demo events or ones already over."""
    if event.is_demo or event.ends_at <= clock.now():
        return
    for user in notifications.opted_in(Category.CLUB):
        en = user.preferred_language == "en"
        notifications.notify(
            user,
            "club.new_event",
            {
                "title": event.title_en if en else event.title_ro,
                "text": event.text_en if en else event.text_ro,
                "when": clock.local(event.starts_at).strftime("%d.%m.%Y %H:%M"),
                "url": notifications.account_path("en" if en else "ro", "calendar"),
            },
            subject=str(event.pk),
        )


def _locked(request: HttpRequest, event_id: uuid.UUID) -> ClubEvent:
    event = ClubEvent.objects.select_for_update().filter(pk=event_id).first()
    if event is None:
        raise DomainError(ErrorCode.EVENTS_EVENT_NOT_FOUND, status=404)
    authorize(request, Action.EVENTS_MANAGE, event.location_id)
    if event.cancelled_at is not None:
        raise DomainError(ErrorCode.EVENTS_ALREADY_CANCELLED, status=409)
    return event


def create(
    request: HttpRequest, location_id: uuid.UUID, data: EventData, published: bool
) -> ClubEvent:
    staff = authorize(request, Action.EVENTS_MANAGE, location_id)
    location = Location.objects.filter(pk=location_id).first()
    if location is None:
        raise DomainError(ErrorCode.LOCATIONS_NOT_FOUND, status=404)
    data = _clean(data)
    if data.starts_at <= clock.now():
        raise DomainError(ErrorCode.EVENTS_INVALID_TIME, status=422)
    with transaction.atomic():
        event = ClubEvent.objects.create(
            location=location,
            kind=data.kind,
            title_ro=data.title_ro,
            title_en=data.title_en,
            text_ro=data.text_ro,
            text_en=data.text_en,
            starts_at=data.starts_at,
            ends_at=data.ends_at,
            published=published,
            created_by=staff,
        )
        audit.record(
            audit.actor_from_request(request),
            "club_event.created",
            target=event,
            after=_snapshot(event),
        )
        _refresh_site(event, was_public=False)
        if published:
            _announce(event)
    return event


def update(request: HttpRequest, event_id: uuid.UUID, data: EventData, reason: str) -> ClubEvent:
    """A changed time must still be in the future; a text can be corrected at any time."""
    data = _clean(data)
    with transaction.atomic():
        event = _locked(request, event_id)
        moved = (data.starts_at, data.ends_at) != (event.starts_at, event.ends_at)
        if moved and data.starts_at <= clock.now():
            raise DomainError(ErrorCode.EVENTS_INVALID_TIME, status=422)
        before = _snapshot(event)
        for field in ("kind", "title_ro", "title_en", "text_ro", "text_en"):
            setattr(event, field, getattr(data, field))
        event.starts_at, event.ends_at = data.starts_at, data.ends_at
        event.save()
        audit.record(
            audit.actor_from_request(request),
            "club_event.changed",
            target=event,
            before=before,
            after=_snapshot(event),
            reason=reason,
        )
        _refresh_site(event, was_public=event.published)
    return event


def set_published(
    request: HttpRequest, event_id: uuid.UUID, published: bool, reason: str
) -> ClubEvent:
    with transaction.atomic():
        event = _locked(request, event_id)
        was_public = event.published
        event.published = published
        event.save(update_fields=["published", "updated_at"])
        audit.record(
            audit.actor_from_request(request),
            "club_event.published" if published else "club_event.withdrawn",
            target=event,
            reason=reason,
        )
        _refresh_site(event, was_public=was_public)
        if published and not was_public:
            _announce(event)
    return event


def cancel(request: HttpRequest, event_id: uuid.UUID, reason: str) -> ClubEvent:
    reason = reason.strip()
    if not reason:
        raise DomainError(ErrorCode.VALIDATION_INVALID, status=422, params={"field": "reason"})
    with transaction.atomic():
        event = _locked(request, event_id)
        event.cancelled_at = clock.now()
        event.cancel_reason = reason[:500]
        event.save(update_fields=["cancelled_at", "cancel_reason", "updated_at"])
        audit.record(
            audit.actor_from_request(request), "club_event.cancelled", target=event, reason=reason
        )
        _refresh_site(event, was_public=event.published)
    return event


def staff_list(request: HttpRequest, location_id: uuid.UUID) -> QuerySet[ClubEvent]:
    """What is coming and the last month, drafts and cancelled events included."""
    authorize(request, Action.EVENTS_MANAGE, location_id)
    since = clock.now() - timedelta(days=STAFF_PAST_DAYS)
    return ClubEvent.objects.filter(location_id=location_id, ends_at__gt=since).order_by(
        "starts_at"
    )[:STAFF_LIMIT]


# ---------------------------------------------------------------- public
def _tournament_item(t: Tournament, entries: int) -> CalendarItem:
    return CalendarItem(
        id=t.id,
        kind="tournament",
        title_ro=t.name,
        title_en=t.name,
        text_ro="",
        text_en="",
        starts_at=t.starts_at,
        ends_at=None,  # a tournament has no time limit (§6.14)
        cancelled=False,
        demo=False,
        tournament=CalendarTournament(
            format=t.format,
            status=t.status,
            registration_closes_at=t.registration_closes_at,
            places_left=max(0, t.max_entries - entries),
        ),
    )


def room_of(location: Location) -> EventRoom | None:
    """The event room (§1: 15–20 people) with its cheapest hour this season (R-051), if priced."""
    room = (
        Resource.objects.filter(location=location, kind=ResourceKind.EVENT_ROOM, is_active=True)
        .order_by("sort_order", "name")
        .first()
    )
    if room is None:
        return None
    season = season_on(clock.today_local())
    rates = []
    for band in Band.values:
        try:
            rates.append(
                rate_for(
                    location,
                    ResourceKind.EVENT_ROOM,
                    Product.EVENT,
                    season,
                    band,
                    CustomerType.STANDARD,
                )
            )
        except DomainError:
            continue
    cheapest = min(rates, key=lambda r: r.amount_per_half_hour, default=None)
    return EventRoom(
        capacity=room.capacity,
        price_per_hour=cheapest.amount_per_half_hour * 2 if cheapest else None,
        provisional=cheapest is not None and cheapest.marker == Marker.TO_SET,
    )


def calendar(location: Location) -> Calendar:
    now = clock.now()
    horizon = now + timedelta(days=CALENDAR_DAYS)
    events = [
        CalendarItem(
            id=e.id,
            kind=e.kind,
            title_ro=e.title_ro,
            title_en=e.title_en,
            text_ro=e.text_ro,
            text_en=e.text_en,
            starts_at=e.starts_at,
            ends_at=e.ends_at,
            cancelled=e.cancelled_at is not None,
            demo=e.is_demo,
        )
        for e in ClubEvent.objects.filter(
            location=location, published=True, ends_at__gt=now, starts_at__lt=horizon
        )
    ]
    # In progress whenever it started; open for entries while it has not started.
    open_tournaments = Tournament.objects.filter(location=location, starts_at__lt=horizon).filter(
        Q(status=TournamentStatus.IN_PROGRESS)
        | Q(status=TournamentStatus.REGISTRATION, starts_at__gt=now)
    )
    tournaments = [
        _tournament_item(t, t.registered)
        for t in open_tournaments.annotate(
            registered=Count("entries", filter=Q(entries__status=EntryStatus.REGISTERED))
        )
    ]
    items = sorted(events + tournaments, key=lambda item: (item.starts_at, str(item.id)))
    return Calendar(items=items[:CALENDAR_LIMIT], room=room_of(location))
