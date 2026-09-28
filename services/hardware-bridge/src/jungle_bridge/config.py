"""Settings, from the environment (`.env` on the device, never in git)."""

from __future__ import annotations

import uuid
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

LOOPBACK = "127.0.0.1"


class ConfigError(Exception):
    pass


@dataclass(frozen=True)
class Settings:
    device_id: str
    device_token: str
    api_url: str
    key_path: Path
    journal_path: Path
    server_public_key: str
    allowed_origins: tuple[str, ...]
    port: int
    window_seconds: int
    drivers: str
    simulator_control: bool

    @property
    def host(self) -> str:
        """Only the loopback interface, always: nothing on the network can reach the bridge."""
        return LOOPBACK


def _flag(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}


def load(env: Mapping[str, str]) -> Settings:
    device_id = env.get("BRIDGE_DEVICE_ID", "").strip()
    try:
        uuid.UUID(device_id)
    except ValueError as exc:
        raise ConfigError("BRIDGE_DEVICE_ID must be the device's id from the admin") from exc
    origins = tuple(
        o.strip().rstrip("/") for o in env.get("BRIDGE_ALLOWED_ORIGINS", "").split(",") if o.strip()
    )
    if not origins:
        raise ConfigError("BRIDGE_ALLOWED_ORIGINS must list the kiosk app's origin")
    drivers = env.get("BRIDGE_DRIVERS", "simulator").strip()
    if drivers != "simulator":
        raise ConfigError("only the simulator drivers exist until the models are chosen (Q23)")
    try:
        port = int(env.get("BRIDGE_PORT", "8765"))
        window = int(env.get("BRIDGE_WINDOW_SECONDS", "120"))
    except ValueError as exc:
        raise ConfigError("BRIDGE_PORT and BRIDGE_WINDOW_SECONDS are numbers") from exc
    data = Path(env.get("BRIDGE_DATA_DIR", "/var/lib/jungle-bridge"))
    return Settings(
        device_id=device_id,
        device_token=env.get("BRIDGE_DEVICE_TOKEN", "").strip(),
        api_url=env.get("BRIDGE_API_URL", "").strip().rstrip("/"),
        key_path=Path(env.get("BRIDGE_KEY_PATH", str(data / "bridge-key.pem"))),
        journal_path=Path(env.get("BRIDGE_JOURNAL_PATH", str(data / "cash-journal.sqlite3"))),
        server_public_key=env.get("BRIDGE_SERVER_PUBLIC_KEY", "").strip(),
        allowed_origins=origins,
        port=port,
        window_seconds=window,
        drivers=drivers,
        simulator_control=_flag(env.get("BRIDGE_SIMULATOR_CONTROL", "0")),
    )
