"""The league's event store (§6.16, ADR-0008).

`record` appends one event and brings the season's state up to date:
- in the usual case (the event is not older than the last one applied) the engine applies it
  to the cached state (incremental);
- otherwise (a match validated late, or a match cancelled) the whole season is replayed from
  its base state, in the order of `at`; the replay is computed in memory first, so an event
  that would break the league (e.g. the daily limit) is refused before anything is written.

Every computation writes immutable `RatingRecord` rows; a replay starts a new computation,
the older rows stay as history. One season is changed by one request at a time (row lock on
the snapshot).
"""

from __future__ import annotations

import dataclasses
import uuid
from collections.abc import Callable
from datetime import date, datetime
from enum import Enum
from functools import partial
from typing import Any, get_type_hints

from django.db import transaction
from jungle_league.config import LeagueConfig
from jungle_league.engine import (
    CompetitorUpdate,
    Ladder,
    LeagueError,
    LeagueState,
    MatchInput,
    RatingEvent,
    apply_daily_decay,
    apply_match,
    award_bonus,
    register_player,
)
from jungle_league.lp import MatchType
from jungle_league.score import MatchScore, ScoreError, SetScore, Side

from jungle.audit import services as audit
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.league import projection
from jungle.league import state as state_json
from jungle.league.models import (
    EventKind,
    LeagueEvent,
    LeagueSeason,
    LeagueSnapshot,
    RatingRecord,
    SeasonStatus,
)

# Called after an event is applied and committed: Wallet cards, badges, notifications.
_applied_listeners: list[Callable[[LeagueSeason, LeagueEvent, dict[str, Any]], None]] = []


def on_applied(listener: Callable[[LeagueSeason, LeagueEvent, dict[str, Any]], None]) -> None:
    if listener not in _applied_listeners:
        _applied_listeners.append(listener)


def make_config(values: dict[str, Any]) -> LeagueConfig:
    """A LeagueConfig from stored JSON: choices such as the third-refusal policy come back as
    the engine's enums (a plain string would never equal them)."""
    hints = get_type_hints(LeagueConfig)
    return LeagueConfig(
        **{
            key: hints[key](value)
            if isinstance(hints.get(key), type) and issubclass(hints[key], Enum)
            else value
            for key, value in values.items()
        }
    )


def config_for(season: LeagueSeason) -> LeagueConfig:
    """The values fixed when the season started (ADR-0022: changes apply from the next one)."""
    return make_config(season.config)


def engine_error(exc: LeagueError | ScoreError) -> DomainError:
    try:
        code = ErrorCode(exc.code)
    except ValueError:  # pragma: no cover - every engine code is listed in core/errors.py
        code = ErrorCode.VALIDATION_INVALID
    return DomainError(code, status=409 if code is ErrorCode.LEAGUE_DAILY_LIMIT else 400)


# ---------------------------------------------------------------- payloads ↔ engine objects
def score_to_json(score: MatchScore) -> dict[str, Any]:
    return {
        "sets": [
            {
                "a": s.a,
                "b": s.b,
                "tiebreak": list(s.tiebreak) if s.tiebreak else None,
                "super_tiebreak": s.super_tiebreak,
            }
            for s in score.sets
        ],
        "unfinished": score.unfinished,
    }


def score_from_json(data: dict[str, Any]) -> MatchScore:
    return MatchScore(
        sets=tuple(
            SetScore(
                int(s["a"]),
                int(s["b"]),
                tuple(s["tiebreak"]) if s.get("tiebreak") else None,
                bool(s.get("super_tiebreak", False)),
            )
            for s in data["sets"]
        ),
        unfinished=bool(data.get("unfinished", False)),
    )


def engine_match_id(event: LeagueEvent) -> str:
    """The engine orders matches by (end time, id). Giving it the event's number as the id keeps
    that order equal to the store's (time, then order of recording): matches ending at the
    same minute on different courts are applied incrementally and replayed identically."""
    return f"{event.pk:015d}"


def match_input(event: LeagueEvent) -> MatchInput:
    payload = event.payload
    challenger = payload.get("challenger")
    return MatchInput(
        match_id=engine_match_id(event),
        team_a=tuple(payload["team_a"]),
        team_b=tuple(payload["team_b"]),
        score=score_from_json(payload["score"]),
        finished_at=event.at,
        match_type=MatchType(payload.get("match_type", MatchType.OFFICIAL)),
        challenger=Side(challenger) if challenger else None,
    )


def update_json(update: CompetitorUpdate) -> dict[str, Any]:
    return {
        "ladder": update.ladder.value,
        "competitor": update.competitor_id,
        "before": state_json.competitor_to_json(update.before),
        "after": state_json.competitor_to_json(update.after),
        "lp_delta": update.lp_delta,
        "change": update.change.value,
    }


def event_json(ref: str, event: RatingEvent) -> dict[str, Any]:
    return {
        "match": ref,
        "counted": event.counted,
        "winner": event.winner.value if event.winner else None,
        "completion_weight": event.completion_weight,
        "repetition_multiplier": event.repetition_multiplier,
        "config_version": event.config_version,
        "updates": [update_json(u) for u in event.updates],
    }


