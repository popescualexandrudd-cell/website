"""The WebSocket the kiosk page talks to (ADR-0013): only on 127.0.0.1, only from the kiosk
app's own origin (any other page open in the browser is refused before the handshake ends),
small messages only."""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import os
from collections.abc import Callable
from datetime import datetime
from typing import Any

from websockets.asyncio.server import Server, ServerConnection, serve
from websockets.exceptions import ConnectionClosed

from jungle_bridge.bridge import Bridge
from jungle_bridge.config import Settings
from jungle_bridge.drivers.base import Devices
from jungle_bridge.journal import Journal
from jungle_bridge.signing import Signer, load_or_create_key, now_utc

log = logging.getLogger(__name__)
MAX_MESSAGE = 64 * 1024


def build(settings: Settings, devices: Devices, clock: Callable[[], datetime] = now_utc) -> Bridge:
    key = load_or_create_key(settings.key_path)
    signer = Signer(key, settings.device_id, clock)
    journal = Journal(settings.journal_path, signer.sign, clock)
    bridge = Bridge(settings, devices, signer, journal, clock)
    for event in bridge.recovered:
        log.warning("cash transaction %s was interrupted; reconciled with the server", event.txn)
    return bridge


def handler(bridge: Bridge) -> Callable[[ServerConnection], Any]:
    async def connection(ws: ServerConnection) -> None:
        bridge.clients.add(ws.send)
        try:
            async for raw in ws:
                reply = await bridge.handle(raw)
                await ws.send(json.dumps(reply))
        except ConnectionClosed:
            log.info("kiosk page disconnected")
        finally:
            bridge.clients.discard(ws.send)

    return connection


async def start(bridge: Bridge, port: int | None = None) -> Server:
    settings = bridge.settings
    return await serve(
        handler(bridge),
        settings.host,
        settings.port if port is None else port,
        origins=list(settings.allowed_origins),  # type: ignore[arg-type]
        max_size=MAX_MESSAGE,
    )


async def run(bridge: Bridge) -> None:  # pragma: no cover - the service's main loop
    server = await start(bridge)
    scanning = asyncio.create_task(bridge.scanner_loop())
    log.info("bridge listening on %s:%s", bridge.settings.host, bridge.settings.port)
    try:
        await server.serve_forever()
    finally:
        scanning.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await scanning
        bridge.journal.close()


def environment() -> dict[str, str]:  # pragma: no cover - read by the service at start
    return dict(os.environ)
