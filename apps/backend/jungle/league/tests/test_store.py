"""The league's event store: snapshot, replay, cancellation, refusals (§6.16, ADR-0008)."""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

import pytest
from jungle_league.engine import Ladder, LeagueState, MatchInput, apply_match, register_player

from jungle.accounts.models import User
from jungle.audit.services import SYSTEM
from jungle.cards import fields as card_fields
from jungle.cards import services as cards
from jungle.cards.models import MemberCard
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.league import integration, projection, services, store
from jungle.league import state as state_json
from jungle.league.models import (
    EventKind,
    LeagueEvent,
    LeagueSeason,
    LeagueSnapshot,
    RatingRecord,
    Standing,
)
from jungle.league.tests.conftest import WIN_A, WIN_B, at, kiosk_request, placed, play
from jungle.privacy import league_consent

pytestmark = pytest.mark.django_db

Join = Callable[..., User]


def engine_fold(
    season: LeagueSeason,
    players: list[User],
    matches: list[tuple[tuple[User, ...], tuple[User, ...], str, dict[str, Any]]],
) -> LeagueState:
    """The same season computed directly with the engine, independently of the store."""
    config = store.config_for(season)
    assert season.base_state is not None
    state = state_json.from_json(season.base_state)
    for player in players:
        state = register_player(state, str(player.pk), 3.0, config)
    for number, (team_a, team_b, when, score) in enumerate(matches, start=1):
        state, _ = apply_match(
            state,
            MatchInput(
                f"{number:03d}",
                tuple(str(p.pk) for p in team_a),
                tuple(str(p.pk) for p in team_b),
                store.score_from_json(score),
                at(when),
            ),
            config,
        )
    return state


def same_league(state: LeagueState, snapshot: LeagueSnapshot) -> None:
    """Ratings, ranks and the recent matches agree (the engine's match ids differ)."""
    stored = state_json.from_json(snapshot.state)
    assert stored.competitors == state.competitors
    assert stored.recent == state.recent


def computation(season: LeagueSeason) -> int:
    return LeagueSnapshot.objects.get(season=season).computation


# ---------------------------------------------------------------- the state as JSON
def test_lg_state_round_trips_exactly(season: LeagueSeason, join: Join) -> None:
    a, b, c, d = (join() for _ in range(4))
    for n, when in enumerate(
        ("2027-04-05 10:00", "2027-04-05 12:00", "2027-04-05 14:00", "2027-04-06 10:00")
    ):
        play(season, (a, b), (c, d), at(when), WIN_A if n % 2 else WIN_B)
    play(season, (a, c), (b, d), at("2027-04-06 12:00"))  # the fifth: ranks are revealed
    state = store.current_state(season)
    assert all(c.rank is not None for c in state.competitors[Ladder.DOUBLES].values())
    data = state_json.to_json(state)
    again = state_json.from_json(json.loads(json.dumps(data)))
    assert again == state
    assert state_json.to_json(again) == data


# ---------------------------------------------------------------- incremental and replay
def test_lg160_incremental_equals_a_replay_from_zero(season: LeagueSeason, join: Join) -> None:
    a, b, c, d, e, f, g, h = (join() for _ in range(8))
    first = computation(season)
    # Two courts ending at the same minute: both applied incrementally, in recording order.
    play(season, (a, b), (c, d), at("2027-04-05 11:30"))
    play(season, (e, f), (g, h), at("2027-04-05 11:30"), WIN_B)
    play(season, (a, c), (b, d), at("2027-04-06 11:30"))
    snapshot = LeagueSnapshot.objects.get(season=season)
    assert snapshot.computation == first
    assert state_json.to_json(store.rebuild(season)) == snapshot.state

    # A match validated late (it ended before the last one applied): the season is replayed.
    play(season, (e, g), (f, h), at("2027-04-05 20:00"))
    snapshot.refresh_from_db()
    assert snapshot.computation == first + 1
    assert state_json.to_json(store.rebuild(season)) == snapshot.state
    events = LeagueEvent.objects.filter(season=season).count()
    assert RatingRecord.objects.filter(season=season, computation=first + 1).count() == events
    expected = engine_fold(
        season,
        [a, b, c, d, e, f, g, h],
        [
            ((a, b), (c, d), "2027-04-05 11:30", WIN_A),
            ((e, f), (g, h), "2027-04-05 11:30", WIN_B),
            ((e, g), (f, h), "2027-04-05 20:00", WIN_A),
            ((a, c), (b, d), "2027-04-06 11:30", WIN_A),
        ],
    )
    same_league(expected, snapshot)


