from __future__ import annotations

import base64
import secrets
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from jungle_bridge import config
from jungle_bridge.bridge import Bridge
from jungle_bridge.drivers.simulator import simulated
from jungle_bridge.server import build
from jungle_bridge.signing import canonical

ORIGIN = "http://localhost:5174"


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2027, 4, 5, 9, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += timedelta(seconds=seconds)


class Server:
    """The club server's side of the signed commands."""

    def __init__(self, device_id: str, clock: Clock):
        self.key = Ed25519PrivateKey.generate()
        self.device_id = device_id
        self.clock = clock

    @property
    def public_key(self) -> str:
        raw = self.key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
        return base64.b64encode(raw).decode()

    def command(self, kind: str, **fields: Any) -> dict[str, Any]:
        payload = {
            "device": self.device_id,
            "type": kind,
            "nonce": secrets.token_hex(12),
            "at": self.clock().isoformat(),
            **fields,
        }
        signature = base64.b64encode(self.key.sign(canonical(payload))).decode()
        return {"payload": payload, "signature": signature}


def env(tmp_path: Path, **extra: str) -> dict[str, str]:
    values = {
        "BRIDGE_DEVICE_ID": DEVICE_ID,
        "BRIDGE_DEVICE_TOKEN": f"{DEVICE_ID}.secret",
        "BRIDGE_API_URL": "https://club.example/api/v1/",
        "BRIDGE_DATA_DIR": str(tmp_path / "data"),
        "BRIDGE_ALLOWED_ORIGINS": f"{ORIGIN}/",
        "BRIDGE_SIMULATOR_CONTROL": "1",
    }
    values.update(extra)
    return values


DEVICE_ID = str(uuid.UUID(int=7))


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
def server(clock: Clock) -> Server:
    return Server(DEVICE_ID, clock)


@pytest.fixture
def make_bridge(tmp_path: Path, clock: Clock, server: Server) -> Iterator[Any]:
    built: list[Bridge] = []

    def factory(**extra: str) -> Bridge:
        values = {"BRIDGE_SERVER_PUBLIC_KEY": server.public_key, **extra}
        bridge = build(config.load(env(tmp_path, **values)), simulated(str(tmp_path)), clock)
        built.append(bridge)
        return bridge

    yield factory
    for bridge in built:
        bridge.journal.close()


@pytest.fixture
def bridge(make_bridge: Any) -> Bridge:
    built: Bridge = make_bridge()
    return built
