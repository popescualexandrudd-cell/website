"""What the league shows publicly (website, screens, kiosks).

R-012 as changed by the owner on 28.09.2026 (Q49): besides name, rank, level, LP and place,
the results of league matches are public (date, time, court, teams, score, LP won or lost),
together with every player's match history, the court and time of tournament matches and of
the Match of the day. The league consent (version 2) says so; players who withdrew it or
deleted their account never appear: they come back with no id and the name "Jucător retras"
(the interface shows the translated label when the id is empty).
Badges and detailed statistics stay private (own account).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from django.db.models import QuerySet

from jungle.accounts.models import User
from jungle.league import projection
from jungle.league.models import (
    LeagueMatch,
    LeagueSeason,
    LeagueSnapshot,
    MatchStatus,
    RatingRecord,
    SeasonStatus,
    Side,
    Standing,
)
from jungle.locations.models import Location

RETIRED = ("Jucător", "retras")
INDIVIDUAL = ("doubles", "singles")


@dataclass(frozen=True)
class PublicPlayer:
    id: uuid.UUID | None  # None: a player who is no longer shown
    first_name: str
    last_name: str


def person(user: User, visible: set[str]) -> PublicPlayer:
    if str(user.pk) in visible:
        return PublicPlayer(user.pk, user.first_name, user.last_name)
    return PublicPlayer(None, *RETIRED)


@dataclass(frozen=True)
class PublicResult:
    id: uuid.UUID
    finished_at: datetime
    court: str
    kind: str
    team_a: list[PublicPlayer]
    team_b: list[PublicPlayer]
    score: dict[str, Any]
    winner: str
    lp_delta: dict[str, int]  # player id → LP won or lost in the match (individual ladder)


def _court(match: LeagueMatch) -> str:
    booking = match.fixture.booking if match.fixture is not None else match.booking
    return booking.resource.name if booking is not None else ""


def _deltas(match: LeagueMatch, computation: int) -> tuple[str, dict[str, int]]:
    """The winner and each player's LP change, from the current computation (an applied match
    always has its event, recorded in every computation)."""
    payload = RatingRecord.objects.get(event_id=match.event_id, computation=computation).payload
    return payload.get("winner") or "", {
        u["competitor"]: u["lp_delta"]
        for u in payload.get("updates", [])
        if u["ladder"] in INDIVIDUAL
    }


def applied(location: Location) -> QuerySet[LeagueMatch]:
    return (
        LeagueMatch.objects.filter(location=location, status=MatchStatus.APPLIED)
        .select_related("booking__resource", "fixture__booking__resource", "season")
        .prefetch_related("players__user")
        .order_by("-finished_at")
    )


def results(matches: list[LeagueMatch]) -> list[PublicResult]:
    visible = projection.visible_players()
    computations = dict(
        LeagueSnapshot.objects.filter(season__in={m.season_id for m in matches}).values_list(
            "season_id", "computation"
        )
    )
    shown = []
    for match in matches:
        winner, deltas = _deltas(match, computations.get(match.season_id, 0))
        players = list(match.players.all())
        shown.append(
            PublicResult(
                id=match.pk,
                finished_at=match.finished_at,
                court=_court(match),
                kind=match.kind,
                team_a=[person(p.user, visible) for p in players if p.side == Side.A],
                team_b=[person(p.user, visible) for p in players if p.side == Side.B],
                score=match.score,
                winner=winner,
                lp_delta={k: v for k, v in deltas.items() if k in visible},
            )
        )
    return shown


@dataclass(frozen=True)
class PublicLadder:
    ladder: str
    position: int | None
    tier: str
    division: str
    level: float
    lp: int


@dataclass(frozen=True)
class PublicProfile:
    player: PublicPlayer
    ladders: list[PublicLadder]
    matches: list[PublicResult]


def profile(location: Location, user_id: uuid.UUID, limit: int = 50) -> PublicProfile | None:
    """A player's public page: standings in the active season and the match history."""
    if str(user_id) not in projection.visible_players():
        return None
    user = User.objects.get(pk=user_id)
    season = LeagueSeason.objects.filter(location=location, status=SeasonStatus.ACTIVE).first()
    rows = (
        Standing.objects.filter(season=season, competitor_id=str(user_id), ladder__in=INDIVIDUAL)
        if season is not None
        else Standing.objects.none()
    )
    history = list(applied(location).filter(players__user=user).distinct()[:limit])
    return PublicProfile(
        player=PublicPlayer(user.pk, user.first_name, user.last_name),
        ladders=[
            PublicLadder(
                r.ladder,
                r.position,
                r.tier,
                r.division,
                projection.round_level(r.level),
                r.lp,
            )
            for r in rows
        ],
        matches=results(history),
    )
