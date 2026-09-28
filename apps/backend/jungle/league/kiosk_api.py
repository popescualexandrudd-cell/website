"""The League Kiosk's API (§8.2, Stage 7). Only an enrolled device can call it (device token,
client certificate in production); every action checks again that it is an active League
Kiosk of the club, on the club's network (invariant 1, ADR-0012).

The player identifies with the card: the kiosk sends what the scanner read. When the device
has a Hardware Bridge enrolled, the scan must come signed by it (a browser cannot invent a
card scan); otherwise the plain code is accepted (development, or before the bridge exists).
"""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime
from typing import Any

from django.core.cache import cache
from django.http import HttpRequest
from ninja import Field, Router, Schema, Status

from jungle.attendance.services import record_arrival_at_device
from jungle.cards import services as cards
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.schemas import errors
from jungle.devices import bridge
from jungle.devices.auth import device_auth, device_of
from jungle.league import challenges, kiosk, kiosk_views, matches, spotlight
from jungle.league.api import (
    ChallengeOut,
    MatchOut,
    SpotlightOut,
    StandingOut,
    challenge_out,
    match_out,
    spotlight_out,
    standing_out,
)
from jungle.league.models import Ladder, LeagueSeason, SeasonStatus, Standing
from jungle.legal.models import DocumentKind
from jungle.legal.services import current_document
from jungle.privacy import league_consent

router = Router(tags=["kiosk: league"], auth=device_auth)

# A scan opens a short session on this kiosk, so the player can do several things after one
# scan (a signed scan is accepted only once). It lives on the server, is bound to the device,
# and ends after a minute without use or when the kiosk logs the player out (§8.2: 30 s idle).
SESSION_SECONDS = 60


# ---------------------------------------------------------------- schemas
class CardIn(Schema):
    token: str | None = Field(default=None, max_length=200, description="Codul citit (fără Bridge)")
    signed: dict[str, Any] | None = Field(default=None, description="Scanarea semnată de Bridge")
    session: str | None = Field(
        default=None, max_length=64, description="Sesiunea deschisă de o scanare (POST /session)"
    )


class PersonOut(Schema):
    id: str
    first_name: str
    last_name: str


class LadderOut(Schema):
    ladder: str
    position: int | None
    tier: str
    division: str
    level: float
    lp: int
    placement_left: int
    matches_played: int
    minimum: int


class ScoreChanceOut(Schema):
    booking_id: str
    court: str
    starts_at: datetime
    ends_at: datetime
    window_closes_at: datetime
    kind: str
    players: list[PersonOut]


class WaitingMatchOut(Schema):
    match_id: str
    team_a: list[PersonOut]
    team_b: list[PersonOut]
    score: dict[str, Any]
    window_closes_at: datetime
    kind: str


class WaitingChallengeOut(Schema):
    challenge_id: str
    ladder: str
    challengers: list[PersonOut]
    respond_by: datetime


class FixtureViewOut(Schema):
    fixture_id: str
    tournament: str
    phase: str
    status: str
    team_a: list[PersonOut]
    team_b: list[PersonOut]


class SessionOut(Schema):
    session: str = Field(description="Se trimite la acțiunile următoare, în loc de card")
    player: PersonOut
    language: str
    adult: bool
    consent_signed: bool
    consent_outdated: bool
    questionnaire: str
    in_league: bool
    director: bool
    ladders: list[LadderOut]
    score_chances: list[ScoreChanceOut]
    to_confirm: list[WaitingMatchOut]
    challenges: list[WaitingChallengeOut]
    fixtures: list[FixtureViewOut]


class IdleChallengeOut(Schema):
    challengers: list[PersonOut]
    targets: list[PersonOut]
    created_at: datetime


class IdleOut(Schema):
    """The idle screen: live standings, Match of the day, Kings, challenges (§8.2)."""

    doubles: list[StandingOut]
    singles: list[StandingOut]
    pairs: list[StandingOut]
    kings: list[StandingOut]
    match_of_the_day: SpotlightOut
    challenges: list[IdleChallengeOut]


