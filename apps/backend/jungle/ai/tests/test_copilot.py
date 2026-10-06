"""The staff's copilot (ADR-0019, §10, Stage 12F): read-only tools over the panel's figures,
signals and demand, each with the staff member's own permissions; the answer shows what it read.
The club clock: Monday 15.03.2027, 09:00."""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

import pytest

from jungle.accounts.models import User
from jungle.ai import provider as providers
from jungle.ai.models import AIInteraction
from jungle.ai.tests.conftest import Fake, says, uses
from jungle.conftest import Api, error_code, set_config
from jungle.core.permissions import Role

pytestmark = pytest.mark.django_db
Staff = Callable[..., User]


def ask(club: Any, question: str) -> dict[str, Any]:
    return {
        "location_id": str(club.location.id),
        "messages": [{"role": "user", "content": question}],
    }


def test_adr19_the_copilot_reads_the_figures_and_shows_what_it_read(
    api: Api, club: Any, staff: Staff, on: None, scripted: Callable[..., Fake]
) -> None:
    fake = scripted(
        uses("club_numbers", "t1", {"first": "2027-03-08", "last": "2027-03-14"}),
        uses("club_signals", "t2"),
        uses("court_demand", "t3"),
        says("Săptămâna trecută: nimic de semnalat; vârful a fost gol."),
    )
    staff(Role.MANAGER, club.location)
    response = api.post("/staff/ai/ask", ask(club, "Cum a mers săptămâna trecută?"))
    assert response.status_code == 200, response.json()
    found = response.json()
    assert found["text"] == "Săptămâna trecută: nimic de semnalat; vârful a fost gol."
    assert found["reads"] == [
        {
            "name": "club_numbers",
            "input": {"first": "2027-03-08", "last": "2027-03-14"},
            "ok": True,
        },
        {"name": "club_signals", "input": {}, "ok": True},
        {"name": "court_demand", "input": {}, "ok": True},
    ]
    offered = {t["name"] for t in fake.calls[0]["tools"]}
    assert {"club_numbers", "club_signals", "court_demand", "club_info"} <= offered
    assert not offered & {"propose_booking", "my_bookings", "class_schedule"}
    numbers = json.loads(fake.calls[1]["messages"][-1]["content"][0]["content"])
    assert numbers["first"] == "2027-03-08" and numbers["amounts"] == "bani (lei × 100)"
    signals = json.loads(fake.calls[2]["messages"][-1]["content"][0]["content"])
    assert signals == {"signals": []}
    assert "only read" in fake.calls[0]["system"]
    assert AIInteraction.objects.get().context == "staff"


def test_adr19_the_copilot_keeps_each_persons_permissions(
    api: Api, club: Any, staff: Staff, on: None, scripted: Callable[..., Fake]
) -> None:
    staff(Role.RECEPTION, club.location)  # no ai.copilot
    assert error_code(api.post("/staff/ai/ask", ask(club, "Cifrele?"))) == "auth.forbidden"
    from jungle.ai import services
    from jungle.ai.models import Context
    from jungle.ai.registry import Call
    from jungle.league.tests.conftest import staff_request

    # A tool still checks the person: a receptionist's call reads nothing (reports.view).
    receptionist = staff(Role.RECEPTION, club.location)
    scripted(uses("club_signals"), says("Nu am acces."))
    call = Call(Context.STAFF, club.location, receptionist, staff_request(receptionist))
    services.ask(call, [{"role": "user", "content": "Semnale?"}])
    assert call.reads == [{"name": "club_signals", "input": {}, "ok": False}]
    assert AIInteraction.objects.get().tools == [
        {"name": "club_signals", "ok": False, "error": "auth.forbidden"}
    ]


def test_adr19_the_copilot_refuses_a_bad_period_and_too_many_questions(
    api: Api, club: Any, staff: Staff, on: None, scripted: Callable[..., Fake]
) -> None:
    staff(Role.MANAGER, club.location)
    fake = scripted(
        uses("club_numbers", "t1", {"first": "2027-01-01", "last": "2027-06-01"}),
        uses("club_numbers", "t2", {"first": "ieri", "last": "azi"}),
        says("Perioada e prea lungă."),
        says("Al doilea."),
    )
    found = api.post("/staff/ai/ask", ask(club, "Tot anul?")).json()
    assert [r["ok"] for r in found["reads"]] == [False, False]
    errors = [json.loads(fake.calls[n]["messages"][-1]["content"][0]["content"]) for n in (1, 2)]
    assert errors == [{"error": "validation.invalid"}, {"error": "validation.invalid"}]
    bad = {
        "location_id": str(club.location.id),
        "messages": [{"role": "assistant", "content": "x"}],
    }
    assert error_code(api.post("/staff/ai/ask", bad)) == "validation.invalid"
    set_config("ai.questions_per_hour", 2)
    assert api.post("/staff/ai/ask", ask(club, "Încă una")).status_code == 200
    limited = api.post("/staff/ai/ask", ask(club, "Și încă una"))
    assert limited.status_code == 429 and error_code(limited) == "auth.rate_limited"


def test_adr19_the_scripted_provider_reads_signals_and_demand(
    api: Api, club: Any, staff: Staff, settings: Any, on: None
) -> None:
    settings.AI_FAKE = True
    providers.use(None)
    staff(Role.MANAGER, club.location)
    found = api.post("/staff/ai/ask", ask(club, "Sunt semnale de verificat?")).json()
    assert found["text"].startswith("Am găsit 0 semnale de verificat.")
    assert [r["name"] for r in found["reads"]] == ["club_signals"]
    found = api.post("/staff/ai/ask", ask(club, "Cum e ocuparea?")).json()
    assert found["text"] == "La vârf, terenurile au fost ocupate 0%."


def test_adr19_a_staff_tool_needs_a_request(club: Any) -> None:
    from jungle.ai.models import Context
    from jungle.ai.registry import Call
    from jungle.ai.tools import _staff
    from jungle.core.errors import DomainError

    with pytest.raises(DomainError) as exc:
        _staff(Call(Context.STAFF, club.location, None))
    assert exc.value.status == 401
