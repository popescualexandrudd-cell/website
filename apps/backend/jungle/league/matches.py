"""League matches, from the score entered at the kiosk to the league (§6.9, LG-090 … LG-098,
LG-162).

At the League Kiosk, after the booking ends:
1. a player scans the card and enters the teams and the score (`propose`);
2. every other player scans the card and confirms or disputes it (`respond`);
3. when everyone confirmed, the score is validated only if the booking is fully paid (every
   share of a split hour included); otherwise it waits for the payment (Q11: 24 hours by
   default) and a later payment validates it (`payment_received`);
4. validated → applied: the engine computes MMR and LP through the event store.

A dispute goes to the admin; a score not confirmed by everyone before the window closes, or
not paid in time, expires (`expire_matches`). Every step checks the booking, the scans, the
payment and the device again, and writes what it checked in the match's log.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from typing import Any

from django.db import transaction
from django.db.models import QuerySet
from django.http import HttpRequest
from jungle_league.score import ScoreError, validate_score

from jungle.accounts.models import User
from jungle.accounts.services.authz import authorize, current_user
from jungle.attendance.models import Scan, ScanKind, StaffNotice
from jungle.audit import services as audit
from jungle.audit.models import ActorKind
from jungle.bookings.models import Booking, BookingStatus, SessionType
from jungle.cards import services as cards
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.http import client_ip
from jungle.core.permissions import Action, Role
from jungle.devices.models import Device
from jungle.league import kiosk, services, store
from jungle.league.models import (
    OPEN_STATUSES,
    EventKind,
    LeagueMatch,
    MatchKind,
    MatchPlayer,
    MatchStatus,
    MatchTransition,
    Response,
    SeasonStatus,
    Side,
)
from jungle.ledger import payments
from jungle.locations.models import ResourceKind

# The bookings whose score may count (§6.14). Challenges join in with their challenge (§6.11),
# tournament matches with their draw (§6.14).
LEAGUE_SESSIONS = {SessionType.OFFICIAL_MATCH: MatchKind.OFFICIAL}
PLAYABLE_BOOKINGS = (BookingStatus.CONFIRMED, BookingStatus.COMPLETED)
NOTICE_DISPUTE = "league.match_disputed"


# ---------------------------------------------------------------- small helpers
def score_window(booking: Booking) -> tuple[datetime, datetime]:
    """LG-093: from the end of the booking, for 30 minutes (configurable); or the window the
    admin reopened after a dispute (the players enter the score again, at the kiosk)."""
    length = timedelta(minutes=int(get_config("league.score_window_minutes")))
    reopened = (
        LeagueMatch.objects.filter(booking=booking, reopened_until__isnull=False)
        .order_by("-reopened_until")
        .values_list("reopened_until", flat=True)
        .first()
    )
    if reopened is not None and reopened > booking.ends_at + length:
        return reopened - length, reopened
    return booking.ends_at, booking.ends_at + length


def _hm(moment: datetime) -> str:
    return moment.astimezone(clock.BUSINESS_TZ).strftime("%H:%M")


def kiosk_actor(request: HttpRequest, device: Device, person: User) -> audit.Actor:
    return audit.Actor(
        kind=ActorKind.DEVICE,
        user_id=person.pk,
        device_id=device.pk,
        label=device.name,
        ip=client_ip(request),
    )


def _log(
    match: LeagueMatch,
    status: str,
    actor: audit.Actor,
    *,
    device: Device | None = None,
    checks: dict[str, Any] | None = None,
    reason: str = "",
) -> None:
    MatchTransition.objects.create(
        match=match,
        status=status,
        at=clock.now(),
        actor=store.audit_actor(actor),
        device=device,
        checks=checks or {},
        reason=reason[:500],
    )


def _parse_score(score: dict[str, Any], match_kind: str, season: Any) -> dict[str, Any]:
    """LG-070 … LG-083: an impossible score is refused at the kiosk, before anyone confirms."""
    try:
        parsed = store.score_from_json(score)
    except (KeyError, TypeError, ValueError) as exc:
        raise DomainError(ErrorCode.VALIDATION_INVALID) from exc
    try:
        validate_score(
            parsed, store.config_for(season), tournament=match_kind == MatchKind.TOURNAMENT
        )
    except ScoreError as exc:
        raise store.engine_error(exc) from exc
    return store.score_to_json(parsed)


# ---------------------------------------------------------------- the checks (LG-091 … LG-098)
def check_booking(booking: Booking, location_id: uuid.UUID) -> dict[str, Any]:
    """LG-091: an official match on one of the club's padel courts (LG-005)."""
    if (
        booking.status not in PLAYABLE_BOOKINGS
        or booking.session_type not in LEAGUE_SESSIONS
        or booking.resource.kind != ResourceKind.PADEL_COURT
        or booking.location_id != location_id
    ):
        raise DomainError(ErrorCode.LEAGUE_BOOKING_NOT_ELIGIBLE)
    return {"booking": str(booking.pk), "status": booking.status, "type": booking.session_type}


