"""`jungle-bridge run` starts the service; `jungle-bridge public-key` prints the key the admin
pastes at enrollment (created on first use)."""

from __future__ import annotations

import asyncio
import logging
import sys

from jungle_bridge import config, server
from jungle_bridge.drivers.simulator import simulated
from jungle_bridge.signing import load_or_create_key, public_key_b64


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    command = args[0] if args else "run"
    try:
        settings = config.load(server.environment())
    except config.ConfigError as exc:
        print(f"configuration: {exc}", file=sys.stderr)
        return 2
    if command == "public-key":
        print(public_key_b64(load_or_create_key(settings.key_path)))
        return 0
    if command != "run":
        print("usage: jungle-bridge [run | public-key]", file=sys.stderr)
        return 2
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    bridge = server.build(settings, simulated(str(settings.journal_path.parent)))
    asyncio.run(server.run(bridge))  # runs until the service stops
    return 0


if __name__ == "__main__":
    sys.exit(main())