def test_lg_cancelled_match_is_left_out(season: LeagueSeason, join: Join, now: Any) -> None:
    a, b, c, d = (join() for _ in range(4))
    kept = play(season, (a, b), (c, d), at("2027-04-05 10:00"))
    dropped = play(season, (a, b), (c, d), at("2027-04-05 12:00"), WIN_B)
    now.move_to("2027-04-05T13:00:00+03:00")
    before = computation(season)
    cancel = store.record(
        season, EventKind.CANCEL, clock.now(), dropped.ref, {}, SYSTEM, "Scor introdus greșit"
    )
    assert cancel.reason == "Scor introdus greșit"
    assert computation(season) == before + 1
    snapshot = LeagueSnapshot.objects.get(season=season)
    same_league(
        engine_fold(season, [a, b, c, d], [((a, b), (c, d), "2027-04-05 10:00", WIN_A)]), snapshot
    )
    assert snapshot.last_at == at("2027-04-05 12:00")  # a cancellation orders nothing

    # Recorded once: repeating a match or a cancellation changes nothing.
    events = LeagueEvent.objects.count()
    again = store.record(season, EventKind.CANCEL, clock.now(), dropped.ref, {}, SYSTEM)
    assert again.pk == cancel.pk
    assert play(season, (a, b), (c, d), at("2027-04-05 10:00"), ref=kept.ref).pk == kept.pk
    assert LeagueEvent.objects.count() == events and computation(season) == before + 1

    with pytest.raises(DomainError) as exc:
        store.record(season, EventKind.CANCEL, clock.now(), "m-unknown", {}, SYSTEM)
    assert (exc.value.code, exc.value.status) == (ErrorCode.LEAGUE_MATCH_NOT_FOUND, 404)


def test_lg103_daily_limit_refused_before_anything_is_written(
    season: LeagueSeason, join: Join
) -> None:
    a, b, c, d = (join() for _ in range(4))
    for hour in ("10:00", "12:00", "14:00"):
        play(season, (a, b), (c, d), at(f"2027-04-05 {hour}"))
    counts = (LeagueEvent.objects.count(), RatingRecord.objects.count())
    with pytest.raises(DomainError) as exc:
        play(season, (a, c), (b, d), at("2027-04-05 16:00"))
    assert (exc.value.code, exc.value.status) == (ErrorCode.LEAGUE_DAILY_LIMIT, 409)
    assert (LeagueEvent.objects.count(), RatingRecord.objects.count()) == counts

    # The same refusal when a late match would break the limit on replay.
    play(season, (a, b), (c, d), at("2027-04-06 10:00"))
    counts = (LeagueEvent.objects.count(), RatingRecord.objects.count())
    before = computation(season)
    with pytest.raises(DomainError) as exc:
        play(season, (a, c), (b, d), at("2027-04-05 18:00"))
    assert exc.value.code is ErrorCode.LEAGUE_DAILY_LIMIT
    assert (LeagueEvent.objects.count(), RatingRecord.objects.count()) == counts
    assert computation(season) == before


def test_lg_score_and_team_errors(season: LeagueSeason, join: Join) -> None:
    a, b, c, d = (join() for _ in range(4))
    with pytest.raises(DomainError) as exc:
        play(season, (a, b), (c, d), at("2027-04-05 10:00"), {"sets": [{"a": 6, "b": 6}]})
    assert exc.value.code.value.startswith("league.score_") and exc.value.status == 400
    with pytest.raises(DomainError) as exc:
        play(season, (a, b), (c, a), at("2027-04-05 10:00"))
    assert exc.value.code is ErrorCode.LEAGUE_DUPLICATE_PLAYER
    assert not LeagueEvent.objects.filter(kind=EventKind.MATCH).exists()


def test_lg_a_season_without_a_state_is_refused(
    new_season: Callable[..., LeagueSeason], join: Join
) -> None:
    planned = new_season(activate=False)
    a, b, c, d = (join() for _ in range(4))
    with pytest.raises(DomainError) as exc:
        play(planned, (a, b), (c, d), at("2027-04-05 10:00"))
    assert (exc.value.code, exc.value.status) == (ErrorCode.LEAGUE_NO_ACTIVE_SEASON, 409)
    with pytest.raises(DomainError):
        store.current_state(planned)


def test_lg_score_json_keeps_tiebreaks() -> None:
    score = {
        "sets": [
            {"a": 7, "b": 6, "tiebreak": [7, 5], "super_tiebreak": False},
            {"a": 10, "b": 8, "tiebreak": None, "super_tiebreak": True},
        ],
        "unfinished": False,
    }
    assert store.score_to_json(store.score_from_json(score)) == score


# ---------------------------------------------------------------- bonus, decay, Wallet
def test_lg141_bonus_and_decay_are_events(season: LeagueSeason, join: Join) -> None:
    a, *_ = placed(season, join)
    lp = Standing.objects.get(season=season, ladder="doubles", competitor_id=str(a.pk)).lp
    store.record(
        season,
        EventKind.BONUS,
        at("2027-04-07 20:00"),
        "turneu-1",
        {"ladder": "doubles", "competitor": str(a.pk), "lp": 10},
        SYSTEM,
    )
    row = Standing.objects.get(season=season, ladder="doubles", competitor_id=str(a.pk))
    assert row.total_lp > 0 and (row.lp == lp + 10 or row.lp < lp)  # or a promotion
    decay = store.record(
        season, EventKind.DECAY, at("2027-04-08 00:05"), "2027-04-07", {"day": "2027-04-07"}, SYSTEM
    )
    assert decay.records.get().payload == {"decay": []}  # nobody is Diamond or Master yet

    newcomer = join()
    with pytest.raises(DomainError) as exc:  # still in placement
        store.record(
            season,
            EventKind.BONUS,
            at("2027-04-08 20:00"),
            "turneu-1",
            {"ladder": "doubles", "competitor": str(newcomer.pk), "lp": 10},
            SYSTEM,
        )
    assert exc.value.code is ErrorCode.LEAGUE_BONUS_NOT_APPLICABLE


