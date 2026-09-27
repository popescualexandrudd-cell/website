"""Direct challenges (§6.11, LG-110 … LG-113).

A player (singles) or a pair (doubles) challenges an opponent in the same division or at most
one division above. The challenged side has 72 hours to answer; up to 2 refusals per season,
a further one is only shown in the player's account unless the admin chose "technical loss"
(Q-owner, reported to the admin). An accepted challenge is played within 7 days, on a
normally booked and paid "challenge" booking, through the usual flow (§6.9); a challenger who
wins gets +5 LP (engine).

Challenges are issued and answered at the League Kiosk (the website and phones only show
them, invariant 2). An unanswered challenge counts as refused (DE_CONFIRMAT).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from functools import partial

from django.db import transaction
from django.db.models import Q, QuerySet
from django.http import HttpRequest
from jungle_league.challenges import (
    RefusalOutcome,
    can_challenge,
    refusal_outcome,
    response_deadline,
    schedule_deadline,
)
from jungle_league.engine import Ladder as EngineLadder
from jungle_league.engine import LeagueState, pair_id
from jungle_league.ranks import RankState

from jungle.accounts.models import User
from jungle.accounts.services.authz import current_user
from jungle.attendance.models import StaffNotice
from jungle.audit import services as audit
from jungle.cards import services as cards
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Role
from jungle.devices.models import Device
from jungle.league import kiosk, notify, services, store
from jungle.league.models import Challenge, ChallengeStatus, Ladder, LeagueSeason

OPEN = (ChallengeStatus.PENDING, ChallengeStatus.ACCEPTED)
NOTICE_TECHNICAL_LOSS = "league.challenge_third_refusal"


def _competitor(people: list[User]) -> tuple[Ladder, str]:
    if len(people) == 1:
        return Ladder.SINGLES, str(people[0].pk)
    return Ladder.PAIRS, pair_id(str(people[0].pk), str(people[1].pk))


def _rank(state: LeagueState, ladder: Ladder, competitor_id: str) -> RankState:
    competitor = state.competitors[EngineLadder(ladder)].get(competitor_id)
    if competitor is None or competitor.rank is None:
        raise DomainError(ErrorCode.LEAGUE_CHALLENGE_NOT_RANKED)
    return competitor.rank


def _names(ids: list[uuid.UUID]) -> str:
    people = User.objects.filter(pk__in=ids).order_by("last_name", "first_name")
    return " și ".join(f"{p.first_name} {p.last_name}" for p in people)


def _email_targets(challenge: Challenge) -> None:
    challengers = _names(challenge.challengers)
    for person in User.objects.filter(pk__in=challenge.targets):
        notify.send(
            "league_challenge",
            person,
            {
                "challengers": challengers,
                "respond_by": challenge.respond_by.astimezone(clock.BUSINESS_TZ),
            },
            notify.ACCOUNT_LEAGUE_PATH,
        )


def between(challengers: set[uuid.UUID], targets: set[uuid.UUID]) -> Q:
    """The challenges between these two sides, whoever challenged whom."""

    def side(prefix: str, people: set[uuid.UUID]) -> Q:
        ids = sorted(people)
        return Q(**{f"{prefix}_a__in": ids}) & (
            Q(**{f"{prefix}_b__in": ids}) if len(ids) == 2 else Q(**{f"{prefix}_b__isnull": True})
        )

    return (side("challenger", challengers) & side("target", targets)) | (
        side("challenger", targets) & side("target", challengers)
    )


@dataclass(frozen=True)
class ChallengeData:
    card_tokens: tuple[str, ...]  # the challengers scan their cards at the kiosk
    targets: tuple[uuid.UUID, ...]  # picked from the standings shown at the kiosk


def issue(request: HttpRequest, device: Device | None, data: ChallengeData) -> Challenge:
    kiosk_device = kiosk.check(request, device, None, "league.challenge")
    challengers = [cards.resolve(token).user for token in data.card_tokens]
    targets = list(User.objects.filter(pk__in=data.targets, is_active=True))
    if len(targets) != len(set(data.targets)):
        raise DomainError(ErrorCode.LEAGUE_UNKNOWN_PLAYER, status=404)
    if len(challengers) not in (1, 2) or len(targets) != len(challengers):
        raise DomainError(ErrorCode.LEAGUE_TEAM_SIZE)
    people = challengers + targets
    if len({p.pk for p in people}) != len(people):
        raise DomainError(ErrorCode.LEAGUE_DUPLICATE_PLAYER)
    for person in people:
        if not services.is_playing(person):
            raise DomainError(
                ErrorCode.LEAGUE_PLAYER_NOT_IN_LEAGUE,
                status=403,
                params={"name": f"{person.first_name} {person.last_name}"},
            )
    season = services.active_season(kiosk_device.location)
    config = store.config_for(season)
    state = store.current_state(season)
    ladder, challenger_id = _competitor(challengers)
    _, target_id = _competitor(targets)
    mine, theirs = _rank(state, ladder, challenger_id), _rank(state, ladder, target_id)
    if not can_challenge(mine.index, theirs.index, config):
        raise DomainError(ErrorCode.LEAGUE_CHALLENGE_NOT_ALLOWED)
    now = clock.now()
    with transaction.atomic():
        open_ones = Challenge.objects.select_for_update().filter(season=season, status__in=OPEN)
        if open_ones.filter(between({p.pk for p in challengers}, {p.pk for p in targets})).exists():
            raise DomainError(ErrorCode.LEAGUE_CHALLENGE_EXISTS, status=409)
        challenge = Challenge.objects.create(
            season=season,
            location=kiosk_device.location,
            ladder=ladder,
            challenger_a=challengers[0],
            challenger_b=challengers[1] if len(challengers) == 2 else None,
            target_a=targets[0],
            target_b=targets[1] if len(targets) == 2 else None,
            challenger_rank=mine.index,
            target_rank=theirs.index,
            created_at=now,
            respond_by=response_deadline(now, config),
        )
        audit.record(
            audit.actor_from_request(request),
            "league.challenge_issued",
            target=challenge,
            after={"device": str(kiosk_device.pk), "ladder": ladder},
        )
        transaction.on_commit(partial(_email_targets, challenge))
    return challenge


def _refusal(challenge: Challenge) -> RefusalOutcome:
    """LG-111: the refusals this season of the people challenged (the most refused of them)."""
    config = store.config_for(challenge.season)
    before = max(
        Challenge.objects.filter(season=challenge.season)
        .filter(Q(target_a_id=person) | Q(target_b_id=person))
        .exclude(pk=challenge.pk)
        .exclude(refusal_outcome="")
        .count()
        for person in challenge.targets
    )
    return refusal_outcome(before, config)


def _record_refusal(challenge: Challenge, status: ChallengeStatus, actor: audit.Actor) -> None:
    outcome = _refusal(challenge)
    challenge.status = status
    challenge.refusal_outcome = outcome.value
    challenge.save()
    audit.record(actor, f"league.challenge_{status}", target=challenge, after={"outcome": outcome})
    if outcome is RefusalOutcome.TECHNICAL_LOSS:  # the admin decides what happens (Q-owner)
        StaffNotice.objects.create(
            location_id=challenge.location_id,
            recipient_role=Role.MANAGER,
            kind=NOTICE_TECHNICAL_LOSS,
            payload={"challenge_id": str(challenge.pk), "refused_by": _names(challenge.targets)},
            created_at=clock.now(),
        )


def answer(
    request: HttpRequest,
    device: Device | None,
    challenge_id: uuid.UUID,
    card_token: str,
    accept: bool,
) -> Challenge:
    """LG-111: one of the challenged players answers for their side, within 72 hours."""
    found = Challenge.objects.filter(pk=challenge_id).first()
    kiosk_device = kiosk.check(
        request, device, found.location_id if found else None, "league.challenge_answer"
    )
    if found is None:
        raise DomainError(ErrorCode.LEAGUE_CHALLENGE_NOT_FOUND, status=404)
    person = cards.resolve(card_token).user
    actor = audit.actor_from_request(request)
    with transaction.atomic():
        challenge = Challenge.objects.select_for_update().get(pk=found.pk)
        if challenge.status != ChallengeStatus.PENDING or clock.now() >= challenge.respond_by:
            raise DomainError(ErrorCode.LEAGUE_CHALLENGE_NOT_FOUND, status=409)
        if person.pk not in challenge.targets:
            raise DomainError(ErrorCode.LEAGUE_CHALLENGE_NOT_TARGET, status=403)
        challenge.responded_at = clock.now()
        challenge.responded_by = person
        if accept:
            challenge.status = ChallengeStatus.ACCEPTED
            challenge.play_by = schedule_deadline(
                challenge.responded_at, store.config_for(challenge.season)
            )
            challenge.save()
            audit.record(
                actor,
                "league.challenge_accepted",
                target=challenge,
                after={"device": str(kiosk_device.pk)},
            )
        else:
            _record_refusal(challenge, ChallengeStatus.REFUSED, actor)
    return challenge


def for_match(
    season: LeagueSeason, team_a: list[User], team_b: list[User], starts_at: datetime
) -> tuple[Challenge, str]:
    """The accepted challenge a "challenge" booking plays, and the challenger's side."""
    side_a, side_b = {p.pk for p in team_a}, {p.pk for p in team_b}
    challenge = (
        Challenge.objects.filter(
            season=season, status=ChallengeStatus.ACCEPTED, play_by__gte=starts_at
        )
        .filter(between(side_a, side_b))
        .order_by("responded_at")
        .first()
    )
    if challenge is None:
        raise DomainError(ErrorCode.LEAGUE_CHALLENGE_REQUIRED)
    return challenge, "a" if set(challenge.challengers) == side_a else "b"


