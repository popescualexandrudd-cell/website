"""Closing a season: final standings, rewards, the Hall of Fame (§6.12, §6.13, LG-100,
LG-120 … LG-122, LG-134)."""

from __future__ import annotations

import uuid
from collections.abc import Callable
from typing import Any

import pytest
from django.core import mail
from django.test import Client

from jungle.accounts.models import User
from jungle.attendance.models import StaffNotice
from jungle.audit.services import SYSTEM
from jungle.cards import services as cards
from jungle.cards.models import PhysicalCardRequest, PrintReason
from jungle.conftest import Api, grant, login_as
from jungle.core.errors import DomainError
from jungle.core.permissions import Role
from jungle.devices.models import Device
from jungle.league import challenges, closing, matches, services
from jungle.league.models import (
    Badge,
    Challenge,
    ChallengeStatus,
    LeagueSeason,
    SeasonAward,
    SeasonStatus,
    Standing,
)
from jungle.league.tests.conftest import at, placed, play, staff_request
from jungle.league.tests.test_matches import Game, kiosk_call
from jungle.locations.models import Resource, ResourceKind
from jungle.rewards.models import Voucher

pytestmark = pytest.mark.django_db

Join = Callable[..., User]
SEASON_OVER = "2027-07-01T10:00:00+03:00"


def configure(season: LeagueSeason, **values: Any) -> LeagueSeason:
    """For the tests: the minimum of matches (LG-100) and other values of the season."""
    LeagueSeason.objects.filter(pk=season.pk).update(config=values)
    season.refresh_from_db()
    return season


def refused(exc: pytest.ExceptionInfo[DomainError]) -> tuple[str, int]:
    return exc.value.code.value, exc.value.status


def test_a_season_closes_only_when_it_is_over(
    season: LeagueSeason, join: Join, manager: User, now: Any, make_user: Callable[..., User]
) -> None:
    request = staff_request(manager)
    with pytest.raises(DomainError) as exc:
        closing.close_season(request, season.pk)
    assert refused(exc) == ("league.season_not_over", 409)
    assert exc.value.params == {"ends": "01.07.2027 00:00"}
    with pytest.raises(DomainError) as exc:
        closing.close_season(request, uuid.uuid4())
    assert refused(exc) == ("league.season_invalid", 404)
    coach = make_user()
    grant(coach, Role.COACH, season.location)
    with pytest.raises(DomainError) as exc:
        closing.close_season(staff_request(coach), season.pk)
    assert refused(exc) == ("auth.forbidden", 403)


def test_open_matches_keep_the_season_open(
    season: LeagueSeason, join: Join, manager: User, now: Any, kiosk: Device, location: Any
) -> None:
    court = Resource.objects.create(
        location=location, slug="teren-9", name="Teren 9", kind=ResourceKind.PADEL_COURT
    )
    game = Game(season, court, [join() for _ in range(4)])
    now.move_to("2027-04-05T11:35:00+03:00")
    matches.propose(kiosk_call(), kiosk, game.proposal())
    now.move_to(SEASON_OVER)
    with pytest.raises(DomainError) as exc:
        closing.close_season(staff_request(manager), season.pk)
    assert refused(exc) == ("league.season_open_matches", 409)
    assert exc.value.params == {"count": 1}


