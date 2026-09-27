"""Entering and leaving the league, the level questionnaire and the seasons
(R-003, R-006, R-010, R-011, §6.4, §6.13)."""

from __future__ import annotations

import uuid
from collections.abc import Callable
from datetime import date
from decimal import Decimal
from typing import Any

import pytest
from django.test import Client
from jungle_league.engine import Ladder

from jungle.accounts.models import User
from jungle.audit.models import AuditLog
from jungle.audit.services import SYSTEM
from jungle.configuration.models import Marker
from jungle.configuration.services import publish_config
from jungle.conftest import Api, error_code, grant, login_as
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Role
from jungle.devices.models import Device
from jungle.league import services, store
from jungle.league.models import (
    EventKind,
    LeagueEvent,
    LeaguePlayer,
    LeagueSeason,
    LevelQuestionnaire,
    PlayerStatus,
    SeasonStatus,
    Standing,
)
from jungle.league.tests.conftest import (
    SEASON_END,
    SEASON_START,
    at,
    kiosk_request,
    play,
    staff_request,
)
from jungle.locations.models import Location
from jungle.privacy import league_consent
from jungle.privacy import services as privacy

pytestmark = pytest.mark.django_db

Join = Callable[..., User]
ANSWERS = {"band": "3.0", "years_playing": 2, "racket_background": "none", "tournaments": "none"}


# ---------------------------------------------------------------- questionnaire (R-003, Q47)
@pytest.mark.parametrize(
    ("answers", "level"),
    [
        (ANSWERS, "3.25"),
        ({**ANSWERS, "years_playing": 0}, "3.00"),
        ({**ANSWERS, "racket_background": "competitive"}, "3.50"),
        (
            {**ANSWERS, "racket_background": "competitive", "tournaments": "regional_national"},
            "3.50",
        ),
        ({**ANSWERS, "band": "1.0", "years_playing": 0}, "1.00"),
        ({**ANSWERS, "band": "6.0", "tournaments": "regional_national"}, "6.75"),
    ],
)
def test_r003_q47_estimate_stays_inside_the_band(answers: dict[str, Any], level: str) -> None:
    assert services.estimate_level(answers) == Decimal(level)


@pytest.mark.parametrize(
    "answers",
    [
        {**ANSWERS, "band": "7.5"},
        {**ANSWERS, "years_playing": "multi"},
        {**ANSWERS, "years_playing": 81},
        {**ANSWERS, "racket_background": "squash"},
        {**ANSWERS, "tournaments": "world"},
        {"band": "3.0"},
    ],
)
def test_r003_invalid_answers_are_refused(answers: dict[str, Any]) -> None:
    with pytest.raises(DomainError) as exc:
        services.estimate_level(answers)
    assert exc.value.code is ErrorCode.LEAGUE_QUESTIONNAIRE_INVALID


def test_r003_a_new_questionnaire_replaces_the_pending_one(
    api: Api, client: Client, make_user: Callable[..., User], location: Location
) -> None:
    player = make_user()
    login_as(client, player, mfa=False)
    first = api.post("/league/questionnaire", ANSWERS)
    assert first.status_code == 201 and first.json()["estimated_level"] == "3.25"
    assert api.post("/league/questionnaire", {**ANSWERS, "band": "4.0"}).status_code == 201
    assert list(LevelQuestionnaire.objects.values_list("estimated_level", flat=True)) == [
        Decimal("4.25")
    ]
    assert api.post("/league/questionnaire", {**ANSWERS, "band": "9"}).status_code == 422

    coach = make_user()
    grant(coach, Role.COACH, location)
    services.validate_questionnaire(
        staff_request(coach), LevelQuestionnaire.objects.get().id, location.id, Decimal("4.0")
    )
    api.post("/league/questionnaire", ANSWERS)  # the validated level is kept
    assert LevelQuestionnaire.objects.count() == 2
    assert services.validated_questionnaire(player) is not None