class ConsentTextOut(Schema):
    kind: str
    version: int
    language: str
    title: str
    body: str


class ConsentIn(Schema):
    card: CardIn
    language: str = Field(pattern=r"^(ro|en)$")
    accepted: bool = Field(description="Bifa obligatorie (R-010)")


class ConsentOut(Schema):
    signed: bool
    version: int | None


class ProposeIn(Schema):
    card: CardIn
    booking_id: uuid.UUID
    team_a: list[uuid.UUID] = Field(min_length=1, max_length=2)
    team_b: list[uuid.UUID] = Field(min_length=1, max_length=2)
    score: dict[str, Any]


class CardOnlyIn(Schema):
    card: CardIn


class RespondIn(Schema):
    card: CardIn
    accept: bool


class FixtureScoreIn(Schema):
    card: CardIn
    score: dict[str, Any]


class ChallengeIn(Schema):
    cards: list[CardIn] = Field(min_length=1, max_length=2)
    targets: list[uuid.UUID] = Field(min_length=1, max_length=2)


class CheckInOut(Schema):
    scanned_at: datetime
    first_name: str


# ---------------------------------------------------------------- helpers
def _session_key(request: HttpRequest, session: str) -> str:
    return f"kiosk-session:{device_of(request).pk}:{session}"


def scanned_token(request: HttpRequest, card: CardIn) -> str:
    """What the scanner read (signed by the device's bridge when it has one), or the card
    behind a session this kiosk opened."""
    device = device_of(request)
    if card.session:
        key = _session_key(request, card.session)
        token = cache.get(key)
        if token is None:
            raise DomainError(ErrorCode.LEAGUE_KIOSK_SESSION_EXPIRED, status=403)
        cache.touch(key, SESSION_SECONDS)
        return str(token)
    if device.public_key:
        payload = bridge.verify(device, card.signed or {}, "scan")
        return str(payload.get("code", ""))
    if not card.token:
        raise DomainError(ErrorCode.CARDS_INVALID, status=404)
    return card.token


def _guard(request: HttpRequest, action: str) -> None:
    device = device_of(request)
    kiosk.check(request, device, device.location_id, action)


def _people(people: list[kiosk_views.Person]) -> list[PersonOut]:
    return [PersonOut(**vars(p)) for p in people]


def session_out(view: kiosk_views.Session, session: str) -> SessionOut:
    return SessionOut(
        session=session,
        player=PersonOut(**vars(view.player)),
        language=view.language,
        adult=view.adult,
        consent_signed=view.consent_signed,
        consent_outdated=view.consent_outdated,
        questionnaire=view.questionnaire,
        in_league=view.in_league,
        director=view.director,
        ladders=[LadderOut(**vars(x)) for x in view.ladders],
        score_chances=[
            ScoreChanceOut(**{**vars(c), "players": _people(c.players)}) for c in view.score_chances
        ],
        to_confirm=[
            WaitingMatchOut(**{**vars(m), "team_a": _people(m.team_a), "team_b": _people(m.team_b)})
            for m in view.to_confirm
        ],
        challenges=[
            WaitingChallengeOut(**{**vars(c), "challengers": _people(c.challengers)})
            for c in view.challenges
        ],
        fixtures=[
            FixtureViewOut(**{**vars(f), "team_a": _people(f.team_a), "team_b": _people(f.team_b)})
            for f in view.fixtures
        ],
    )


def _session(request: HttpRequest, card: CardIn) -> SessionOut:
    token = scanned_token(request, card)
    user = cards.resolve(token).user
    session = card.session or secrets.token_urlsafe(24)
    cache.set(_session_key(request, session), token, SESSION_SECONDS)
    return session_out(kiosk_views.session(device_of(request), user), session)


