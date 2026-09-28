"""The league seen from the website and phones: read-only, and only what R-012 allows."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest
from django.test import Client

from jungle.accounts.models import User
from jungle.audit.services import SYSTEM
from jungle.conftest import Api, error_code, login_as
from jungle.league import services, store
from jungle.league.models import EventKind, LeagueSeason, SeasonStatus, Standing
from jungle.league.projection import round_level
from jungle.league.tests.conftest import at, placed, play
from jungle.locations.models import Location

pytestmark = pytest.mark.django_db

Join = Callable[..., User]
PUBLIC_FIELDS = {"position", "players", "tier", "division", "level", "lp", "eligible"}


def test_r012_public_standings_show_only_name_level_lp_and_place(
    api: Api, season: LeagueSeason, join: Join, location: Location
) -> None:
    a, b, c, d = placed(season, join)
    newcomer = join()  # in placement: not ranked yet
    rows = api.get(f"/league/standings?location={location.slug}").json()
    assert [r["position"] for r in rows] == [1, 2, 3, 4]
    for row in rows:
        assert set(row) == PUBLIC_FIELDS
        assert [set(p) for p in row["players"]] == [{"id", "first_name", "last_name"}]
    names = {p["last_name"] for r in rows for p in r["players"]}
    assert names == {a.last_name, b.last_name, c.last_name, d.last_name}
    assert newcomer.last_name not in names

    pairs = api.get(f"/league/standings?location={location.slug}&ladder=pairs").json()
    assert [len(r["players"]) for r in pairs] == [2, 2]
    stored = Standing.objects.get(season=season, ladder="doubles", position=1)
    assert rows[0]["level"] == round_level(stored.level) and rows[0]["lp"] == stored.lp

    assert api.get(f"/league/standings?location={location.slug}&ladder=mixt").status_code == 422
    assert api.get("/league/standings?location=nicaieri").status_code == 404
    old = api.get(f"/league/standings?location={location.slug}&season=7")
    assert error_code(old) == "league.no_active_season" and old.status_code == 404


def test_lg100_standings_of_a_closed_season_stay_readable(
    api: Api, season: LeagueSeason, join: Join, location: Location
) -> None:
    placed(season, join)
    LeagueSeason.objects.filter(pk=season.pk).update(status=SeasonStatus.CLOSED)
    assert api.get(f"/league/standings?location={location.slug}").status_code == 404
    closed = api.get(f"/league/standings?location={location.slug}&season=1").json()
    assert len(closed) == 4
    seasons = api.get(f"/league/seasons?location={location.slug}").json()
    assert [(s["number"], s["status"]) for s in seasons] == [(1, "closed")]


def test_seasons_list_leaves_out_the_planned_ones(
    api: Api, new_season: Callable[..., LeagueSeason], location: Location
) -> None:
    new_season(1)
    new_season(2, activate=False)
    seasons = api.get(f"/league/seasons?location={location.slug}").json()
    assert [(s["number"], s["status"]) for s in seasons] == [(1, "active")]


def test_lg051_kings_of_the_jungle(
    api: Api, season: LeagueSeason, join: Join, location: Location
) -> None:
    placed(season, join)
    assert api.get(f"/league/kings?location={location.slug}").json() == []
    Standing.objects.filter(season=season, ladder="doubles", position=2).update(
        tier="master", division="", eligible=True
    )
    kings = api.get(f"/league/kings?location={location.slug}").json()
    assert [(k["position"], k["tier"]) for k in kings] == [(2, "master")]
    assert set(kings[0]) == PUBLIC_FIELDS


def test_r012_my_statistics_are_private(
    api: Api, client: Client, season: LeagueSeason, join: Join
) -> None:
    assert api.get("/league/me").status_code == 401
    a, b, c, d = placed(season, join)
    store.record(
        season,
        EventKind.BONUS,
        at("2027-04-07 20:00"),
        "turneu-1",
        {"ladder": "doubles", "competitor": str(a.pk), "lp": 15},
        SYSTEM,
    )
    login_as(client, a, mfa=False)
    me = api.get("/league/me").json()
    assert me["in_league"] is True
    ladders = {row["ladder"]: row for row in me["ladders"]}
    # Own ladders only (a pair belongs to two people: it is shown in the standings).
    assert set(ladders) == {"doubles", "singles"}
    assert ladders["doubles"]["matches_played"] == 5 and ladders["doubles"]["position"] >= 1
    assert ladders["singles"]["placement_left"] == 5
    recent: list[dict[str, Any]] = me["recent"]
    assert recent[0]["kind"] == "bonus" and recent[0]["lp_delta"] == 15
    assert [r["kind"] for r in recent].count("match") == 5
    assert {r["ladder"] for r in recent} == {"doubles"}

    # A replay starts a new computation: only the current one is shown, once.
    play(season, (a, c), (b, d), at("2027-04-06 16:00"))
    me = api.get("/league/me").json()
    assert [r["kind"] for r in me["recent"]].count("match") == 6


def test_q49_results_and_player_history_are_public(
    api: Api,
    season: LeagueSeason,
    join: Join,
    location: Location,
    kiosk: Any,
    now: Any,
) -> None:
    """Q49 (owner, 28.09.2026): results with date, time, court and LP; each player's history."""
    from jungle.league import matches
    from jungle.league.tests.test_matches import Game, kiosk_call
    from jungle.locations.models import Resource, ResourceKind

    court = Resource.objects.create(
        location=location, slug="teren-7", name="Teren 7", kind=ResourceKind.PADEL_COURT
    )
    game = Game(season, court, [join() for _ in range(4)])
    game.pay()
    now.move_to("2027-04-05T11:35:00+03:00")
    match = matches.propose(kiosk_call(), kiosk, game.proposal())
    for player in (game.b, game.c, game.d):
        matches.respond(kiosk_call(), kiosk, match.pk, game.token(player), True)
    shown = api.get(f"/league/results?location={location.slug}").json()
    assert len(shown) == 1
    result = shown[0]
    assert result["court"] == "Teren 7" and result["finished_at"].startswith("2027-04-05T08:30")
    assert result["winner"] == "a" and len(result["team_a"]) == 2
    assert set(result["lp_delta"]) == {str(p.pk) for p in game.players}  # 0 during placement

    page = api.get(f"/league/players/{game.a.pk}?location={location.slug}").json()
    assert page["player"]["last_name"] == game.a.last_name
    assert {x["ladder"] for x in page["ladders"]} == {"doubles", "singles"}
    assert [m["id"] for m in page["matches"]] == [str(match.pk)]

    services.leave(game.d, "test")  # left the league: not shown any more
    shown = api.get(f"/league/results?location={location.slug}").json()
    names = [(p["id"], p["first_name"]) for p in shown[0]["team_b"]]
    assert (None, "Jucător") in names and str(game.d.pk) not in shown[0]["lp_delta"]
    assert api.get(f"/league/players/{game.d.pk}?location={location.slug}").status_code == 404
    assert api.get(f"/league/players/{game.a.pk}?location=nicaieri").status_code == 404


def test_q49_a_profile_without_an_active_season(
    api: Api, season: LeagueSeason, join: Join, location: Location
) -> None:
    player = join()
    LeagueSeason.objects.filter(pk=season.pk).update(status=SeasonStatus.CLOSED)
    page = api.get(f"/league/players/{player.pk}?location={location.slug}").json()
    assert page["ladders"] == [] and page["matches"] == []