def test_lg120_lg121_rewards_and_the_hall_of_fame(
    api: Api,
    client: Client,
    season: LeagueSeason,
    join: Join,
    manager: User,
    now: Any,
    kiosk: Device,
    location: Any,
    django_capture_on_commit_callbacks: Any,
) -> None:
    configure(season, min_matches_per_season=1, min_matches_per_season_pairs=1)
    a, b, c, d = placed(season, join)
    e, _f, g, h = placed(season, join)
    for p in (a, e):
        cards.issue_card(SYSTEM, p)
    pending = challenges.issue(
        kiosk_call(),
        kiosk,
        challenges.ChallengeData(
            (cards.issue_card(SYSTEM, g).token, cards.issue_card(SYSTEM, h).token),
            (c.pk, d.pk),
        ),
    )
    now.move_to(SEASON_OVER)
    with django_capture_on_commit_callbacks(execute=True):
        closed = closing.close_season(staff_request(manager), season.pk)
    assert closed.status == SeasonStatus.CLOSED and closed.closed_at is not None
    assert Challenge.objects.get(pk=pending.pk).status == ChallengeStatus.CANCELLED

    awards = list(SeasonAward.objects.filter(season=season).order_by("tier", "position"))
    tiers = {(aw.tier, aw.position) for aw in awards}
    assert tiers == {
        ("gold", 1),
        ("gold", 2),
        ("gold", 3),
        ("silver", 1),
        ("silver", 2),
        ("silver", 3),
    }
    # Q6 (28.09.2026): each winner chooses in the account; nothing is issued before the choice.
    assert all(aw.kind == "tier_top" and aw.vouchers == [] and aw.choice == "" for aw in awards)
    assert not Voucher.objects.exists()
    assert len(mail.outbox) == 6 and "Sezonul 1" in mail.outbox[0].subject
    assert "la alegere, din cont" in mail.outbox[0].body and " sau " in mail.outbox[0].body

    winner = awards[0].user
    request = staff_request(winner)
    assert [a.pk for a in closing.pending_choices(winner)] == [awards[0].pk]
    with pytest.raises(DomainError) as exc:
        closing.choose(request, awards[0].pk, "cash")
    assert refused(exc) == ("league.reward_option_invalid", 400)
    chosen = closing.choose(request, awards[0].pk, "bookings")
    assert chosen.choice == "bookings" and len(chosen.vouchers) == 4
    assert {(v.kind, v.value, v.target) for v in Voucher.objects.all()} == {
        ("percent", 20, "booking")
    }
    with pytest.raises(DomainError) as exc:  # chosen once
        closing.choose(request, awards[0].pk, "subscription")
    assert refused(exc) == ("league.reward_not_found", 404)
    other = awards[1]
    with pytest.raises(DomainError) as exc:  # only the winner chooses
        closing.choose(request, other.pk, "subscription")
    assert refused(exc) == ("league.reward_not_found", 404)
    login_as(client, other.user, mfa=False)
    mine = api.get("/league/me/rewards").json()
    assert [(r["id"], sorted(r["options"])) for r in mine] == [
        (other.pk, ["bookings", "subscription"])
    ]
    picked = api.post(f"/league/me/rewards/{other.pk}/choose", {"option": "subscription"})
    assert picked.status_code == 200
    assert Voucher.objects.filter(holder=other.user, value=15, target="subscription").count() == 1
    assert api.get("/league/me/rewards").json() == []
    assert not StaffNotice.objects.filter(kind=closing.NOTICE_REWARDS).exists()  # no kings

    final = Standing.objects.filter(season=season, ladder="doubles", position__isnull=False)
    assert final.count() == 8 and all(r.eligible for r in final)

    fame = api.get(f"/league/hall-of-fame?location={location.slug}").json()
    assert [(s["number"], len(s["entries"])) for s in fame] == [(1, 6)]
    assert set(fame[0]["entries"][0]) == {"kind", "tier", "position", "first_name", "last_name"}

    with pytest.raises(DomainError) as exc:  # a closed season is final (LG-134)
        play(season, (a, b), (c, d), at("2027-07-01 09:00"))
    assert refused(exc) == ("league.no_active_season", 409)
    with pytest.raises(DomainError) as exc:
        closing.close_season(staff_request(manager), season.pk)
    assert refused(exc) == ("league.season_invalid", 409)


def test_lg100_under_the_minimum_no_reward(
    season: LeagueSeason, join: Join, manager: User, now: Any
) -> None:
    placed(season, join)  # 5 matches each; the default minimum is 12
    now.move_to(SEASON_OVER)
    closing.close_season(staff_request(manager), season.pk)
    assert not SeasonAward.objects.exists()
    assert not Standing.objects.filter(season=season, eligible=True).exists()


