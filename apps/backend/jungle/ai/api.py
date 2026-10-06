"""The AI (ADR-0019): the club's assistant on the website (12D), and its state, spend and log in
the panel."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from django.http import HttpRequest
from ninja import Field, Router, Schema

from jungle.ai import services
from jungle.bookings.models import SessionType
from jungle.core.schemas import errors
from jungle.core.security import require_csrf, session_auth

public_router = Router(tags=["ai"])
staff_router = Router(tags=["staff: ai"], auth=session_auth)


class TurnIn(Schema):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class AskIn(Schema):
    location: str = Field(max_length=60)
    messages: list[TurnIn] = Field(
        min_length=1, max_length=20, description="the conversation, ending with the question"
    )


class ProposalOut(Schema):
    """A booking prepared by the assistant: the person confirms it (POST /api/v1/bookings)."""

    resource_id: uuid.UUID
    resource_name: str
    starts_at: datetime
    duration_minutes: int
    session_type: SessionType
    total: str = Field(description='as the person reads it, e.g. "120 lei"')
    provisional: bool = Field(description="the club has not fixed this price yet (DE_STABILIT)")


class AskOut(Schema):
    text: str
    outcome: str = Field(description="answered, refused, budget, steps or failed")
    proposals: list[ProposalOut]


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


@public_router.post("/ask", response={200: AskOut, **errors(403, 404, 422, 429, 503)}, auth=None)
def ask(request: HttpRequest, payload: AskIn) -> AskOut:
    """The club's assistant: for a visitor, or for the signed-in client (their own bookings, and a
    booking prepared for them to confirm). It never books, pays or changes the league."""
    require_csrf(request)
    result = services.ask_from_web(
        request, payload.location, [turn.dict() for turn in payload.messages]
    )
    return AskOut(
        text=result.answer.text,
        outcome=result.answer.outcome,
        proposals=[ProposalOut(**p) for p in result.proposals],
    )


@staff_router.get("/ai/status", response={200: AIStatusOut, **errors(401, 403)})
def ai_status(request: HttpRequest, location_id: uuid.UUID) -> AIStatusOut:
    return AIStatusOut(**services.status(request, location_id).__dict__)


@staff_router.get("/ai/interactions", response={200: list[AIInteractionOut], **errors(401, 403)})
def ai_interactions(request: HttpRequest, location_id: uuid.UUID) -> list[AIInteractionOut]:
    return [AIInteractionOut.from_orm(row) for row in services.interactions(request, location_id)]
