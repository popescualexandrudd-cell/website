"""The club's assistant (12D, ADR-0019): its tools by context, the scripted development provider,
the website's endpoint with its limit, and the switch that waits for the key. The club clock:
Monday 15.03.2027, 09:00 (conftest `club`); peak hours 17–22 (Q3)."""

from __future__ import annotations

from collections.abc import Callable, Iterator
from datetime import datetime
from functools import partial
from typing import Any

import pytest
from django.test import Client

from jungle.accounts.models import User
from jungle.ai import provider as providers
from jungle.ai import services, tools
from jungle.ai.fake import FakeClubProvider
from jungle.ai.models import AIInteraction, Context, Outcome
from jungle.ai.provider import Reply
from jungle.ai.registry import Call
from jungle.bookings.models import Booking, ClassSession
from jungle.configuration.models import FeatureFlag
from jungle.conftest import Api, error_code, login_as, set_config
from jungle.core import clock
from jungle.core.errors import DomainError
from jungle.core.permissions import Role

pytestmark = pytest.mark.django_db

TUESDAY = "2027-03-16"


def refused(attempt: Callable[[], object]) -> str:
    with pytest.raises(DomainError) as exc:
        attempt()
    return exc.value.code.value


def book(club: Any, who: User, court: Any, start: str, end: str) -> Booking:
    return Booking.objects.create(
        location=club.location, resource=court, organizer=who, created_by=who,
        starts_at=datetime.fromisoformat(start), ends_at=datetime.fromisoformat(end),
        session_type="free_rental", price_total=0,
    )  # fmt: skip


@pytest.fixture
def fake(settings: Any) -> Iterator[None]:
    settings.AI_FAKE = True
    FeatureFlag.objects.update_or_create(key="ai", defaults={"enabled": True})
    yield
    providers.use(None)


# ---------------------------------------------------------------- the tools
def test_r041_free_courts_from_the_bookings_never_guessed(
    club: Any, make_user: Callable[..., User]
) -> None:
    other = make_user()
    book(club, other, club.court1, f"{TUESDAY}T18:00:00+02:00", f"{TUESDAY}T19:30:00+02:00")
    call = Call(Context.PUBLIC, club.location, None)
    free = tools.court_availability(call, {"date": TUESDAY, "duration_minutes": 90})
    courts = {c["name"]: c["free_starts"] for c in free["courts"]}
    assert set(courts) == {"teren-1", "teren-2", "tenis-1"}
    assert courts["teren-2"][0] == "08:00" and courts["teren-2"][-1] == "21:30"
    assert not {"17:00", "17:30", "18:00", "18:30", "19:00"} & set(courts["teren-1"])
    assert {"16:30", "19:30"} <= set(courts["teren-1"])
    assert "other" not in str(free) and str(other.pk) not in str(free)  # no personal data
    today = tools.court_availability(call, {"date": "2027-03-15", "duration_minutes": 60})
    assert today["courts"][0]["free_starts"][0] == "09:30"  # it is 09:00: no past times
    for data, code in (
        ({"date": "2027-03-14", "duration_minutes": 60}, "validation.invalid"),
        ({"date": "2027-04-30", "duration_minutes": 60}, "validation.invalid"),
        ({"date": "mâine", "duration_minutes": 60}, "validation.invalid"),
        ({"date": TUESDAY, "duration_minutes": 45}, "booking.invalid_duration"),
    ):
        assert refused(partial(tools.court_availability, call, data)) == code


def test_r052_a_quote_as_a_booking_would_price_it(club: Any) -> None:
    call = Call(Context.PUBLIC, club.location, None)
    peak = {
        "court_id": str(club.court1.pk),
        "starts_at": f"{TUESDAY} 18:00",
        "duration_minutes": 90,
    }
    assert tools.court_quote(call, peak) == {
        "court": "teren-1",
        "starts_at": f"{TUESDAY} 18:00",
        "total": "180 lei",
        "provisional": True,  # demo rates, not decided yet (DE_STABILIT): said as indicative
    }
    tennis = peak | {"court_id": str(club.tennis.pk)}
    assert tools.court_quote(call, tennis)["provisional"] is False  # R-051: decided
    for data, code in (
        (peak | {"court_id": str(club.reformer.pk)}, "booking.resource_not_bookable"),
        (peak | {"starts_at": "16.03.2027 18:00"}, "validation.invalid"),
        (peak | {"starts_at": f"{TUESDAY} 18:10"}, "booking.off_grid"),
        (peak | {"starts_at": f"{TUESDAY} 22:30"}, "booking.outside_hours"),
    ):
        assert refused(partial(tools.court_quote, call, data)) == code


