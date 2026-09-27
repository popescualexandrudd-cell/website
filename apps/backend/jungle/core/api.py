"""Health check (used by monitoring and Docker)."""

from __future__ import annotations

from django.db import connection
from django.http import HttpRequest
from ninja import Router, Schema, Status

router = Router(tags=["health"])


class HealthOut(Schema):
    status: str
    database: str


@router.get("", response={200: HealthOut, 503: HealthOut}, auth=None)
def health(request: HttpRequest) -> Status[HealthOut]:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:  # database unreachable: report, do not crash
        return Status(503, HealthOut(status="degraded", database="unavailable"))
    return Status(200, HealthOut(status="ok", database="ok"))
