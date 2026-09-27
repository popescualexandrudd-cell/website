"""Publish a new version of a legal document from a Markdown file in docs/.

Only the part after `<!-- PUBLIC TEXT BELOW -->` is published; its first `# ` line is the
title. Texts still containing DE_CONFIRMAT are refused unless marked as demo.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand, CommandError, CommandParser

from jungle.audit.services import SYSTEM
from jungle.legal.models import DocumentKind
from jungle.legal.services import publish_document

MARKER = "<!-- PUBLIC TEXT BELOW -->"


def read_public_text(path: Path) -> tuple[str, str]:
    text = path.read_text(encoding="utf-8")
    if MARKER not in text:
        raise CommandError(f"{path}: missing '{MARKER}'")
    public = text.split(MARKER, 1)[1].strip()
    first, _, body = public.partition("\n")
    if not first.startswith("# "):
        raise CommandError(f"{path}: the public text must start with a '# ' title")
    return first[2:].strip(), body.strip() + "\n"


class Command(BaseCommand):
    help = "Publish a legal document version (immutable) from a Markdown file."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--kind", required=True, choices=DocumentKind.values)
        parser.add_argument("--language", required=True, choices=["ro", "en"])
        parser.add_argument("--file", required=True)
        parser.add_argument(
            "--demo", action="store_true", help="allow DE_CONFIRMAT placeholders (dev only)"
        )

    def handle(self, *args: Any, **options: Any) -> None:
        title, body = read_public_text(Path(options["file"]))
        if "DE_CONFIRMAT" in body and not options["demo"]:
            raise CommandError(
                "The text still contains DE_CONFIRMAT placeholders (company details, Q26)."
            )
        doc = publish_document(
            SYSTEM,
            DocumentKind(options["kind"]),
            options["language"],
            title,
            body,
            is_demo=options["demo"],
        )
        self.stdout.write(self.style.SUCCESS(f"Published {doc} (sha256 {doc.sha256[:12]}…)"))
