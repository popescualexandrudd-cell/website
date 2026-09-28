"""Sending the cash journal to the server (ADR-0013 point 4).

Events go in order, signed; the server acknowledges the ids it recorded, and only those are
marked as synced here. Sending an event twice is harmless: the server keys on its id. When the
server cannot be reached nothing is lost; the events wait on disk for the next attempt.

The server's side (crediting cash only from validly signed events) arrives with the Payments
Kiosk (Stage 8); until then `send` is whatever the caller provides (the tests, a dry run).
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import Any

from jungle_bridge.journal import Journal

log = logging.getLogger(__name__)

Send = Callable[[list[dict[str, Any]]], Awaitable[list[str]]]


async def sync_once(journal: Journal, send: Send, batch: int = 100) -> int:
    """Sends what is still pending; returns how many events the server acknowledged."""
    pending = journal.pending()[:batch]
    if not pending:
        return 0
    try:
        acknowledged = await send([e.envelope for e in pending])
    except (OSError, TimeoutError) as exc:
        log.warning("cash journal sync failed, %d events wait on disk: %s", len(pending), exc)
        return 0
    sent = {e.id for e in pending}
    confirmed = [i for i in acknowledged if i in sent]
    journal.mark_synced(confirmed)
    return len(confirmed)
