"""The users module of the panel (§8.6, R-004): what the staff sees about a person beyond the
account itself (cards, league, recent bookings) and the objection to appearing by name on the
screens (Q55, GDPR art. 21), recorded at the person's request and kept in the audit log."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime

from django.db import transaction
from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.accounts.services.authz import authorize
from jungle.audit import services as audit
from jungle.bookings.models import Booking
from jungle.cards.models import MemberCard
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.league.models import LevelQuestionnaire
from jungle.league.services import is_playing
from jungle.screens.models import NameObjection

RECENT = 10


@dataclass(frozen=True)
class CardView:
    id: uuid.UUID
    number: str
    status: str
    issued_at: datetime
    revoked_at: datetime | None
    revoke_reason: str


@dataclass(frozen=True)
class BookingView:
    id: uuid.UUID
    resource: str
    starts_at: datetime
    ends_at: datetime
    status: str
    session_type: str


@dataclass
class Profile:
    in_league: bool
    level_validated: str | None
    level_waiting: bool
    hidden_on_screens: bool
    cards: list[CardView] = field(default_factory=list)
    bookings: list[BookingView] = field(default_factory=list)


def _person(user_id: uuid.UUID) -> User:
    user = User.objects.filter(pk=user_id).first()
    if user is None:
        raise DomainError(ErrorCode.ACCOUNTS_NOT_FOUND, status=404)
    return user


def profile(request: HttpRequest, user_id: uuid.UUID, location_id: uuid.UUID) -> Profile:
    authorize(request, Action.USERS_VIEW, location_id)
    user = _person(user_id)
    validated = (
        LevelQuestionnaire.objects.filter(user=user, validated_at__isnull=False)
        .order_by("-validated_at")
        .first()
    )
    waiting = LevelQuestionnaire.objects.filter(user=user, validated_at__isnull=True).exists()
    return Profile(
        in_league=is_playing(user),
        level_validated=str(validated.validated_level) if validated else None,
        level_waiting=waiting,
        hidden_on_screens=NameObjection.objects.filter(user=user).exists(),
        cards=[
            CardView(c.pk, c.number, c.status, c.issued_at, c.revoked_at, c.revoke_reason)
            for c in MemberCard.objects.filter(user=user).order_by("-issued_at")
        ],
        bookings=[
            BookingView(b.pk, b.resource.name, b.starts_at, b.ends_at, b.status, b.session_type)
            for b in Booking.objects.filter(organizer=user, location_id=location_id)
            .select_related("resource")
            .order_by("-starts_at")[:RECENT]
        ],
    )


def set_hidden_on_screens(
    request: HttpRequest, user_id: uuid.UUID, location_id: uuid.UUID, hidden: bool, note: str
) -> bool:
    """Q55 (GDPR art. 21): the person asked not to appear by name on the screens, or withdrew
    that request."""
    staff = authorize(request, Action.PRIVACY_REQUESTS, location_id)
    user = _person(user_id)
    with transaction.atomic():
        if hidden:
            NameObjection.objects.update_or_create(user=user, defaults={"note": note[:200]})
        else:
            NameObjection.objects.filter(user=user).delete()
        audit.record(
            audit.actor_from_request(request),
            "screens.name_objection" if hidden else "screens.name_objection_withdrawn",
            after={"user": str(user.pk), "by": str(staff.pk), "note": note[:200]},
        )
    return hidden
