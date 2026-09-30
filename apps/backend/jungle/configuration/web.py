"""Tells the public website that the club's settings changed (ADR-0022), so its pages are rebuilt
at the next visit instead of after their 5-minute refresh: a feature flag turned on (for example
the full site at the launch, `full_site`) or a new version of a setting.

The website exposes `POST /api/revalidate` (apps/web), protected by a shared secret. Both values
live only in the server's `.env` (`WEB_REVALIDATE_URL`, `WEB_REVALIDATE_SECRET`); without them this
does nothing. A failure never breaks the change itself: it is logged, and the pages still refresh
on their own within 5 minutes.
"""

from __future__ import annotations

import logging

import httpx
from django.conf import settings
from django.db import transaction

logger = logging.getLogger(__name__)
TIMEOUT_SECONDS = 3.0

# The cache tags the website gives the data it reads from the API (apps/web/src/lib/flags.ts).
FLAGS_TAG = "flags"
CONFIG_TAG = "config"
# The club's calendar (jungle.events, apps/web/src/lib/events.ts).
EVENTS_TAG = "events"
# The café menu (jungle.cafe, apps/web/src/lib/cafe.ts).
CAFE_TAG = "cafe"


def revalidate(tags: list[str]) -> bool:
    """Asks the website to drop the cached data with these tags; True if it answered OK."""
    url = settings.WEB_REVALIDATE_URL
    secret = settings.WEB_REVALIDATE_SECRET
    if not url or not secret:
        return False
    try:
        response = httpx.post(
            url,
            json={"tags": tags},
            headers={"X-Revalidate-Secret": secret},
            timeout=TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as exc:
        logger.warning("website revalidation failed (%s): %s", ",".join(tags), exc)
        return False
    if response.status_code != 200:
        logger.warning(
            "website revalidation refused (%s): HTTP %s", ",".join(tags), response.status_code
        )
        return False
    return True


def revalidate_after_commit(tags: list[str]) -> None:
    """Once the change is saved (never for a change that is rolled back)."""
    transaction.on_commit(lambda: revalidate(tags))