def _standings(season: LeagueSeason | None, ladder: str, limit: int) -> list[StandingOut]:
    if season is None:
        return []
    rows = (
        Standing.objects.filter(season=season, ladder=ladder, position__isnull=False)
        .select_related("player_a", "player_b")
        .order_by("position")[:limit]
    )
    return [standing_out(r) for r in rows]


def _active(request: HttpRequest) -> LeagueSeason | None:
    return LeagueSeason.objects.filter(
        location_id=device_of(request).location_id, status=SeasonStatus.ACTIVE
    ).first()


# ---------------------------------------------------------------- endpoints
@router.get("/idle", response={200: IdleOut, **errors(401, 403)})
def idle(request: HttpRequest) -> IdleOut:
    _guard(request, "league.kiosk_idle")
    season = _active(request)
    kings = [
        s for s in _standings(season, Ladder.DOUBLES, 100) if s.tier == "master" and s.eligible
    ]
    return IdleOut(
        doubles=_standings(season, Ladder.DOUBLES, 10),
        singles=_standings(season, Ladder.SINGLES, 10),
        pairs=_standings(season, Ladder.PAIRS, 10),
        kings=kings[:10],
        match_of_the_day=spotlight_out(spotlight.match_of_the_day(device_of(request).location)),
        challenges=[
            IdleChallengeOut(challengers=_people(a), targets=_people(b), created_at=at)
            for a, b, at in kiosk_views.open_challenges(device_of(request))
        ],
    )


@router.get("/standings", response={200: list[StandingOut], **errors(401, 403, 422)})
def standings(
    request: HttpRequest, ladder: Ladder = Ladder.DOUBLES, search: str = ""
) -> list[StandingOut]:
    """§8.2 action 6: the full standings, with search by name."""
    _guard(request, "league.kiosk_standings")
    shown = _standings(_active(request), ladder, 500)
    text = search.strip().lower()[:60]
    if text:
        shown = [
            s
            for s in shown
            if any(text in f"{p.first_name} {p.last_name}".lower() for p in s.players)
        ]
    return shown


@router.post("/session", response={200: SessionOut, **errors(401, 403, 404, 422)})
def session(request: HttpRequest, payload: CardOnlyIn) -> SessionOut:
    """After a scan: the player's own screen (logged out by the kiosk after 30 s idle)."""
    _guard(request, "league.kiosk_session")
    return _session(request, payload.card)


class LogoutIn(Schema):
    session: str = Field(max_length=64)


@router.post("/logout", response={204: None, **errors(401, 422)})
def logout(request: HttpRequest, payload: LogoutIn) -> Status[None]:
    """The kiosk ends the session (the player left, or 30 s without a touch)."""
    cache.delete(_session_key(request, payload.session))
    return Status(204, None)


@router.get("/consent", response={200: ConsentTextOut, **errors(401, 403, 404, 422)})
def consent_text(request: HttpRequest, language: str = "ro") -> ConsentTextOut:
    _guard(request, "league.kiosk_consent")
    doc = current_document(DocumentKind.LEAGUE_GDPR, language if language in ("ro", "en") else "ro")
    return ConsentTextOut(
        kind=doc.kind, version=doc.version, language=doc.language, title=doc.title, body=doc.body
    )


@router.post("/consent", response={200: ConsentOut, **errors(400, 401, 403, 404, 422)})
def sign_consent(request: HttpRequest, payload: ConsentIn) -> ConsentOut:
    """R-010, R-011: only with the box ticked, at this League Kiosk."""
    if not payload.accepted:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "accepted"})
    _guard(request, "league.kiosk_consent_sign")
    user = cards.resolve(scanned_token(request, payload.card)).user
    consent = league_consent.sign(request, user, device_of(request), payload.language)
    return ConsentOut(signed=True, version=consent.document.version)