# ---------------------------------------------------------------- joining (R-006, R-010, §6.4)
def test_r010_joining_needs_level_and_consent(
    api: Api,
    client: Client,
    staff: Callable[..., User],
    make_user: Callable[..., User],
    kiosk: Device,
    league_text: None,
    location: Location,
    season: LeagueSeason,
) -> None:
    player = make_user(first_name="Radu")
    login_as(client, player, mfa=False)
    me = api.get("/league/me").json()
    assert (me["in_league"], me["adult"], me["consent_signed"], me["questionnaire"]) == (
        False,
        True,
        False,
        "none",
    )
    questionnaire = api.post("/league/questionnaire", ANSWERS).json()
    assert api.get("/league/me").json()["questionnaire"] == "pending"

    staff(Role.COACH, location)
    pending = api.get(f"/staff/league/questionnaires?location_id={location.id}").json()
    assert [(q["id"], q["name"]) for q in pending] == [
        (questionnaire["id"], f"Radu {player.last_name}")
    ]
    validated = api.post(
        f"/staff/league/questionnaires/{questionnaire['id']}/validate",
        {"location_id": str(location.id), "level": "3.50", "sigma": "6.5", "note": "Joc bun"},
    )
    assert validated.status_code == 200 and validated.json()["validated_level"] == "3.50"
    assert not services.is_playing(player)  # the consent is still missing

    league_consent.sign(kiosk_request(), player, kiosk, "ro")
    assert services.is_playing(player)
    row = Standing.objects.get(season=season, ladder="doubles", competitor_id=str(player.pk))
    assert (row.placement_left, row.position) == (5, None)
    assert row.level == pytest.approx(3.5)
    state = store.current_state(season)
    assert state.competitors[Ladder.DOUBLES][str(player.pk)].rating.sigma == 6.5
    assert AuditLog.objects.filter(action="league.joined").count() == 1

    login_as(client, player, mfa=False)
    me = api.get("/league/me").json()
    assert (me["in_league"], me["consent_signed"], me["questionnaire"]) == (
        True,
        True,
        "validated",
    )
    assert me["ladders"][0]["ladder"] == "doubles" and me["ladders"][0]["placement_left"] == 5
    assert services.try_join(player) == LeaguePlayer.objects.get(user=player)  # nothing new
    assert LeagueEvent.objects.filter(kind=EventKind.REGISTER).count() == 1


def test_r006_minors_and_closed_accounts_do_not_join(
    join: Join, make_user: Callable[..., User]
) -> None:
    player = join()
    player.is_active = False
    player.save()
    assert services.eligible(player) is False
    minor = make_user(date_of_birth=date(2010, 1, 1))  # 17 in April 2027
    LevelQuestionnaire.objects.create(
        user=minor,
        answers=ANSWERS,
        estimated_level=Decimal("3"),
        submitted_at=clock.now(),
        validated_at=clock.now(),
    )
    assert services.try_join(minor) is None


def test_validation_errors(
    api: Api,
    client: Client,
    staff: Callable[..., User],
    make_user: Callable[..., User],
    location: Location,
) -> None:
    player = make_user()
    q = services.submit_questionnaire(staff_request(player), ANSWERS)
    coach = staff(Role.COACH, location)
    url = f"/staff/league/questionnaires/{q.id}/validate"
    assert api.post(url, {"location_id": str(location.id), "level": "7.5"}).status_code == 422
    with pytest.raises(DomainError) as exc:
        services.validate_questionnaire(
            staff_request(coach), q.id, location.id, Decimal("3"), Decimal("0.1")
        )
    assert exc.value.code is ErrorCode.LEAGUE_QUESTIONNAIRE_INVALID
    assert api.post(url, {"location_id": str(location.id), "level": "3"}).status_code == 200
    again = api.post(url, {"location_id": str(location.id), "level": "3"})
    assert error_code(again) == "league.questionnaire_not_found" and again.status_code == 404

    login_as(client, player, mfa=False)  # a player cannot validate
    assert api.post(url, {"location_id": str(location.id), "level": "3"}).status_code == 403
    assert api.get(f"/staff/league/questionnaires?location_id={location.id}").status_code == 403


# ---------------------------------------------------------------- leaving (R-011, §12.2)
def test_r011_withdrawing_the_consent_leaves_and_signing_again_returns(
    join: Join, kiosk: Device, season: LeagueSeason
) -> None:
    a, b, c, d = (join() for _ in range(4))
    play(season, (a, b), (c, d), at("2027-04-05 10:00"))
    request = kiosk_request()
    request.user = a
    league_consent.withdraw(request)
    player = LeaguePlayer.objects.get(user=a)
    assert player.status == PlayerStatus.WITHDRAWN and player.left_at is not None
    assert AuditLog.objects.filter(action="league.left").count() == 1
    assert not services.is_playing(a)

    league_consent.sign(kiosk_request(), a, kiosk, "ro")  # comes back with the same rating
    assert services.is_playing(a)
    assert LeagueEvent.objects.filter(kind=EventKind.REGISTER, ref=str(a.pk)).count() == 1
    row = Standing.objects.get(season=season, ladder="doubles", competitor_id=str(a.pk))
    assert row.matches_played == 1


def test_r011_leaving_without_having_joined_records_nothing(
    make_user: Callable[..., User], kiosk: Device, league_text: None, now: Any
) -> None:
    person = make_user()
    league_consent.sign(kiosk_request(), person, kiosk, "ro")  # no validated level: not joined
    request = kiosk_request()
    request.user = person
    league_consent.withdraw(request)
    assert not AuditLog.objects.filter(action="league.left").exists()


