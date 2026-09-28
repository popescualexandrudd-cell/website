"""What the League Kiosk shows (§8.2): the idle screen and, after a card is scanned, the
player's own session. Reading only: every action goes through the services that check the
device again (`league.kiosk`, `league.matches`, `league.challenges`, `privacy.league_consent`).

The kiosk screen can be seen by others, so the player's session shows only minimal private
data (§8.2): name, rank, LP, level, place, matches played against the minimum, and what waits
for them (a score to enter or confirm, a challenge to answer).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from django.db.models import Q

from jungle.accounts.models import User
from jungle.attendance.models import Scan, ScanKind
from jungle.bookings.models import Booking, SessionType
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.devices.models import Device
from jungle.league import matches, services, store, tournaments
from jungle.league.models import (
    Challenge,
    ChallengeStatus,
    Fixture,
    FixtureStatus,
    LeagueMatch,
    LeagueSeason,
    LevelQuestionnaire,
    MatchStatus,
    Response,
    SeasonStatus,
    Standing,
    TournamentStatus,
)
from jungle.league.projection import round_level
from jungle.privacy import league_consent


@dataclass(frozen=True)
class Person:
    id: str
    first_name: str
    last_name: str


def person(user: User) -> Person:
    return Person(str(user.pk), user.first_name, user.last_name)


@dataclass(frozen=True)
class LadderView:
    ladder: str
    position: int | None
    tier: str
    division: str
    level: float
    lp: int
    placement_left: int
    matches_played: int
    minimum: int


@dataclass(frozen=True)
class ScoreChance:
    """A finished booking the player can enter the score for, with who scanned in."""

    booking_id: str
    court: str
    starts_at: datetime
    ends_at: datetime
    window_closes_at: datetime
    kind: str
    players: list[Person]


@dataclass(frozen=True)
class WaitingMatch:
    match_id: str
    team_a: list[Person]
    team_b: list[Person]
    score: dict[str, Any]
    window_closes_at: datetime
    kind: str


@dataclass(frozen=True)
class WaitingChallenge:
    challenge_id: str
    ladder: str
    challengers: list[Person]
    respond_by: datetime


@dataclass(frozen=True)
class FixtureView:
    fixture_id: str
    tournament: str
    phase: str
    status: str
    team_a: list[Person]
    team_b: list[Person]
    match_id: str | None = None  # a score entered and waiting (the director can validate it)
    score: dict[str, Any] | None = None


@dataclass
class Session:
    player: Person
    language: str
    adult: bool
    consent_signed: bool
    consent_outdated: bool
    questionnaire: str
    in_league: bool
    director: bool
    ladders: list[LadderView] = field(default_factory=list)
    score_chances: list[ScoreChance] = field(default_factory=list)
    to_confirm: list[WaitingMatch] = field(default_factory=list)
    challenges: list[WaitingChallenge] = field(default_factory=list)
    fixtures: list[FixtureView] = field(default_factory=list)


def _people(ids: list[str]) -> list[Person]:
    found = {str(u.pk): u for u in User.objects.filter(pk__in=ids)}
    return [person(found[i]) for i in ids if i in found]


def _questionnaire(user: User) -> str:
    latest = LevelQuestionnaire.objects.filter(user=user).order_by("-submitted_at").first()
    if latest is None:
        return "none"
    return "validated" if latest.validated_at else "pending"


def _ladders(season: LeagueSeason | None, user: User) -> list[LadderView]:
    if season is None:
        return []
    config = store.config_for(season)
    rows = Standing.objects.filter(
        season=season, competitor_id=str(user.pk), ladder__in=("doubles", "singles")
    ).order_by("ladder")
    return [
        LadderView(
            r.ladder,
            r.position,
            r.tier,
            r.division,
            round_level(r.level),
            r.lp,
            r.placement_left,
            r.matches_played,
            config.min_matches_per_season,
        )
        for r in rows
    ]


def score_chances(device: Device, user: User) -> list[ScoreChance]:
    """Finished league bookings at this club where the player scanned in and whose score
    window is open, still without a score (§8.2, action 2)."""
    now = clock.now()
    length = timedelta(minutes=int(get_config("league.score_window_minutes")))
    candidates = (
        Booking.objects.filter(
            location_id=device.location_id,
            session_type__in=list(matches.LEAGUE_SESSIONS),
            status__in=matches.PLAYABLE_BOOKINGS,
            ends_at__lte=now,
            ends_at__gt=now - length - timedelta(days=1),
            scans__user=user,
            scans__kind=ScanKind.COURT_ENTRY,
        )
        .select_related("resource")
        .distinct()
        .order_by("-ends_at")
    )
    chances = []
    for booking in candidates:
        opens, closes = matches.score_window(booking)
        live = LeagueMatch.objects.filter(booking=booking).exclude(status=MatchStatus.CANCELLED)
        if not opens <= now < closes or live.exists():
            continue
        scanned = list(
            dict.fromkeys(
                str(u)
                for u in Scan.objects.filter(booking=booking, kind=ScanKind.COURT_ENTRY)
                .order_by("scanned_at")
                .values_list("user_id", flat=True)
            )
        )
        chances.append(
            ScoreChance(
                str(booking.pk),
                booking.resource.name,
                booking.starts_at,
                booking.ends_at,
                closes,
                matches.LEAGUE_SESSIONS[SessionType(booking.session_type)],
                _people(scanned),
            )
        )
    return chances


def to_confirm(user: User) -> list[WaitingMatch]:
    now = clock.now()
    waiting = LeagueMatch.objects.filter(
        status=MatchStatus.PROPOSED,
        window_closes_at__gt=now,
        players__user=user,
        players__response=Response.PENDING,
    ).prefetch_related("players")
    return [
        WaitingMatch(
            str(m.pk),
            _people([str(p.user_id) for p in m.players.all() if p.side == "a"]),
            _people([str(p.user_id) for p in m.players.all() if p.side == "b"]),
            m.score,
            m.window_closes_at,
            m.kind,
        )
        for m in waiting
    ]


def challenges_for(user: User) -> list[WaitingChallenge]:
    waiting = Challenge.objects.filter(
        Q(target_a=user) | Q(target_b=user),
        status=ChallengeStatus.PENDING,
        respond_by__gt=clock.now(),
    )
    return [
        WaitingChallenge(
            str(c.pk), c.ladder, _people([str(p) for p in c.challengers]), c.respond_by
        )
        for c in waiting
    ]


def fixtures_for(device: Device, user: User, director: bool) -> list[FixtureView]:
    """Tournament matches the player (or the director) can finish or score here (Q28)."""
    rows = Fixture.objects.filter(
        tournament__location_id=device.location_id,
        tournament__status=TournamentStatus.IN_PROGRESS,
        status__in=(FixtureStatus.READY, FixtureStatus.FINISHED),
        booking__isnull=False,
    ).select_related("tournament")
    mine = str(user.pk)
    views = []
    for f in rows:
        if not (director or mine in f.team_a + f.team_b):
            continue
        waiting = LeagueMatch.objects.filter(fixture=f, status=MatchStatus.PROPOSED).first()
        views.append(
            FixtureView(
                str(f.pk),
                f.tournament.name,
                f.phase,
                f.status,
                _people(f.team_a),
                _people(f.team_b),
                str(waiting.pk) if waiting else None,
                waiting.score if waiting else None,
            )
        )
    return views


def session(device: Device, user: User) -> Session:
    season = LeagueSeason.objects.filter(
        location_id=device.location_id, status=SeasonStatus.ACTIVE
    ).first()
    consent = league_consent.status(user, user.preferred_language)
    director = tournaments.is_director(user, device.location_id)
    view = Session(
        player=person(user),
        language=user.preferred_language,
        adult=league_consent.is_adult(user),
        consent_signed=consent.signed,
        consent_outdated=consent.outdated,
        questionnaire=_questionnaire(user),
        in_league=services.is_playing(user),
        director=director,
    )
    view.ladders = _ladders(season, user)
    view.fixtures = fixtures_for(device, user, director)
    if view.in_league:
        view.score_chances = score_chances(device, user)
        view.to_confirm = to_confirm(user)
        view.challenges = challenges_for(user)
    return view


def open_challenges(device: Device) -> list[tuple[list[Person], list[Person], datetime]]:
    """For the idle screen: the challenges accepted and waiting to be played (§8.2)."""
    rows = Challenge.objects.filter(
        location_id=device.location_id,
        status__in=(ChallengeStatus.PENDING, ChallengeStatus.ACCEPTED),
    ).order_by("-created_at")[:10]
    return [
        (
            _people([str(p) for p in c.challengers]),
            _people([str(p) for p in c.targets]),
            c.created_at,
        )
        for c in rows
    ]