@router.post("/matches", response={201: MatchOut, **errors(400, 401, 403, 404, 409, 422)})
def propose(request: HttpRequest, payload: ProposeIn) -> Status[MatchOut]:
    """§8.2 action 2: the score of a finished booking, set by set."""
    match = matches.propose(
        request,
        device_of(request),
        matches.Proposal(
            booking_id=payload.booking_id,
            card_token=scanned_token(request, payload.card),
            team_a=tuple(payload.team_a),
            team_b=tuple(payload.team_b),
            score=payload.score,
        ),
    )
    return Status(201, match_out(match))


@router.post(
    "/matches/{match_id}/respond", response={200: MatchOut, **errors(401, 403, 404, 409, 422)}
)
def respond(request: HttpRequest, match_id: uuid.UUID, payload: RespondIn) -> MatchOut:
    """§8.2 action 3: confirm or dispute."""
    return match_out(
        matches.respond(
            request,
            device_of(request),
            match_id,
            scanned_token(request, payload.card),
            payload.accept,
        )
    )


@router.post(
    "/matches/{match_id}/director", response={200: MatchOut, **errors(401, 403, 404, 409, 422)}
)
def director(request: HttpRequest, match_id: uuid.UUID, payload: CardOnlyIn) -> MatchOut:
    """Q28: the tournament director validates a tournament score."""
    return match_out(
        matches.director_confirm(
            request, device_of(request), match_id, scanned_token(request, payload.card)
        )
    )


@router.post(
    "/fixtures/{fixture_id}/finished",
    response={200: dict[str, str], **errors(401, 403, 404, 409, 422)},
)
def fixture_finished(
    request: HttpRequest, fixture_id: uuid.UUID, payload: CardOnlyIn
) -> dict[str, str]:
    fixture = matches.finish_fixture(
        request, device_of(request), fixture_id, scanned_token(request, payload.card)
    )
    return {"fixture_id": str(fixture.pk), "status": fixture.status}


@router.post(
    "/fixtures/{fixture_id}/score", response={201: MatchOut, **errors(400, 401, 403, 404, 409, 422)}
)
def fixture_score(
    request: HttpRequest, fixture_id: uuid.UUID, payload: FixtureScoreIn
) -> Status[MatchOut]:
    match = matches.propose_fixture(
        request,
        device_of(request),
        matches.FixtureScore(fixture_id, scanned_token(request, payload.card), payload.score),
    )
    return Status(201, match_out(match))


@router.post("/challenges", response={201: ChallengeOut, **errors(400, 401, 403, 404, 409, 422)})
def issue_challenge(request: HttpRequest, payload: ChallengeIn) -> Status[ChallengeOut]:
    """§8.2 action 4 (Q48): the challengers scan their cards and pick the opponents."""
    tokens = tuple(scanned_token(request, c) for c in payload.cards)
    challenge = challenges.issue(
        request, device_of(request), challenges.ChallengeData(tokens, tuple(payload.targets))
    )
    return Status(201, challenge_out(challenge, challenge.challenger_a_id))


@router.post(
    "/challenges/{challenge_id}/answer",
    response={200: ChallengeOut, **errors(401, 403, 404, 409, 422)},
)
def answer_challenge(
    request: HttpRequest, challenge_id: uuid.UUID, payload: RespondIn
) -> ChallengeOut:
    token = scanned_token(request, payload.card)
    challenge = challenges.answer(request, device_of(request), challenge_id, token, payload.accept)
    return challenge_out(challenge, cards.resolve(token).user.pk)


@router.post("/check-in", response={200: CheckInOut, **errors(401, 403, 404, 422)})
def check_in(request: HttpRequest, payload: CardOnlyIn) -> CheckInOut:
    """§8.2 action 5 (R-030)."""
    _guard(request, "league.kiosk_check_in")
    user = cards.resolve(scanned_token(request, payload.card)).user
    scan = record_arrival_at_device(device_of(request), user)
    return CheckInOut(scanned_at=scan.scanned_at, first_name=user.first_name)
