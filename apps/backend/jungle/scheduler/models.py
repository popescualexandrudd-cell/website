"""Every run of a scheduled job (ADR-0024): when it started, when it ended, whether it worked and
what it said. The panel and the monitoring read these; nothing else writes them."""

from __future__ import annotations

from django.db import models


class JobRun(models.Model):
    id = models.BigAutoField(primary_key=True)
    job = models.CharField(max_length=64)
    started_at = models.DateTimeField()
    finished_at = models.DateTimeField(null=True, blank=True)
    ok = models.BooleanField(null=True, help_text="empty while it runs")
    output = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-started_at"]
        verbose_name = "rulare programată"
        verbose_name_plural = "rulări programate"
        indexes = [models.Index(fields=["job", "-started_at"])]

    def __str__(self) -> str:
        state = "…" if self.ok is None else ("ok" if self.ok else "eșuat")
        return f"{self.job} {self.started_at:%Y-%m-%d %H:%M} {state}"
