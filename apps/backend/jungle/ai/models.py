"""The AI log (ADR-0019): one row per question, without the conversation's text."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class Context(models.TextChoices):
    """Who the AI works for: the tools it may use depend on it."""

    PUBLIC = "public", "Asistent public (fără cont)"
    MEMBER = "member", "Asistent în contul clientului"
    STAFF = "staff", "Copilot pentru personal"


class Outcome(models.TextChoices):
    ANSWERED = "answered", "Răspuns"
    REFUSED = "refused", "Refuzat de model"
    BUDGET = "budget", "Limita lunară atinsă"
    STEPS = "steps", "Prea mulți pași"
    FAILED = "failed", "Eroare la furnizor"


class AIInteraction(models.Model):
    """What was used and what it cost: never the question, the answer or a tool's data
    (data minimisation, §10.1). The person is kept for their own history and erasure."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    context = models.CharField(max_length=10, choices=Context.choices)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    location = models.ForeignKey(
        "locations.Location", on_delete=models.PROTECT, related_name="ai_interactions"
    )
    model = models.CharField(max_length=80)
    outcome = models.CharField(max_length=10, choices=Outcome.choices)
    # [{"name": "club_info", "ok": true}, {"name": "x", "ok": false, "error": "ai.forbidden"}]
    tools = models.JSONField(default=list)
    steps = models.PositiveSmallIntegerField(default=0)
    input_tokens = models.PositiveIntegerField(default=0)
    output_tokens = models.PositiveIntegerField(default=0)
    cost_micro_usd = models.PositiveBigIntegerField("cost (milionimi de dolar)", default=0)
    created_at = models.DateTimeField()

    class Meta:
        verbose_name = "interacțiune AI"
        verbose_name_plural = "interacțiuni AI"
        indexes = [models.Index(fields=["created_at"], name="ai_interaction_by_time")]

    def __str__(self) -> str:
        return f"{self.context} · {self.outcome} · {self.created_at:%d.%m.%Y %H:%M}"


class DraftKind(models.TextChoices):
    COMMUNITY = "community", "Mesaj pentru comunitate"
    ARTICLE = "article", "Articol"
    TRANSLATION = "translation", "Traducere"


class DraftStatus(models.TextChoices):
    TO_REVIEW = "to_review", "De revizuit"
    APPROVED = "approved", "Aprobată"
    DISCARDED = "discarded", "Renunțat"


class AIDraft(models.Model):
    """A text the AI wrote for the staff (ADR-0019, Q19): it stays "de revizuit" until a person
    approves it (corrected, if needed) or discards it; nothing is published or sent by itself.
    The staff's request and the text are kept: they are the club's own content, not a client's."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey(
        "locations.Location", on_delete=models.PROTECT, related_name="ai_drafts"
    )
    kind = models.CharField(max_length=12, choices=DraftKind.choices)
    language = models.CharField(max_length=2)
    request = models.TextField("cererea", max_length=8000)
    body = models.TextField("textul", max_length=20000)
    status = models.CharField(
        max_length=10, choices=DraftStatus.choices, default=DraftStatus.TO_REVIEW
    )
    interaction = models.ForeignKey(
        AIInteraction, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "ciornă AI"
        verbose_name_plural = "ciorne AI"

    def __str__(self) -> str:
        return f"{self.kind} · {self.status} · {self.created_at:%d.%m.%Y %H:%M}"
