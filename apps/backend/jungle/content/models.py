"""The website's texts changed from the panel (§8.6 "Conținut site", "Traduceri", Stage 11).

Every text of the website is in the catalogue (`packages/i18n`, ADR-0018); a staff member can
replace one, in one language, without a new version of the site. A change is first a draft; it
reaches the website only when it is published, and the default text comes back by deleting the
change. The website uses a published text only where the catalogue has that text, with the same
fields (`{name}`), so a change can never break a page.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models


class TextOverride(models.Model):
    id = models.BigAutoField(primary_key=True)
    key = models.CharField(max_length=200, help_text="web.… (the catalogue's path)")
    language = models.CharField(max_length=2)
    draft = models.TextField(blank=True, default="", max_length=2000)
    published = models.TextField(blank=True, default="", max_length=2000)
    published_at = models.DateTimeField(null=True, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    updated_at = models.DateTimeField()

    class Meta:
        ordering = ["key", "language"]
        verbose_name = "text schimbat"
        verbose_name_plural = "texte schimbate"
        constraints = [
            models.UniqueConstraint(fields=["key", "language"], name="text_override_once")
        ]

    def __str__(self) -> str:
        return f"{self.key} ({self.language})"