def test_r023_wallet_card_shows_own_rank_in_the_holders_language(
    season: LeagueSeason, join: Join, make_user: Callable[..., User]
) -> None:
    a = join()
    card = cards.issue_card(SYSTEM, a)
    fields = {f.key: f.value for f in card_fields.card_fields(card)}
    assert fields["placement"] == "5 meciuri rămase"

    english = join(preferred_language="en")
    others = [join(), join()]
    play(season, (a, english), tuple(others), at("2027-04-05 10:00"))
    english_card = cards.issue_card(SYSTEM, english)
    fields = {f.key: f.value for f in card_fields.card_fields(english_card)}
    assert fields["placement"] == "4 matches left"

    b, *_ = placed(season, join)
    ranked = cards.issue_card(SYSTEM, b)
    fields = {f.key: f.value for f in card_fields.card_fields(ranked)}
    row = Standing.objects.get(season=season, ladder="doubles", competitor_id=str(b.pk))
    assert fields["rank"] == integration.rank_label(row.tier, row.division, integration.TIER_RO)
    assert (
        fields["lp"] == str(row.lp)
        and fields["level"] == f"{projection.round_level(row.level):.1f}"
    )

    league_consent_withdraw(b)
    assert "rank" not in {f.key for f in card_fields.card_fields(ranked)}
    outsider = cards.issue_card(SYSTEM, make_user())
    assert [f.key for f in card_fields.card_fields(outsider)] == ["member_since"]


def league_consent_withdraw(user: User) -> None:
    request = kiosk_request()
    request.user = user
    league_consent.withdraw(request)


def test_r023_cards_refresh_after_every_change(
    season: LeagueSeason,
    join: Join,
    monkeypatch: pytest.MonkeyPatch,
    django_capture_on_commit_callbacks: Any,
) -> None:
    refreshed: list[MemberCard] = []
    monkeypatch.setattr(integration, "card_changed", refreshed.append)
    a, b, c, d = (join() for _ in range(4))
    cards.issue_card(SYSTEM, a)
    cards.issue_card(SYSTEM, c)
    with django_capture_on_commit_callbacks(execute=True):
        play(season, (a, b), (c, d), at("2027-04-05 10:00"))
    assert {card.user_id for card in refreshed} == {a.pk, c.pk}  # b and d have no card

    refreshed.clear()
    with django_capture_on_commit_callbacks(execute=True):
        play(season, (a, c), (b, d), at("2027-04-05 09:30"))  # late: replayed
    assert {card.user_id for card in refreshed} == {a.pk, c.pk}


def test_lg_projection_hides_who_left_and_renumbers(season: LeagueSeason, join: Join) -> None:
    a, *_ = placed(season, join)
    doubles = Standing.objects.filter(season=season, ladder="doubles", position__isnull=False)
    assert sorted(p or 0 for p in doubles.values_list("position", flat=True)) == [1, 2, 3, 4]
    league_consent_withdraw(a)
    rows = Standing.objects.filter(season=season)
    assert sorted(p or 0 for p in doubles.values_list("position", flat=True)) == [1, 2, 3]
    assert rows.get(ladder="doubles", player_a=a).position is None
    pairs = {r.competitor_id: r.position for r in rows.filter(ladder="pairs")}
    assert [p for cid, p in pairs.items() if str(a.pk) in cid] == [None]
    assert [p for cid, p in pairs.items() if str(a.pk) not in cid] == [1]


def test_listeners_are_registered_once_and_models_read_well(
    season: LeagueSeason, join: Join
) -> None:
    before = list(store._applied_listeners)
    integration.connect()  # again (e.g. a second AppConfig.ready): nothing doubles
    assert store._applied_listeners == before
    a, b, c, d = (join() for _ in range(4))
    event = play(season, (a, b), (c, d), at("2027-04-05 10:00"), ref="m-1")
    snapshot = LeagueSnapshot.objects.get(season=season)
    row = Standing.objects.get(season=season, ladder="doubles", competitor_id=str(a.pk))
    player = a.league_player
    questionnaire = a.questionnaires.get()
    texts = [
        str(x) for x in (season, event, snapshot, event.records.get(), row, player, questionnaire)
    ]
    assert texts[:2] == ["Sezonul 1", "match m-1"]
    assert all(texts)
    assert services.active_season(season.location) == season
    LeagueSeason.objects.filter(pk=season.pk).update(status="closed")
    with pytest.raises(DomainError) as exc:
        services.active_season(season.location)
    assert exc.value.code is ErrorCode.LEAGUE_NO_ACTIVE_SEASON
