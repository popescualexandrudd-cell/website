"""Data-subject rights and the league consent (R-006, R-010, R-011, §12.2)."""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from typing import Any

import pytest
from django.contrib.auth.models import AnonymousUser
from django.test import Client, RequestFactory

from jungle.accounts.models import GuardianLink, User
from jungle.attendance.models import Scan, StaffNotice
from jungle.audit.models import AuditLog
from jungle.audit.services import SYSTEM
from jungle.bookings.models import Booking
from jungle.cards import services as cards
from jungle.cards.models import CardStatus, MemberCard
from jungle.conftest import Api, error_code, grant, login_as
from jungle.core import clock
from jungle.core.errors import DomainError
from jungle.core.permissions import Role
from jungle.devices.models import Device, DeviceKind
from jungle.ledger import services as ledger
from jungle.ledger.models import AccountKind, TransactionKind
from jungle.legal.models import Consent, ConsentAction, DocumentKind
from jungle.legal.services import publish_document
from jungle.privacy import league_consent, services
from jungle.rewards.models import Referral, ReferralCode

pytestmark = pytest.mark.django_db


@pytest.fixture
def league_text(db: None) -> None:
    for language in ("ro", "en"):
        publish_document(
            SYSTEM, DocumentKind.LEAGUE_GDPR, language, "Acord ligă", f"text {language}"
        )


@pytest.fixture
def kiosk(location: Any) -> Device:
    return Device.objects.create(
        kind=DeviceKind.LEAGUE_KIOSK, location=location, name="Chioșc Ligă 1"
    )


def kiosk_request() -> Any:
    request = RequestFactory().post("/", REMOTE_ADDR="10.0.0.5", HTTP_USER_AGENT="LeagueKiosk/1.0")
    request.user = AnonymousUser()  # the kiosk device, not a logged-in person
    return request


# ---------------------------------------------------------------- league consent
def test_r010_r011_consent_at_the_league_kiosk(
    league_text: None, kiosk: Device, make_user: Any
) -> None:
    player = make_user(date_of_birth=date(1995, 5, 1))
    consent = league_consent.sign(kiosk_request(), player, kiosk, "ro")
    assert consent.action == ConsentAction.GRANTED and consent.device == kiosk
    assert (
        consent.language == "ro" and len(consent.text_sha256) == 64
    )  # R-011: version, hash, device, language
    assert consent.document.version == 1 and consent.ip == "10.0.0.5"
    assert league_consent.sign(kiosk_request(), player, kiosk, "ro") == consent  # nothing new
    status = league_consent.status(player, "ro")
    assert (status.signed, status.version, status.outdated) == (True, 1, False)

    publish_document(SYSTEM, DocumentKind.LEAGUE_GDPR, "ro", "Acord ligă", "text nou")
    assert league_consent.status(player, "ro").outdated is True  # the kiosk shows the new text
    renewed = league_consent.sign(kiosk_request(), player, kiosk, "ro")
    assert renewed.document.version == 2


def test_r010_only_at_an_active_league_kiosk(
    league_text: None, location: Any, make_user: Any
) -> None:
    player = make_user()
    for device in (
        Device.objects.create(kind=DeviceKind.PAYMENTS_KIOSK, location=location, name="Plăți"),
        Device.objects.create(
            kind=DeviceKind.LEAGUE_KIOSK, location=location, name="Oprit", is_active=False
        ),
    ):
        with pytest.raises(DomainError) as exc:
            league_consent.sign(kiosk_request(), player, device, "ro")
        assert exc.value.code.value == "league.kiosk_only"
    assert not Consent.objects.exists()


@pytest.mark.parametrize("born", [date(2009, 3, 16), None])
def test_r006_the_league_is_for_adults(
    league_text: None, kiosk: Device, make_user: Any, born: date | None, time_machine: Any
) -> None:
    time_machine.move_to("2027-03-15T10:00:00+02:00", tick=False)
    player = make_user(date_of_birth=born)
    with pytest.raises(DomainError) as exc:
        league_consent.sign(kiosk_request(), player, kiosk, "ro")
    assert exc.value.code.value == "league.adults_only"


def test_r006_eighteenth_birthday_counts(
    league_text: None, kiosk: Device, make_user: Any, time_machine: Any
) -> None:
    time_machine.move_to("2027-03-15T10:00:00+02:00", tick=False)
    player = make_user(date_of_birth=date(2009, 3, 15))
    assert league_consent.sign(kiosk_request(), player, kiosk, "ro").action == ConsentAction.GRANTED


