"""Prints the public key of the server's command key, for each Hardware Bridge's `.env`
(`BRIDGE_SERVER_PUBLIC_KEY`). The private key never leaves the server's `.env`."""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from jungle.devices import commands


class Command(BaseCommand):
    help = "Prints the public key the Hardware Bridges use to check the server's commands."

    def handle(self, *args: Any, **options: Any) -> None:
        self.stdout.write(commands.public_key())
