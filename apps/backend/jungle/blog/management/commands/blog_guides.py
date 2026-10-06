"""Adds the guides of the blog's editorial plan (§15.2) as unpublished drafts, to be read, corrected
and published from the panel (Blog module). Safe to run again: existing addresses are left alone."""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand, CommandError

from jungle.blog.guides import add_guides
from jungle.locations.models import Location


class Command(BaseCommand):
    help = "Adds the blog guides (§15.2) as unpublished drafts."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--location", default="jungle-padel", help="the location's slug")

    def handle(self, *args: Any, **options: Any) -> None:
        location = Location.objects.filter(slug=options["location"]).first()
        if location is None:
            raise CommandError(f"Locația {options['location']!r} nu există (rulați seed_initial).")
        added = add_guides(location)
        self.stdout.write(
            f"Ghiduri adăugate ca ciorne: {len(added)}"
            + (f" ({', '.join(added)})." if added else " (toate existau deja).")
        )