def test_r011_withdrawal_from_the_account(
    api: Api, league_text: None, kiosk: Device, make_user: Any, client: Client
) -> None:
    player = make_user()
    login_as(client, player, mfa=False)
    assert api.get("/privacy/league-consent").json()["signed"] is False
    assert error_code(api.post("/privacy/league-consent/withdraw")) == "privacy.no_consent"
    league_consent.sign(kiosk_request(), player, kiosk, "en")
    withdrawn: list[User] = []
    league_consent.on_withdrawn(withdrawn.append)
    league_consent.on_withdrawn(withdrawn.append)  # registered once
    try:
        assert api.post("/privacy/league-consent/withdraw").status_code == 200
    finally:
        league_consent._withdrawal_listeners.remove(withdrawn.append)
    assert withdrawn == [player]
    assert Consent.objects.filter(user=player).count() == 2  # both rows kept (append-only)
    body = api.get("/privacy/league-consent?language=en").json()
    assert body["signed"] is False and body["current_version"] == 1


# ---------------------------------------------------------------- export
def test_export_contains_everything_about_the_person(
    api: Api, club: Any, make_user: Any, client: Client
) -> None:
    person = make_user(first_name="Ioana", phone="+40700000009")
    other = make_user(first_name="Altcineva")
    login_as(client, person, mfa=False)
    api.get("/cards/mine")
    api.post(
        "/bookings",
        {
            "resource_id": str(club.court1.id),
            "starts_at": "2027-03-16T10:00:00+02:00",
            "duration_minutes": 60,
            "session_type": "training",
        },
    )
    Booking.objects.create(
        location=club.location,
        resource=club.court2,
        organizer=other,
        created_by=other,
        starts_at=datetime.fromisoformat("2027-03-16T10:00:00+02:00"),
        ends_at=datetime.fromisoformat("2027-03-16T11:00:00+02:00"),
        session_type="training",
        price_total=0,
    )
    response = api.get("/privacy/export")
    assert response.status_code == 200 and response["Content-Disposition"].startswith("attachment")
    data = json.loads(response.content)
    assert data["profile"]["first_name"] == "Ioana" and data["profile"]["phone"] == "+40700000009"
    assert len(data["bookings"]) == 1 and len(data["cards"]) == 1
    assert "Altcineva" not in response.content.decode()  # nobody else's data
    assert data["balance"] == {"credit": 0, "debt": 0}
    assert AuditLog.objects.filter(action="privacy.exported").count() == 1


# ---------------------------------------------------------------- deleting the account
def test_erase_leaves_a_retired_player(
    api: Api,
    club: Any,
    make_user: Any,
    client: Client,
    league_text: None,
    kiosk: Device,
    time_machine: Any,
) -> None:
    person = make_user(first_name="Mara", last_name="Dobre", phone="+40711111111")
    friend = make_user()
    login_as(client, person, mfa=False)
    card = api.get("/cards/mine").json()
    league_consent.sign(kiosk_request(), person, kiosk, "ro")
    past = Booking.objects.create(
        location=club.location,
        resource=club.court1,
        organizer=person,
        created_by=person,
        starts_at=datetime.fromisoformat("2027-03-10T10:00:00+02:00"),
        ends_at=datetime.fromisoformat("2027-03-10T11:00:00+02:00"),
        session_type="training",
        price_total=0,
        status="completed",
    )
    Scan.objects.create(user=person, location=club.location, kind="arrival", scanned_at=clock.now())
    ReferralCode.objects.create(user=person, code="ABCDEFGH", created_at=clock.now())
    Referral.objects.create(referrer=friend, referred=person, created_at=clock.now())
    StaffNotice.objects.create(
        location=club.location,
        kind="no_show_block",
        created_at=clock.now(),
        payload={"user_id": str(person.pk), "name": "Mara Dobre"},
    )

    assert (
        error_code(api.post("/privacy/delete-account", {"password": "greșită"}))
        == "privacy.wrong_password"
    )
    assert (
        api.post("/privacy/delete-account", {"password": "Parola-Sigura-2026"}).status_code == 200
    )

    person.refresh_from_db()
    assert (person.first_name, person.last_name, person.email, person.phone) == (
        "Jucător",
        "retras",
        None,
        "",
    )
    assert person.date_of_birth is None and not person.is_active and person.deleted_at is not None
    assert not person.has_usable_password()
    assert MemberCard.objects.get(pk=card["id"]).status == CardStatus.REVOKED
    assert not Scan.objects.filter(user=person).exists()
    assert not ReferralCode.objects.filter(user=person).exists() and not Referral.objects.exists()
    assert StaffNotice.objects.get().payload["name"] == "Jucător retras"
    assert Booking.objects.filter(pk=past.pk).exists()  # history stays, pseudonymised
    assert Consent.objects.filter(user=person).exists()  # proof of consent is kept
    assert api.get("/cards/mine").status_code == 401  # logged out: the account is closed
    assert AuditLog.objects.filter(action="privacy.account_erased").exists()


