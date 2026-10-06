"""The AI's tools (ADR-0019 §3, §4): the first barrier.

A tool is the only way the AI touches the club, and each one lists the contexts it serves
(public, member, staff). A tool runs as the person the AI works for, through the same services
and checks as a human. What the AI may never change has no tool: `register` refuses any name
about scores, rating, LP, ranks, standings, money, prices, discounts, vouchers, consents or the
club's settings, and a test lists every registered tool. The second barrier is in
`jungle.core.ai_origin`.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from jungle.accounts.models import User
from jungle.ai.models import Context
from jungle.locations.models import Location

FORBIDDEN_WORDS = frozenset(
    {
        "score", "scores", "rating", "mmr", "lp", "rank", "ranks", "standing", "standings",
        "ledger", "money", "pay", "payment", "payments", "refund", "credit", "balance", "price",
        "prices", "discount", "discounts", "voucher", "vouchers", "consent", "consents", "gdpr",
        "erase", "flag", "flags", "config", "settings",
    }
)  # fmt: skip


@dataclass(frozen=True)
class Call:
    """Who the AI works for in this question."""

    context: Context
    location: Location
    user: User | None


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    input_schema: dict[str, Any]
    contexts: frozenset[Context]
    run: Callable[[Call, dict[str, Any]], dict[str, Any]]

    def definition(self) -> dict[str, Any]:
        """What the model sees (`strict`: the input always matches the schema)."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
            "strict": True,
        }


_TOOLS: dict[str, Tool] = {}


def register(tool: Tool) -> Tool:
    if set(tool.name.split("_")) & FORBIDDEN_WORDS:
        raise ValueError(f"the AI may not have a tool named {tool.name!r} (ADR-0019)")
    if tool.name in _TOOLS:
        raise ValueError(f"tool {tool.name!r} is already registered")
    if not tool.contexts:
        raise ValueError(f"tool {tool.name!r} serves no context")
    _TOOLS[tool.name] = tool
    return tool


def unregister(name: str) -> None:
    _TOOLS.pop(name, None)


def tools_for(context: Context) -> list[Tool]:
    """The tools of a context, in a fixed order (the request stays the same: cached)."""
    return sorted((t for t in _TOOLS.values() if context in t.contexts), key=lambda t: t.name)


def find(name: str, context: Context) -> Tool | None:
    tool = _TOOLS.get(name)
    return tool if tool is not None and context in tool.contexts else None


def names() -> dict[str, list[str]]:
    """{tool: [contexts]}: what the AI can do, for the panel and the barrier test."""
    return {t.name: sorted(c.value for c in t.contexts) for t in _TOOLS.values()}
