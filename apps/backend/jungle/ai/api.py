"""The AI in the panel (ADR-0019): its state, spend and log. The assistant's own endpoints
come with it (phase 12D)."""

from __future__ import annotations

import uuid
from datetime import datetime

from django.http import HttpRequest
from ninja import Field, Router, Schema

from jungle.ai import services
from jungle.core.schemas import errors
from jungle.core.security import session_auth

staff_router = Router(tags=["staff: ai"], auth=session_auth)


class AIStatusOut(Schema):
    enabled: bool = Field(description="the global switch `ai`")
    configured: bool = Field(description="AI_API_KEY and AI_MODEL are set on the server")
    model: str
    month_cost_micro_usd: int = Field(description="this month's spend, in millionths of a dollar")
    budget_usd: int
    tools: dict[str, list[str]] = Field(description="{tool: [contexts]}")


class AIInteractionOut(Schema):
    id: uuid.UUID
    context: str
    outcome: str
    model: str
    tools: list[dict[str, object]]
    steps: int
    input_tokens: int
    output_tokens: int
    cost_micro_usd: int
    created_at: datetime


@staff_router.get("/ai/status", response={200: AIStatusOut, **errors(401, 403)})
def ai_status(request: HttpRequest, location_id: uuid.UUID) -> AIStatusOut:
    return AIStatusOut(**services.status(request, location_id).__dict__)


@staff_router.get("/ai/interactions", response={200: list[AIInteractionOut], **errors(401, 403)})
def ai_interactions(request: HttpRequest, location_id: uuid.UUID) -> list[AIInteractionOut]:
    return [AIInteractionOut.from_orm(row) for row in services.interactions(request, location_id)]
