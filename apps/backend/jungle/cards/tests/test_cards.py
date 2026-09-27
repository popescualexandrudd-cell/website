"""Member cards (R-020 … R-025): token, reissue, scanning, print queue, Diamond card."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from django.conf import settings
from django.core import mail
from django.test import Client

from jungle.audit.services import SYSTEM
from jungle.cards import printing, services
from jungle.cards.models import CardStatus, MemberCard, PhysicalCardRequest, PrintStatus
from jungle.conftest import Api, error_code, login_as
from jungle.core.permissions import Role

pytestmark = pytest.mark.django_db


@pytest.fixture
def member(make_user: Any, client: Client) -> Any:
    user = make_user(first_name="Rareș", last_name="Moșteanu")
    login_as(client, user, mfa=False)
    return user


def test_r020_first_card_is_created_and_emailed(
    api: Api, member: Any, django_capture_on_commit_callbacks: Any
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        body = api.get("/cards/mine").json()
    assert body["number"].startswith("JP-") and len(body["number"]) == 11
    assert body["qr_svg"].startswith("<svg")
    assert api.get("/cards/mine").json()["id"] == body["id"]  # not reissued on every visit
    assert len(mail.outbox) == 1 and body["number"] in mail.outbox[0].body


def test_r022_token_is_random_and_holds_no_personal_data(api: Api, member: Any) -> None:
    api.get("/cards/mine")
    card = MemberCard.objects.get()
    assert len(card.token) >= 43
    for personal in (member.first_name, member.last_name, str(member.pk), member.email):
        assert personal not in card.token


def test_r022_replacing_a_lost_card_blocks_the_old_code(api: Api, member: Any) -> None:
    old = api.get("/cards/mine").json()
    old_token = MemberCard.objects.get(pk=old["id"]).token
    new = api.post("/cards/mine/replace")
    assert new.status_code == 201 and new.json()["id"] != old["id"]
    assert MemberCard.objects.get(pk=old["id"]).status == CardStatus.REVOKED
    assert MemberCard.objects.filter(user=member, status=CardStatus.ACTIVE).count() == 1
    from jungle.core.errors import DomainError

    with pytest.raises(DomainError) as exc:
        services.resolve(old_token)
    assert exc.value.code.value == "cards.invalid"
    assert services.resolve(MemberCard.objects.get(pk=new.json()["id"]).token).user == member


def test_r025_scanning_the_card_records_attendance(
    api: Api, club: Any, make_user: Any, staff: Any
) -> None:
    player = make_user()
    card = services.issue_card(SYSTEM, player)
    staff(Role.RECEPTION, club.location)
    response = api.post(
        "/staff/scans",
        {"location_id": str(club.location.id), "kind": "arrival", "card_token": card.token},
    )
    assert response.status_code == 201 and response.json()["user_id"] == str(player.pk)
    unknown = api.post(
        "/staff/scans",
        {"location_id": str(club.location.id), "kind": "arrival", "card_token": "x" * 43},
    )
    assert unknown.status_code == 404 and error_code(unknown) == "cards.invalid"
    nobody = api.post("/staff/scans", {"location_id": str(club.location.id), "kind": "arrival"})
    assert error_code(nobody) == "attendance.unknown_person"


def test_blocked_user_card_does_not_scan(make_user: Any) -> None:
    from jungle.core.errors import DomainError

    player = make_user()
    card = services.issue_card(SYSTEM, player)
    player.is_active = False
    player.save()
    with pytest.raises(DomainError):
        services.resolve(card.token)


# ---------------------------------------------------------------- staff
def test_staff_reissue_queue_and_print(api: Api, club: Any, make_user: Any, staff: Any) -> None:
    player = make_user(first_name="Ana", last_name="Pop")
    body = {
        "user_id": str(player.pk),
        "location_id": str(club.location.id),
        "reason": "Membru nou",
        "print_card": True,
    }
    staff(Role.COACH, club.location)
    assert api.post("/staff/cards/reissue", body).status_code == 403
    staff(Role.RECEPTION, club.location)
    first = api.post("/staff/cards/reissue", body)
    assert first.status_code == 201
    second = api.post("/staff/cards/reissue", {**body, "reason": "Card deteriorat"}).json()
    queue = api.get(f"/staff/cards/print-queue?location_id={club.location.id}").json()
    assert [q["reason"] for q in queue] == ["new_member", "reissue"]
    assert queue[0]["name"] == "Ana Pop"

    pdf = api.post(
        "/staff/cards/print.pdf",
        {"location_id": str(club.location.id), "request_ids": [q["id"] for q in queue]},
    )
    assert pdf.status_code == 200 and pdf["Content-Type"] == "application/pdf"
    assert (
        pdf.content.startswith(b"%PDF")
        and pdf.content.count(b"/Type /Page\n") + pdf.content.count(b"/Type /Page ") >= 1
    )
    # Only the active card is printed: the first one was revoked by the second.
    assert b"Jungle Padel" in pdf.content

    url = f"/staff/cards/print-queue/{queue[1]['id']}/status"
    assert (
        api.post(url, {"location_id": str(club.location.id), "status": "handed_over"}).status_code
        == 409
    )
    assert (
        api.post(url, {"location_id": str(club.location.id), "status": "printed"}).json()["status"]
        == "printed"
    )
    assert (
        api.post(url, {"location_id": str(club.location.id), "status": "handed_over"}).json()[
            "status"
        ]
        == "handed_over"
    )
    remaining = api.get(f"/staff/cards/print-queue?location_id={club.location.id}").json()
    assert [q["id"] for q in remaining] == [queue[0]["id"]]
    cancel = f"/staff/cards/print-queue/{queue[0]['id']}/status"
    assert (
        api.post(cancel, {"location_id": str(club.location.id), "status": "cancelled"}).json()[
            "status"
        ]
        == "cancelled"
    )
    assert (
        api.post(
            "/staff/cards/print-queue/00000000-0000-0000-0000-000000000000/status",
            {"location_id": str(club.location.id), "status": "printed"},
        ).status_code
        == 404
    )
    nothing = api.post(
        "/staff/cards/print.pdf",
        {"location_id": str(club.location.id), "request_ids": [queue[0]["id"]]},
    )
    assert nothing.status_code == 409 and error_code(nothing) == "cards.nothing_to_print"
    assert second["status"] == "active"


def test_staff_reissue_and_block_rules(api: Api, club: Any, make_user: Any, staff: Any) -> None:
    player = make_user()
    staff(Role.RECEPTION, club.location)
    body = {
        "user_id": str(player.pk),
        "location_id": str(club.location.id),
        "reason": " ",
        "print_card": False,
    }
    assert error_code(api.post("/staff/cards/reissue", body)) == "validation.invalid"
    assert (
        api.post(
            "/staff/cards/reissue", {**body, "reason": "x", "user_id": str(club.location.id)}
        ).status_code
        == 404
    )
    assert api.post(
        "/staff/cards/reissue", {**body, "reason": "x", "location_id": str(club.court1.id)}
    ).status_code in (403, 404)
    card = api.post("/staff/cards/reissue", {**body, "reason": "Nou"}).json()
    assert not PhysicalCardRequest.objects.exists()
    block = f"/staff/cards/{card['id']}/block"
    assert (
        error_code(api.post(block, {"location_id": str(club.location.id), "reason": " "}))
        == "validation.invalid"
    )
    blocked = api.post(
        block, {"location_id": str(club.location.id), "reason": "Folosit de altcineva"}
    )
    assert (
        blocked.json()["status"] == "revoked"
        and blocked.json()["revoke_reason"] == "Folosit de altcineva"
    )
    again = api.post(block, {"location_id": str(club.location.id), "reason": "din nou"})
    assert again.json()["revoke_reason"] == "Folosit de altcineva"  # already blocked: unchanged
    assert (
        api.post(
            "/staff/cards/00000000-0000-0000-0000-000000000000/block",
            {"location_id": str(club.location.id), "reason": "x"},
        ).status_code
        == 404
    )


def test_reissue_needs_an_existing_location(
    api: Api, club: Any, make_user: Any, staff: Any
) -> None:
    staff(Role.ADMIN)  # global role: passes authorization, then the location is checked
    body = {
        "user_id": str(make_user().pk),
        "location_id": str(club.court1.id),
        "reason": "x",
        "print_card": True,
    }
    assert api.post("/staff/cards/reissue", body).status_code == 404


# ---------------------------------------------------------------- Diamond (R-024, Q1)
def test_r024_diamond_card_once_with_a_chosen_emblem(
    api: Api, club: Any, member: Any, staff: Any, client: Client
) -> None:
    assert api.get("/cards/mine/diamond").json() is None
    card = api.get("/cards/mine").json()
    offer = services.offer_diamond_card(member, club.location)
    assert offer is not None
    assert services.offer_diamond_card(member, club.location) is None  # once in a lifetime
    emblems = api.get("/cards/emblems").json()["emblems"]
    assert "jaguar" in emblems
    assert (
        error_code(api.post("/cards/mine/emblem", {"emblem": "unicorn"})) == "cards.invalid_emblem"
    )

    staff(Role.RECEPTION, club.location)
    nothing = api.post(
        "/staff/cards/print.pdf",
        {"location_id": str(club.location.id), "request_ids": [str(offer.pk)]},
    )
    assert nothing.status_code == 409  # waits for the emblem
    login_as(client, member, mfa=False)
    chosen = api.post("/cards/mine/emblem", {"emblem": "jaguar"}).json()
    assert (
        chosen["emblem"] == "jaguar" and api.get("/cards/mine/diamond").json()["emblem"] == "jaguar"
    )
    staff(Role.RECEPTION, club.location)
    pdf = api.post(
        "/staff/cards/print.pdf",
        {"location_id": str(club.location.id), "request_ids": [str(offer.pk)]},
    )
    assert pdf.status_code == 200
    assert (
        services.printable(PhysicalCardRequest.objects.get(pk=offer.pk)).subtitle
        == "Diamant · Jaguar"
    )
    assert card["id"] == str(offer.card_id)  # same card, same code: only a new plastic


def test_no_diamond_offer_without_a_card(
    club: Any, make_user: Any, client: Client, api: Api
) -> None:
    person = make_user()
    assert services.offer_diamond_card(person, club.location) is None
    login_as(client, person, mfa=False)
    assert api.post("/cards/mine/emblem", {"emblem": "jaguar"}).status_code == 404


# ---------------------------------------------------------------- printing
def test_r021_pdf_is_cr80_with_embedded_fonts() -> None:
    pdf = printing.cards_pdf(
        [
            printing.PrintableCard(
                "Ștefan-Alexandru Maximilian", "Țăranu-Constantinescu", "JP-ABCDEFGH", "t" * 43
            )
        ]
    )
    assert b"/MediaBox [ 0 0 242.6457 153.0142 ]" in pdf  # 85.60 × 53.98 mm
    assert b"FontFile2" in pdf  # the font is embedded: diacritics print correctly
    with pytest.raises(ValueError, match="nothing to print"):
        printing.cards_pdf([])


def test_card_colours_match_the_design_tokens() -> None:
    tokens = json.loads(
        (Path(settings.REPO_ROOT) / "packages/design-tokens/tokens/color.json").read_text()
    )["color"]
    assert printing.NIGHT_900 == tokens["night"]["900"]["$value"]
    assert printing.NIGHT_600 == tokens["night"]["600"]["$value"]
    assert printing.BONE_50 == tokens["bone"]["50"]["$value"]
    assert printing.BONE_400 == tokens["bone"]["400"]["$value"]
    assert printing.BRASS_400 == tokens["brass"]["400"]["$value"]


def test_readable_rows(member: Any, club: Any) -> None:
    from jungle.cards.models import AppleDeviceRegistration
    from jungle.core import clock

    card = services.issue_card(SYSTEM, member)
    row = PhysicalCardRequest.objects.create(
        card=card, location=club.location, reason="new_member", created_at=clock.now()
    )
    reg = AppleDeviceRegistration.objects.create(
        card=card, device_library_id="abc", push_token="t", created_at=clock.now()
    )
    assert str(card) == card.number and str(row) and str(reg)
    assert PrintStatus.QUEUED == row.status
