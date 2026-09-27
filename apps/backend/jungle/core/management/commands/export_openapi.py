"""Writes the OpenAPI schema used to generate packages/api-client (ADR-0007)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandParser

from jungle.api import api


class Command(BaseCommand):
    help = "Export the OpenAPI schema as JSON."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--output",
            default=str(settings.REPO_ROOT / "packages/api-client/openapi.json"),
            help="output file ('-' for stdout)",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        text = (
            json.dumps(api.get_openapi_schema(), indent=2, sort_keys=True, ensure_ascii=False)
            + "\n"
        )
        if options["output"] == "-":
            self.stdout.write(text, ending="")
            return
        Path(options["output"]).write_text(text, encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"OpenAPI schema written to {options['output']}"))
