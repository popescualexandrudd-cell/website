"""The client's opinion after the first game (Q71): the question in the account, the answer, and
the NPS for the owner's side (`reports.view`)."""

from __future__ import annotations

import uuid
from datetime import date

from django.http import HttpRequest
from ninja import Field, Router, Schema

from jungle.core.schemas import errors
from jungle.core.security import session_auth
from jungle.feedback import services

me_router = Router(tags=["feedback"], auth=session_auth)
staff_router = Router(tags=["staff: feedback"], auth=session_auth)


class FeedbackStateOut(Schema):
    asked: bool = Field(description="the club asked this person (once, after the first game)")
    answered: bool


class FeedbackIn(Schema):
    score: int = Field(ge=0, le=10, description="would you recommend us to a friend? 0–10")


class FeedbackSummaryOut(Schema):
    first: date
    last: date
    asked: int
    answers: int
    promoters: int = Field(description="9–10")
    passives: int = Field(description="7–8")
    detractors: int = Field(description="0–6")
    nps: int | None = Field(description="promoters % − detractors %; null without answers")


def _state(value: services.State) -> FeedbackStateOut:
    return FeedbackStateOut(asked=value.asked, answered=value.answered)


@me_router.get("", response={200: FeedbackStateOut, **errors(401)})
def feedback_state(request: HttpRequest) -> FeedbackStateOut:
    return _state(services.state(request))


@me_router.post("", response={200: FeedbackStateOut, **errors(401, 404, 409, 422)})
def feedback_answer(request: HttpRequest, payload: FeedbackIn) -> FeedbackStateOut:
    return _state(services.answer(request, payload.score))


@staff_router.get("/feedback/summary", response={200: FeedbackSummaryOut, **errors(401, 403, 422)})
def feedback_summary(
    request: HttpRequest, location_id: uuid.UUID, days: int = 90
) -> FeedbackSummaryOut:
    s = services.summary(request, location_id, days)
    return FeedbackSummaryOut(
        first=s.first,
        last=s.last,
        asked=s.asked,
        answers=s.answers,
        promoters=s.promoters,
        passives=s.passives,
        detractors=s.detractors,
        nps=s.nps,
    )