def check_scans(booking: Booking, players: list[User]) -> dict[str, Any]:
    """LG-092: every player scanned the card when entering the court for this booking."""
    scanned = set(
        Scan.objects.filter(booking=booking, kind=ScanKind.COURT_ENTRY).values_list(
            "user_id", flat=True
        )
    )
    missing = [p for p in players if p.pk not in scanned]
    if missing:
        raise DomainError(ErrorCode.LEAGUE_PLAYERS_NOT_SCANNED, params={"missing": len(missing)})
    return {"scanned": sorted(str(p.pk) for p in players)}


def check_payment(booking: Booking) -> dict[str, int]:
    """LG-096: the booking is fully paid, every share of a split hour included."""
    status = payments.money_status(payments.due_for_booking(booking))
    return {"price": status.price, "paid": status.paid, "to_pay": status.to_pay}


def check_players(team_a: list[User], team_b: list[User]) -> list[User]:
    if len(team_a) not in (1, 2) or len(team_b) != len(team_a):
        raise DomainError(ErrorCode.LEAGUE_TEAM_SIZE)
    players = team_a + team_b
    if len({p.pk for p in players}) != len(players):
        raise DomainError(ErrorCode.LEAGUE_DUPLICATE_PLAYER)
    for player in players:
        if not services.is_playing(player):  # adult, validated level, consent (R-006, R-010)
            raise DomainError(
                ErrorCode.LEAGUE_PLAYER_NOT_IN_LEAGUE,
                status=403,
                params={"name": f"{player.first_name} {player.last_name}"},
            )
    return players


def check_daily_limit(match_players: list[User], finished_at: datetime, limit: int) -> None:
    """LG-103: at most `limit` official matches per player per day (club time), counting the
    ones still waiting for confirmation or payment."""
    day = finished_at.astimezone(clock.BUSINESS_TZ).date()
    start = datetime.combine(day, time(), clock.BUSINESS_TZ)
    end = datetime.combine(day + timedelta(days=1), time(), clock.BUSINESS_TZ)
    for player in match_players:
        count = (
            LeagueMatch.objects.filter(
                players__user=player,
                status__in=(*OPEN_STATUSES, MatchStatus.APPLIED),
                finished_at__gte=start,
                finished_at__lt=end,
            )
            .distinct()
            .count()
        )
        if count >= limit:
            raise DomainError(ErrorCode.LEAGUE_DAILY_LIMIT, status=409)


def _users(ids: tuple[uuid.UUID, ...]) -> list[User]:
    found = {u.pk: u for u in User.objects.filter(pk__in=ids, is_active=True)}
    if len(found) != len(set(ids)):
        raise DomainError(ErrorCode.LEAGUE_UNKNOWN_PLAYER, status=404)
    return [found[i] for i in ids]


# ---------------------------------------------------------------- at the kiosk
@dataclass(frozen=True)
class Proposal:
    booking_id: uuid.UUID
    card_token: str  # the proposer's card, scanned at the kiosk
    team_a: tuple[uuid.UUID, ...]
    team_b: tuple[uuid.UUID, ...]
    score: dict[str, Any]


