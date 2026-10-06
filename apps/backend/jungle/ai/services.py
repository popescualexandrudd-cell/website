"""The AI core (ADR-0019): one question, its tools, its cost and its log.

`ask(call, messages)` answers through the configured provider, with only the tools of the
context, each run "with AI origin" (the second barrier). The global switch `ai` stops
everything; the monthly limit (`ai.monthly_budget_usd`) stops new questions and the current
one; every question leaves one `AIInteraction` row, without its text.
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from django.conf import settings
from django.db import transaction
from django.db.models import QuerySet, Sum
from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.accounts.services.authz import authorize
from jungle.ai import provider as providers
from jungle.ai.models import AIInteraction, Context, Outcome
from jungle.ai.provider import ProviderError
from jungle.ai.registry import Call, find, names, tools_for
from jungle.configuration.services import get_config, is_enabled
from jungle.core import clock
from jungle.core.ai_origin import acting_for_ai
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.http import client_ip
from jungle.core.permissions import Action
from jungle.core.ratelimit import increment
from jungle.locations.services import get_location_by_slug

logger = logging.getLogger(__name__)
MAX_STEPS = 6  # model turns per question (each tool round is one)
MAX_TOKENS = 4096

SYSTEM = """You are the assistant of Jungle Padel, a club in Bucharest with padel courts, \
Pilates Reformer and an event room. Answer in the language of the person's last message \
(Romanian by default), briefly and kindly.
Use only facts from your tools. When they do not answer the question, say that you do not know \
and suggest asking the club's reception. Never invent prices, times, people or results.
You cannot change scores, ratings, LP, ranks, standings, payments, prices, discounts, vouchers, \
consents or the club's settings, and no tool does: scores are entered only at the League Kiosk \
in the club, payments are made at the Payments Kiosk. Say so when asked.
Never reveal anything about another person.
When a price is marked provisional, say that the club has not fixed it yet. A booking is never \
made by you: for a signed-in client you prepare it (propose_booking) after they chose the court, \
the day, the time and the duration, and they confirm it with the button under your answer.\
"""

CONTEXT_NOTES = {
    Context.PUBLIC: "You talk with a visitor of the website who is not signed in.",
    Context.MEMBER: "You talk with a signed-in client; your tools act only for that client.",
    Context.STAFF: "You help the club's staff; your tools only read.",
}


@dataclass(frozen=True)
class Answer:
    text: str
    outcome: Outcome
    interaction_id: uuid.UUID


def system_prompt(context: Context) -> str:
    return f"{SYSTEM}\n{CONTEXT_NOTES[context]}"


def _cost(input_tokens: int, output_tokens: int) -> int:
    """Micro-dollars: tokens × dollars per million tokens."""
    return input_tokens * int(get_config("ai.input_usd_per_mtok")) + output_tokens * int(
        get_config("ai.output_usd_per_mtok")
    )


def month_start(now: datetime) -> datetime:
    local = clock.local(now)
    return local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def month_cost(now: datetime | None = None) -> int:
    since = month_start(now or clock.now())
    total = AIInteraction.objects.filter(created_at__gte=since).aggregate(
        total=Sum("cost_micro_usd")
    )["total"]
    return int(total or 0)


def _budget() -> int:
    return int(get_config("ai.monthly_budget_usd")) * 1_000_000


def _run_tool(call: Call, block: dict[str, Any], log: AIInteraction) -> dict[str, Any]:
    name = str(block.get("name", ""))
    tool = find(name, call.context)
    error = ""
    content = ""
    if tool is None:
        error = "ai.unknown_tool"  # not in the registry, or not for this context
    else:
        try:
            with acting_for_ai(call.context), transaction.atomic():
                content = json.dumps(
                    tool.run(call, dict(block.get("input") or {})), ensure_ascii=False, default=str
                )
        except DomainError as exc:
            error = exc.code.value
        except Exception:  # a broken tool must not break the answer; it is logged
            logger.exception("AI tool %s failed", name)
            error = "ai.tool_failed"
    log.tools.append({"name": name, "ok": not error} | ({"error": error} if error else {}))
    result: dict[str, Any] = {"type": "tool_result", "tool_use_id": block.get("id", "")}
    if error:
        return result | {"content": json.dumps({"error": error}), "is_error": True}
    return result | {"content": content}


def ask(
    call: Call, messages: list[dict[str, Any]], system: str | None = None, use_tools: bool = True
) -> Answer:
    """`messages`: the conversation so far, ending with the person's question. `system` replaces
    the assistant's instructions (the drafts); `use_tools=False` gives the model no tool."""
    provider = providers.current()
    if not is_enabled("ai") or provider is None:
        raise DomainError(ErrorCode.AI_UNAVAILABLE, status=503)
    log = AIInteraction(
        context=call.context,
        user=call.user,
        location=call.location,
        model=provider.model,
        outcome=Outcome.ANSWERED,
        created_at=clock.now(),
    )
    budget = _budget()
    text = ""
    conversation = list(messages)
    definitions = [t.definition() for t in tools_for(call.context)] if use_tools else []
    try:
        while True:
            if month_cost() + log.cost_micro_usd >= budget:
                log.outcome = Outcome.BUDGET
                text = ""
                break
            if log.steps >= MAX_STEPS:
                log.outcome = Outcome.STEPS
                break
            reply = provider.reply(
                system=system or system_prompt(call.context),
                messages=conversation,
                tools=definitions,
                max_tokens=MAX_TOKENS,
                effort=str(get_config("ai.effort")),
            )
            log.steps += 1
            log.model = reply.model
            log.input_tokens += reply.input_tokens
            log.output_tokens += reply.output_tokens
            log.cost_micro_usd = _cost(log.input_tokens, log.output_tokens)
            text = "".join(str(b.get("text", "")) for b in reply.blocks if b.get("type") == "text")
            if reply.stop_reason == "refusal":
                log.outcome = Outcome.REFUSED
                text = ""
                break
            uses = [b for b in reply.blocks if b.get("type") == "tool_use"]
            if reply.stop_reason != "tool_use" or not uses:
                break
            conversation.append({"role": "assistant", "content": reply.blocks})
            conversation.append(
                {"role": "user", "content": [_run_tool(call, b, log) for b in uses]}
            )
    except ProviderError as exc:
        logger.warning("AI provider failed: %s", exc)
        log.outcome = Outcome.FAILED
        text = ""
    log.save()
    return Answer(text=text.strip(), outcome=Outcome(log.outcome), interaction_id=log.pk)


