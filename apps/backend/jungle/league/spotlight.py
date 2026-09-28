"""The Match of the day (§6.15, LG-150).

Chosen among today's league bookings (official matches and challenges) with a deterministic
stake score: a promotion within reach, a duel in the top 10, a challenge, a rivalry (the same
players met often lately), a big level gap. Points and thresholds are configurable
(`league.match_of_the_day`). The admin can pick another match, with a reason. The AI's
presentation text and the summary after the match come with Stage 12.

Shown publicly with R-012 data only (names, rank, level, LP, place): no court, no time.
Players are the ones who scanned in on the court; before that, the players of the accepted
challenge, or the booking's organiser.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from itertools import combinations
from typing import Any

from django.db import transaction
from django.db.models import Q
from django.http import HttpRequest

from jungle.accounts.services.authz import authorize
from jungle.attendance.models import Scan, ScanKind
from jungle.audit import services as audit
from jungle.bookings.models import Booking, BookingStatus, SessionType
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.league import projection, store
from jungle.league.models import (
    Challenge,
    ChallengeStatus,
    Ladder,
    LeagueMatch,
    LeagueSeason,
    MatchOfTheDay,
    MatchStatus,
    SeasonStatus,
    Standing,
)
from jungle.locations.models import Location

SESSIONS = (SessionType.OFFICIAL_MATCH, SessionType.CHALLENGE)


@dataclass(frozen=True)
class Spotlight:
    booking: Booking
    players: list[Standing]
    stake: int
    reasons: list[str]
    chosen_by_admin: bool


def _day_bounds(day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time(), clock.BUSINESS_TZ)
    return start, datetime.combine(day + timedelta(days=1), time(), clock.BUSINESS_TZ)


def _candidates(location: Location, day: date) -> list[Booking]:
    start, end = _day_bounds(day)
    return list(
        Booking.objects.filter(
            location=location,
            session_type__in=SESSIONS,
            status__in=(BookingStatus.CONFIRMED, BookingStatus.COMPLETED),
            starts_at__gte=start,
            starts_at__lt=end,
        )
        .select_related("organizer")
        .order_by("starts_at", "id")
    )


def known_players(booking: Booking, season: LeagueSeason) -> list[uuid.UUID]:
    scanned = list(
        dict.fromkeys(
            Scan.objects.filter(booking=booking, kind=ScanKind.COURT_ENTRY)
            .order_by("scanned_at")
            .values_list("user_id", flat=True)
        )
    )
    if scanned:
        return scanned
    if booking.session_type == SessionType.CHALLENGE:
        who = booking.organizer_id
        challenge = (
            Challenge.objects.filter(
                season=season, status=ChallengeStatus.ACCEPTED, play_by__gte=booking.starts_at
            )
            .filter(Q(challenger_a=who) | Q(challenger_b=who) | Q(target_a=who) | Q(target_b=who))
            .order_by("responded_at")
            .first()
        )
        if challenge is not None:
            return challenge.challengers + challenge.targets
    return [booking.organizer_id]


def _rivalry(ids: list[uuid.UUID], since: datetime, needed: int) -> bool:
    for first, second in combinations(ids, 2):
        together = (
            LeagueMatch.objects.filter(status=MatchStatus.APPLIED, finished_at__gte=since)
            .filter(players__user=first)
            .filter(players__user=second)
            .distinct()
            .count()
        )
        if together >= needed:
            return True
    return False


def stake(booking: Booking, season: LeagueSeason) -> tuple[int, list[str], list[Standing]]:
    weights: dict[str, Any] = dict(get_config("league.match_of_the_day"))
    config = store.config_for(season)
    visible = projection.visible_players()
    ids = [i for i in known_players(booking, season) if str(i) in visible]
    rows = list(
        Standing.objects.filter(
            season=season, ladder=Ladder.DOUBLES, competitor_id__in=[str(i) for i in ids]
        ).select_related("player_a")
    )
    reasons: list[str] = []
    per_division = config.lp_per_division
    if any(
        r.rank_index is not None
        and r.tier != "master"
        and r.lp >= per_division - int(weights["promotion_margin_lp"])
        for r in rows
    ):
        reasons.append("promotion")
    in_top = sum(1 for r in rows if r.position is not None and r.position <= 10)
    if in_top >= 2:
        reasons.append("top10_duel")
    elif in_top == 1:
        reasons.append("top10")
    if booking.session_type == SessionType.CHALLENGE:
        reasons.append("challenge")
    since = clock.now() - timedelta(days=int(weights["rivalry_days"]))
    if _rivalry(ids, since, int(weights["rivalry_matches"])):
        reasons.append("rivalry")
    levels = [r.level for r in rows]
    if len(levels) >= 2 and max(levels) - min(levels) >= float(weights["level_gap_levels"]):
        reasons.append("level_gap")
    rows.sort(key=lambda r: (r.position is None, r.position or 0, r.competitor_id))
    return sum(int(weights[r]) for r in reasons), reasons, rows


def match_of_the_day(location: Location, day: date | None = None) -> Spotlight | None:
    day = day or clock.today_local()
    season = LeagueSeason.objects.filter(location=location, status=SeasonStatus.ACTIVE).first()
    if season is None:
        return None
    choice = MatchOfTheDay.objects.filter(location=location, day=day).select_related("booking")
    chosen = choice.first()
    if chosen is not None:
        points, reasons, rows = stake(chosen.booking, season)
        return Spotlight(chosen.booking, rows, points, reasons, True)
    best: Spotlight | None = None
    for booking in _candidates(location, day):  # ordered by start: the earliest wins a tie
        points, reasons, rows = stake(booking, season)
        if best is None or points > best.stake:
            best = Spotlight(booking, rows, points, reasons, False)
    return best


def choose(
    request: HttpRequest, location_id: uuid.UUID, booking_id: uuid.UUID, reason: str
) -> MatchOfTheDay:
    """The admin picks today's Match of the day (with a reason, audited)."""
    user = authorize(request, Action.LEAGUE_MANAGE, location_id)
    if not reason.strip():
        raise DomainError(ErrorCode.LEAGUE_REASON_REQUIRED)
    day = clock.today_local()
    location = Location.objects.filter(pk=location_id).first()
    booking = Booking.objects.filter(pk=booking_id).first()
    if location is None or booking is None or booking not in _candidates(location, day):
        raise DomainError(ErrorCode.LEAGUE_NOT_A_MATCH_TODAY)
    with transaction.atomic():
        row, _ = MatchOfTheDay.objects.update_or_create(
            location=location,
            day=day,
            defaults={
                "booking": booking,
                "chosen_by": user,
                "reason": reason.strip()[:250],
                "created_at": clock.now(),
            },
        )
        audit.record(
            audit.actor_from_request(request),
            "league.match_of_the_day_chosen",
            target=row,
            reason=reason,
        )
    return row
