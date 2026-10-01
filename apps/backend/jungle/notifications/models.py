"""Notifications (§11, Stage 12): the outbox, the templates edited in the panel, the client's
choices and the browsers subscribed to push.

Every message is first written to the outbox (`Notification`) with a key that makes it unique (the
same event for the same thing is sent once), then delivered after the change is saved; what could
not be delivered is tried again by `manage.py send_notifications`, which also sends the scheduled
ones (the reminders). The text a client receives is kept only as long as needed (90 days).
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class Status(models.TextChoices):
    QUEUED = "queued", "De trimis"
    SENT = "sent", "Trimisă"
    FAILED = "failed", "Netrimisă"
    SKIPPED = "skipped", "Nu s-a trimis (oprită sau fără canal)"


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    event = models.CharField(max_length=40)
    channel = models.CharField(max_length=8)
    language = models.CharField(max_length=2, default="ro")
    # One message per event, thing, person and channel (for example a booking's reminder).
    key = models.CharField(max_length=200, unique=True)
    context = models.JSONField(default=dict)
    send_after = models.DateTimeField()
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.QUEUED)
    attempts = models.PositiveSmallIntegerField(default=0)
    last_error = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "send_after"], name="notification_due")]
        verbose_name = "notificare"
        verbose_name_plural = "notificări"

    def __str__(self) -> str:
        return f"{self.event} → {self.user_id} ({self.channel}, {self.status})"


class Template(models.Model):
    """A text edited in the panel; without one, the default from the code's files is used."""

    event = models.CharField(max_length=40)
    channel = models.CharField(max_length=8)
    language = models.CharField(max_length=2)
    subject = models.CharField(
        max_length=160, help_text="Subiectul emailului sau titlul notificării."
    )
    body = models.TextField(max_length=5000)
    updated_at = models.DateTimeField()
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["event", "channel", "language"], name="notification_template_once"
            )
        ]
        verbose_name = "șablon de notificare"
        verbose_name_plural = "șabloanele notificărilor"

    def __str__(self) -> str:
        return f"{self.event} ({self.channel}, {self.language})"


class Preference(models.Model):
    """A category the client turned off on a channel (only the categories that may be)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_choices"
    )
    category = models.CharField(max_length=16)
    channel = models.CharField(max_length=8)
    enabled = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "category", "channel"], name="notification_choice_once"
            )
        ]

    def __str__(self) -> str:
        return f"{self.user_id} {self.category}/{self.channel}: {self.enabled}"


class PushSubscription(models.Model):
    """A browser (phone or computer) that accepted the club's push notifications."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="push_subscriptions"
    )
    endpoint = models.URLField(max_length=1000, unique=True)
    p256dh = models.CharField(max_length=200)
    auth = models.CharField(max_length=100)
    created_at = models.DateTimeField()

    class Meta:
        verbose_name = "abonare push"
        verbose_name_plural = "abonările push"

    def __str__(self) -> str:
        return f"{self.user_id} push"
