"""The bridge's settings, from the device's `.env`."""

from __future__ import annotations

from pathlib import Path

import pytest
from jungle_bridge import config

from tests.conftest import DEVICE_ID, ORIGIN, env


def test_settings(tmp_path: Path) -> None:
    settings = config.load(env(tmp_path, BRIDGE_ALLOWED_ORIGINS=f"{ORIGIN}/, ,http://kiosk"))
    assert settings.allowed_origins == (ORIGIN, "http://kiosk")
    assert settings.host == "127.0.0.1" and settings.port == 8765
    assert settings.key_path == tmp_path / "data" / "bridge-key.pem"
    assert settings.journal_path == tmp_path / "data" / "cash-journal.sqlite3"
    assert settings.api_url == "https://club.example/api/v1"
    assert settings.simulator_control is True and settings.window_seconds == 120
    assert settings.device_id == DEVICE_ID
    assert config.load(env(tmp_path, BRIDGE_SIMULATOR_CONTROL="no")).simulator_control is False


@pytest.mark.parametrize(
    ("change", "message"),
    [
        ({"BRIDGE_DEVICE_ID": "chiosc"}, "BRIDGE_DEVICE_ID"),
        ({"BRIDGE_ALLOWED_ORIGINS": " "}, "BRIDGE_ALLOWED_ORIGINS"),
        ({"BRIDGE_DRIVERS": "ssp"}, "Q23"),
        ({"BRIDGE_PORT": "optzeci"}, "numbers"),
    ],
)
def test_invalid_settings(tmp_path: Path, change: dict[str, str], message: str) -> None:
    with pytest.raises(config.ConfigError, match=message):
        config.load(env(tmp_path, **change))
