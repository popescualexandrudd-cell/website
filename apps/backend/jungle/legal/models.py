"""Versioned legal documents and consent records (R-002, R-011, §12.2).

Both tables are append-only: a new text is a new version, and a withdrawal is a new
consent row with action WITHDRAWN.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models


class DocumentKind(models.TextChoices):
    TERMS = "terms", "Termeni și condiții"
    PRIVACY = "privacy", "Politica de confidențialitate"
    LEAGUE_GDPR = "league_gdpr", "Acordul GDPR al ligii"
    WAITLIST_NOTICE = "waitlist_notice", "Nota de informare pentru lista de așteptare"
    REFUNDS = "refunds", "Politica de anulare și rambursare"
    COOKIES = "cookies", "Politica de cookies"
    RULES = "rules", "Regulamentul clubului"


# Documents a person must accept to create an account.
REGISTRATION_DOCUMENTS = (DocumentKind.TERMS, DocumentKind.PRIVACY)


class LegalDocument(models.Model):
    kind = models.CharField(max_length=30, choices=DocumentKind.choices)
    version = models.PositiveIntegerField()
    language = models.CharField(max_length=5)
    title = models.CharField(max_length=200)
    body = models.TextField()
    sha256 = models.CharField(max_length=64)
    is_demo = models.BooleanField(default=False)
    published_at = models.DateTimeField()
    created_by_id = models.UUIDField(null=True, blank=True)

    class Meta:
        ordering = ["kind", "language", "-version"]
        verbose_name = "document legal"
        verbose_name_plural = "documente legale"
        constraints = [
            models.UniqueConstraint(
                fields=["kind", "version", "language"], name="legal_document_version_unique"
            )
        ]

    def __str__(self) -> str:
        return f"{self.get_kind_display()} v{self.version} ({self.language})"


class ConsentAction(models.TextChoices):
    GRANTED = "granted", "Acordat"
    WITHDRAWN = "withdrawn", "Retras"


class Consent(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="consents"
    )
    document = models.ForeignKey(LegalDocument, on_delete=models.PROTECT, related_name="consents")
    action = models.CharField(max_length=10, choices=ConsentAction.choices)
    text_sha256 = models.CharField(max_length=64)
    language = models.CharField(max_length=5)
    device = models.ForeignKey(
        "devices.Device", on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-occurred_at", "-id"]
        verbose_name = "acord"
        verbose_name_plural = "acorduri"

    def __str__(self) -> str:
        return f"{self.user} {self.action} {self.document}"
