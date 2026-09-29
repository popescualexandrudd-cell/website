"""What the screens show (§8.5), read-only.

- A **court screen**: the court, the session on it now (time, duration, type), each player with
  only the public fields of R-012 (name, rank, LP, level), the time left (from `ends_at`), the
  next booking, "Match of the day" when it is, a QR code to the public league pages; while the
  court is free, the standings, events and the club's announcements.
- A **lobby screen** (lobby, café, mezzanine): every court's state, the Match of the day, the
  standings, the Kings of the Jungle, events, and the café orders ready to collect.

Everyone on a court appears by name (Q55, the owner's answer of 29.09.2026); players in the
league are marked and show their rank, LP and level; an erased account, or someone who objected
to appearing by name (GDPR art. 21, `NameObjection`), shows "Jucător".
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from typing import Any

import segno
from django.conf import settings
from django.db.models import Q

from jungle.accounts.models import User
from jungle.attendance.models import Scan, ScanKind
from jungle.bookings.models import Booking, BookingStatus, SessionType
from jungle.cafe.models import CafeOrder, OrderStatus
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.league import projection, spotlight
from jungle.league.models import (
    Challenge,
    ChallengeStatus,
    Fixture,
    Ladder,
    LeagueMatch,
    LeagueSeason,
    SeasonStatus,
    Side,
    Standing,
    Tournament,
    TournamentStatus,
)
from jungle.locations.models import Location, Resource, ResourceKind
from jungle.screens.models import CourtLineup, NameObjection

COURT_KINDS = (ResourceKind.PADEL_COURT, ResourceKind.TENNIS_COURT)
LIVE = (BookingStatus.CONFIRMED, BookingStatus.COMPLETED)


@dataclass(frozen=True)
class Player:
    """Everyone on court by name (Q55, 29.09.2026); the league's public fields (R-012) only for
    players in the league, marked `in_league` (the screen shows a "Ligă" badge). An empty name:
    an erased account (the screen shows "Jucător")."""

    name: str
    in_league: bool = False
    tier: str = ""
    division: str = ""
    lp: int | None = None
    level: float | None = None
    position: int | None = None


@dataclass(frozen=True)
class Session:
    booking_id: uuid.UUID
    starts_at: datetime
    ends_at: datetime
    minutes: int
    session_type: str
    match_of_the_day: bool
    teams: list[list[Player]]


@dataclass(frozen=True)
class Next:
    starts_at: datetime
    session_type: str


@dataclass(frozen=True)
class Court:
    id: uuid.UUID
    name: str
    current: Session | None
    next: Next | None


@dataclass(frozen=True)
class Row:
    """A line of the standings (R-012)."""

    position: int
    names: list[str]
    tier: str
    division: str
    lp: int
    level: float


@dataclass(frozen=True)
class Event:
    title: str
    starts_at: datetime | None = None


@dataclass
class League:
    doubles: list[Row] = field(default_factory=list)
    singles: list[Row] = field(default_factory=list)
    pairs: list[Row] = field(default_factory=list)
    kings: list[Row] = field(default_factory=list)
    match_of_the_day: Session | None = None
    match_of_the_day_court: str = ""


@dataclass
class State:
    kind: str  # "court" or "lobby"
    location_name: str
    server_time: datetime
    league: League
    events: list[Event]
    announcements: list[dict[str, str]]
    court: Court | None = None
    courts: list[Court] = field(default_factory=list)
    cafe_ready: list[int] = field(default_factory=list)
    qr_url: str = ""
    qr_svg: str = ""


# ---------------------------------------------------------------- players
def _display_name(user: User) -> str:
    """As on the court screen of §8.5: surname first ("Popescu Alexandru Daniel")."""
    return f"{user.last_name} {user.first_name}".strip()


def _players(
    ids: list[uuid.UUID], season: LeagueSeason | None, ladder: str, visible: set[str]
) -> list[Player]:
    users = {u.pk: u for u in User.objects.filter(pk__in=ids)}
    hidden = set(NameObjection.objects.filter(user_id__in=ids).values_list("user_id", flat=True))
    rows = (
        {
            r.competitor_id: r
            for r in Standing.objects.filter(
                season=season, ladder=ladder, competitor_id__in=[str(i) for i in ids]
            )
        }
        if season is not None
        else {}
    )
    shown = []
    for player_id in ids:
        user = users.get(player_id)
        if user is None or user.deleted_at is not None or not user.is_active or player_id in hidden:
            shown.append(Player(name=""))
            continue
        if str(player_id) not in visible:
            shown.append(Player(name=_display_name(user)))
            continue
        row = rows.get(str(player_id))
        if row is None:
            shown.append(Player(name=_display_name(user), in_league=True))
            continue
        placed = row.rank_index is not None
        shown.append(
            Player(
                name=_display_name(user),
                in_league=True,
                tier=row.tier if placed else "",
                division=row.division if placed else "",
                lp=row.lp if placed else None,
                level=projection.round_level(row.level),
                position=row.position,
            )
        )
    return shown


def _uuids(values: list[Any]) -> list[uuid.UUID]:
    return [uuid.UUID(str(v)) for v in values if v]


def fixed_teams(booking: Booking) -> list[list[uuid.UUID]] | None:
    """The teams nobody can change on the court: the match entered at the kiosk (or its
    tournament match), or the tournament draw."""
    match = (
        LeagueMatch.objects.filter(Q(booking=booking) | Q(fixture__booking=booking))
        .order_by("-proposed_at")
        .prefetch_related("players")
        .first()
    )
    if match is not None:
        players = list(match.players.all())
        return [
            [p.user_id for p in players if p.side == Side.A],
            [p.user_id for p in players if p.side == Side.B],
        ]
    fixture = Fixture.objects.filter(booking=booking).first()
    if fixture is not None and (fixture.team_a or fixture.team_b):
        return [_uuids(fixture.team_a), _uuids(fixture.team_b)]
    return None


def scanned_in(booking: Booking) -> list[uuid.UUID]:
    """Who checked in on the court, in the order of the scans."""
    return list(
        dict.fromkeys(
            Scan.objects.filter(booking=booking, kind=ScanKind.COURT_ENTRY)
            .order_by("scanned_at")
            .values_list("user_id", flat=True)
        )
    )


def teams_of(booking: Booking, season: LeagueSeason | None) -> list[list[uuid.UUID]]:
    """Who plays, in teams when they are known: the match entered at the kiosk, a tournament
    fixture, an accepted challenge, the teams the players chose at the kiosk (Q55); otherwise
    the check-ins on court, in pairs by the order of the scans when there are four
    (`screens.pairs_from_scan_order`, Q55)."""
    fixed = fixed_teams(booking)
    if fixed is not None:
        return fixed
    scanned = scanned_in(booking)
    lineup = CourtLineup.objects.filter(booking=booking).first()
    if lineup is not None and set(_uuids(lineup.team_a + lineup.team_b)) == set(scanned):
        return [_uuids(lineup.team_a), _uuids(lineup.team_b)]
    if not scanned and booking.session_type == SessionType.CHALLENGE and season is not None:
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
            return [
                [i for i in (challenge.challenger_a_id, challenge.challenger_b_id) if i],
                [i for i in (challenge.target_a_id, challenge.target_b_id) if i],
            ]
    if not scanned:
        return [[booking.organizer_id]]
    if len(scanned) in (2, 4) and bool(get_config("screens.pairs_from_scan_order")):
        half = len(scanned) // 2
        return [scanned[:half], scanned[half:]]
    return [scanned]


# ---------------------------------------------------------------- courts
def _session(
    booking: Booking, season: LeagueSeason | None, visible: set[str], spotlight_id: uuid.UUID | None
) -> Session:
    teams = teams_of(booking, season)
    ladder = Ladder.SINGLES if sum(len(t) for t in teams) == 2 else Ladder.DOUBLES
    return Session(
        booking_id=booking.pk,
        starts_at=booking.starts_at,
        ends_at=booking.ends_at,
        minutes=int((booking.ends_at - booking.starts_at).total_seconds() // 60),
        session_type=booking.session_type,
        match_of_the_day=booking.pk == spotlight_id,
        teams=[_players(team, season, ladder, visible) for team in teams if team],
    )


def _court(
    resource: Resource,
    now: datetime,
    season: LeagueSeason | None,
    visible: set[str],
    spotlight_id: uuid.UUID | None,
) -> Court:
    bookings = Booking.objects.filter(resource=resource, status__in=LIVE)
    current = (
        bookings.filter(starts_at__lte=now, ends_at__gt=now).select_related("organizer").first()
    )
    day_end = datetime.combine(
        clock.local(now).date() + timedelta(days=1), time(), clock.BUSINESS_TZ
    )
    after = current.ends_at if current is not None else now
    upcoming = (
        bookings.filter(starts_at__gte=after, starts_at__lt=day_end).order_by("starts_at").first()
    )
    return Court(
        id=resource.pk,
        name=resource.name,
        current=_session(current, season, visible, spotlight_id) if current else None,
        next=Next(upcoming.starts_at, upcoming.session_type) if upcoming else None,
    )


# ---------------------------------------------------------------- league, events, café
def _rows(
    season: LeagueSeason | None, ladder: str, limit: int, visible: set[str], kings: bool = False
) -> list[Row]:
    """The top of a ladder; a row with anyone no longer public is left out (the standings are
    rewritten on the next change)."""
    if season is None:
        return []
    query = Standing.objects.filter(season=season, ladder=ladder, position__isnull=False)
    if kings:
        query = query.filter(tier="master", eligible=True)
    rows = []
    for r in query.select_related("player_a", "player_b").order_by("position")[:limit]:
        people = [p for p in (r.player_a, r.player_b) if p is not None]
        if not all(str(p.pk) in visible for p in people):
            continue
        rows.append(
            Row(
                position=r.position or 0,
                names=[_display_name(p) for p in people],
                tier=r.tier,
                division=r.division,
                lp=r.lp,
                level=projection.round_level(r.level),
            )
        )
    return rows


def _league(
    location: Location, season: LeagueSeason | None, visible: set[str], limit: int
) -> tuple[League, uuid.UUID | None]:
    found = spotlight.match_of_the_day(location)
    spotlight_id = found.booking.pk if found is not None else None
    league = League(
        doubles=_rows(season, Ladder.DOUBLES, limit, visible),
        singles=_rows(season, Ladder.SINGLES, max(3, limit // 2), visible),
        pairs=_rows(season, Ladder.PAIRS, max(3, limit // 2), visible),
        kings=_rows(season, Ladder.DOUBLES, 10, visible, kings=True),
    )
    if found is not None:
        league.match_of_the_day = _session(found.booking, season, visible, spotlight_id)
        league.match_of_the_day_court = found.booking.resource.name
    return league, spotlight_id


def _events(location: Location, now: datetime) -> list[Event]:
    """What is coming at the club: the league's tournaments (more kinds of events later)."""
    tournaments = Tournament.objects.filter(
        location=location, starts_at__gte=now - timedelta(hours=12)
    ).exclude(status__in=(TournamentStatus.CANCELLED, TournamentStatus.FINISHED))
    return [Event(t.name, t.starts_at) for t in tournaments.order_by("starts_at")[:5]]


