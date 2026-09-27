from dataclasses import replace
from datetime import UTC, datetime, timedelta

import pytest
from jungle_league import (
    DEFAULT_CONFIG,
    LeagueState,
    MatchScore,
    RankState,
    SetScore,
    register_player,
)
from jungle_league.engine import Competitor, Ladder

WIN_A = MatchScore((SetScore(6, 3), SetScore(6, 4)))
WIN_B = MatchScore((SetScore(3, 6), SetScore(4, 6)))
START = datetime(2027, 4, 5, 8, 0, tzinfo=UTC)


def at(hours: float) -> datetime:
    return START + timedelta(hours=hours)


def with_rank(
    state: LeagueState, ladder: Ladder, cid: str, rank: RankState, **kwargs: object
) -> LeagueState:
    table = dict(state.competitors[ladder])
    table[cid] = replace(table[cid], rank=rank, placement_left=0, **kwargs)
    competitors = dict(state.competitors)
    competitors[ladder] = table
    return replace(state, competitors=competitors)


def put(state: LeagueState, ladder: Ladder, cid: str, competitor: Competitor) -> LeagueState:
    competitors = dict(state.competitors)
    competitors[ladder] = {**state.competitors[ladder], cid: competitor}
    return replace(state, competitors=competitors)


@pytest.fixture
def league() -> LeagueState:
    state = LeagueState()
    for pid, level in [
        ("ana", 4.0),
        ("bogdan", 4.0),
        ("cristi", 4.0),
        ("dan", 4.0),
        ("elena", 5.0),
        ("filip", 3.0),
    ]:
        state = register_player(state, pid, level, DEFAULT_CONFIG)
    return state
