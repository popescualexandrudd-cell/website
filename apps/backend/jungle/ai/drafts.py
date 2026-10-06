"""Drafts written by the AI for the staff (ADR-0019, Stage 12E): a message for the community group
(Q19: generated here, posted by hand), a blog article, a translation.

The facts come from the club's own data, gathered here in code (public data only: the calendar,
the league's public standings, the club's details); the AI only writes. Every draft is saved as
"de revizuit" and stays so until a person approves it (corrected, if needed) or discards it;
nothing is published or sent by itself. The model gets no tool, and each draft is one
`AIInteraction` in the log and the monthly limit, like a question.
"""

from __future__ import annotations

import json
import uuid
from datetime import timedelta
from typing import Any

from django.db import transaction
from django.db.models import QuerySet
from django.http import HttpRequest

from jungle.accounts.services.authz import authorize
from jungle.ai import services
from jungle.ai.models import AIDraft, Context, DraftKind, DraftStatus, Outcome
from jungle.ai.registry import Call
from jungle.ai.tools import club_info
from jungle.audit import services as audit
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.events import services as events
from jungle.league import projection
from jungle.league.models import EventKind, Ladder, LeagueSeason, SeasonStatus, Standing
from jungle.locations.models import Location

LANGUAGE_NAMES = {"ro": "Romanian", "en": "English"}
FACT_DAYS = 30  # the calendar the drafts may mention
TOP = 5

SYSTEM = """You write drafts for the staff of Jungle Padel, a club in Bucharest with padel courts, \
Pilates Reformer and an event room. A person reviews every draft before anything is used.
Use only the facts given in the request and the staff's own text; never invent prices, dates, \
times, people, results, quotes or reviews. Items marked "demo": true are examples, not real: leave \
them out. Where a needed fact is missing, write [de completat] instead of guessing.
Write in the language asked for. Plain text; for an article, Markdown headings, lists and links \
only (no images, no HTML). Output only the draft, without comments about it.\
"""

KIND_NOTES = {
    DraftKind.COMMUNITY: "Write a short, friendly message for the club's community group "
    "(posted by hand by the staff): at most 120 words, about what the staff asks, from the facts.",
    DraftKind.ARTICLE: "Write a blog article for the club's website on the staff's topic: a title "
    "(as a level-1 heading), 300 to 600 words, from the facts and the staff's notes.",
    DraftKind.TRANSLATION: "Translate the staff's text faithfully. Keep names, numbers, dates, "
    "links and Markdown as they are; add nothing.",
}


def _season_facts(location: Location) -> dict[str, Any] | None:
    season = LeagueSeason.objects.filter(location=location, status=SeasonStatus.ACTIVE).first()
    if season is None:
        return None
    week_ago = clock.now() - timedelta(days=7)
    visible = projection.visible_players()
    top = (
        Standing.objects.filter(
            season=season,
            ladder=Ladder.DOUBLES,
            position__isnull=False,
            competitor_id__in=visible,
        )
        .select_related("player_a")
        .order_by("position")[:TOP]
    )
    return {
        "season": season.name,
        "season_ends": clock.local(season.ends_at).date().isoformat(),
        "league_matches_last_7_days": season.events.filter(
            kind=EventKind.MATCH, at__gte=week_ago
        ).count(),
        "top_doubles": [
            {
                "place": row.position,
                "name": row.player_a.full_name,
                "rank": f"{row.tier} {row.division}".strip(),
                "lp": row.lp,
            }
            for row in top
        ],
    }


def club_facts(call: Call) -> dict[str, Any]:
    """Public facts only (what the website already shows)."""
    horizon = clock.now() + timedelta(days=FACT_DAYS)
    calendar = [
        {
            "title": item.title_ro,
            "title_en": item.title_en,
            "text": item.text_ro,
            "starts": clock.local(item.starts_at).strftime("%Y-%m-%d %H:%M"),
            "cancelled": item.cancelled,
            "demo": item.demo,
        }
        for item in events.calendar(call.location).items
        if item.starts_at < horizon
    ]
    return {
        "today": clock.today_local().isoformat(),
        "club": club_info(call, {}),
        "calendar_next_30_days": calendar,
        "league": _season_facts(call.location),
    }


def _message(call: Call, kind: DraftKind, language: str, text: str) -> str:
    parts = [KIND_NOTES[kind], f"Write in {LANGUAGE_NAMES[language]}."]
    if kind != DraftKind.TRANSLATION:
        facts = json.dumps(club_facts(call), ensure_ascii=False, default=str)
        parts.append(f"Facts (JSON):\n{facts}")
    parts.append(f"The staff's text:\n{text}")
    return "\n\n".join(parts)


def create(
    request: HttpRequest, location_id: uuid.UUID, kind: DraftKind, language: str, text: str
) -> AIDraft:
    user = authorize(request, Action.AI_DRAFTS, location_id)
    location = Location.objects.get(pk=location_id)
    if language not in LANGUAGE_NAMES or not text.strip():
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "language/text"})
    call = Call(Context.STAFF, location, user, request)
    answer = services.ask(
        call,
        [{"role": "user", "content": _message(call, kind, language, text.strip())}],
        system=SYSTEM,
        use_tools=False,
    )
    if answer.outcome != Outcome.ANSWERED or not answer.text:
        raise DomainError(ErrorCode.AI_NO_DRAFT, status=409, params={"outcome": answer.outcome})
    with transaction.atomic():
        draft = AIDraft.objects.create(
            location=location,
            kind=kind,
            language=language,
            request=text.strip(),
            body=answer.text,
            interaction_id=answer.interaction_id,
            requested_by=user,
            created_at=clock.now(),
        )
        audit.record(
            audit.actor_from_request(request),
            "ai.draft_written",
            target=draft,
            after={"kind": kind},
        )
    return draft


def drafts(request: HttpRequest, location_id: uuid.UUID, limit: int = 50) -> QuerySet[AIDraft]:
    authorize(request, Action.AI_DRAFTS, location_id)
    return AIDraft.objects.filter(location_id=location_id).select_related("requested_by")[:limit]


def review(
    request: HttpRequest, draft_id: uuid.UUID, status: DraftStatus, body: str | None = None
) -> AIDraft:
    """Approve (with the person's corrections, if any) or discard; once only."""
    with transaction.atomic():
        draft = AIDraft.objects.select_for_update().filter(pk=draft_id).first()
        if draft is None:
            raise DomainError(ErrorCode.AI_DRAFT_NOT_FOUND, status=404)
        user = authorize(request, Action.AI_DRAFTS, draft.location_id)
        if draft.status != DraftStatus.TO_REVIEW or status == DraftStatus.TO_REVIEW:
            raise DomainError(ErrorCode.AI_DRAFT_REVIEWED, status=409)
        if body is not None and not body.strip():
            raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "body"})
        edited = status == DraftStatus.APPROVED and body is not None and body.strip() != draft.body
        if edited:
            draft.body = str(body).strip()
        draft.status = status
        draft.reviewed_by = user
        draft.reviewed_at = clock.now()
        draft.save()
        audit.record(
            audit.actor_from_request(request),
            "ai.draft_reviewed",
            target=draft,
            after={"status": status, "edited": edited},
        )
    return draft
