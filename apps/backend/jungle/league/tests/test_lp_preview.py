"""The website's points simulator (§9.2.7): the LP of one match, from the league engine itself
(LG-060 … LG-066, LG-053 … LG-056) with the running season's values. Nothing is read or stored."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest
from jungle_league.config import LeagueConfig
from jungle_league.ranks import RankChange, RankState

from jungle.accounts.models import User
from jungle.audit.models import AuditLog
from jungle.configuration.models import Marker
from jungle.configuration.services import publish_config
from jungle.conftest import Api, error_code, grant
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Role
from jungle.league import lp_preview
from jungle.league.models import LeagueEvent, LeagueSeason, SeasonStatus
from jungle.league.tests.conftest import staff_request
from jungle.locations.models import Location

pytestmark = pytest.mark.django_db

CONFIG = LeagueConfig()
EVEN = (4.0, 4.0, 4.0, 4.0)
GOLD_IV_50 = RankState(8, 50)


@pytest.mark.parametrize(
    ("levels", "state", "result", "kind", "chance", "lp", "after", "change"),
    [
        # equal teams at the rank of one's level (Gold I): K/2 = ±20 (LG-060); a loss −20
        (EVEN, RankState(11, 50), "win", "official", 0.5, 20, ("gold", "I", 70), RankChange.NONE),
        # below the rank of one's level: climbs faster, loses less (LG-062)
        (EVEN, GOLD_IV_50, "win", "official", 0.5, 26, ("gold", "IV", 76), RankChange.NONE),
        (EVEN, GOLD_IV_50, "loss", "official", 0.5, -15, ("gold", "IV", 35), RankChange.NONE),
        # the weaker team wins: more LP
        (
            (3.0, 3.0, 4.0, 4.0),
            GOLD_IV_50,
            "win",
            "official",
            0.221,
            28,
            ("gold", "IV", 78),
            RankChange.NONE,
        ),
        # a tournament ×1.5 (LG-063) and a promotion with the surplus (LG-053)
        (
            (4.0, 4.0, 3.0, 4.0),
            RankState(8, 90),
            "win",
            "tournament",
            0.65,
            27,
            ("gold", "III", 17),
            RankChange.PROMOTED,
        ),
        # a demotion to 75 LP (LG-055); the Bronze IV floor (LG-056)
        (
            (4.0, 4.0, 5.0, 5.0),
            RankState(9, 5),
            "loss",
            "official",
            0.221,
            -7,
            ("gold", "IV", 75),
            RankChange.DEMOTED,
        ),
        (
            (1.0, 1.0, 1.0, 1.0),
            RankState(0, 10),
            "loss",
            "official",
            0.5,
            -23,
            ("bronze", "IV", 0),
            RankChange.NONE,
        ),
        # Master has no divisions and no LP ceiling
        (
            (7.0, 7.0, 7.0, 7.0),
            RankState(20, 300),
            "win",
            "official",
            0.5,
            24,
            ("master", None, 324),
            RankChange.NONE,
        ),
    ],
)
def test_lg060_the_preview_is_the_engine_on_a_plain_match(
    levels: Any,
    state: RankState,
    result: Any,
    kind: Any,
    chance: float,
    lp: int,
    after: Any,
    change: RankChange,
) -> None:
    shown = lp_preview.preview(CONFIG, levels, state, result, kind)
    assert shown.win_probability == pytest.approx(chance, abs=0.001)
    assert shown.lp == lp
    assert (shown.after.tier, shown.after.division, shown.after.lp) == after
    assert shown.change is change
    assert shown.before == lp_preview.rank_of(state)


@pytest.mark.parametrize(
    ("level", "towards"),
    [
        (1.0, ("bronze", "IV")),
        (4.0, ("gold", "I")),
        (5.5, ("diamond", "II")),
        (7.0, ("master", None)),
    ],
)
def test_lg061_towards_is_the_rank_the_league_pushes_a_level_to(level: float, towards: Any) -> None:
    shown = lp_preview.preview(CONFIG, (level, 4.0, 4.0, 4.0), RankState(0, 0), "win", "official")
    assert (shown.towards.tier, shown.towards.division) == towards


@pytest.mark.parametrize(
    ("tier", "division", "lp", "index"),
    [
        ("bronze", "IV", 0, 0),
        ("silver", "II", 99, 6),
        ("diamond", "I", 10, 19),
        ("master", None, 5000, 20),
    ],
)
def test_the_chosen_rank(tier: Any, division: Any, lp: int, index: int) -> None:
    assert lp_preview.rank_state(tier, division, lp) == RankState(index, lp)


@pytest.mark.parametrize(
    ("tier", "division", "lp"),
    [
        ("gold", None, 10),
        ("gold", "II", 100),
        ("gold", "II", -1),
        ("master", "I", 10),
        ("master", None, 5001),
    ],
)
def test_a_rank_that_cannot_exist_is_refused(tier: Any, division: Any, lp: int) -> None:
    with pytest.raises(DomainError) as exc:
        lp_preview.rank_state(tier, division, lp)
    assert exc.value.code is ErrorCode.VALIDATION_INVALID and exc.value.status == 422


def test_the_values_of_the_running_season_or_the_setting_before_it(
    location: Location, make_user: Callable[..., User]
) -> None:
    admin = make_user()
    grant(admin, Role.ADMIN)
    admin_request = staff_request(admin)
    # before any season: the setting the next season starts with
    publish_config(admin_request, "league.config", {"k_factor": 30}, Marker.TO_CONFIRM, "test")
    assert lp_preview.config_now(location).k_factor == 30
    # a running season keeps the values it started with
    LeagueSeason.objects.create(
        location=location, number=1, name="Sezonul 1", status=SeasonStatus.ACTIVE,
        starts_at="2027-03-01T00:00:00Z", ends_at="2027-06-01T00:00:00Z", config={"k_factor": 50},
    )  # fmt: skip
    assert lp_preview.config_now(location).k_factor == 50


QUERY = {
    "location": "jungle-padel",
    "you": 4.0,
    "partner": 4.0,
    "rival_a": 4.0,
    "rival_b": 4.0,
    "tier": "gold",
    "division": "I",
    "lp": 50,
    "result": "win",
    "kind": "official",
}


def test_the_public_endpoint_reads_and_stores_nothing(api: Api, location: Location) -> None:
    response = api.get("/league/lp-preview", data=QUERY)
    assert response.status_code == 200
    assert response.json() == {
        "win_probability": 0.5,
        "lp": 20,
        "before": {"tier": "gold", "division": "I", "lp": 50},
        "after": {"tier": "gold", "division": "I", "lp": 70},
        "change": "none",
        "towards": {"tier": "gold", "division": "I", "lp": 0},
    }
    assert not LeagueEvent.objects.exists() and not AuditLog.objects.exists()


def test_the_public_endpoint_refuses_what_cannot_be(api: Api, location: Location) -> None:
    master = api.get("/league/lp-preview", data={**QUERY, "tier": "master", "division": ""})
    assert master.status_code == 422  # an empty division is not a division
    no_division = {k: v for k, v in QUERY.items() if k != "division"}
    response = api.get("/league/lp-preview", data=no_division)
    assert response.status_code == 422 and error_code(response) == "validation.invalid"
    assert api.get("/league/lp-preview", data={**QUERY, "you": 7.5}).status_code == 422
    assert api.get("/league/lp-preview", data={**QUERY, "result": "draw"}).status_code == 422
    assert api.get("/league/lp-preview", data={**QUERY, "location": "nowhere"}).status_code == 404
