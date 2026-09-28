"""LG-001 … LG-004, LG-043, LG-044, LG-102, LG-103, LG-113, LG-130 … LG-133, LG-141,
LG-160 and LG-161: the engine as a whole."""

from dataclasses import replace
from datetime import UTC, date, datetime

import pytest
from conftest import START, WIN_A, WIN_B, at, put, with_rank
from jungle_league import (
    DEFAULT_CONFIG as C,
)
from jungle_league import (
    Ladder,
    LeagueConfig,
    LeagueError,
    LeagueState,
    MatchInput,
    MatchScore,
    MatchType,
    RankChange,
    RankState,
    Rating,
    ScoreError,
    SetScore,
    Side,
    apply_daily_decay,
    apply_match,
    award_bonus,
    decay_warnings,
    pair_id,
    register_player,
    replay,
    start_new_season,
)


def singles(mid, hours, score=WIN_A, a="ana", b="bogdan", **kwargs):
    return MatchInput(mid, (a,), (b,), score, at(hours), **kwargs)


def doubles(mid, hours, score=WIN_A, a=("ana", "bogdan"), b=("cristi", "dan"), **kwargs):
    return MatchInput(mid, a, b, score, at(hours), **kwargs)


def test_lg_040_register_from_questionnaire(league):
    elena = league.competitor(Ladder.DOUBLES, "elena")
    assert elena.rating == Rating(30.0, C.sigma0)
    assert elena.rank is None and elena.placement_left == 5
    assert league.competitor(Ladder.SINGLES, "filip").rating.mu == 20.0


def test_lg_041_coach_adjusts_before_the_first_match(league):
    adjusted = register_player(league, "elena", 4.5, C, sigma=5.0)
    assert adjusted.competitor(Ladder.DOUBLES, "elena").rating == Rating(27.5, 5.0)
    played, _ = apply_match(adjusted, singles("m1", 1, a="elena"), C)
    with pytest.raises(LeagueError, match="league.already_playing"):
        register_player(played, "elena", 5.0, C)


@pytest.mark.parametrize("pid", ["", "a+b"])
def test_invalid_player_ids(league, pid):
    with pytest.raises(LeagueError, match="league.invalid_player_id"):
        register_player(league, pid, 4.0, C)


def test_lg_043_lg_044_placement_hides_lp_then_assigns_a_capped_rank(league):
    state = league
    for i in range(4):
        state, event = apply_match(state, singles(f"m{i}", 24 * i), C)
        assert all(u.lp_delta == 0 and u.after.rank is None for u in event.updates)
    state, event = apply_match(state, singles("m4", 96), C)
    ana = state.competitor(Ladder.SINGLES, "ana")
    assert ana.rank is not None and ana.rank.lp == 0 and ana.rank.index <= C.placement_cap_index
    assert ana.placement_left == 0 and ana.matches_played == 5 and ana.reached_at == at(96)
    assert ana.rank.index > state.competitor(Ladder.SINGLES, "bogdan").rank.index


def test_lg_002_lg_003_doubles_updates_players_and_pairs(league):
    state, event = apply_match(league, doubles("m1", 1), C)
    assert {(u.ladder, u.competitor_id) for u in event.updates} == {
        (Ladder.DOUBLES, "ana"),
        (Ladder.DOUBLES, "bogdan"),
        (Ladder.DOUBLES, "cristi"),
        (Ladder.DOUBLES, "dan"),
        (Ladder.PAIRS, "ana+bogdan"),
        (Ladder.PAIRS, "cristi+dan"),
    }
    assert pair_id("bogdan", "ana") == "ana+bogdan"
    assert state.competitor(Ladder.DOUBLES, "ana").rating.mu > 25
    assert state.competitor(Ladder.SINGLES, "ana").matches_played == 0
    # The same pair in the other order is the same competitor.
    state, _ = apply_match(state, doubles("m2", 2, a=("bogdan", "ana")), C)
    assert state.competitor(Ladder.PAIRS, "ana+bogdan").matches_played == 2


def test_lg_004_a_new_pair_starts_at_the_mean_of_its_players(league):
    _, event = apply_match(league, doubles("m1", 1, a=("elena", "filip")), C)
    pair = next(u for u in event.updates if u.competitor_id == "elena+filip")
    assert pair.before.rating == Rating(25.0, C.sigma0)


