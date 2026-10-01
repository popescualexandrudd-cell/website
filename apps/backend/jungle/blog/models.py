"""The club's blog (§9.3 `/blog`, §15.2 SEO): guides and news, written in the panel.

Each article is complete in both languages (§10: RO + EN) and has its own address (`slug`). A draft
is seen only in the panel; a published article is on the website, and a correction later keeps
its address and its first publication date. Demo articles (`seed_initial --demo`) are shown as
such (invariant 12).
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class Article(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey(
        "locations.Location", on_delete=models.PROTECT, related_name="articles"
    )
    slug = models.SlugField(max_length=80, help_text="Adresa articolului: /blog/<slug>.")
    title_ro = models.CharField(max_length=140)
    title_en = models.CharField(max_length=140)
    summary_ro = models.CharField(max_length=300)
    summary_en = models.CharField(max_length=300)
    # Markdown: headings, lists, links, emphasis. No images or HTML (rendered without either).
    body_ro = models.TextField(max_length=40_000)
    body_en = models.TextField(max_length=40_000)
    published = models.BooleanField(default=False)
    first_published_at = models.DateTimeField(null=True, blank=True)
    is_demo = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-first_published_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["location", "slug"], name="article_slug_per_location")
        ]
        verbose_name = "articol"
        verbose_name_plural = "articolele blogului"

    def __str__(self) -> str:
        return self.title_ro