def test_r102_the_weeks_classes_with_their_places(
    club: Any, make_user: Callable[..., User]
) -> None:
    def session(start: str) -> ClassSession:
        begins = datetime.fromisoformat(start)
        return ClassSession.objects.create(
            location=club.location, studio=club.studio, instructor=club.coach, kind="group",
            starts_at=begins, ends_at=begins.replace(hour=begins.hour + 1), capacity=4,
            price_total=4000,
        )  # fmt: skip

    soon = session(f"{TUESDAY}T18:00:00+02:00")
    session("2027-03-25T18:00:00+02:00")  # more than a week away
    soon.enrollments.create(user=make_user(), status="enrolled")
    schedule = tools.class_schedule(Call(Context.PUBLIC, club.location, None), {})
    assert schedule == {
        "classes": [
            {"kind": "group", "starts_at": f"{TUESDAY} 18:00", "ends_at": "19:00", "places_left": 3}
        ]
    }


def test_r040_the_clients_own_bookings_and_a_booking_prepared_not_made(
    club: Any, make_user: Callable[..., User]
) -> None:
    ana, ion = make_user(), make_user()
    book(club, ana, club.court2, f"{TUESDAY}T10:00:00+02:00", f"{TUESDAY}T11:00:00+02:00")
    book(club, ion, club.court1, f"{TUESDAY}T18:00:00+02:00", f"{TUESDAY}T19:30:00+02:00")
    call = Call(Context.MEMBER, club.location, ana)
    assert tools.my_bookings(call, {}) == {
        "bookings": [{"court": "teren-2", "starts_at": f"{TUESDAY} 10:00", "ends_at": "11:00"}]
    }
    slot = {
        "court_id": str(club.court1.pk),
        "starts_at": f"{TUESDAY} 18:00",
        "duration_minutes": 90,
    }
    assert refused(lambda: tools.propose_booking(call, slot)) == "booking.slot_taken"
    free = slot | {"starts_at": f"{TUESDAY} 19:30"}
    prepared = tools.propose_booking(call, free)
    assert (prepared["proposal"], prepared["court"], prepared["total"]) == (1, "teren-1", "180 lei")
    [proposal] = call.proposals
    assert proposal["resource_id"] == club.court1.pk and proposal["duration_minutes"] == 90
    assert Booking.objects.filter(organizer=ana).count() == 1  # nothing booked by the AI
    unverified = make_user(email_verified_at=None)
    late = Call(Context.MEMBER, club.location, unverified)
    assert refused(lambda: tools.propose_booking(late, free)) == "booking.email_not_verified"
    nobody = Call(Context.MEMBER, club.location, None)
    assert refused(lambda: tools.my_bookings(nobody, {})) == "auth.required"


# ---------------------------------------------------------------- the scripted provider
def test_adr19_the_scripted_provider_walks_the_real_tools(club: Any, fake: None) -> None:
    def ask(question: str, user: User | None = None) -> tuple[str, list[dict[str, Any]]]:
        call = Call(Context.MEMBER if user else Context.PUBLIC, club.location, user)
        answer = services.ask(call, [{"role": "user", "content": question}])
        assert answer.outcome == Outcome.ANSWERED
        return answer.text, call.proposals

    assert ask("Care e programul?")[0] == (
        "Clubul e deschis de luni până vineri 08:00–23:00, iar în weekend 08:00–23:00."
    )
    assert ask("Vreau să rezerv un teren")[0] == (
        "Mâine e liber teren-1 la 21:30. Intră în cont ca să rezervi."
    )
    member = User.objects.filter(is_active=True).first()
    assert member is not None
    text, [proposal] = ask("Rezerv un teren mâine", member)
    assert text.startswith("Am pregătit rezervarea: teren-1, 2027-03-16 21:30, 140 lei.")
    assert proposal["starts_at"].isoformat() == "2027-03-16T21:30:00+02:00"
    assert ask("Salut")[0].startswith("Sunt asistentul de test al clubului")
    assert AIInteraction.objects.filter(model="fake-club").count() == 4


