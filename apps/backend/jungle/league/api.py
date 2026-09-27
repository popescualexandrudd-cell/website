"""League endpoints. From the website and phones the league is **read-only** (invariant 2):
standings show only first and last name, level (rank and numeric level), LP and place
(R-012). Scores are entered and confirmed only at the League Kiosk (Stage 7, invariant 1).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from django.db.models import F, Q
from django.http import HttpRequest
from ninja import Field, Router, Schema, Status

from jungle.accounts.services.authz import current_user
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.schemas import errors
from jungle.core.security import session_auth
from jungle.league import services
from jungle.league.models import (
    Ladder,
    LeagueSeason,
    LevelQuestionnaire,
    RatingRecord,
    SeasonStatus,
    Standing,
)
from jungle.league.projection import round_level
from jungle.locations.services import get_location_by_slug
from jungle.privacy import league_consent

public_router = Router(tags=["league"])
me_router = Router(tags=["league"], auth=session_auth)
staff_router = Router(tags=["staff: league"], auth=session_auth)


class SeasonOut(Schema):
    id: uuid.UUID
    number: int
    name: str
    starts_at: datetime
    ends_at: datetime
    status: str
    is_calibration: bool


class PlayerOut(Schema):
    first_name: str
    last_name: str


class StandingOut(Schema):
    """R-012: nothing else is public."""

    position: int
    players: list[PlayerOut]
    tier: str
    division: str
    level: float
    lp: int
    eligible: bool = Field(description="False: sub minimul de meciuri (§6.10)")


class MyLadderOut(Schema):
    ladder: str
    level: float
    tier: str
    division: str
    lp: int
    position: int | None
    placement_left: int
    matches_played: int
    eligible: bool


class RatingChangeOut(Schema):
    at: datetime
    kind: str
    lp_delta: int
    ladder: str


class MeOut(Schema):
    in_league: bool
    adult: bool
    consent_signed: bool
    questionnaire: str = Field(description="none, pending sau validated")
    ladders: list[MyLadderOut]
    recent: list[RatingChangeOut]


class QuestionnaireIn(Schema):
    band: str = Field(pattern=r"^(1\.0|1\.5|2\.0|2\.5|3\.0|3\.5|4\.0|4\.5|5\.0|5\.5|6\.0)$")
    years_playing: int = Field(ge=0, le=80)
    racket_background: str = Field(pattern=r"^(none|recreational|competitive)$")
    tournaments: str = Field(pattern=r"^(none|club|regional_national)$")


class QuestionnaireOut(Schema):
    id: uuid.UUID
    answers: dict[str, object]
    estimated_level: Decimal
    submitted_at: datetime
    validated_level: Decimal | None
    validated_at: datetime | None


class StaffQuestionnaireOut(QuestionnaireOut):
    user_id: uuid.UUID
    name: str


class ValidateIn(Schema):
    location_id: uuid.UUID
    level: Decimal = Field(ge=1, le=7, decimal_places=2)
    sigma: Decimal | None = Field(default=None, ge=Decimal("0.5"), le=15, decimal_places=3)
    note: str = Field(default="", max_length=500)


class SeasonIn(Schema):
    location_id: uuid.UUID
    number: int = Field(ge=0, le=1000)
    name: str = Field(min_length=1, max_length=120)
    starts_at: datetime
    ends_at: datetime
    is_calibration: bool = False


def _season(location: str, season_number: int | None) -> LeagueSeason:
    place = get_location_by_slug(location)
    seasons = LeagueSeason.objects.filter(location=place).exclude(status=SeasonStatus.PLANNED)
    season = (
        seasons.filter(number=season_number).first()
        if season_number is not None
        else seasons.filter(status=SeasonStatus.ACTIVE).first()
    )
    if season is None:
        raise DomainError(ErrorCode.LEAGUE_NO_ACTIVE_SEASON, status=404)
    return season


def standing_out(row: Standing) -> StandingOut:
    players = [PlayerOut(first_name=row.player_a.first_name, last_name=row.player_a.last_name)]
    if row.player_b is not None:
        players.append(
            PlayerOut(first_name=row.player_b.first_name, last_name=row.player_b.last_name)
        )
    return StandingOut(
        position=row.position or 0,
        players=players,
        tier=row.tier,
        division=row.division,
        level=round_level(row.level),
        lp=row.lp,
        eligible=row.eligible,
    )


# ---------------------------------------------------------------- public (read-only)
@public_router.get("/seasons", response={200: list[SeasonOut], **errors(404)}, auth=None)
def seasons(request: HttpRequest, location: str) -> list[SeasonOut]:
    place = get_location_by_slug(location)
    rows = LeagueSeason.objects.filter(location=place).exclude(status=SeasonStatus.PLANNED)
    return [SeasonOut.from_orm(s) for s in rows]


@public_router.get("/standings", response={200: list[StandingOut], **errors(404, 422)}, auth=None)
def standings(
    request: HttpRequest, location: str, ladder: Ladder = Ladder.DOUBLES, season: int | None = None
) -> list[StandingOut]:
    """LG-057 order; players in placement are not ranked yet."""
    rows = (
        Standing.objects.filter(
            season=_season(location, season), ladder=ladder, position__isnull=False
        )
        .select_related("player_a", "player_b")
        .order_by("position")
    )
    return [standing_out(r) for r in rows]


@public_router.get("/kings", response={200: list[StandingOut], **errors(404)}, auth=None)
def kings(request: HttpRequest, location: str) -> list[StandingOut]:
    """LG-051: the Kings of the Jungle — the 10 best eligible Masters (computed, not stored)."""
    rows = (
        Standing.objects.filter(
            season=_season(location, None),
            ladder=Ladder.DOUBLES,
            position__isnull=False,
            tier="master",
            eligible=True,
        )
        .select_related("player_a", "player_b")
        .order_by("position")[:10]
    )
    return [standing_out(r) for r in rows]


# ---------------------------------------------------------------- the player's own view
def my_changes(player_id: str, limit: int = 20) -> list[RatingChangeOut]:
    """The player's latest LP changes in the active seasons (current computation only)."""
    mine = (
        Q(payload__contains={"updates": [{"competitor": player_id}]})
        | Q(payload__contains={"decay": [{"competitor": player_id}]})
        | Q(payload__contains={"bonus": {"competitor": player_id}})
    )
    records = (
        RatingRecord.objects.filter(
            mine,
            season__status=SeasonStatus.ACTIVE,
            computation=F("season__snapshot__computation"),
        )
        .select_related("event")
        .order_by("-event__at", "-id")[:limit]
    )
    changes: list[RatingChangeOut] = []
    for record in records:
        payload = record.payload
        updates = [*payload.get("updates", []), *payload.get("decay", [])]
        if "bonus" in payload:
            updates.append(payload["bonus"])
        changes.extend(
            RatingChangeOut(
                at=record.event.at,
                kind=record.event.kind,
                lp_delta=u["lp_delta"],
                ladder=u["ladder"],
            )
            for u in updates
            if u["competitor"] == player_id
        )
    return changes