def test_erase_refusals(api: Api, club: Any, make_user: Any, client: Client) -> None:
    person = make_user()
    login_as(client, person, mfa=False)
    body = {"password": "Parola-Sigura-2026"}
    booked = api.post(
        "/bookings",
        {
            "resource_id": str(club.court1.id),
            "starts_at": "2027-03-16T10:00:00+02:00",
            "duration_minutes": 60,
            "session_type": "training",
        },
    ).json()
    assert error_code(api.post("/privacy/delete-account", body)) == "privacy.future_bookings"
    api.post(f"/bookings/{booked['id']}/cancel", {})

    debt = ledger.account(AccountKind.RECEIVABLE, user=person, location=club.location)
    revenue = ledger.account(AccountKind.REVENUE, location=club.location, category="padel")
    ledger.post(
        TransactionKind.CHARGE, [(debt, 5000), (revenue, -5000)], description="t", actor=SYSTEM
    )
    response = api.post("/privacy/delete-account", body)
    assert error_code(response) == "privacy.outstanding_debt" and response.json()["error"][
        "params"
    ] == {"debt": 5000}
    credit = ledger.account(AccountKind.CUSTOMER_BALANCE, user=person)
    ledger.post(
        TransactionKind.PAYMENT, [(credit, 5000), (debt, -5000)], description="t", actor=SYSTEM
    )
    ledger.post(
        TransactionKind.CREDIT, [(revenue, 8000), (credit, -8000)], description="t", actor=SYSTEM
    )
    assert error_code(api.post("/privacy/delete-account", body)) == "privacy.credit_left"
    assert api.post("/privacy/delete-account", {**body, "forfeit_credit": True}).status_code == 200


def test_staff_and_parents_first(make_user: Any, club: Any) -> None:
    staff_member = make_user()
    grant(staff_member, Role.RECEPTION, club.location)
    with pytest.raises(DomainError) as exc:
        services.erase(SYSTEM, staff_member)
    assert exc.value.code.value == "privacy.staff_account"
    parent, child = make_user(), make_user()
    GuardianLink.objects.create(guardian=parent, child=child)
    with pytest.raises(DomainError) as exc:
        services.erase(SYSTEM, parent)
    assert exc.value.code.value == "privacy.has_children"
    services.erase(SYSTEM, child)
    services.erase(SYSTEM, parent)  # once the child's account is gone
    with pytest.raises(DomainError) as exc:
        services.erase(SYSTEM, parent)
    assert exc.value.status == 404


def test_erase_on_request_by_staff(api: Api, make_user: Any, staff: Any) -> None:
    person = make_user()
    staff(Role.RECEPTION)
    assert (
        api.post(f"/staff/users/{person.pk}/erase", {"reason": "Cerere pe email"}).status_code
        == 403
    )
    staff(Role.ADMIN)
    assert (
        error_code(api.post(f"/staff/users/{person.pk}/erase", {"reason": " "}))
        == "validation.invalid"
    )
    assert api.post(f"/staff/users/{club_uuid()}/erase", {"reason": "x"}).status_code == 404
    assert (
        api.post(
            f"/staff/users/{person.pk}/erase", {"reason": "Cerere pe email, identitate verificată"}
        ).status_code
        == 200
    )
    person.refresh_from_db()
    assert person.deleted_at is not None


def club_uuid() -> str:
    return "00000000-0000-0000-0000-000000000000"


def test_erased_card_voids_the_wallet_pass(make_user: Any) -> None:
    person = make_user()
    card = cards.issue_card(SYSTEM, person)
    before = card.updated_at
    services.erase(SYSTEM, person)
    card.refresh_from_db()
    assert card.status == CardStatus.REVOKED and card.updated_at >= before
    assert card.revoke_reason == "Cont șters"
    assert timedelta(0) <= clock.now() - card.revoked_at  # type: ignore[operator]