def test_adr19_the_scripted_provider_when_nothing_is_free_or_a_tool_refuses(club: Any) -> None:
    fake = FakeClubProvider()
    full = {"date": TUESDAY, "duration_minutes": 90, "courts": [{"free_starts": []}]}
    used = {"role": "assistant", "content": [{"type": "tool_use", "name": "court_availability"}]}

    def after(result: dict[str, Any]) -> str:
        reply = fake.reply(
            system="", messages=[used, {"role": "user", "content": [result]}], tools=[],
            max_tokens=10, effort="low",
        )  # fmt: skip
        return str(reply.blocks[0]["text"])

    import json

    nothing = {"type": "tool_result", "content": json.dumps(full)}
    assert after(nothing) == "Mâine nu mai e niciun teren liber pentru 90 de minute."
    error = {"type": "tool_result", "content": '{"error": "ai.forbidden"}', "is_error": True}
    assert after(error) == "Nu am putut: ai.forbidden."
    assert isinstance(fake.reply(
        system="", messages=[{"role": "user", "content": [{"type": "text", "text": "program"}]}],
        tools=[], max_tokens=10, effort="low",
    ), Reply)  # fmt: skip


# ---------------------------------------------------------------- the website
def test_adr19_the_assistant_on_the_website(
    api: Api, client: Client, club: Any, fake: None, make_user: Callable[..., User]
) -> None:
    question = {"location": "jungle-padel", "messages": [{"role": "user", "content": "Program?"}]}
    answer = api.post("/ai/ask", question)
    assert answer.status_code == 200, answer.content
    assert answer.json()["outcome"] == "answered" and answer.json()["proposals"] == []
    assert AIInteraction.objects.get().context == "public"

    login_as(client, make_user(), mfa=False)
    booking = {"location": "jungle-padel", "messages": [{"role": "user", "content": "Rezerv"}]}
    [proposal] = api.post("/ai/ask", booking).json()["proposals"]
    assert proposal == {
        "resource_id": str(club.court1.pk),
        "resource_name": "teren-1",
        "starts_at": "2027-03-16T21:30:00+02:00",
        "duration_minutes": 90,
        "session_type": "free_rental",
        "total": "140 lei",  # 21:30–22:00 peak, then off-peak
        "provisional": True,
    }
    # the person confirms with the button: the ordinary booking endpoint, as on the booking page
    made = api.post(
        "/bookings",
        {k: proposal[k] for k in ("resource_id", "starts_at", "duration_minutes", "session_type")},
    )
    assert made.status_code == 201, made.content

    wrong = {"location": "jungle-padel", "messages": [{"role": "assistant", "content": "x"}]}
    assert error_code(api.post("/ai/ask", wrong)) == "validation.invalid"
    assert api.post("/ai/ask", question | {"location": "nicaieri"}).status_code == 404
    set_config("ai.questions_per_hour", 2)  # the booking question above was the first
    assert api.post("/ai/ask", question).status_code == 200
    limited = api.post("/ai/ask", question)
    assert (limited.status_code, error_code(limited)) == (429, "auth.rate_limited")
    FeatureFlag.objects.filter(key="ai").update(enabled=False)
    client.logout()
    off = api.post("/ai/ask", question)
    assert (off.status_code, error_code(off)) == (503, "ai.unavailable")
    assert clock.now()  # the club clock did not move


def test_adr19_the_switch_waits_for_the_key(
    api: Api, club: Any, staff: Callable[..., User], settings: Any
) -> None:
    staff(Role.ADMIN)
    body = {"enabled": True, "reason": "pornim asistentul"}
    refused_on = api.put("/staff/flags/ai", body)
    assert (refused_on.status_code, error_code(refused_on)) == (409, "ai.not_configured")
    assert api.put("/staff/flags/ai", body | {"enabled": False}).status_code == 200
    settings.AI_API_KEY, settings.AI_MODEL = "key-from-env", "claude-opus-5-5"
    assert api.put("/staff/flags/ai", body).status_code == 200
    state = api.get(f"/staff/ai/status?location_id={club.location.id}").json()
    assert (state["enabled"], state["configured"], state["model"]) == (
        True,
        True,
        "claude-opus-5-5",
    )
    settings.AI_API_KEY, settings.AI_FAKE = "", True
    assert isinstance(providers.current(), FakeClubProvider)
    assert api.get(f"/staff/ai/status?location_id={club.location.id}").json()["model"] == (
        "fake-club"
    )
