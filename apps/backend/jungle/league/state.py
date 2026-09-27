"""The engine state ↔ JSON, exactly: floats keep every digit (Python writes the shortest
repr that reads back identically), times are ISO 8601 in UTC (one spelling per moment). A
state saved and read back equals the original (tested), so a snapshot and a replay always
agree, to the character (§6.16)."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

from jungle_league.engine import Competitor, Ladder, LeagueState
from jungle_league.ranks import RankState
from jungle_league.rating import Rating


def _iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat()


def _dt(value: datetime | None) -> str | None:
    return _iso(value) if value is not None else None


def _parse_dt(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value is not None else None


def competitor_to_json(c: Competitor) -> dict[str, Any]:
    return {
        "mu": c.rating.mu,
        "sigma": c.rating.sigma,
        "rank": None if c.rank is None else [c.rank.index, c.rank.lp, c.rank.protection],
        "placement_left": c.placement_left,
        "placement_cap": c.placement_cap,
        "matches_played": c.matches_played,
        "reached_at": _dt(c.reached_at),
        "last_match_at": _dt(c.last_match_at),
        "decayed_through": c.decayed_through.isoformat() if c.decayed_through else None,
    }


def competitor_from_json(data: dict[str, Any]) -> Competitor:
    rank = data["rank"]
    return Competitor(
        rating=Rating(data["mu"], data["sigma"]),
        rank=None if rank is None else RankState(rank[0], rank[1], rank[2]),
        placement_left=data["placement_left"],
        placement_cap=data["placement_cap"],
        matches_played=data["matches_played"],
        reached_at=_parse_dt(data["reached_at"]),
        last_match_at=_parse_dt(data["last_match_at"]),
        decayed_through=date.fromisoformat(data["decayed_through"])
        if data["decayed_through"]
        else None,
    )


def to_json(state: LeagueState) -> dict[str, Any]:
    return {
        "season": state.season,
        "last_key": None
        if state.last_key is None
        else [_iso(state.last_key[0]), state.last_key[1]],
        "competitors": {
            ladder.value: {cid: competitor_to_json(c) for cid, c in sorted(table.items())}
            for ladder, table in state.competitors.items()
        },
        "recent": {
            player: [[_iso(moment), sorted(group)] for moment, group in items]
            for player, items in sorted(state.recent.items())
        },
    }


def from_json(data: dict[str, Any]) -> LeagueState:
    last_key = data["last_key"]
    return LeagueState(
        competitors={
            Ladder(ladder): {cid: competitor_from_json(c) for cid, c in table.items()}
            for ladder, table in data["competitors"].items()
        },
        recent={
            player: tuple(
                (datetime.fromisoformat(moment), frozenset(group)) for moment, group in items
            )
            for player, items in data["recent"].items()
        },
        last_key=None if last_key is None else (datetime.fromisoformat(last_key[0]), last_key[1]),
        season=data["season"],
    )


def empty() -> LeagueState:
    return LeagueState(competitors={ladder: {} for ladder in Ladder})
