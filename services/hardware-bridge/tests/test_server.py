"""ADR-0013: the WebSocket, only on 127.0.0.1 and only for the kiosk app's origin."""

from __future__ import annotations

import asyncio
import json
from typing import Any

import pytest
from jungle_bridge.bridge import Bridge
from jungle_bridge.server import pusher, start
from websockets.asyncio.client import connect
from websockets.exceptions import ConnectionClosed, InvalidStatus

from tests.conftest import ORIGIN

pytestmark = pytest.mark.anyio


async def test_the_kiosk_page_talks_to_the_bridge(bridge: Bridge) -> None:
    assert bridge.settings.host == "127.0.0.1"
    server = await start(bridge, port=0)
    port = next(iter(server.sockets)).getsockname()[1]
    loop = asyncio.create_task(bridge.scanner_loop())
    try:
        async with connect(f"ws://127.0.0.1:{port}", origin=ORIGIN) as ws:  # type: ignore[arg-type]
            async with connect(f"ws://127.0.0.1:{port}", origin=ORIGIN) as other:  # type: ignore[arg-type]
                await other.send(json.dumps({"op": "health"}))
                assert json.loads(await other.recv())["ok"] is True
            # the second page closed normally
            await ws.send(json.dumps({"id": 7, "op": "hello"}))
            hello = json.loads(await ws.recv())
            assert hello["id"] == 7 and hello["device"] == bridge.settings.device_id
            await ws.send(json.dumps({"id": 8, "op": "sim.scan", "code": "CARD-9"}))
            messages: list[dict[str, Any]] = [json.loads(await ws.recv()) for _ in range(2)]
            scan = next(m for m in messages if m.get("event") == "scan")
            assert scan["signed"]["payload"]["code"] == "CARD-9"
            await ws.send("x" * (64 * 1024 + 1))  # too big: the bridge closes the connection
            with pytest.raises(ConnectionClosed):
                await ws.recv()
        await asyncio.sleep(0.05)
        assert bridge.clients == set()
    finally:
        loop.cancel()
        server.close()
        await server.wait_closed()


@pytest.mark.parametrize("origin", ["https://evil.example", None])
async def test_other_pages_are_refused(bridge: Bridge, origin: str | None) -> None:
    server = await start(bridge, port=0)
    port = next(iter(server.sockets)).getsockname()[1]
    try:
        with pytest.raises(InvalidStatus) as exc:
            async with connect(f"ws://127.0.0.1:{port}", origin=origin):  # type: ignore[arg-type]
                pass  # pragma: no cover - the handshake is refused
        assert exc.value.response.status_code == 403
    finally:
        server.close()
        await server.wait_closed()


async def test_a_push_cut_short_closes_that_page(bridge: Bridge) -> None:
    """A push cancelled mid-way (the page did not take it in time) cuts the connection: a
    half-sent message cannot stay on it; the page connects again by itself."""
    aborted: list[bool] = []

    class Transport:
        def abort(self) -> None:
            aborted.append(True)

    class Stuck:
        transport = Transport()

        async def send(self, _: str) -> None:
            await asyncio.Event().wait()

    push = pusher(Stuck())  # type: ignore[arg-type]
    with pytest.raises(TimeoutError):
        await asyncio.wait_for(push("x"), 0.01)
    assert aborted == [True]
