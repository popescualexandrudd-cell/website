"""Tournament draws (§6.14, LG-142): pure functions, no database, fully deterministic.

"Seeded" lists are in seed order (the best first): by rank for a seeded draw, or shuffled
with a seed stored on the tournament for a random one (the same seed gives the same draw).
"""

from __future__ import annotations

import random
from collections.abc import Sequence


def shuffled[T](items: Sequence[T], seed: str) -> list[T]:
    """A random draw that can be repeated and checked (the seed is kept)."""
    result = list(items)
    random.Random(seed).shuffle(result)  # noqa: S311 - a draw, not a secret
    return result


def bracket_size(entries: int) -> int:
    size = 1
    while size < entries:
        size *= 2
    return max(size, 2)


def seed_positions(size: int) -> list[int]:
    """The standard bracket order of seeds 1…size: 1 and 2 can meet only in the final,
    1–4 only in the semi-finals, and so on (8 → 1, 8, 4, 5, 2, 7, 3, 6)."""
    order = [1, 2]
    while len(order) < size:
        total = len(order) * 2 + 1
        order = [s for seed in order for s in (seed, total - seed)]
    return order


def knockout[T](seeded: Sequence[T]) -> list[tuple[T | None, T | None]]:
    """The first round; None is a bye (the best seeds get them)."""
    size = bracket_size(len(seeded))
    slots: list[T | None] = [
        seeded[seed - 1] if seed <= len(seeded) else None for seed in seed_positions(size)
    ]
    return [(slots[i], slots[i + 1]) for i in range(0, size, 2)]


def phase_name(teams_left: int) -> str:
    return {2: "final", 4: "semifinal", 8: "quarterfinal"}.get(teams_left, f"round_of_{teams_left}")


def round_robin[T](entries: Sequence[T]) -> list[list[tuple[T, T]]]:
    """Everyone meets everyone once (circle method); with an odd number, one rests a round."""
    players: list[T | None] = list(entries)
    if len(players) % 2:
        players.append(None)
    n = len(players)
    rounds = []
    for _ in range(n - 1):
        pairs = [(players[i], players[n - 1 - i]) for i in range(n // 2)]
        rounds.append([(a, b) for a, b in pairs if a is not None and b is not None])
        players = [players[0], players[-1], *players[1:-1]]
    return rounds


def snake_groups[T](seeded: Sequence[T], group_size: int) -> list[list[T]]:
    """Groups filled in a snake (1, 2, 3, 3, 2, 1 …) so they are balanced; never smaller than
    `group_size` (extra entries join existing groups), so everyone plays in their group."""
    count = max(1, len(seeded) // group_size)
    groups: list[list[T]] = [[] for _ in range(count)]
    for index, entry in enumerate(seeded):
        lap, position = divmod(index, count)
        groups[position if lap % 2 == 0 else count - 1 - position].append(entry)
    return groups


def group_qualifiers[T](tables: Sequence[Sequence[T]], advance: int) -> list[T]:
    """Seed order for the knockout: all group winners, then all runners-up … so the best
    finishers of one group meet those of another first."""
    return [table[place] for place in range(advance) for table in tables if place < len(table)]


def americano[T](players: Sequence[T]) -> list[list[tuple[tuple[T, T], tuple[T, T]]]]:
    """Americano: every player partners every other exactly once (circle method); partners
    of a round are paired into matches in order. Needs a multiple of 4 players."""
    if len(players) < 4 or len(players) % 4:
        raise ValueError("americano needs a multiple of 4 players")
    rounds = []
    for partners in round_robin(players):
        rounds.append([(partners[i], partners[i + 1]) for i in range(0, len(partners), 2)])
    return rounds


def mexicano_round[T](ranked: Sequence[T]) -> list[tuple[tuple[T, T], tuple[T, T]]]:
    """Mexicano: the next round from the current ranking, in groups of four: 1st and 4th
    against 2nd and 3rd."""
    if len(ranked) < 4 or len(ranked) % 4:
        raise ValueError("mexicano needs a multiple of 4 players")
    return [
        ((ranked[i], ranked[i + 3]), (ranked[i + 1], ranked[i + 2]))
        for i in range(0, len(ranked), 4)
    ]


def king_of_the_court_next[T](results: Sequence[tuple[T, T]]) -> list[tuple[T, T]]:
    """King of the Court ("up and down the river"): `results` is (winner, loser) per court,
    the top court first. Winners move up a court, losers move down."""
    if len(results) == 1:
        return [results[0]]
    winners = [w for w, _ in results]
    losers = [lo for _, lo in results]
    last = len(results) - 1
    courts = [(winners[0], winners[1])]
    courts += [(losers[i - 1], winners[i + 1]) for i in range(1, last)]
    courts.append((losers[last - 1], losers[last]))
    return courts
