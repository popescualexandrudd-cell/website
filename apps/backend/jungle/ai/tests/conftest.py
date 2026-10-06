"""Shared by the AI tests: a scripted provider and the switch."""

from __future__ import annotations

import json
from collections.abc import Callable, Iterator
from typing import Any

import pytest

from jungle.ai import provider as providers
from jungle.ai.provider import Reply
from jungle.configuration.models import FeatureFlag


class Fake:
    """A provider that answers from a script and remembers what it was asked."""

    model = "fake-model"

    def __init__(self, *replies: Reply | Exception) -> None:
        self.replies = list(replies)
        self.calls: list[dict[str, Any]] = []

    def reply(self, **kwargs: Any) -> Reply:
        self.calls.append(json.loads(json.dumps(kwargs, default=str)))
        answer = self.replies.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer


def says(text: str, tokens: tuple[int, int] = (100, 20)) -> Reply:
    return Reply([{"type": "text", "text": text}], "end_turn", *tokens, "fake-model")


def uses(name: str, use_id: str = "t1", tool_input: dict[str, Any] | None = None) -> Reply:
    blocks: list[dict[str, Any]] = [
        {"type": "thinking", "thinking": "", "signature": "s"},
        {"type": "tool_use", "id": use_id, "name": name, "input": tool_input or {}},
    ]
    return Reply(blocks, "tool_use", 200, 30, "fake-model")


@pytest.fixture
def on(db: None) -> None:
    FeatureFlag.objects.update_or_create(key="ai", defaults={"enabled": True})


@pytest.fixture
def scripted() -> Iterator[Callable[..., Fake]]:
    def use(*replies: Reply | Exception) -> Fake:
        fake = Fake(*replies)
        providers.use(fake)
        return fake

    yield use
    providers.use(None)