@me_router.get("/me", response={200: MeOut, **errors(401)})
def me(request: HttpRequest) -> MeOut:
    """Private statistics: only the player sees them (R-012)."""
    user = current_user(request)
    rows = Standing.objects.filter(season__status=SeasonStatus.ACTIVE, competitor_id=str(user.pk))
    latest = LevelQuestionnaire.objects.filter(user=user).order_by("-submitted_at").first()
    questionnaire = (
        "none" if latest is None else ("validated" if latest.validated_at else "pending")
    )
    recent = my_changes(str(user.pk))
    return MeOut(
        in_league=services.is_playing(user),
        adult=league_consent.is_adult(user),
        consent_signed=league_consent.status(user, user.preferred_language).signed,
        questionnaire=questionnaire,
        ladders=[
            MyLadderOut(
                ladder=r.ladder,
                level=round_level(r.level),
                tier=r.tier,
                division=r.division,
                lp=r.lp,
                position=r.position,
                placement_left=r.placement_left,
                matches_played=r.matches_played,
                eligible=r.eligible,
            )
            for r in rows
        ],
        recent=recent,
    )


@me_router.post("/questionnaire", response={201: QuestionnaireOut, **errors(400, 401, 422)})
def questionnaire(request: HttpRequest, payload: QuestionnaireIn) -> Status[QuestionnaireOut]:
    """R-003: the level questionnaire; a coach validates it before the first league match."""
    return Status(
        201, QuestionnaireOut.from_orm(services.submit_questionnaire(request, payload.dict()))
    )


# ---------------------------------------------------------------- staff
@staff_router.get(
    "/league/questionnaires", response={200: list[StaffQuestionnaireOut], **errors(401, 403, 422)}
)
def pending(request: HttpRequest, location_id: uuid.UUID) -> list[StaffQuestionnaireOut]:
    return [
        StaffQuestionnaireOut(
            id=q.id,
            answers=q.answers,
            estimated_level=q.estimated_level,
            submitted_at=q.submitted_at,
            validated_level=q.validated_level,
            validated_at=q.validated_at,
            user_id=q.user_id,
            name=f"{q.user.first_name} {q.user.last_name}",
        )
        for q in services.pending_questionnaires(request, location_id)
    ]


@staff_router.post(
    "/league/questionnaires/{questionnaire_id}/validate",
    response={200: QuestionnaireOut, **errors(400, 401, 403, 404, 422)},
)
def validate(
    request: HttpRequest, questionnaire_id: uuid.UUID, payload: ValidateIn
) -> QuestionnaireOut:
    q = services.validate_questionnaire(
        request, questionnaire_id, payload.location_id, payload.level, payload.sigma, payload.note
    )
    return QuestionnaireOut.from_orm(q)


@staff_router.post("/league/seasons", response={201: SeasonOut, **errors(400, 401, 403, 404, 422)})
def create_season(request: HttpRequest, payload: SeasonIn) -> Status[SeasonOut]:
    season = services.create_season(request, services.SeasonData(**payload.dict()))
    return Status(201, SeasonOut.from_orm(season))


@staff_router.post(
    "/league/seasons/{season_id}/activate", response={200: SeasonOut, **errors(401, 403, 404, 409)}
)
def activate(request: HttpRequest, season_id: uuid.UUID) -> SeasonOut:
    return SeasonOut.from_orm(services.activate_season(request, season_id))


@staff_router.post(
    "/league/seasons/{season_id}/rebuild", response={200: SeasonOut, **errors(401, 403, 404)}
)
def rebuild(request: HttpRequest, season_id: uuid.UUID) -> SeasonOut:
    return SeasonOut.from_orm(services.rebuild_season(request, season_id))