def propose(request: HttpRequest, device: Device | None, data: Proposal) -> LeagueMatch:
    """LG-094: one player scans the card and enters the teams and the score."""
    booking = Booking.objects.select_related("resource").filter(pk=data.booking_id).first()
    kiosk_device = kiosk.check(
        request, device, booking.location_id if booking else None, "league.propose"
    )
    if booking is None:
        raise DomainError(ErrorCode.BOOKING_NOT_FOUND, status=404)
    proposer = cards.resolve(data.card_token).user
    actor = kiosk_actor(request, kiosk_device, proposer)
    now = clock.now()
    with transaction.atomic():
        Booking.objects.select_for_update().filter(pk=booking.pk).first()  # one at a time
        checks = check_booking(booking, kiosk_device.location_id)
        opens, closes = score_window(booking)
        if now < opens:
            raise DomainError(
                ErrorCode.LEAGUE_WINDOW_NOT_OPEN,
                status=409,
                params={"opens": _hm(opens), "closes": _hm(closes)},
            )
        if now >= closes:
            raise DomainError(
                ErrorCode.LEAGUE_WINDOW_CLOSED, status=409, params={"closes": _hm(closes)}
            )
        if (
            LeagueMatch.objects.filter(booking=booking)
            .exclude(status=MatchStatus.CANCELLED)
            .exists()
        ):
            raise DomainError(ErrorCode.LEAGUE_SCORE_ALREADY_PROPOSED, status=409)
        team_a, team_b = _users(data.team_a), _users(data.team_b)
        players = check_players(team_a, team_b)
        if proposer not in players:
            raise DomainError(ErrorCode.LEAGUE_NOT_A_PLAYER, status=403)
        checks |= check_scans(booking, players)
        season = services.active_season(booking.location)
        kind = LEAGUE_SESSIONS[SessionType(booking.session_type)]
        score = _parse_score(data.score, kind, season)
        check_daily_limit(
            players, booking.ends_at, store.config_for(season).max_official_matches_per_day
        )
        match = LeagueMatch.objects.create(
            season=season,
            location=booking.location,
            booking=booking,
            kind=kind,
            status=MatchStatus.PROPOSED,
            score=score,
            finished_at=booking.ends_at,
            window_closes_at=closes,
            proposed_by=proposer,
            proposed_at=now,
        )
        MatchPlayer.objects.bulk_create(
            MatchPlayer(
                match=match,
                user=player,
                side=Side.A if player in team_a else Side.B,
                response=Response.CONFIRMED if player == proposer else Response.PENDING,
                responded_at=now if player == proposer else None,
                device=kiosk_device if player == proposer else None,
            )
            for player in players
        )
        _log(match, MatchStatus.PROPOSED, actor, device=kiosk_device, checks=checks)
        audit.record(
            actor,
            "league.score_proposed",
            target=match,
            after={
                "score": score,
                "team_a": [str(p.pk) for p in team_a],
                "team_b": [str(p.pk) for p in team_b],
            },
        )
    return match


def respond(
    request: HttpRequest, device: Device | None, match_id: uuid.UUID, card_token: str, accept: bool
) -> LeagueMatch:
    """LG-094, LG-095: every other player scans the card and confirms or disputes."""
    found = LeagueMatch.objects.filter(pk=match_id).first()
    kiosk_device = kiosk.check(
        request, device, found.location_id if found else None, "league.respond"
    )
    if found is None:
        raise DomainError(ErrorCode.LEAGUE_MATCH_NOT_FOUND, status=404)
    person = cards.resolve(card_token).user
    actor = kiosk_actor(request, kiosk_device, person)
    with transaction.atomic():
        # LG-162: the match row is locked, so two last confirmations cannot both apply it.
        match = (
            LeagueMatch.objects.select_for_update(of=("self",))
            .select_related("booking")
            .get(pk=found.pk)
        )
        if match.status != MatchStatus.PROPOSED:
            raise DomainError(ErrorCode.LEAGUE_MATCH_NOT_OPEN, status=409)
        if clock.now() >= match.window_closes_at:
            raise DomainError(
                ErrorCode.LEAGUE_WINDOW_CLOSED,
                status=409,
                params={"closes": _hm(match.window_closes_at)},
            )
        entry = match.players.filter(user=person).first()
        if entry is None:
            raise DomainError(ErrorCode.LEAGUE_NOT_A_PLAYER, status=403)
        if entry.response != Response.PENDING:
            raise DomainError(ErrorCode.LEAGUE_ALREADY_RESPONDED, status=409)
        entry.response = Response.CONFIRMED if accept else Response.DISPUTED
        entry.responded_at = clock.now()
        entry.device = kiosk_device
        entry.save()
        if not accept:
            _dispute(match, actor, kiosk_device, person)
            return match
        audit.record(
            actor, "league.score_confirmed", target=match, after={"player": str(person.pk)}
        )
        if not match.players.filter(response=Response.PENDING).exists():
            _confirmed_by_all(match, actor, kiosk_device)
    return match


def _dispute(match: LeagueMatch, actor: audit.Actor, device: Device, person: User) -> None:
    match.status = MatchStatus.DISPUTED
    match.save(update_fields=["status"])
    _log(match, MatchStatus.DISPUTED, actor, device=device, checks={"by": str(person.pk)})
    audit.record(actor, "league.score_disputed", target=match, after={"player": str(person.pk)})
    StaffNotice.objects.create(
        location_id=match.location_id,
        recipient_role=Role.MANAGER,
        kind=NOTICE_DISPUTE,
        payload={
            "match_id": str(match.pk),
            "court": match.booking.resource.name if match.booking else "",
            "finished_at": match.finished_at.isoformat(),
        },
        created_at=clock.now(),
    )


