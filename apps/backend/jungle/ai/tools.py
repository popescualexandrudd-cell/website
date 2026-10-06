"""The club's AI tools (registered at start-up, `AIConfig.ready`). Read-only so far: the
assistant (12D) and the copilot (12F) add theirs here, each through the services people use."""

from __future__ import annotations

from typing import Any

from jungle.ai.models import Context
from jungle.ai.registry import Call, Tool, register
from jungle.configuration.services import get_config

ALL = frozenset(Context)


def club_info(call: Call, _: dict[str, Any]) -> dict[str, Any]:
    """Public facts only: the club's name, address, opening hours and public contact."""
    company = dict(get_config("club.company"))
    hours = dict(get_config("bookings.opening_hours"))
    return {
        "club": call.location.name,
        "address": ", ".join(p for p in (call.location.address, call.location.city) if p),
        "opening_hours": {
            "monday_to_friday": "–".join(hours["weekday"]),
            "weekend": "–".join(hours["weekend"]),
            "time_zone": "Europe/Bucharest",
        },
        "phone": company.get("phone") or None,
        "email": company.get("privacy_contact_email") or None,
    }


register(
    Tool(
        name="club_info",
        description=(
            "The club's name, address, opening hours (Romanian time) and public contact. Use it "
            "for any question about where the club is, when it is open or how to reach it."
        ),
        input_schema={
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": False,
        },
        contexts=ALL,
        run=club_info,
    )
)
