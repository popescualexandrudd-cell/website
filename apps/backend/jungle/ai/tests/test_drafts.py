"""Drafts written by the AI for the staff (ADR-0019, Q19): from the club's public facts, without
tools, saved "de revizuit" until a person approves (with corrections) or discards them; in the
log and the monthly limit like a question. The club clock: Monday 15.03.2027, 09:00."""

from __future__ import annotations

import json
from collections.abc import Callable
from datetime import datetime
from typing import Any

import pytest

from jungle.accounts.models import User
from jungle.ai import drafts
from jungle.ai import provider as providers
from jungle.ai.models import AIDraft, AIInteraction, Context, DraftKind, DraftStatus
from jungle.ai.provider import Reply
from jungle.ai.registry import Call
from jungle.ai.tests.conftest import Fake, says
from jungle.audit.models import AuditLog
from jungle.conftest import Api, error_code
from jungle.core import clock
from jungle.core.errors import DomainError
from jungle.core.permissions import Role
from jungle.events.models import ClubEvent
from jungle.league.models import LeaguePlayer, LeagueSeason, SeasonStatus, Standing

pytestmark = pytest.mark.django_db

Staff = Callable[..., User]


def body(club: Any, kind: str = "community", text: str = "Anunță seara cu DJ.") -> dict[str, Any]:
    return {"location_id": str(club.location.id), "kind": kind, "language": "ro", "text": text}


def event(club: Any, title: str, starts: str, **fields: Any) -> ClubEvent:
    return ClubEvent.objects.create(
        location=club.location, kind="dj_night", title_ro=title, title_en=title,
        starts_at=datetime.fromisoformat(starts), ends_at=datetime.fromisoformat(starts)
        .replace(hour=23), published=True, **fields,
    )  # fmt: skip


def test_adr19_a_community_message_from_the_public_facts_saved_to_review(
    api: Api, club: Any, staff: Staff, on: None, scripted: Callable[..., Fake]
) -> None:
    event(club, "Seară cu DJ", "2027-03-20T20:00:00+02:00")
    event(club, "Exemplu", "2027-03-21T20:00:00+02:00", is_demo=True)
    event(club, "Prea departe", "2027-05-01T20:00:00+03:00")
    fake = scripted(says("Sâmbătă, 20 martie: seară cu DJ la club!"))
    staff(Role.RECEPTION, club.location)
    assert error_code(api.post("/staff/ai/drafts", body(club))) == "auth.forbidden"
    manager = staff(Role.MANAGER, club.location)
    response = api.post("/staff/ai/drafts", body(club))
    assert response.status_code == 201, response.json()
    draft = response.json()
    assert draft["status"] == "to_review" and draft["kind"] == "community"
    assert draft["body"] == "Sâmbătă, 20 martie: seară cu DJ la club!"
    assert draft["request"] == "Anunță seara cu DJ." and draft["requested_by"] == manager.full_name
    [call] = fake.calls
    assert call["system"] == drafts.SYSTEM and call["tools"] == []
    message = call["messages"][0]["content"]
    assert "at most 120 words" in message and "Write in Romanian." in message
    facts = json.loads(message.split("Facts (JSON):\n", 1)[1].split("\n\nThe staff's text:")[0])
    assert facts["club"]["club"] == club.location.name and facts["league"] is None
    assert [(e["title"], e["demo"]) for e in facts["calendar_next_30_days"]] == [
        ("Seară cu DJ", False),
        ("Exemplu", True),  # the model is told to leave demo items out
    ]
    assert message.endswith("The staff's text:\nAnunță seara cu DJ.")
    row = AIInteraction.objects.get()
    assert row.context == Context.STAFF and row.user == manager  # in the log and the limit
    assert AuditLog.objects.filter(action="ai.draft_written").count() == 1
    [listed] = api.get(f"/staff/ai/drafts?location_id={club.location.id}").json()
    assert listed["id"] == draft["id"]


def test_adr19_the_league_facts_are_public_data_only(
    club: Any, make_user: Callable[..., User]
) -> None:
    season = LeagueSeason.objects.create(
        location=club.location, number=1, name="Sezonul 1", status=SeasonStatus.ACTIVE,
        starts_at=datetime.fromisoformat("2027-03-01T00:00:00+02:00"),
        ends_at=datetime.fromisoformat("2027-06-01T00:00:00+03:00"),
    )  # fmt: skip
    shown, gone = make_user(first_name="Ana"), make_user(first_name="Dan")
    for place, user in enumerate((shown, gone), start=1):
        LeaguePlayer.objects.create(user=user, joined_at=clock.now())
        Standing.objects.create(
            season=season, ladder="doubles", competitor_id=str(user.pk), player_a=user, mu=25,
            sigma=3, level=3.2, rank_index=6, tier="gold", division="II", lp=40, position=place,
        )  # fmt: skip
    User.objects.filter(pk=gone.pk).update(deleted_at=clock.now())
    league = drafts.club_facts(Call(Context.STAFF, club.location, None))["league"]
    assert league == {
        "season": "Sezonul 1",
        "season_ends": "2027-06-01",
        "league_matches_last_7_days": 0,
        "top_doubles": [{"place": 1, "name": shown.full_name, "rank": "gold II", "lp": 40}],
    }


