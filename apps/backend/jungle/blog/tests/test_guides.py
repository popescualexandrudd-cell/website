"""The guides of the blog's editorial plan (§15.2, Stage 13B): unpublished drafts for the staff to
read, correct and publish; never over an existing address; both languages complete."""

from __future__ import annotations

from io import StringIO
from typing import Any

import pytest
from django.core.management import CommandError, call_command

from jungle.blog import guides
from jungle.blog.models import Article

pytestmark = pytest.mark.django_db
SLUGS = [
    "ce-este-padelul",
    "cum-functioneaza-liga-jungle",
    "echipamentul-de-padel",
    "padel-sau-tenis",
    "regulile-padelului",
]


def test_every_guide_is_complete_in_both_languages() -> None:
    found = guides.guides()
    assert [g.slug for g in found] == SLUGS
    for guide in found:
        assert len(guide.title_ro) <= 140 and len(guide.title_en) <= 140
        assert 0 < len(guide.summary_ro) <= 300 and 0 < len(guide.summary_en) <= 300
        assert guide.body_ro.startswith("## ") and guide.body_en.startswith("## ")
        assert "de revizuit" in guide.body_ro and "to be reviewed" in guide.body_en
        assert (
            "<" not in guide.body_ro + guide.body_en and "|" not in guide.body_ro
        )  # no HTML, no tables


def test_the_guides_become_drafts_once(club: Any) -> None:
    out = StringIO()
    call_command("blog_guides", stdout=out)
    assert "Ghiduri adăugate ca ciorne: 5" in out.getvalue()
    drafts = Article.objects.filter(slug__in=SLUGS)
    assert drafts.count() == 5 and not drafts.filter(published=True).exists()
    assert not drafts.filter(is_demo=True).exists()
    Article.objects.filter(slug="padel-sau-tenis").update(title_ro="Corectat de club")
    out = StringIO()
    call_command("blog_guides", stdout=out)
    assert "(toate existau deja)" in out.getvalue()
    assert Article.objects.get(slug="padel-sau-tenis").title_ro == "Corectat de club"
    with pytest.raises(CommandError):
        call_command("blog_guides", "--location", "nu-exista")


def test_a_broken_guide_is_refused() -> None:
    with pytest.raises(ValueError, match="front matter"):
        guides.parse("x", "---\ntitle_ro: T\n---\n<!-- ro -->\nText")
