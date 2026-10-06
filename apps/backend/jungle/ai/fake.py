"""A scripted provider for development and the end-to-end tests (`AI_FAKE=true`; refused in
staging and production). It is not an AI: it follows a fixed script through the club's real tools
(the hours; the free courts tomorrow; preparing a booking), so the assistant's whole path, its
barriers and its log run without a key and without spending anything. Asked for a draft (the
staff's text in the message), it answers with a marked test draft that repeats that text."""

from __future__ import annotations

import json
from datetime import timedelta
from typing import Any

from jungle.ai.provider import Reply
from jungle.core import clock

HOURS = ("program", "deschis", "adres", "open", "hours", "where")
BOOK = ("rezerv", "book", "teren", "court")
STAFF_TEXT = "The staff's text:\n"
SIGNALS = ("semnal", "anomal", "signal")
DEMAND = ("ocupare", "cerere", "demand", "occupancy")


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
        if STAFF_TEXT in _text(last):
            asked = _text(last).split(STAFF_TEXT, 1)[1].strip()
            return self._say(f"[Ciornă de test, fără AI real]\n\n{asked[:500]}")
        results = (
            [b for b in last if isinstance(b, dict) and b.get("type") == "tool_result"]
            if isinstance(last, list)
            else []
        )
        if results:
            used = [b for b in messages[-2]["content"] if b.get("type") == "tool_use"][-1]
            return self._after(used["name"], results[-1], {t["name"] for t in tools})
        question = _text(last).lower()
        names = {t["name"] for t in tools}
        if "club_signals" in names and any(word in question for word in SIGNALS):
            return self._use("club_signals", {})
        if "court_demand" in names and any(word in question for word in DEMAND):
            return self._use("court_demand", {})
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
        if name == "club_signals":
            return self._say(
                f"Am găsit {len(data['signals'])} semnale de verificat. Ele doar arată unde să "
                "vă uitați; decide un om."
            )
        if name == "court_demand":
            peak = next(b for b in data["bands"] if b["band"] == "peak")
            return self._say(f"La vârf, terenurile au fost ocupate {peak['percent']}%.")
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