def test_lg_060_lp_after_placement(league):
    state = with_rank(league, Ladder.SINGLES, "ana", RankState(8, 50))
    state = with_rank(state, Ladder.SINGLES, "bogdan", RankState(8, 50))
    state, event = apply_match(state, singles("m1", 1), C)
    by_id = {u.competitor_id: u for u in event.updates}
    assert by_id["ana"].lp_delta > 0 > by_id["bogdan"].lp_delta
    assert state.competitor(Ladder.SINGLES, "ana").rank.lp == 50 + by_id["ana"].lp_delta
    assert state.competitor(Ladder.SINGLES, "ana").reached_at == at(1)


def test_lg_060_a_match_that_leaves_lp_unchanged_keeps_reached_at(league):
    state = with_rank(league, Ladder.SINGLES, "ana", RankState(0, 0), reached_at=START)
    state = with_rank(state, Ladder.SINGLES, "bogdan", RankState(0, 0), reached_at=START)
    state, _ = apply_match(state, singles("m1", 1, score=WIN_B), C)
    assert (
        state.competitor(Ladder.SINGLES, "ana").reached_at == START
    )  # floor at Bronze IV: LP unchanged


def test_lg_160_idempotent_and_chronological(league):
    state, _ = apply_match(league, singles("m1", 1), C)
    again, none = apply_match(state, singles("m1", 1), C)
    assert none is None and again is state
    with pytest.raises(LeagueError, match="league.out_of_order"):
        apply_match(state, singles("m0", 0.5), C)
    naive = datetime(2027, 4, 5, 12)  # noqa: DTZ001 - the error under test
    with pytest.raises(LeagueError, match="league.naive_datetime"):
        apply_match(state, MatchInput("m2", ("ana",), ("bogdan",), WIN_A, naive), C)


@pytest.mark.parametrize(
    ("a", "b", "error"),
    [
        (("ana",), ("zoe",), "league.unknown_player"),
        (("ana",), ("ana",), "league.duplicate_player"),
        (("ana", "bogdan"), ("cristi",), "league.team_size"),
        ((), (), "league.team_size"),
    ],
)
def test_invalid_teams(league, a, b, error):
    with pytest.raises(LeagueError, match=error):
        apply_match(league, MatchInput("m1", a, b, WIN_A, at(1)), C)


def test_lg_103_three_official_matches_per_local_day(league):
    state = league
    others = ["bogdan", "cristi", "dan"]
    for i, other in enumerate(others):
        state, _ = apply_match(state, singles(f"m{i}", i, b=other), C)
    with pytest.raises(LeagueError, match="league.daily_limit"):
        apply_match(state, singles("m3", 3, b="elena"), C)
    # 21:30 UTC on 5 April is already 6 April in Bucharest (summer time): a new day.
    state, event = apply_match(
        state,
        MatchInput("m4", ("ana",), ("elena",), WIN_A, datetime(2027, 4, 5, 21, 30, tzinfo=UTC)),
        C,
    )
    assert event is not None


def test_lg_103_lg_102_tournament_matches_are_neither_limited_nor_counted(league):
    state = league
    for i in range(5):  # a tournament day: five matches, same opponent, full value
        state, event = apply_match(state, singles(f"t{i}", i, match_type=MatchType.TOURNAMENT), C)
        assert event.repetition_multiplier == 1.0
    assert state.recent.get("ana", ()) == ()
    for i, other in enumerate(["cristi", "dan", "elena"]):  # still three official ones
        state, _ = apply_match(state, singles(f"m{i}", 6 + i, b=other), C)


def test_lg_102_same_group_diminishing_returns(league):
    state = league
    multipliers = []
    for i in range(4):
        state, event = apply_match(state, singles(f"m{i}", 24 * i), C)
        multipliers.append(event.repetition_multiplier)
    assert multipliers == [1.0, 1.0, 0.5, 0.25]
    state, event = apply_match(state, singles("late", 24 * 12), C)  # outside the 7-day window
    assert event.repetition_multiplier == 1.0


def test_lg_083_no_complete_set_is_training(league):
    state, event = apply_match(
        league, singles("m1", 1, score=MatchScore((SetScore(3, 2),), unfinished=True)), C
    )
    assert event.counted is False and event.updates == ()
    assert state.competitors == league.competitors and state.last_key == (at(1), "m1")