def test_adr19_a_translation_gets_no_facts_and_a_failed_draft_is_not_saved(
    api: Api, club: Any, staff: Staff, on: None, scripted: Callable[..., Fake]
) -> None:
    staff(Role.MANAGER, club.location)
    fake = scripted(says("Saturday: DJ night."), Reply([], "refusal", 10, 0, "fake-model"))
    text = body(club, "translation", "Sâmbătă: seară cu DJ.") | {"language": "en"}
    assert api.post("/staff/ai/drafts", text).json()["body"] == "Saturday: DJ night."
    message = fake.calls[0]["messages"][0]["content"]
    assert "Facts" not in message and "Write in English." in message
    response = api.post("/staff/ai/drafts", body(club, "article", "Despre Reformer"))
    assert response.status_code == 409 and error_code(response) == "ai.no_draft"
    assert AIDraft.objects.count() == 1 and AIInteraction.objects.count() == 2


def test_adr19_bad_requests(club: Any, staff: Staff, on: None) -> None:
    from jungle.league.tests.conftest import staff_request

    manager = staff(Role.MANAGER, club.location)
    for language, text in (("de", "Text"), ("ro", "   ")):
        with pytest.raises(DomainError) as exc:
            drafts.create(
                staff_request(manager), club.location.id, DraftKind.ARTICLE, language, text
            )
        assert exc.value.code.value == "validation.invalid"


def test_adr19_a_person_approves_with_corrections_or_discards_once(
    api: Api, club: Any, staff: Staff, on: None, scripted: Callable[..., Fake]
) -> None:
    staff(Role.MANAGER, club.location)
    scripted(says("Text scris de AI."), says("Alt text."), says("Al treilea."))
    first, second, third = (api.post("/staff/ai/drafts", body(club)).json()["id"] for _ in range(3))
    url = "/staff/ai/drafts/{}/review"
    blank = api.post(url.format(first), {"status": "approved", "body": "  "})
    assert error_code(blank) == "validation.invalid"
    approved = api.post(url.format(first), {"status": "approved", "body": "Text corectat."}).json()
    assert approved["status"] == "approved" and approved["body"] == "Text corectat."
    assert approved["reviewed_at"] is not None
    again = api.post(url.format(first), {"status": "discarded"})
    assert again.status_code == 409 and error_code(again) == "ai.draft_reviewed"
    kept = api.post(url.format(second), {"status": "approved", "body": "Alt text."}).json()
    assert kept["body"] == "Alt text."
    assert api.post(url.format(third), {"status": "discarded"}).json()["status"] == "discarded"
    logs = [log.after or {} for log in AuditLog.objects.filter(action="ai.draft_reviewed")]
    assert sorted((a["status"], a["edited"]) for a in logs) == [
        ("approved", False),
        ("approved", True),
        ("discarded", False),
    ]
    missing = api.post(url.format("00000000-0000-0000-0000-000000000000"), {"status": "approved"})
    assert missing.status_code == 404 and error_code(missing) == "ai.draft_not_found"
    staff(Role.RECEPTION, club.location)
    assert error_code(api.post(url.format(third), {"status": "approved"})) == "auth.forbidden"


def test_adr19_a_draft_cannot_go_back_to_review(club: Any, staff: Staff, on: None) -> None:
    from jungle.league.tests.conftest import staff_request

    manager = staff(Role.MANAGER, club.location)
    draft = AIDraft.objects.create(
        location=club.location, kind=DraftKind.ARTICLE, language="ro", request="r", body="b",
        requested_by=manager, created_at=clock.now(),
    )  # fmt: skip
    with pytest.raises(DomainError) as exc:
        drafts.review(staff_request(manager), draft.pk, DraftStatus.TO_REVIEW)
    assert exc.value.code.value == "ai.draft_reviewed"
    assert str(draft).startswith("article · to_review")


def test_adr19_the_scripted_provider_writes_a_marked_test_draft(
    club: Any, staff: Staff, settings: Any, on: None
) -> None:
    from jungle.league.tests.conftest import staff_request

    settings.AI_FAKE = True
    providers.use(None)
    manager = staff(Role.MANAGER, club.location)
    draft = drafts.create(
        staff_request(manager), club.location.id, DraftKind.COMMUNITY, "ro", "Turneu sâmbătă"
    )
    assert draft.body == "[Ciornă de test, fără AI real]\n\nTurneu sâmbătă"
