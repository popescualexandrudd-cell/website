"""Production settings refuse what would be unsafe there (checked in a separate process)."""

from __future__ import annotations

import os
import subprocess
import sys

import pytest

BASE = {
    "JUNGLE_ENV": "prod",
    "DJANGO_SECRET_KEY": "x" * 60,
    "FIELD_ENCRYPTION_KEY": "y" * 60,
    "DJANGO_SETTINGS_MODULE": "jungle.settings",
}


def load(**extra: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if k not in {"REDIS_URL", "KIOSK_ALLOW_LOOPBACK"}}
    env.update(BASE, **extra)
    return subprocess.run(
        [sys.executable, "-c", "import jungle.settings"],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )


@pytest.mark.parametrize(
    ("extra", "message"),
    [
        ({}, "REDIS_URL must be set"),
        ({"REDIS_URL": "redis://r:6379/0", "KIOSK_ALLOW_LOOPBACK": "true"}, "development only"),
    ],
)
def test_production_refuses_unsafe_settings(extra: dict[str, str], message: str) -> None:
    result = load(**extra)
    assert result.returncode != 0 and message in result.stderr


def test_production_settings_load_when_complete() -> None:
    result = load(REDIS_URL="redis://r:6379/0")
    assert result.returncode == 0, result.stderr