def test_lg_104_level_gap_limit_turns_the_match_into_training(league):
    config = LeagueConfig(level_gap_limit=1.0)
    _, event = apply_match(league, singles("m1", 1, a="elena", b="filip"), config)
    assert event.counted is False
    _, event = apply_match(league, singles("m1", 1, a="ana", b="bogdan"), config)
    assert event.counted is True


def test_lg_082_unfinished_draw_and_weight(league):
    score = MatchScore((SetScore(6, 4), SetScore(4, 6)), unfinished=True)
    state, event = apply_match(league, singles("m1", 1, score=score), C)
    assert event.winner is None and event.completion_weight == 0.75
    assert state.competitor(Ladder.SINGLES, "ana").rating.mu == pytest.approx(25)


def test_lg_113_challenge_bonus_only_when_the_challenger_wins(league):
    state = with_rank(league, Ladder.SINGLES, "ana", RankState(8, 50))
    state = with_rank(state, Ladder.SINGLES, "bogdan", RankState(9, 50))
    _, e1 = apply_match(state, singles("m1", 1), C)
    _, e2 = apply_match(
        state, singles("m1", 1, match_type=MatchType.CHALLENGE, challenger=Side.A), C
    )
    assert e2.updates[0].lp_delta == e1.updates[0].lp_delta + 5
    assert e2.updates[1].lp_delta == e1.updates[1].lp_delta
    _, e3 = apply_match(
        state, singles("m1", 1, score=WIN_B, match_type=MatchType.CHALLENGE, challenger=Side.A), C
    )
    _, e4 = apply_match(state, singles("m1", 1, score=WIN_B), C)
    assert [u.lp_delta for u in e3.updates] == [u.lp_delta for u in e4.updates]
    _, e5 = apply_match(
        state, singles("m1", 1, score=WIN_B, match_type=MatchType.CHALLENGE, challenger=Side.B), C
    )
    assert e5.updates[1].lp_delta == e4.updates[1].lp_delta + 5


def test_lg_141_tournament_multiplier_and_must_finish(league):
    state = with_rank(league, Ladder.SINGLES, "ana", RankState(8, 50))
    state = with_rank(state, Ladder.SINGLES, "bogdan", RankState(8, 50))
    _, official = apply_match(state, singles("m1", 1), C)
    _, tournament = apply_match(state, singles("m1", 1, match_type=MatchType.TOURNAMENT), C)
    # ×1.5 applies before rounding, so the result is within one LP of 1.5 × the official value.
    assert abs(tournament.updates[0].lp_delta - 1.5 * official.updates[0].lp_delta) <= 1
    with pytest.raises(ScoreError):
        apply_match(
            state,
            singles(
                "m2",
                2,
                score=MatchScore((SetScore(6, 1), SetScore(2, 1)), True),
                match_type=MatchType.TOURNAMENT,
            ),
            C,
        )


def test_lg_141_tournament_phase_bonus(league):
    state = with_rank(league, Ladder.SINGLES, "ana", RankState(8, 90, 2))
    state, update = award_bonus(state, Ladder.SINGLES, "ana", 30, at(5), C)
    assert update.change is RankChange.PROMOTED
    assert state.competitor(Ladder.SINGLES, "ana").rank == RankState(9, 20, 3)
    state = with_rank(state, Ladder.SINGLES, "bogdan", RankState(4, 10, 2))
    state, _ = award_bonus(state, Ladder.SINGLES, "bogdan", 5, at(6), C)
    assert state.competitor(Ladder.SINGLES, "bogdan").rank.protection == 2  # a bonus is not a match
    for pid, lp in [("cristi", 10), ("bogdan", 0)]:
        with pytest.raises(LeagueError, match="league.bonus_not_applicable"):
            award_bonus(state, Ladder.SINGLES, pid, lp, at(7), C)


