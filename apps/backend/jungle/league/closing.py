"""Closing a season (§6.12, §6.13, LG-100, LG-120 … LG-122, LG-134).

When the season is over and no match is left half-way, the manager closes it:
- the standings become final (LG-100: only players with the minimum of matches are ranked
  for the rewards);
- the rewards fixed at the start of the season are issued automatically (Q6 default): the
  top 3 Kings of the Jungle (free hours, balls and the special card) and the top 3 of every
  rank (a discount the following month on the subscription and on bookings), as vouchers in
  the player's account; "Season 0 – Calibration" has no prizes (Q27);
- the winners enter the Hall of Fame, which stays on the website.
The next season is then activated from this one (LG-130).
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from functools import partial
from typing import Any

from django.db import transaction
from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.accounts.services.authz import authorize
from jungle.attendance.models import StaffNotice
from jungle.audit import services as audit
from jungle.cards import services as cards
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action, Role
from jungle.league import badges, notify, projection, services, store
from jungle.league.models import (
    OPEN_STATUSES,
    AwardKind,
    Challenge,
    ChallengeStatus,
    LeagueMatch,
    LeagueSeason,
    MatchStatus,
    SeasonAward,
    SeasonStatus,
    Standing,
)
from jungle.rewards.models import VoucherSource
from jungle.rewards.services import VoucherData, issue_voucher

TIERS = ("master", "diamond", "platinum", "gold", "silver", "bronze")
TIER_RO = {
    "bronze": "Bronz",
    "silver": "Argint",
    "gold": "Aur",
    "platinum": "Platină",
    "diamond": "Diamant",
    "master": "Maestru",
}
NOTICE_REWARDS = "league.season_rewards"
UNFINISHED = (*OPEN_STATUSES, MatchStatus.DISPUTED)


def _people(row: Standing) -> Iterator[User]:
    yield row.player_a
    if row.player_b is not None:
        yield row.player_b


def _winners(season: LeagueSeason, ladder: str) -> list[tuple[str, str, int, Standing]]:
    """(kind, tier, position, row): the final standings, only the eligible and visible."""
    rules = season.rewards
    rows = list(
        Standing.objects.filter(season=season, ladder=ladder, position__isnull=False, eligible=True)
        .select_related("player_a", "player_b")
        .order_by("position")
    )
    winners = [
        (AwardKind.KING.value, "master", n, row)
        for n, row in enumerate(
            [r for r in rows if r.tier == "master"][: rules["kings"]["top"]], start=1
        )
    ]
    for tier in TIERS:
        in_tier = [r for r in rows if r.tier == tier][: rules["tier_top"]["top"]]
        winners += [(AwardKind.TIER_TOP.value, tier, n, row) for n, row in enumerate(in_tier, 1)]
    return winners


def _label(kind: str, tier: str, position: int, language: str) -> str:
    if kind == AwardKind.KING:
        return (
            f"locul {position} între Regii Junglei"
            if language == "ro"
            else f"number {position} of the Kings of the Jungle"
        )
    return (
        f"locul {position} în rangul {TIER_RO[tier]}"
        if language == "ro"
        else f"number {position} in {tier.title()}"
    )


def _voucher_line(rule: dict[str, Any], language: str) -> str:
    count, value = rule["count"], rule["value"]
    ro = language == "ro"
    what = {
        "hour": (f"{value} de minute gratuite" if ro else f"{value} free minutes"),
        "amount": (f"{value / 100:.2f} RON" if ro else f"RON {value / 100:.2f}"),
        "percent": (f"{value}% reducere" if ro else f"{value}% off"),
    }[rule["kind"]]
    target = {
        "booking": ("la o rezervare" if ro else "on a booking"),
        "subscription": ("la abonament" if ro else "on a subscription"),
        "any": ("la orice" if ro else "on anything"),
    }[rule["target"]]
    days = rule["valid_days"]
    valid = f"valabil {days} de zile" if ro else f"valid for {days} days"
    return f"{count} × {what} {target}, {valid}"


def _email(user: User, season: LeagueSeason, kind: str, tier: str, position: int) -> None:
    rule = season.rewards["kings" if kind == AwardKind.KING else "tier_top"]
    language = user.preferred_language if user.preferred_language in ("ro", "en") else "ro"
    notify.send(
        "league_season_reward",
        user,
        {
            "season": season.name,
            "award": _label(kind, tier, position, language),
            "rewards": [_voucher_line(v, language) for v in rule["vouchers"]],
            "extras": rule["extras"][language],
        },
        notify.ACCOUNT_VOUCHERS_PATH,
    )


def _award(season: LeagueSeason) -> list[SeasonAward]:
    rules = season.rewards
    # Players who left the league have no place in the standings, so no reward (R-011).
    awards: list[SeasonAward] = []
    kings_for_extras: list[str] = []
    for kind, tier, position, row in _winners(season, rules["ladder"]):
        rule = rules["kings" if kind == AwardKind.KING else "tier_top"]
        for user in _people(row):
            vouchers = [
                str(
                    issue_voucher(
                        audit.SYSTEM,
                        user,
                        VoucherData(
                            kind=v["kind"],
                            value=v["value"],
                            target=v["target"],
                            valid_days=v["valid_days"],
                            reason=f"{season.name}: {_label(kind, tier, position, 'ro')}",
                        ),
                        VoucherSource.REWARD,
                    ).pk
                )
                for v in rule["vouchers"]
                for _ in range(v["count"])
            ]
            awards.append(
                SeasonAward.objects.create(
                    season=season,
                    kind=kind,
                    ladder=rules["ladder"],
                    tier=tier,
                    position=position,
                    user=user,
                    competitor_id=row.competitor_id,
                    vouchers=vouchers,
                    created_at=clock.now(),
                )
            )
            if kind == AwardKind.KING:
                cards.offer_king_card(user, season.location)
                badges.grant(user, "king", str(season.pk), season, {"position": position})
                kings_for_extras.append(f"{user.first_name} {user.last_name}")
            transaction.on_commit(partial(_email, user, season, kind, tier, position))
    if kings_for_extras and rules["kings"]["extras"]["ro"]:
        StaffNotice.objects.create(
            location_id=season.location_id,
            recipient_role=Role.MANAGER,
            kind=NOTICE_REWARDS,
            payload={"season": season.name, "kings": kings_for_extras, **rules["kings"]["extras"]},
            created_at=clock.now(),
        )
    return awards


def close_season(request: HttpRequest, season_id: uuid.UUID) -> LeagueSeason:
    with transaction.atomic():
        season = LeagueSeason.objects.select_for_update().filter(pk=season_id).first()
        if season is None:
            raise DomainError(ErrorCode.LEAGUE_SEASON_INVALID, status=404)
        authorize(request, Action.LEAGUE_MANAGE, season.location_id)
        if season.status != SeasonStatus.ACTIVE:
            raise DomainError(ErrorCode.LEAGUE_SEASON_INVALID, status=409)
        store.snapshot_for_update(season)  # no event lands while the season closes
        if clock.now() < season.ends_at:
            ends = season.ends_at.astimezone(clock.BUSINESS_TZ)
            raise DomainError(
                ErrorCode.LEAGUE_SEASON_NOT_OVER,
                status=409,
                params={"ends": f"{ends:%d.%m.%Y %H:%M}"},
            )
        unfinished = LeagueMatch.objects.filter(season=season, status__in=UNFINISHED).count()
        if unfinished:
            raise DomainError(
                ErrorCode.LEAGUE_SEASON_OPEN_MATCHES, status=409, params={"count": unfinished}
            )
        season.status = SeasonStatus.CLOSED
        season.closed_at = clock.now()
        season.save(update_fields=["status", "closed_at"])
        Challenge.objects.filter(
            season=season, status__in=(ChallengeStatus.PENDING, ChallengeStatus.ACCEPTED)
        ).update(status=ChallengeStatus.CANCELLED)
        services.refresh_standings(season)  # final: LG-100
        awards = [] if season.is_calibration else _award(season)
        audit.record(
            audit.actor_from_request(request),
            "league.season_closed",
            target=season,
            after={"awards": len(awards), "calibration": season.is_calibration},
        )
    return season


# ---------------------------------------------------------------- the Hall of Fame (LG-134)
@dataclass(frozen=True)
class FameEntry:
    kind: str
    tier: str
    position: int
    first_name: str
    last_name: str


@dataclass(frozen=True)
class FameSeason:
    number: int
    name: str
    ends_at: Any
    entries: list[FameEntry]


def hall_of_fame(season_rows: list[LeagueSeason]) -> list[FameSeason]:
    """Only public data (R-012): names, rank and place; players who left are not shown."""
    visible = projection.visible_players()
    result = []
    for season in season_rows:
        entries = [
            FameEntry(a.kind, a.tier, a.position, a.user.first_name, a.user.last_name)
            for a in season.awards.select_related("user").order_by("kind", "tier", "position")
            if str(a.user_id) in visible
        ]
        result.append(FameSeason(season.number, season.name, season.ends_at, entries))
    return result
