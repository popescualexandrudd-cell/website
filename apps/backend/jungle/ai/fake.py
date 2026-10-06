"""A scripted provider for development and the end-to-end tests (`AI_FAKE=true`; refused in
staging and production). It is not an AI: it follows a fixed script through the club's real tools
(the hours; the free courts tomorrow; preparing a booking), so the assistant's whole path, its
barriers and its log run without a key and without spending anything."""

from __future__ import annotations

import json
from datetime import timedelta
from typing import Any

from jungle.ai.provider import Reply
from jungle.core import clock

HOURS = ("program", "deschis", "adres", "open", "hours", "where")
BOOK = ("rezerv", "book", "teren", "court")


def _text(content: Any) -> str:
    if isinstance(content, str):
        return content
    return " ".join(str(b.get("text", "")) for b in content if isinstance(b, dict))


class FakeClubProvider:
    model = "fake-club"

    def reply(
        self,
        *,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        max_tokens: int,
        effort: str,
    ) -> Reply:
        last = messages[-1]["content"]
        results = (
            [b for b in last if isinstance(b, dict) and b.get("type") == "tool_result"]
            if isinstance(last, list)
            else []
        )
        if results:
            used = [b for b in messages[-2]["content"] if b.get("type") == "tool_use"][-1]
            return self._after(used["name"], results[-1], {t["name"] for t in tools})
        question = _text(last).lower()
        if any(word in question for word in HOURS):
            return self._use("club_info", {})
        if any(word in question for word in BOOK):
            tomorrow = (clock.today_local() + timedelta(days=1)).isoformat()
            return self._use("court_availability", {"date": tomorrow, "duration_minutes": 90})
        return self._say(
            "Sunt asistentul de test al clubului (fără AI real). Întreabă-mă de program sau de "
            "o rezervare."
        )

    def _after(self, name: str, result: dict[str, Any], tools: set[str]) -> Reply:
        data = json.loads(result["content"])
        if result.get("is_error"):
            return self._say(f"Nu am putut: {data['error']}.")
        if name == "club_info":
            hours = data["opening_hours"]
            return self._say(
                f"Clubul e deschis de luni până vineri {hours['monday_to_friday']}, iar în "
                f"weekend {hours['weekend']}."
            )
        if name == "court_availability":
            court = next((c for c in data["courts"] if c["free_starts"]), None)
            if court is None:
                return self._say("Mâine nu mai e niciun teren liber pentru 90 de minute.")
            start = f"{data['date']} {court['free_starts'][-1]}"
            if "propose_booking" in tools:
                return self._use(
                    "propose_booking",
                    {"court_id": court["court_id"], "starts_at": start, "duration_minutes": 90},
                )
            return self._say(
                f"Mâine e liber {court['name']} la {court['free_starts'][-1]}. Intră în cont ca "
                "să rezervi."
            )
        return self._say(
            f"Am pregătit rezervarea: {data['court']}, {data['starts_at']}, {data['total']}. "
            "Confirm-o cu butonul de mai jos; plata se face la Chioșcul de Plăți."
        )

    def _use(self, name: str, tool_input: dict[str, Any]) -> Reply:
        block = {"type": "tool_use", "id": f"fake-{name}", "name": name, "input": tool_input}
        return Reply([block], "tool_use", 50, 20, self.model)

    def _say(self, text: str) -> Reply:
        return Reply([{"type": "text", "text": text}], "end_turn", 50, 20, self.model)