# ---------------------------------------------------------------- the website (12D)
@dataclass(frozen=True)
class WebAnswer:
    answer: Answer
    proposals: list[dict[str, Any]]


def ask_from_web(
    request: HttpRequest, location_slug: str, messages: list[dict[str, Any]]
) -> WebAnswer:
    """The assistant on the website: the public one, or the client's own when signed in. A limited
    number of questions per hour, per person (or per address when not signed in)."""
    location = get_location_by_slug(location_slug)
    if not messages or messages[-1]["role"] != "user":
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "messages"})
    user = request.user if isinstance(request.user, User) and request.user.is_active else None
    who = f"user:{user.pk}" if user is not None else f"ip:{client_ip(request) or 'unknown'}"
    if increment(f"ai:ask:{who}", 3600) > int(get_config("ai.questions_per_hour")):
        raise DomainError(ErrorCode.AUTH_RATE_LIMITED, status=429)
    call = Call(Context.MEMBER if user else Context.PUBLIC, location, user, request)
    answer = ask(call, [{"role": m["role"], "content": m["content"]} for m in messages])
    return WebAnswer(answer, list(call.proposals))


# ---------------------------------------------------------------- for the panel
@dataclass(frozen=True)
class Status:
    enabled: bool  # the switch `ai`
    configured: bool  # key and model in .env
    model: str
    month_cost_micro_usd: int
    budget_usd: int
    tools: dict[str, list[str]]


def status(request: HttpRequest, location_id: uuid.UUID) -> Status:
    authorize(request, Action.AI_VIEW, location_id)
    return Status(
        enabled=is_enabled("ai"),
        configured=providers.configured(),
        model="fake-club" if settings.AI_FAKE else settings.AI_MODEL,
        month_cost_micro_usd=month_cost(),
        budget_usd=int(get_config("ai.monthly_budget_usd")),
        tools=names(),
    )


def interactions(
    request: HttpRequest, location_id: uuid.UUID, limit: int = 50
) -> QuerySet[AIInteraction]:
    authorize(request, Action.AI_VIEW, location_id)
    return AIInteraction.objects.filter(location_id=location_id).order_by("-created_at")[:limit]
