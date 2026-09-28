"""Tournament draws (LG-142): brackets, groups, round robin, Americano, Mexicano, King of the
Court. Pure functions: tested with properties."""

from __future__ import annotations

from collections import Counter
from itertools import combinations

import pytest
from hypothesis import given
from hypothesis import strategies as st

from jungle.league import draws


def test_lg142_seed_positions_keep_the_best_apart() -> None:
    assert draws.seed_positions(2) == [1, 2]
    assert draws.seed_positions(8) == [1, 8, 4, 5, 2, 7, 3, 6]
    order = draws.seed_positions(16)
    assert order.index(1) < 8 <= order.index(2)  # 1 and 2 in opposite halves


def test_lg142_knockout_byes_go_to_the_best_seeds() -> None:
    first = draws.knockout(["s1", "s2", "s3", "s4", "s5", "s6"])
    assert first == [("s1", None), ("s4", "s5"), ("s2", None), ("s3", "s6")]
    assert draws.knockout(["a"]) == [("a", None)]
    assert [draws.phase_name(n) for n in (2, 4, 8, 16)] == [
        "final",
        "semifinal",
        "quarterfinal",
        "round_of_16",
    ]
    assert draws.bracket_size(5) == 8 and draws.bracket_size(8) == 8


@given(st.integers(min_value=2, max_value=13))
def test_lg142_round_robin_everyone_meets_everyone_once(n: int) -> None:
    rounds = draws.round_robin(list(range(n)))
    games = [frozenset(g) for r in rounds for g in r]
    assert Counter(games) == Counter(frozenset(p) for p in combinations(range(n), 2))
    for r in rounds:  # nobody plays twice in a round
        seen = [p for g in r for p in g]
        assert len(seen) == len(set(seen))


def test_lg142_snake_groups_are_balanced() -> None:
    assert draws.snake_groups(list(range(1, 9)), 4) == [[1, 4, 5, 8], [2, 3, 6, 7]]
    assert draws.snake_groups([1, 2, 3], 4) == [[1, 2, 3]]
    assert draws.snake_groups([1, 2, 3, 4, 5], 2) == [[1, 4, 5], [2, 3]]
    tables = [["A1", "A2", "A3"], ["B1", "B2"]]
    assert draws.group_qualifiers(tables, 2) == ["A1", "B1", "A2", "B2"]
    assert draws.group_qualifiers(tables, 3) == ["A1", "B1", "A2", "B2", "A3"]


@given(st.sampled_from([4, 8, 12, 16]))
def test_lg142_americano_partners_every_player_once(n: int) -> None:
    rounds = draws.americano(list(range(n)))
    partners = [frozenset(pair) for r in rounds for match in r for pair in match]
    assert Counter(partners) == Counter(frozenset(p) for p in combinations(range(n), 2))
    for r in rounds:
        seen = [p for match in r for pair in match for p in pair]
        assert sorted(seen) == list(range(n))


def test_lg142_mexicano_and_king_of_the_court() -> None:
    assert draws.mexicano_round(list("abcdefgh")) == [
        (("a", "d"), ("b", "c")),
        (("e", "h"), ("f", "g")),
    ]
    for bad in (list("abc"), list("abcdef")):
        with pytest.raises(ValueError, match="mexicano"):
            draws.mexicano_round(bad)
        with pytest.raises(ValueError, match="americano"):
            draws.americano(bad)
    assert draws.king_of_the_court_next([("W0", "L0")]) == [("W0", "L0")]
    assert draws.king_of_the_court_next([("W0", "L0"), ("W1", "L1")]) == [
        ("W0", "W1"),
        ("L0", "L1"),
    ]
    assert draws.king_of_the_court_next([("W0", "L0"), ("W1", "L1"), ("W2", "L2")]) == [
        ("W0", "W1"),
        ("L0", "W2"),
        ("L1", "L2"),
    ]


def test_lg142_a_random_draw_can_be_repeated() -> None:
    items = list(range(10))
    assert draws.shuffled(items, "seed-1") == draws.shuffled(items, "seed-1")
    assert sorted(draws.shuffled(items, "seed-2")) == items