def _players_of(match: LeagueMatch) -> tuple[list[User], list[User]]:
    rows = list(match.players.select_related("user"))
    return (
        [r.user for r in rows if r.side == Side.A],
        [r.user for r in rows if r.side == Side.B],
    )


def _confirmed_by_all(match: LeagueMatch, actor: audit.Actor, device: Device | None) -> None:
    """CONFIRMAT_DE_TOȚI: the booking and the scans are checked again, then the payment."""
    booking = match.booking
    if booking is None:  # pragma: no cover - tournament matches arrive with Stage 6D
        raise DomainError(ErrorCode.LEAGUE_BOOKING_NOT_ELIGIBLE)
    team_a, team_b = _players_of(match)
    checks = check_booking(booking, match.location_id) | check_scans(booking, team_a + team_b)
    _log(match, "confirmed", actor, device=device, checks=checks)
    _payment_gate(match, booking, actor, device)


def _payment_gate(
    match: LeagueMatch, booking: Booking, actor: audit.Actor, device: Device | None
) -> None:
    """LG-096: validated only when the booking is fully paid; otherwise it waits (Q11)."""
    payment = check_payment(booking)
    if payment["to_pay"] == 0:
        _log(match, "validated", actor, device=device, checks={"payment": payment})
        _apply(match, actor)
        return
    hours = int(get_config("league.payment_deadline_hours"))
    match.status = MatchStatus.AWAITING_PAYMENT
    match.payment_deadline = clock.now() + timedelta(hours=hours)
    match.save(update_fields=["status", "payment_deadline"])
    _log(match, MatchStatus.AWAITING_PAYMENT, actor, device=device, checks={"payment": payment})


def _apply(match: LeagueMatch, actor: audit.Actor) -> None:
    """LG-097: the engine computes MMR and LP (through the event store). A match without a
    complete set becomes training (§6.8); one over the daily limit too (LG-103)."""
    team_a, team_b = _players_of(match)
    payload = {
        "team_a": [str(p.pk) for p in team_a],
        "team_b": [str(p.pk) for p in team_b],
        "score": match.score,
        "match_type": match.kind,
    }
    try:
        event = store.record(
            match.season, EventKind.MATCH, match.finished_at, match.ref, payload, actor
        )
    except DomainError as exc:
        if exc.code is not ErrorCode.LEAGUE_DAILY_LIMIT:
            raise
        _finish(match, MatchStatus.TRAINING, actor, None, "Limita zilnică de meciuri (LG-103)")
        return
    record = event.records.order_by("-computation").first()
    counted = bool(record and record.payload.get("counted"))
    _finish(
        match,
        MatchStatus.APPLIED if counted else MatchStatus.TRAINING,
        actor,
        event,
        "" if counted else "Niciun set complet (§6.8)",
    )


def _finish(
    match: LeagueMatch,
    status: MatchStatus,
    actor: audit.Actor,
    event: Any,
    note: str,
) -> None:
    match.status = status
    match.event = event
    match.applied_at = clock.now()
    match.note = note
    match.save(update_fields=["status", "event", "applied_at", "note"])
    _log(match, status, actor, checks={"event": event.pk if event else None}, reason=note)
    audit.record(actor, f"league.match_{status}", target=match)


# ---------------------------------------------------------------- payment and time
def payment_received(due: payments.Due) -> None:
    """A later payment at the Payments Kiosk validates the waiting score automatically."""
    if due.booking is None:
        return
    with transaction.atomic():
        match = (
            LeagueMatch.objects.select_for_update()
            .filter(booking=due.booking, status=MatchStatus.AWAITING_PAYMENT)
            .first()
        )
        if match is None:
            return
        if match.payment_deadline is None or clock.now() > match.payment_deadline:
            return  # too late: the expiry job closes it
        if check_payment(due.booking)["to_pay"] == 0:
            _payment_gate(match, due.booking, audit.SYSTEM, None)


@dataclass(frozen=True)
class ExpiryReport:
    unconfirmed: int
    unpaid: int


def _expire(match_id: uuid.UUID, status: MatchStatus, when: str, reason: str) -> bool:
    with transaction.atomic():
        match = LeagueMatch.objects.select_for_update().get(pk=match_id)
        limit = match.window_closes_at if when == "window" else match.payment_deadline
        if match.status != status or limit is None or clock.now() < limit:
            return False
        match.status = MatchStatus.EXPIRED
        match.note = reason
        match.save(update_fields=["status", "note"])
        _log(match, MatchStatus.EXPIRED, audit.SYSTEM, reason=reason)
        audit.record(audit.SYSTEM, "league.match_expired", target=match, reason=reason)
    return True