def _announcements() -> list[dict[str, str]]:
    return [dict(a) for a in get_config("screens.announcements")]


def _qr(url: str) -> str:
    """An SVG QR code drawn in the text colour (the screen sets it from the tokens)."""
    svg = segno.make(url, error="m").svg_inline(dark="#000", light=None, border=2, omitsize=True)
    return str(svg).replace('stroke="#000"', 'stroke="currentColor"')


def qr_url(location: Location) -> str:
    configured = str(get_config("screens.qr_url")).strip()
    return configured or f"{settings.WEB_BASE_URL}/ro/liga"


def _season(location: Location) -> LeagueSeason | None:
    return LeagueSeason.objects.filter(location=location, status=SeasonStatus.ACTIVE).first()


def court_state(resource: Resource, now: datetime | None = None) -> State:
    now = now or clock.now()
    location = resource.location
    season = _season(location)
    visible = projection.visible_players()
    league, spotlight_id = _league(location, season, visible, 5)
    url = qr_url(location)
    return State(
        kind="court",
        location_name=location.name,
        server_time=now,
        league=league,
        events=_events(location, now),
        announcements=_announcements(),
        court=_court(resource, now, season, visible, spotlight_id),
        qr_url=url,
        qr_svg=_qr(url),
    )


def lobby_state(location: Location, now: datetime | None = None) -> State:
    now = now or clock.now()
    season = _season(location)
    visible = projection.visible_players()
    league, spotlight_id = _league(location, season, visible, 10)
    courts = Resource.objects.filter(location=location, kind__in=COURT_KINDS, is_active=True)
    url = qr_url(location)
    return State(
        kind="lobby",
        location_name=location.name,
        server_time=now,
        league=league,
        events=_events(location, now),
        announcements=_announcements(),
        courts=[
            _court(r, now, season, visible, spotlight_id) for r in courts.order_by("sort_order")
        ],
        cafe_ready=list(
            CafeOrder.objects.filter(
                location=location, day=clock.today_local(), status=OrderStatus.READY
            )
            .order_by("ready_at", "number")
            .values_list("number", flat=True)
        ),
        qr_url=url,
        qr_svg=_qr(url),
    )
