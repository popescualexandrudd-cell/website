"""LG-051, LG-057, LG-100, LG-101: standings, tie-breaks, eligibility and the King of the Jungle."""

from dataclasses import replace

from conftest import START, at, put
from jungle_league import DEFAULT_CONFIG as C
from jungle_league import Ladder, LeagueState, RankState, Rating, kings_of_the_jungle, standings
from jungle_league.engine import Competitor


def comp(index, lp, mu=25.0, matches=12, reached=START):
    return Competitor(Rating(mu, 3.0), RankState(index, lp), 0, 12, matches, reached)


def test_lg_057_tie_breaks_are_deterministic():
    state = LeagueState()
    rows = {
        "first": comp(10, 50, mu=30),  # same LP, higher μ
        "second": comp(10, 50, mu=28, matches=20),  # same μ as third, more matches
        "third": comp(10, 50, mu=28, matches=15, reached=at(1)),
        "fourth": comp(10, 50, mu=28, matches=15, reached=at(2)),  # reached later
        "fifth_b": comp(10, 50, mu=28, matches=15, reached=None),
        "fifth_a": comp(10, 50, mu=28, matches=15, reached=None),  # full tie: by id
        "top": comp(12, 0),
        "placing": replace(comp(0, 0), rank=None, placement_left=3),
    }
    for cid, c in rows.items():
        state = put(state, Ladder.DOUBLES, cid, c)
    table = standings(state, Ladder.DOUBLES, C)
    assert [s.competitor_id for s in table] == [
        "top",
        "first",
        "second",
        "third",
        "fourth",
        "fifth_a",
        "fifth_b",
    ]
    assert [s.position for s in table] == list(range(1, 8))
    assert table[0].total_lp == 1200 and table[1].level == 5.0


def test_lg_100_lg_101_eligibility_final_and_live():
    state = put(LeagueState(), Ladder.DOUBLES, "few", comp(15, 0, matches=4))
    state = put(state, Ladder.DOUBLES, "many", comp(5, 0, matches=12))
    final = {s.competitor_id: s.eligible for s in standings(state, Ladder.DOUBLES, C)}
    assert final == {"few": False, "many": True}
    live = {
        s.competitor_id: s.eligible
        for s in standings(state, Ladder.DOUBLES, C, full_weeks_elapsed=4)
    }
    assert live == {"few": True, "many": True}


def test_q31_pairs_need_6_matches():
    state = put(LeagueState(), Ladder.PAIRS, "a+b", comp(5, 0, matches=6))
    assert standings(state, Ladder.PAIRS, C)[0].eligible


def test_lg_051_kings_are_the_top_10_eligible_masters():
    state = LeagueState()
    for i in range(12):
        state = put(state, Ladder.DOUBLES, f"m{i:02}", comp(20, 100 * i))
    state = put(state, Ladder.DOUBLES, "absent", comp(20, 5000, matches=3))
    state = put(state, Ladder.DOUBLES, "diamond", comp(19, 99))
    kings = kings_of_the_jungle(standings(state, Ladder.DOUBLES, C))
    assert [k.competitor_id for k in kings] == [f"m{i:02}" for i in range(11, 1, -1)]
