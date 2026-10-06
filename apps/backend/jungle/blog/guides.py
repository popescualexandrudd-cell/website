"""The guides of the blog's editorial plan (§15.2, Stage 13B): Markdown files in `guide_texts/`,
each with its titles and summaries (front matter) and its Romanian and English text. `add_guides`
puts them in the blog as **unpublished drafts**, so the staff read, correct and publish them from
the panel (Blog module) like any article; a guide whose address is taken is never overwritten.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from django.db import transaction

from jungle.blog.models import Article
from jungle.locations.models import Location

GUIDES = Path(__file__).with_name("guide_texts")
FIELDS = ("title_ro", "title_en", "summary_ro", "summary_en")


@dataclass(frozen=True)
class Guide:
    slug: str
    title_ro: str
    title_en: str
    summary_ro: str
    summary_en: str
    body_ro: str
    body_en: str


def parse(slug: str, text: str) -> Guide:
    """---\\nfield: value\\n---\\n<!-- ro -->\\n…\\n<!-- en -->\\n…"""
    _, head, rest = text.split("---\n", 2)
    meta = {}
    for line in head.strip().splitlines():
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip().strip('"')
    if set(meta) != set(FIELDS) or "<!-- en -->" not in rest:
        raise ValueError(
            f"guide {slug}: front matter {sorted(meta)} or the English text is missing"
        )
    ro, en = rest.split("<!-- en -->", 1)
    return Guide(
        slug=slug,
        body_ro=ro.replace("<!-- ro -->", "").strip(),
        body_en=en.strip(),
        **{key: meta[key] for key in FIELDS},
    )


def guides() -> list[Guide]:
    return [
        parse(path.stem, path.read_text(encoding="utf-8")) for path in sorted(GUIDES.glob("*.md"))
    ]


def add_guides(location: Location) -> list[str]:
    """The guides not in the blog yet, as unpublished drafts; returns their addresses."""
    added = []
    with transaction.atomic():
        for guide in guides():
            if Article.objects.filter(location=location, slug=guide.slug).exists():
                continue
            Article.objects.create(
                location=location, published=False, is_demo=False, **guide.__dict__
            )
            added.append(guide.slug)
    return added