def test_q27_the_calibration_season_has_no_prizes(
    new_season: Callable[..., LeagueSeason], join: Join, manager: User, now: Any
) -> None:
    season = new_season(activate=False)
    LeagueSeason.objects.filter(pk=season.pk).update(is_calibration=True)
    season = services.activate_season(staff_request(manager), season.pk)
    configure(season, min_matches_per_season=1)
    placed(season, join)
    now.move_to(SEASON_OVER)
    closing.close_season(staff_request(manager), season.pk)
    assert not SeasonAward.objects.exists() and not Voucher.objects.exists()


def test_lg120_the_kings_of_the_jungle(
    season: LeagueSeason,
    join: Join,
    manager: User,
    now: Any,
    django_capture_on_commit_callbacks: Any,
) -> None:
    configure(season, min_matches_per_season=1, placement_cap_index=20)
    players = placed(season, lambda: join(level="7.00"))
    for p in players:
        cards.issue_card(SYSTEM, p)
    masters = list(
        Standing.objects.filter(season=season, ladder="doubles", tier="master").order_by("position")
    )
    assert masters
    left = players[-1]  # a player who leaves the league before the end is not rewarded
    services.leave(left, "test")
    now.move_to(SEASON_OVER)
    with django_capture_on_commit_callbacks(execute=True):
        closing.close_season(staff_request(manager), season.pk)
    kings = SeasonAward.objects.filter(season=season, kind="king").order_by("position")
    assert 1 <= kings.count() <= 3 and left.pk not in {k.user_id for k in kings}
    for king in kings:
        assert Voucher.objects.filter(pk__in=king.vouchers, kind="hour", value=60).count() == 2
        assert Badge.objects.filter(user=king.user, code="king", key=str(season.pk)).exists()
    assert PhysicalCardRequest.objects.filter(reason=PrintReason.KING).count() == kings.count()
    notice = StaffNotice.objects.get(kind=closing.NOTICE_REWARDS)
    assert notice.payload["ro"] == "o cutie de mingi și cardul special al Regelui Junglei"
    assert len(notice.payload["kings"]) == kings.count()
    king_mail = [m for m in mail.outbox if "Regii Junglei" in m.body]
    assert king_mail and "La recepție te așteaptă și" in king_mail[0].body
    assert str(kings.first()).startswith(str(season.pk))
    request_row = PhysicalCardRequest.objects.filter(reason=PrintReason.KING).first()
    assert request_row is not None and cards.printable(request_row).subtitle == "Rege al Junglei"


def test_the_king_card_needs_an_active_card(season: LeagueSeason, join: Join) -> None:
    assert cards.offer_king_card(join(), season.location) is None


def test_reward_texts_in_english() -> None:
    rule = {"kind": "amount", "value": 5000, "target": "any", "count": 1, "valid_days": 30}
    assert closing._voucher_line(rule, "en") == "1 × RON 50.00 on anything, valid for 30 days"
    assert closing._voucher_line({**rule, "kind": "hour", "value": 60}, "en").startswith(
        "1 × 60 free minutes"
    )
    assert closing._label("king", "master", 1, "en") == "number 1 of the Kings of the Jungle"
    assert closing._label("tier_top", "gold", 2, "en") == "number 2 in Gold"


def test_rewards_on_the_pairs_ladder_through_the_api(
    api: Api,
    staff: Callable[..., User],
    season: LeagueSeason,
    join: Join,
    now: Any,
    location: Any,
) -> None:
    configure(season, min_matches_per_season=1, min_matches_per_season_pairs=1)
    LeagueSeason.objects.filter(pk=season.pk).update(rewards={**season.rewards, "ladder": "pairs"})
    a, b, c, d = placed(season, join)
    now.move_to(SEASON_OVER)
    staff(Role.MANAGER, location)
    closed = api.post(f"/staff/league/seasons/{season.pk}/close")
    assert closed.status_code == 200 and closed.json()["status"] == "closed"
    winners = set(SeasonAward.objects.values_list("user_id", flat=True))
    assert winners == {a.pk, b.pk, c.pk, d.pk}  # both players of each pair
    assert set(SeasonAward.objects.values_list("ladder", flat=True)) == {"pairs"}