# ---------------------------------------------------------------- folding events
def apply_one(
    state: LeagueState, event: LeagueEvent, config: LeagueConfig
) -> tuple[LeagueState, dict[str, Any]]:
    """One event on the engine state; returns the new state and what to record."""
    p = event.payload
    if event.kind == EventKind.REGISTER:
        sigma = p.get("sigma")
        state = register_player(
            state, p["player"], float(p["level"]), config, float(sigma) if sigma else None
        )
        return state, {"registered": p["player"], "level": p["level"]}
    if event.kind == EventKind.MATCH:
        state, rating_event = apply_match(state, match_input(event), config)
        if rating_event is None:  # pragma: no cover - record() skips a match already recorded
            raise AssertionError("unreachable")
        return state, event_json(event.ref, rating_event)
    if event.kind == EventKind.BONUS:
        state, update = award_bonus(
            state, Ladder(p["ladder"]), p["competitor"], int(p["lp"]), event.at, config
        )
        return state, {"bonus": update_json(update)}
    if event.kind == EventKind.DECAY:
        state, updates = apply_daily_decay(state, date.fromisoformat(p["day"]), config)
        return state, {"decay": [update_json(u) for u in updates]}
    return state, {"cancelled": event.ref}  # CANCEL: the match is left out of the replay


def _replay(
    season: LeagueSeason, events: list[LeagueEvent], config: LeagueConfig
) -> tuple[LeagueState, list[tuple[LeagueEvent, dict[str, Any]]]]:
    cancelled = {e.ref for e in events if e.kind == EventKind.CANCEL}
    state = state_json.from_json(season.base_state or state_json.to_json(state_json.empty()))
    results = []
    for event in sorted(events, key=lambda e: (e.at, e.pk)):
        if event.kind == EventKind.MATCH and event.ref in cancelled:
            continue
        state, record = apply_one(state, event, config)
        results.append((event, record))
    return state, results


# ---------------------------------------------------------------- writing
def snapshot_for_update(season: LeagueSeason) -> LeagueSnapshot:
    snapshot = LeagueSnapshot.objects.select_for_update().filter(season=season).first()
    if snapshot is None:
        raise DomainError(ErrorCode.LEAGUE_NO_ACTIVE_SEASON, status=409)
    return snapshot


def record(
    season: LeagueSeason,
    kind: str,
    at: datetime,
    ref: str,
    payload: dict[str, Any],
    actor: audit.Actor,
    reason: str = "",
) -> LeagueEvent:
    """Appends an event and updates the state, the rating records and the standings.

    A match (or its cancellation) is recorded once: recording it again returns the first
    event and changes nothing (a retried request is harmless)."""
    config = config_for(season)
    with transaction.atomic():
        snapshot = snapshot_for_update(season)
        status = LeagueSeason.objects.values_list("status", flat=True).get(pk=season.pk)
        if status != SeasonStatus.ACTIVE:  # a closed season is final (LG-134)
            raise DomainError(ErrorCode.LEAGUE_NO_ACTIVE_SEASON, status=409)
        if kind in (EventKind.MATCH, EventKind.CANCEL):
            earlier = season.events.filter(kind=kind, ref=ref).first()
            if earlier is not None:
                return earlier
        if (
            kind == EventKind.CANCEL
            and not season.events.filter(kind=EventKind.MATCH, ref=ref).exists()
        ):
            raise DomainError(ErrorCode.LEAGUE_MATCH_NOT_FOUND, status=404)
        event = LeagueEvent.objects.create(
            season=season,
            kind=kind,
            at=at,
            ref=ref,
            payload=payload,
            actor=audit_actor(actor),
            reason=reason[:500],
            created_at=clock.now(),
        )
        # Incremental when the event comes after everything applied so far (a later number
        # breaks ties); a cancellation or a match validated late replays the season.
        incremental = kind != EventKind.CANCEL and (
            snapshot.last_at is None or at >= snapshot.last_at
        )
        try:
            if incremental:
                new_state, result = apply_one(state_json.from_json(snapshot.state), event, config)
            else:
                new_state, results = _replay(season, list(season.events.all()), config)
        except (LeagueError, ScoreError) as exc:
            raise engine_error(exc) from exc  # the transaction is rolled back: nothing is kept
        if incremental:
            RatingRecord.objects.create(
                season=season,
                computation=snapshot.computation,
                event=event,
                payload=result,
                created_at=clock.now(),
            )
        else:
            snapshot.computation += 1
            RatingRecord.objects.bulk_create(
                RatingRecord(
                    season=season,
                    computation=snapshot.computation,
                    event=e,
                    payload=r,
                    created_at=clock.now(),
                )
                for e, r in results
            )
        snapshot.state = state_json.to_json(new_state)
        snapshot.last_event_id = event.pk
        if kind != EventKind.CANCEL:  # a cancellation changes no state and orders nothing
            snapshot.last_at = max(snapshot.last_at or at, at)
        snapshot.updated_at = clock.now()
        snapshot.save()
        projection.rebuild(season, new_state, config)
        outcome = result if incremental else {"replayed": True, "computation": snapshot.computation}
        for listener in _applied_listeners:
            transaction.on_commit(partial(listener, season, event, outcome))
    return event


def rebuild(season: LeagueSeason) -> LeagueState:
    """Recomputes the season from its base state (an admin check; also used by the tests to
    prove that the cached state equals a computation from zero)."""
    config = config_for(season)
    with transaction.atomic():
        snapshot = snapshot_for_update(season)
        new_state, _ = _replay(season, list(season.events.all()), config)
        snapshot.state = state_json.to_json(new_state)
        snapshot.updated_at = clock.now()
        snapshot.save()
        projection.rebuild(season, new_state, config)
    return new_state


def current_state(season: LeagueSeason) -> LeagueState:
    snapshot = LeagueSnapshot.objects.filter(season=season).first()
    if snapshot is None:
        raise DomainError(ErrorCode.LEAGUE_NO_ACTIVE_SEASON, status=409)
    return state_json.from_json(snapshot.state)


def audit_actor(actor: audit.Actor) -> dict[str, Any]:
    return {
        k: str(v) if isinstance(v, uuid.UUID) else v for k, v in dataclasses.asdict(actor).items()
    }
