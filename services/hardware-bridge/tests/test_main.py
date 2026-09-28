"""The command line: printing the public key for enrollment."""

from __future__ import annotations

import base64
from pathlib import Path

import pytest
from jungle_bridge import __main__ as cli
from jungle_bridge import server
from jungle_bridge.bridge import Bridge

from tests.conftest import env


def test_public_key_for_enrollment(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(server, "environment", lambda: env(tmp_path))
    assert cli.main(["public-key"]) == 0
    key = capsys.readouterr().out.strip()
    assert len(base64.b64decode(key)) == 32
    assert cli.main(["public-key"]) == 0
    assert capsys.readouterr().out.strip() == key  # the same key every time
    assert cli.main(["format"]) == 2
    assert "usage" in capsys.readouterr().err


def test_bad_configuration(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(server, "environment", lambda: env(tmp_path, BRIDGE_DEVICE_ID=""))
    assert cli.main([]) == 2
    assert "BRIDGE_DEVICE_ID" in capsys.readouterr().err


def test_run_starts_the_service_with_the_simulators(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    started: list[Bridge] = []

    async def run(bridge: Bridge) -> None:
        started.append(bridge)
        bridge.journal.close()

    monkeypatch.setattr(server, "environment", lambda: env(tmp_path))
    monkeypatch.setattr(server, "run", run)
    assert cli.main(["run"]) == 0
    assert started[0].settings.drivers == "simulator"
