"""Entering and leaving the league (§6.4, R-003, R-006, R-010) and the seasons (§6.13).

To play in the league a person needs: to be an adult, a level questionnaire validated by a
coach, and the league consent signed at the League Kiosk. When all three are true, the
person joins and is registered in the active season (from the validated level). Withdrawing
the consent (or deleting the account) takes them out: they are no longer shown and cannot
play; their past matches stay in the others' history.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Any

from django.db import transaction
from django.db.models import QuerySet
from django.http import HttpRequest
from jungle_league.engine import register_player, start_new_season

from jungle.accounts.models import User
from jungle.accounts.services.authz import authorize, current_user
from jungle.audit import services as audit
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.league import projection, store
from jungle.league import state as state_json
from jungle.league.models import (
    EventKind,
    LeaguePlayer,
    LeagueSeason,
    LeagueSnapshot,
    LevelQuestionnaire,
    PlayerStatus,
    SeasonStatus,
)
from jungle.locations.models import Location
from jungle.privacy import league_consent

# ---------------------------------------------------------------- questionnaire (R-003, Q47)
# Bands of the level descriptions (docs/03-liga/NIVELURI.md): the player picks the one that
# describes their game; the answers about experience move the estimate inside the band.
BANDS = {
    "1.0": (1.0, 1.5), "1.5": (1.5, 2.0), "2.0": (2.0, 2.5), "2.5": (2.5, 3.0),
    "3.0": (3.0, 3.5), "3.5": (3.5, 4.0), "4.0": (4.0, 4.5), "4.5": (4.5, 5.0),
    "5.0": (5.0, 5.5), "5.5": (5.5, 6.0), "6.0": (6.0, 7.0),
}  # fmt: skip
RACKET = ("none", "recreational", "competitive")
TOURNAMENTS = ("none", "club", "regional_national")


def estimate_level(answers: dict[str, Any]) -> Decimal:
    """Q47 (default, DE_CONFIRMAT): the middle of the chosen band, −0.25 under a year of
    padel, +0.25 for competitive racket sports, +0.25 for regional or national tournaments;
    always inside the chosen band. The coach sees the answers and sets the final level."""
    try:
        low, high = BANDS[str(answers["band"])]
        years = int(answers["years_playing"])
        racket, tournaments = answers["racket_background"], answers["tournaments"]
    except (KeyError, TypeError, ValueError) as exc:
        raise DomainError(ErrorCode.LEAGUE_QUESTIONNAIRE_INVALID) from exc
    if not 0 <= years <= 80 or racket not in RACKET or tournaments not in TOURNAMENTS:
        raise DomainError(ErrorCode.LEAGUE_QUESTIONNAIRE_INVALID)
    level = Decimal(str((low + high) / 2))
    if years < 1:
        level -= Decimal("0.25")
    if racket == "competitive":
        level += Decimal("0.25")
    if tournaments == "regional_national":
        level += Decimal("0.25")
    return min(max(level, Decimal(str(low))), Decimal(str(high)))


def submit_questionnaire(request: HttpRequest, answers: dict[str, Any]) -> LevelQuestionnaire:
    """Online or at the kiosk (R-003). A new questionnaire replaces an unvalidated one."""
    user = current_user(request)
    level = estimate_level(answers)
    clean = {
        "band": str(answers["band"]),
        "years_playing": int(answers["years_playing"]),
        "racket_background": answers["racket_background"],
        "tournaments": answers["tournaments"],
    }
    with transaction.atomic():
        LevelQuestionnaire.objects.filter(user=user, validated_at__isnull=True).delete()
        questionnaire = LevelQuestionnaire.objects.create(
            user=user, answers=clean, estimated_level=level, submitted_at=clock.now()
        )
        audit.record(
            audit.actor_from_request(request),
            "league.questionnaire_submitted",
            target=questionnaire,
        )
    return questionnaire


def pending_questionnaires(
    request: HttpRequest, location_id: uuid.UUID
) -> QuerySet[LevelQuestionnaire]:
    authorize(request, Action.LEAGUE_VALIDATE_LEVELS, location_id)
    return (
        LevelQuestionnaire.objects.filter(validated_at__isnull=True)
        .select_related("user")
        .order_by("submitted_at")
    )


def validate_questionnaire(
    request: HttpRequest,
    questionnaire_id: uuid.UUID,
    location_id: uuid.UUID,
    level: Decimal,
    sigma: Decimal | None = None,
    note: str = "",
) -> LevelQuestionnaire:
    """§6.4: the coach confirms or adjusts L0 (and, optionally, σ) before the first match."""
    coach = authorize(request, Action.LEAGUE_VALIDATE_LEVELS, location_id)
    if not Decimal("1.0") <= level <= Decimal("7.0") or (
        sigma is not None and not Decimal("0.5") <= sigma <= Decimal("15")
    ):
        raise DomainError(ErrorCode.LEAGUE_QUESTIONNAIRE_INVALID)
    with transaction.atomic():
        questionnaire = (
            LevelQuestionnaire.objects.select_for_update()
            .filter(pk=questionnaire_id, validated_at__isnull=True)
            .first()
        )
        if questionnaire is None:
            raise DomainError(ErrorCode.LEAGUE_QUESTIONNAIRE_NOT_FOUND, status=404)
        questionnaire.validated_level = level
        questionnaire.validated_sigma = sigma
        questionnaire.validated_by = coach
        questionnaire.validated_at = clock.now()
        questionnaire.note = note[:500]
        questionnaire.save()
        audit.record(
            audit.actor_from_request(request),
            "league.level_validated",
            target=questionnaire,
            after={"estimated": str(questionnaire.estimated_level), "validated": str(level)},
        )
        try_join(questionnaire.user)
    return questionnaire


def validated_questionnaire(user: User) -> LevelQuestionnaire | None:
    return (
        LevelQuestionnaire.objects.filter(user=user, validated_at__isnull=False)
        .order_by("-validated_at")
        .first()
    )


# ---------------------------------------------------------------- joining and leaving
def eligible(user: User) -> bool:
    """R-006, R-010, §6.4: adult, validated level, league consent signed."""
    return (
        user.is_active
        and user.deleted_at is None
        and league_consent.is_adult(user)
        and league_consent.status(user, "ro").signed
        and validated_questionnaire(user) is not None
    )


def try_join(user: User) -> LeaguePlayer | None:
    """Joins the league when every condition is met (called after each of them)."""
    if not eligible(user):
        return None
    with transaction.atomic():
        player, created = LeaguePlayer.objects.select_for_update().get_or_create(
            user=user, defaults={"joined_at": clock.now()}
        )
        if not created and player.status == PlayerStatus.ACTIVE:
            return player
        player.status = PlayerStatus.ACTIVE
        player.left_at = None
        player.save()
        audit.record(audit.SYSTEM, "league.joined", target=player)
        for season in LeagueSeason.objects.filter(status=SeasonStatus.ACTIVE):
            register_in_season(season, user)
    return player


def register_in_season(season: LeagueSeason, user: User, at: datetime | None = None) -> None:
    """Registers the player in the season from the validated level (once), now or at `at`
    (demo data only: `kiosk_demo` registers its players from the start of the season)."""
    state = store.current_state(season)
    player_id = str(user.pk)
    if any(player_id in table for table in state.competitors.values()):
        refresh_standings(season)  # a returning player: shown again
        return
    questionnaire = validated_questionnaire(user)
    if questionnaire is None:  # pragma: no cover - try_join checked it
        return
    store.record(
        season,
        EventKind.REGISTER,
        at or clock.now(),
        player_id,
        {
            "player": player_id,
            "level": float(questionnaire.validated_level or questionnaire.estimated_level),
            "sigma": float(questionnaire.validated_sigma)
            if questionnaire.validated_sigma
            else None,
        },
        audit.SYSTEM,
    )


def leave(user: User, reason: str) -> None:
    """R-011: after the consent is withdrawn (or the account deleted) the player leaves."""
    with transaction.atomic():
        updated = LeaguePlayer.objects.filter(user=user, status=PlayerStatus.ACTIVE).update(
            status=PlayerStatus.WITHDRAWN, left_at=clock.now()
        )
        if updated:
            audit.record(audit.SYSTEM, "league.left", target=user, reason=reason)
        for season in LeagueSeason.objects.filter(status=SeasonStatus.ACTIVE):
            refresh_standings(season)


def refresh_standings(season: LeagueSeason) -> None:
    projection.rebuild(season, store.current_state(season), store.config_for(season))


def is_playing(user: User) -> bool:
    return LeaguePlayer.objects.filter(user=user, status=PlayerStatus.ACTIVE).exists()


# ---------------------------------------------------------------- seasons (§6.13)
@dataclass(frozen=True)
class SeasonData:
    location_id: uuid.UUID
    number: int
    name: str
    starts_at: datetime
    ends_at: datetime
    is_calibration: bool = False


def create_season(request: HttpRequest, data: SeasonData) -> LeagueSeason:
    authorize(request, Action.LEAGUE_MANAGE, data.location_id)
    location = Location.objects.filter(pk=data.location_id).first()
    if location is None:
        raise DomainError(ErrorCode.LOCATIONS_NOT_FOUND, status=404)
    if (
        data.ends_at <= data.starts_at
        or LeagueSeason.objects.filter(location=location, number=data.number).exists()
    ):
        raise DomainError(ErrorCode.LEAGUE_SEASON_INVALID)
    season = LeagueSeason.objects.create(
        location=location,
        number=data.number,
        name=data.name,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        is_calibration=data.is_calibration,
    )
    audit.record(audit.actor_from_request(request), "league.season_created", target=season)
    return season


def current_config() -> dict[str, Any]:
    overrides: dict[str, Any] = dict(get_config("league.config"))
    store.make_config(overrides)  # validated by the registry; raises if not
    return overrides


def activate_season(request: HttpRequest, season_id: uuid.UUID) -> LeagueSeason:
    """LG-130 … LG-133: the new season starts from the previous one (LP 0, MMR compressed,
    re-placement); new players are registered from their validated level."""
    with transaction.atomic():
        season = LeagueSeason.objects.select_for_update().filter(pk=season_id).first()
        if season is None:
            raise DomainError(ErrorCode.LEAGUE_SEASON_INVALID, status=404)
        authorize(request, Action.LEAGUE_MANAGE, season.location_id)
        busy = LeagueSeason.objects.filter(
            location=season.location, status=SeasonStatus.ACTIVE
        ).exists()
        if season.status != SeasonStatus.PLANNED or busy:
            raise DomainError(ErrorCode.LEAGUE_SEASON_INVALID, status=409)
        season.config = current_config()
        season.rewards = dict(get_config("league.rewards"))  # LG-122, fixed for the season
        config = store.make_config(season.config)
        previous = (
            LeagueSeason.objects.filter(location=season.location, status=SeasonStatus.CLOSED)
            .order_by("-number")
            .first()
        )
        state = (
            state_json.empty()
            if previous is None
            else start_new_season(store.current_state(previous), config)
        )
        for player in LeaguePlayer.objects.filter(status=PlayerStatus.ACTIVE).select_related(
            "user"
        ):
            player_id = str(player.user_id)
            questionnaire = validated_questionnaire(player.user)
            if questionnaire is None or any(player_id in t for t in state.competitors.values()):
                continue
            state = register_player(
                state,
                player_id,
                float(questionnaire.validated_level or questionnaire.estimated_level),
                config,
                float(questionnaire.validated_sigma) if questionnaire.validated_sigma else None,
            )
        season.base_state = state_json.to_json(state)
        season.status = SeasonStatus.ACTIVE
        season.activated_at = clock.now()
        season.save()
        LeagueSnapshot.objects.create(
            season=season, state=season.base_state, updated_at=clock.now()
        )
        projection.rebuild(season, state, config)
        audit.record(audit.actor_from_request(request), "league.season_activated", target=season)
    return season


def active_season(location: Location) -> LeagueSeason:
    season = LeagueSeason.objects.filter(location=location, status=SeasonStatus.ACTIVE).first()
    if season is None:
        raise DomainError(ErrorCode.LEAGUE_NO_ACTIVE_SEASON, status=409)
    return season


def rebuild_season(request: HttpRequest, season_id: uuid.UUID) -> LeagueSeason:
    """An admin check: recompute from zero (the result must equal the cached state)."""
    season = LeagueSeason.objects.filter(pk=season_id).first()
    if season is None:
        raise DomainError(ErrorCode.LEAGUE_SEASON_INVALID, status=404)
    authorize(request, Action.LEAGUE_MANAGE, season.location_id)
    store.rebuild(season)
    audit.record(audit.actor_from_request(request), "league.season_rebuilt", target=season)
    return season
