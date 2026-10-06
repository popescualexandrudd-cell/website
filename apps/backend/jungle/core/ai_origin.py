"""The second barrier of ADR-0019: what the AI may never change refuses an AI caller.

The AI acts only through the tools in `jungle.ai.registry` (the first barrier: a tool that would
change scores, rating, LP, standings, money, prices, vouchers, consents or the club's settings
does not exist). Every tool runs inside `acting_for_ai(...)`; the services below call
`refuse_ai(...)` first, so even a tool added by mistake cannot reach them:

- `league.store.record` (rating, LP, ranks, standings) and `league.kiosk.check` (scores);
- `ledger.services.post` (every movement of money: payments, refunds, credits, discounts);
- `pricing.services.set_rate`, `subscriptions.services.set_rate` (prices);
- `rewards.services` (vouchers and "Bring a friend");
- `privacy.league_consent` and `privacy.services.erase` (GDPR consents, deletion);
- `configuration.services.set_flag` / `publish_config` (switches and settings).
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar

from jungle.core.errors import DomainError, ErrorCode

_ORIGIN: ContextVar[str | None] = ContextVar("ai_origin", default=None)


@contextmanager
def acting_for_ai(context: str) -> Iterator[None]:
    """Everything called inside runs "with AI origin" (the assistant's context: public, member,
    staff)."""
    token = _ORIGIN.set(context)
    try:
        yield
    finally:
        _ORIGIN.reset(token)


def ai_context() -> str | None:
    return _ORIGIN.get()


def refuse_ai(domain: str) -> None:
    """The first line of every protected service: an AI caller gets `ai.forbidden`."""
    if _ORIGIN.get() is not None:
        raise DomainError(ErrorCode.AI_FORBIDDEN, status=403, params={"domain": domain})