def played(challenge_id: uuid.UUID | None) -> None:
    if challenge_id is not None:
        Challenge.objects.filter(pk=challenge_id, status=ChallengeStatus.ACCEPTED).update(
            status=ChallengeStatus.PLAYED
        )


@dataclass(frozen=True)
class ChallengeExpiry:
    unanswered: int
    unplayed: int


def expire_challenges() -> ChallengeExpiry:
    """Unanswered in 72 hours: counts as refused (DE_CONFIRMAT). Accepted but not played in
    7 days: expires, nobody is penalised."""
    now = clock.now()
    with transaction.atomic():
        due = list(
            Challenge.objects.select_for_update(skip_locked=True)
            .filter(status=ChallengeStatus.PENDING, respond_by__lte=now)
            .order_by("respond_by")
        )
        for challenge in due:
            _record_refusal(challenge, ChallengeStatus.EXPIRED, audit.SYSTEM)
    unplayed = Challenge.objects.filter(status=ChallengeStatus.ACCEPTED, play_by__lt=now).update(
        status=ChallengeStatus.EXPIRED
    )
    return ChallengeExpiry(len(due), unplayed)


def my_challenges(request: HttpRequest) -> QuerySet[Challenge]:
    user = current_user(request)
    return Challenge.objects.filter(
        Q(challenger_a=user) | Q(challenger_b=user) | Q(target_a=user) | Q(target_b=user)
    ).select_related("challenger_a", "challenger_b", "target_a", "target_b")
