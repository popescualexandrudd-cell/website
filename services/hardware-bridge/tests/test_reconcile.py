"""ADR-0013: the cash journal reaches the server, idempotently, and survives outages."""

from __future__ import annotations

from typing import Any

import pytest
from jungle_bridge import journal as j
from jungle_bridge.bridge import Bridge
from jungle_bridge.reconcile import sync_once

pytestmark = pytest.mark.anyio


async def test_sync_marks_only_what_the_server_acknowledged(bridge: Bridge) -> None:
    journal = bridge.journal
    first = journal.append("txn-0001", j.STARTED, 100)
    second = journal.append("txn-0001", j.ACCEPTED, 100)
    received: list[list[dict[str, Any]]] = []

    async def server(events: list[dict[str, Any]]) -> list[str]:
        received.append(events)
        return [events[0]["payload"]["event"], "someone-else"]

    assert await sync_once(journal, server) == 1
    assert [e.id for e in journal.pending()] == [second.id]
    assert received[0][0]["payload"]["event"] == first.id

    async def down(_: list[dict[str, Any]]) -> list[str]:
        raise OSError("no route to host")

    assert await sync_once(journal, down) == 0
    assert [e.id for e in journal.pending()] == [second.id]  # still on disk
    assert await sync_once(journal, lambda ev: server(ev)) == 1
    assert await sync_once(journal, server) == 0  # nothing left
