"""The AI provider adapter (ADR-0019 §1): the rest of the club only sees `AIProvider`.

The default is Claude (Anthropic), through the official SDK. The model comes from `AI_MODEL` and
the key from `AI_API_KEY`, both only in `.env` on the server (Q24); without either, the AI is off
and everything else works as usual.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

import anthropic
from django.conf import settings

# A refused request is answered again by another model, chosen by the API from the refusal's
# category ("fallbacks": "default"), on the models that support it.
FALLBACK_BETA = "server-side-fallback-2026-07-01"
FALLBACK_MODELS = frozenset({"claude-opus-5-5", "claude-sonnet-5-5", "claude-fable-5-1"})


class ProviderError(Exception):
    """The provider could not answer (network, key, limits); the caller logs it."""


@dataclass(frozen=True)
class Reply:
    blocks: list[dict[str, Any]]  # the model's content blocks, sent back unchanged
    stop_reason: str
    input_tokens: int
    output_tokens: int
    model: str


class AIProvider(Protocol):
    model: str

    def reply(
        self,
        *,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        max_tokens: int,
        effort: str,
    ) -> Reply: ...


class ClaudeProvider:
    def __init__(self, api_key: str, model: str, client: anthropic.Anthropic | None = None):
        self.model = model
        self.client = client or anthropic.Anthropic(api_key=api_key, max_retries=2, timeout=60.0)

    def reply(
        self,
        *,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        max_tokens: int,
        effort: str,
    ) -> Reply:
        # The system prompt and the tools do not change between questions: cached.
        params: dict[str, Any] = {
            "model": self.model,
            "max_tokens": max_tokens,
            "system": [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
            "tools": tools,
            "messages": messages,
            "output_config": {"effort": effort},
        }
        try:
            if self.model in FALLBACK_MODELS:
                response: Any = self.client.beta.messages.create(
                    **params, betas=[FALLBACK_BETA], fallbacks="default"
                )
            else:
                response = self.client.messages.create(**params)
        except anthropic.APIError as exc:
            raise ProviderError(type(exc).__name__) from exc
        usage = response.usage
        # Cached tokens are counted at the full price: the monthly limit errs on the safe side.
        read = (usage.input_tokens or 0) + (usage.cache_creation_input_tokens or 0)
        read += usage.cache_read_input_tokens or 0
        return Reply(
            blocks=[block.to_dict() for block in response.content],
            stop_reason=response.stop_reason or "end_turn",
            input_tokens=read,
            output_tokens=usage.output_tokens or 0,
            model=response.model,
        )


_override: AIProvider | None = None


def use(provider: AIProvider | None) -> None:
    """Tests (and a future second provider) set the provider here."""
    global _override
    _override = provider


def current() -> AIProvider | None:
    """The configured provider, or None when the key or the model is missing."""
    if _override is not None:
        return _override
    if not settings.AI_API_KEY or not settings.AI_MODEL:
        return None
    return ClaudeProvider(settings.AI_API_KEY, settings.AI_MODEL)