def test_privacy_erasure_takes_the_player_out(join: Join, season: LeagueSeason) -> None:
    a, b, c, d = (join() for _ in range(4))
    play(season, (a, b), (c, d), at("2027-04-05 10:00"))
    privacy.erase(SYSTEM, a)
    assert not services.is_playing(a)
    assert services.eligible(User.objects.get(pk=a.pk)) is False


# ---------------------------------------------------------------- seasons (§6.13)
def test_seasons_are_created_and_activated_by_the_manager(
    api: Api, staff: Callable[..., User], location: Location, now: Any
) -> None:
    staff(Role.MANAGER)
    body = {
        "location_id": str(location.id),
        "number": 0,
        "name": "Sezonul 0 – Calibrare",
        "starts_at": SEASON_START.isoformat(),
        "ends_at": SEASON_END.isoformat(),
        "is_calibration": True,
    }
    created = api.post("/staff/league/seasons", body)
    assert created.status_code == 201 and created.json()["status"] == "planned"
    assert error_code(api.post("/staff/league/seasons", body)) == "league.season_invalid"
    backwards = {**body, "number": 1, "ends_at": SEASON_START.isoformat()}
    assert error_code(api.post("/staff/league/seasons", backwards)) == "league.season_invalid"
    elsewhere = api.post("/staff/league/seasons", {**body, "location_id": str(uuid.uuid4())})
    assert elsewhere.status_code == 404

    season_id = created.json()["id"]
    activated = api.post(f"/staff/league/seasons/{season_id}/activate")
    assert activated.status_code == 200 and activated.json()["status"] == "active"
    assert api.post(f"/staff/league/seasons/{season_id}/activate").status_code == 409
    second = api.post("/staff/league/seasons", {**body, "number": 1}).json()["id"]
    assert api.post(f"/staff/league/seasons/{second}/activate").status_code == 409  # one at a time
    assert api.post(f"/staff/league/seasons/{uuid.uuid4()}/activate").status_code == 404

    rebuilt = api.post(f"/staff/league/seasons/{season_id}/rebuild")
    assert rebuilt.status_code == 200
    assert AuditLog.objects.filter(action="league.season_rebuilt").exists()
    assert api.post(f"/staff/league/seasons/{uuid.uuid4()}/rebuild").status_code == 404


def test_seasons_are_not_for_coaches(
    api: Api, staff: Callable[..., User], location: Location
) -> None:
    staff(Role.COACH, location)
    body = {
        "location_id": str(location.id),
        "number": 1,
        "name": "Sezonul 1",
        "starts_at": SEASON_START.isoformat(),
        "ends_at": SEASON_END.isoformat(),
    }
    assert api.post("/staff/league/seasons", body).status_code == 403


def test_adr0022_a_season_keeps_the_values_of_its_start(
    make_user: Callable[..., User], new_season: Callable[..., LeagueSeason], join: Join
) -> None:
    admin = make_user()
    grant(admin, Role.ADMIN)
    with pytest.raises(DomainError) as exc:
        publish_config(
            staff_request(admin), "league.config", {"placement_matches": -1}, Marker.TO_CONFIRM, "x"
        )
    assert exc.value.code is ErrorCode.CONFIG_INVALID_VALUE
    publish_config(
        staff_request(admin),
        "league.config",
        {"placement_matches": 3},
        Marker.TO_CONFIRM,
        "Test Q45",
    )
    season = new_season()
    assert season.config == {"placement_matches": 3}
    player = join()
    row = Standing.objects.get(season=season, ladder="doubles", competitor_id=str(player.pk))
    assert row.placement_left == 3


def test_lg130_a_new_season_starts_from_the_previous_one(
    new_season: Callable[..., LeagueSeason], join: Join, now: Any
) -> None:
    first = new_season(1)
    a, b, c, d = (join() for _ in range(4))
    for when in (
        "2027-04-05 10:00",
        "2027-04-05 12:00",
        "2027-04-05 14:00",
        "2027-04-06 10:00",
        "2027-04-06 12:00",
    ):
        play(first, (a, b), (c, d), at(when))
    assert (
        Standing.objects.filter(season=first, ladder="doubles", position__isnull=False).count() == 4
    )
    LeagueSeason.objects.filter(pk=first.pk).update(
        status=SeasonStatus.CLOSED, closed_at=clock.now()
    )
    newcomer = join()  # no active season now: joins, registered at the next start

    second = new_season(2)
    state = store.current_state(second)
    assert state.season == 2
    doubles = state.competitors[Ladder.DOUBLES]
    config = store.config_for(second)
    for player in (a, b, c, d):  # LP 0, rank hidden until re-placement (LG-131)
        competitor = doubles[str(player.pk)]
        assert competitor.rank is None and competitor.placement_left == config.replacement_matches
    assert doubles[str(newcomer.pk)].placement_left == config.placement_matches
    assert Standing.objects.filter(season=second, ladder="doubles").count() == 5