def test_lg_106_daily_decay(league):
    last = datetime(2027, 4, 1, 18, tzinfo=UTC)
    state = with_rank(league, Ladder.DOUBLES, "ana", RankState(16, 3), last_match_at=last)
    state = with_rank(state, Ladder.DOUBLES, "bogdan", RankState(20, 50), last_match_at=last)
    state = with_rank(state, Ladder.DOUBLES, "cristi", RankState(12, 50), last_match_at=last)
    state = with_rank(state, Ladder.DOUBLES, "dan", RankState(17, 50))  # never played: no decay
    _, updates = apply_daily_decay(state, date(2027, 4, 15), C)  # 14 days: grace
    assert updates == ()
    state, updates = apply_daily_decay(state, date(2027, 4, 16), C)
    assert {u.competitor_id: u.lp_delta for u in updates} == {"ana": -5, "bogdan": -10}
    assert state.competitor(Ladder.DOUBLES, "ana").rank == RankState(16, 0)
    _, updates = apply_daily_decay(state, date(2027, 4, 16), C)
    assert updates == ()  # idempotent for the same day


def test_lg_107_decay_warnings(league):
    last = datetime(2027, 4, 1, 18, tzinfo=UTC)
    state = with_rank(league, Ladder.DOUBLES, "ana", RankState(16, 3), last_match_at=last)
    state = with_rank(state, Ladder.SINGLES, "bogdan", RankState(20, 3), last_match_at=last)
    state = with_rank(state, Ladder.SINGLES, "cristi", RankState(20, 3))
    assert decay_warnings(state, date(2027, 4, 13), C) == (
        (Ladder.DOUBLES, "ana"),
        (Ladder.SINGLES, "bogdan"),
    )
    assert decay_warnings(state, date(2027, 4, 14), C) == ()


def test_lg_131_lg_133_season_reset(league):
    state = with_rank(league, Ladder.DOUBLES, "ana", RankState(14, 40), last_match_at=START)
    state = put(
        state,
        Ladder.DOUBLES,
        "ana",
        replace(state.competitor(Ladder.DOUBLES, "ana"), rating=Rating(35, 2)),
    )
    state = put(
        state,
        Ladder.DOUBLES,
        "bogdan",
        replace(
            state.competitor(Ladder.DOUBLES, "bogdan"), rating=Rating(15, 8.0), placement_left=2
        ),
    )
    mean = sum(c.rating.mu for c in state.competitors[Ladder.DOUBLES].values()) / 6
    new = start_new_season(state, C)
    ana = new.competitor(Ladder.DOUBLES, "ana")
    assert ana.rating.mu == pytest.approx(mean + 0.75 * (35 - mean))
    assert ana.rating.sigma == 3.5
    assert (ana.rank, ana.placement_left, ana.placement_cap, ana.matches_played) == (None, 3, 14, 0)
    bogdan = new.competitor(Ladder.DOUBLES, "bogdan")
    assert bogdan.rating.sigma == C.sigma0  # min(σ0, σ + 1.5)
    assert (bogdan.placement_left, bogdan.placement_cap) == (3, C.placement_cap_index)
    assert new.competitors[Ladder.PAIRS] == {} and new.season == 2


def test_lg_133_replacement_rank_is_capped_by_the_previous_season(league):
    state = with_rank(league, Ladder.SINGLES, "elena", RankState(3, 0))
    state = start_new_season(state, C)
    for i in range(3):
        state, _ = apply_match(state, singles(f"m{i}", 24 * i, a="elena", b="filip"), C)
    assert state.competitor(Ladder.SINGLES, "elena").rank.index <= 3


def test_lg_161_replay_equals_incremental_and_cancellation_equals_from_zero(league):
    matches = [
        doubles("d1", 1),
        singles("s1", 2, a="elena", b="filip"),
        doubles("d2", 26, score=WIN_B),
        singles("s2", 27, a="ana", b="elena"),
        doubles("d3", 50, a=("ana", "cristi"), b=("bogdan", "dan")),
    ]
    incremental = league
    for m in matches:
        incremental, _ = apply_match(incremental, m, C)
    replayed, events = replay(league, reversed(matches), C)
    assert replayed == incremental and len(events) == 5
    without, _ = replay(league, [m for m in matches if m.match_id != "d2"], C)
    step = league
    for m in matches:
        if m.match_id != "d2":
            step, _ = apply_match(step, m, C)
    assert without == step
    duplicated, events = replay(league, [*matches, matches[-1]], C)
    assert duplicated == incremental and len(events) == 5


def test_competitor_lookup_errors():
    with pytest.raises(LeagueError, match="league.unknown_player"):
        LeagueState().competitor(Ladder.DOUBLES, "nobody")
