"""Property tests (§6.17): LP sign and limits, floors and caps, no double promotion,
determinism, replay = computation from zero, and a validator that never crashes."""

from datetime import timedelta

from conftest import START
from hypothesis import given, settings
from hypothesis import strategies as st
from jungle_league import (
    DEFAULT_CONFIG as C,
)
from jungle_league import (
    MASTER_INDEX,
    LeagueState,
    MatchInput,
    MatchScore,
    MatchType,
    RankChange,
    RankState,
    Rating,
    ScoreError,
    SetScore,
    lp_delta,
    rate,
    register_player,
    replay,
)
from jungle_league import validate_score as validate
from jungle_league.lp import LpInput
from jungle_league.ranks import apply_lp

probabilities = st.floats(0.0, 1.0)
levels = st.floats(1.0, 7.0)
totals = st.integers(0, 4000)
types = st.sampled_from(list(MatchType))
weights = st.sampled_from([1.0, 0.75, 0.5])
reps = st.sampled_from([1.0, 0.5, 0.25])
ratings = st.builds(Rating, st.floats(-20, 70), st.floats(0.05, 12))


@given(st.sampled_from([0.0, 0.5, 1.0]), probabilities, levels, totals, types, weights, reps)
def test_lg_067_lg_068_sign_and_limits(outcome, p, level, total, match_type, w, rep):
    delta = lp_delta(LpInput(outcome, p, level, total, match_type, w, rep), C)
    if outcome == 1.0:
        assert 3 <= delta <= 60
    elif outcome == 0.0:
        assert -60 <= delta <= -3
    else:
        assert -20 <= delta <= 20


@given(st.integers(0, MASTER_INDEX), st.integers(0, 400), st.integers(0, 3), st.integers(-200, 300))
def test_lg_053_lg_058_rank_movement_invariants(index, lp, protection, delta):
    lp = lp if index == MASTER_INDEX else min(lp, 99)
    state, change = apply_lp(RankState(index, lp, protection), delta, C)
    assert state.lp >= 0
    assert abs(state.index - index) <= 1  # never two divisions in one match
    if state.index < MASTER_INDEX:
        assert state.lp < 100
    if change is RankChange.PROMOTED:
        assert state.index == index + 1 and state.protection == 3
    if change is RankChange.DEMOTED:
        assert state.index == index - 1 and state.lp == 75 and protection == 0
    if protection > 0 or index == 0:
        assert state.index >= index
    if delta >= 0:
        assert change is not RankChange.DEMOTED
    if delta <= 0:
        assert change is not RankChange.PROMOTED


@given(
    st.lists(ratings, min_size=1, max_size=2),
    st.lists(ratings, min_size=1, max_size=2),
    st.sampled_from([0.0, 0.5, 1.0]),
    weights,
)
def test_lg_020_rating_update_direction_and_positive_sigma(team_a, team_b, score, w):
    n = min(len(team_a), len(team_b))
    team_a, team_b = team_a[:n], team_b[:n]
    new_a, new_b = rate(team_a, team_b, score, C, w)
    assert all(r.sigma > 0 for r in (*new_a, *new_b))
    if score == 1.0:
        assert all(new.mu >= old.mu for new, old in zip(new_a, team_a, strict=True))
        assert all(new.mu <= old.mu for new, old in zip(new_b, team_b, strict=True))


games = st.integers(0, 15)
sets = st.builds(SetScore, games, games, st.none() | st.tuples(games, games), st.booleans())


@given(st.lists(sets, max_size=4), st.booleans(), st.booleans())
def test_lg_074_validator_only_ever_raises_score_errors(raw_sets, unfinished, tournament):
    code = None
    try:
        result = validate(MatchScore(tuple(raw_sets), unfinished), C, tournament)
    except ScoreError as error:
        code = error.code
    if code is not None:
        assert code.startswith("league.score_")
        return
    assert result.completion_weight in (0.0, 0.5, 0.75, 1.0)
    assert result.counts == (result.completion_weight > 0)


PLAYERS = ["p0", "p1", "p2", "p3", "p4", "p5"]
SCORES = [
    MatchScore((SetScore(6, 3), SetScore(6, 4))),
    MatchScore((SetScore(3, 6), SetScore(7, 6, (7, 3)), SetScore(4, 6))),
    MatchScore((SetScore(6, 4), SetScore(2, 1)), unfinished=True),
    MatchScore((SetScore(6, 4), SetScore(4, 6)), unfinished=True),
]


@st.composite
def seasons(draw):
    matches = []
    for i in range(draw(st.integers(1, 25))):
        size = draw(st.sampled_from([1, 2]))
        players = draw(st.permutations(PLAYERS))[: size * 2]
        matches.append(
            MatchInput(
                f"m{i:03}",
                tuple(players[:size]),
                tuple(players[size:]),
                draw(st.sampled_from(SCORES)),
                START + timedelta(hours=9 * i),
                draw(st.sampled_from([MatchType.OFFICIAL, MatchType.CHALLENGE])),
            )
        )
    return matches


def base_state():
    state = LeagueState()
    for i, pid in enumerate(PLAYERS):
        state = register_player(state, pid, 2.5 + i * 0.6, C)
    return state


@settings(max_examples=60, deadline=None)
@given(seasons(), st.data())
def test_lg_161_replay_from_a_point_equals_from_zero(matches, data):
    base = base_state()
    full, events = replay(base, matches, C)
    assert replay(base, list(reversed(matches)), C)[0] == full  # determinism
    cut = data.draw(st.integers(0, len(matches)))
    prefix, _ = replay(base, matches[:cut], C)
    resumed, _ = replay(prefix, matches[cut:], C)
    assert resumed == full
    for event in events:
        for update in event.updates:
            if update.after.rank is not None and update.before.rank is not None:
                assert abs(update.after.rank.index - update.before.rank.index) <= 1
