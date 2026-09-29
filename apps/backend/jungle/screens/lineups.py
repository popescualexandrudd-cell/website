"""The players choose their teams themselves at the League Kiosk (Q55, the owner's answer of
29.09.2026): by default the court screen pairs the four players by the order of their scans;
any of them may instead say who they play with. Only the four players who checked in on the
court, only while the teams are not fixed by a match entered at the kiosk or a tournament
draw, and never for a challenge (its teams are the challenge's). A score is never touched
here (invariant 1): the teams on the screen are what the players said; the match entered at
the kiosk replaces them.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from django.db import transaction
from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.attendance.models import ScanKind
from jungle.audit import services as audit
from jungle.bookings.models import Booking, BookingStatus, SessionType
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.devices.models import Device
from jungle.screens import views
from jungle.screens.models import CourtLineup

EARLY = timedelta(minutes=15)  # the teams may be chosen a little before the start
TEAM_SIZE = 2
LIVE = (BookingStatus.CONFIRMED, BookingStatus.COMPLETED)
NOT_CHOSEN_HERE = (SessionType.CHALLENGE, SessionType.TOURNAMENT)


@dataclass(frozen=True)
class Lineup:
    booking_id: uuid.UUID
    court: str
    starts_at: datetime
    ends_at: datetime
    players: list[User]
    teams: list[list[uuid.UUID]]


def _candidates(device: Device, user: User) -> list[Booking]:
    now = clock.now()
    return list(
        Booking.objects.filter(
            location_id=device.location_id,
            status__in=LIVE,
            starts_at__lte=now + EARLY,
            ends_at__gt=now,
            scans__user=user,
            scans__kind=ScanKind.COURT_ENTRY,
        )
        .exclude(session_type__in=NOT_CHOSEN_HERE)
        .select_related("resource")
        .distinct()
        .order_by("starts_at")
    )


def _lineup(booking: Booking) -> Lineup | None:
    """A court where the teams can still be chosen: four players checked in, teams not fixed."""
    players = views.scanned_in(booking)
    if len(players) != 2 * TEAM_SIZE or views.fixed_teams(booking) is not None:
        return None
    users = {u.pk: u for u in User.objects.filter(pk__in=players)}
    return Lineup(
        booking_id=booking.pk,
        court=booking.resource.name,
        starts_at=booking.starts_at,
        ends_at=booking.ends_at,
        players=[users[p] for p in players],
        teams=views.teams_of(booking, None),
    )


def for_player(device: Device, user: User) -> list[Lineup]:
    """The courts where this player can choose the teams now, at this club."""
    return [found for b in _candidates(device, user) if (found := _lineup(b)) is not None]


def choose_partner(
    request: HttpRequest, device: Device, user: User, booking_id: uuid.UUID, partner_id: uuid.UUID
) -> Lineup:
    """ "I play with …": the two others make the other team. Recorded, audited, and announced to
    the screens after the commit (the model's signal)."""
    booking = next((b for b in _candidates(device, user) if b.pk == booking_id), None)
    if booking is None:
        raise DomainError(ErrorCode.SCREENS_NOT_ON_COURT, status=404)
    found = _lineup(booking)
    if found is None:
        raise DomainError(ErrorCode.SCREENS_TEAMS_FIXED, status=409)
    ids = [p.pk for p in found.players]
    if partner_id == user.pk or partner_id not in ids:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "partner_id"})
    mine = [user.pk, partner_id]
    others = [p for p in ids if p not in mine]
    with transaction.atomic():
        CourtLineup.objects.update_or_create(
            booking=booking,
            defaults={
                "team_a": [str(p) for p in mine],
                "team_b": [str(p) for p in others],
                "set_by": user,
                "device": device,
                "updated_at": clock.now(),
            },
        )
        audit.record(
            audit.actor_from_request(request),
            "screens.lineup_chosen",
            after={"booking": str(booking.pk), "team_a": [str(p) for p in mine]},
        )
    return Lineup(
        booking_id=found.booking_id,
        court=found.court,
        starts_at=found.starts_at,
        ends_at=found.ends_at,
        players=found.players,
        teams=[mine, others],
    )
