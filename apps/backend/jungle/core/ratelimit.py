"""Small counters in the cache, used for lockouts and rate limits."""

from __future__ import annotations

from django.core.cache import cache


def increment(key: str, timeout: int) -> int:
    """Increment a counter that expires `timeout` seconds after its first increment."""
    if cache.add(key, 1, timeout):
        return 1
    try:
        return int(cache.incr(key))
    except ValueError:  # expired between add() and incr()
        cache.set(key, 1, timeout)
        return 1