def expire_matches() -> ExpiryReport:
    """LG-095, LG-096: run every few minutes (with the no-show job)."""
    now = clock.now()
    unconfirmed = LeagueMatch.objects.filter(
        status=MatchStatus.PROPOSED, window_closes_at__lte=now
    ).values_list("pk", flat=True)
    unpaid = LeagueMatch.objects.filter(
        status=MatchStatus.AWAITING_PAYMENT, payment_deadline__lt=now
    ).values_list("pk", flat=True)
    return ExpiryReport(
        unconfirmed=sum(
            _expire(pk, MatchStatus.PROPOSED, "window", "Neconfirmat de toți la timp (LG-095)")
            for pk in list(unconfirmed)
        ),
        unpaid=sum(
            _expire(pk, MatchStatus.AWAITING_PAYMENT, "payment", "Neplătit la termen (Q11)")
            for pk in list(unpaid)
        ),
    )


# ---------------------------------------------------------------- admin (LG-095)
class Resolution:
    """What the admin may do (LG-095). The admin never types a score: scores are entered and
    confirmed only at the League Kiosk (invariant 1)."""

    APPLY = "apply"  # the score entered at the kiosk counts (disputed or expired)
    REOPEN = "reopen"  # the players enter the score again at the kiosk, in a new window
    CANCEL = "cancel"  # the match does not count; an applied one is taken out (LG-161)


def staff_matches(
    request: HttpRequest, location_id: uuid.UUID, status: str | None = None
) -> QuerySet[LeagueMatch]:
    authorize(request, Action.LEAGUE_MANAGE, location_id)
    rows = LeagueMatch.objects.filter(location_id=location_id)
    if status:
        rows = rows.filter(status=status)
    return rows.prefetch_related("players__user", "transitions").select_related("booking__resource")


def resolve(request: HttpRequest, match_id: uuid.UUID, action: str, reason: str) -> LeagueMatch:
    """Only with a written reason, audited. Applying still needs the booking paid (LG-096)."""
    found = LeagueMatch.objects.filter(pk=match_id).first()
    if found is None:
        raise DomainError(ErrorCode.LEAGUE_MATCH_NOT_FOUND, status=404)
    authorize(request, Action.LEAGUE_MANAGE, found.location_id)
    reason = reason.strip()
    if not reason:
        raise DomainError(ErrorCode.LEAGUE_REASON_REQUIRED)
    actor = audit.actor_from_request(request)
    with transaction.atomic():
        match = (
            LeagueMatch.objects.select_for_update(of=("self",))
            .select_related("booking")
            .get(pk=found.pk)
        )
        before = {"status": match.status, "score": match.score}
        settled = (MatchStatus.DISPUTED, MatchStatus.EXPIRED)
        if action == Resolution.APPLY and match.status in settled:
            _log(match, "resolved", actor, checks={"action": action}, reason=reason)
            _confirmed_by_all(match, actor, None)
        elif action == Resolution.REOPEN and match.status in settled:
            minutes = int(get_config("league.score_window_minutes"))
            match.status = MatchStatus.CANCELLED
            match.reopened_until = clock.now() + timedelta(minutes=minutes)
            match.note = reason[:500]
            match.save(update_fields=["status", "reopened_until", "note"])
            _log(match, "reopened", actor, reason=reason)
        elif (
            action == Resolution.CANCEL
            and match.status != MatchStatus.CANCELLED
            and (match.event is None or match.season.status == SeasonStatus.ACTIVE)
        ):  # a closed season is final (LG-134)
            if match.event is not None:  # LG-161: recomputed as if it had never been played
                store.record(
                    match.season,
                    EventKind.CANCEL,
                    clock.now(),
                    match.ref,
                    {},
                    actor,
                    reason,
                )
            match.status = MatchStatus.CANCELLED
            match.note = reason[:500]
            match.save(update_fields=["status", "note"])
            _log(match, MatchStatus.CANCELLED, actor, reason=reason)
        else:
            raise DomainError(ErrorCode.LEAGUE_MATCH_STATE_INVALID, status=409)
        audit.record(
            actor,
            "league.match_resolved",
            target=match,
            before=before,
            after={"status": match.status, "score": match.score, "action": action},
            reason=reason,
        )
    return match


def my_matches(request: HttpRequest) -> QuerySet[LeagueMatch]:
    user = current_user(request)
    return (
        LeagueMatch.objects.filter(players__user=user)
        .distinct()
        .prefetch_related("players__user")
        .order_by("-finished_at")
    )
