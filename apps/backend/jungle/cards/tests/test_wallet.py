"""Apple Wallet and Google Wallet (R-020, R-023), with test certificates made on the fly."""

from __future__ import annotations

import base64
import datetime as dt
import io
import json
import shutil
import subprocess
import zipfile
from pathlib import Path
from typing import Any

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa
from cryptography.x509.oid import NameOID
from django.test import Client

from jungle.audit.services import SYSTEM
from jungle.cards import fields, services, wallet_apple, wallet_google
from jungle.cards.models import AppleDeviceRegistration, MemberCard
from jungle.conftest import Api, error_code, login_as

pytestmark = pytest.mark.django_db
PASS_TYPE = "pass.ro.junglepadel.test"


def _cert(
    name: str, key: rsa.RSAPrivateKey, issuer: x509.Name | None = None, issuer_key: Any = None
) -> x509.Certificate:
    subject = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, name)])
    now = dt.datetime.now(dt.UTC)
    return (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer or subject)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - dt.timedelta(days=1))
        .not_valid_after(now + dt.timedelta(days=30))
        .sign(issuer_key or key, hashes.SHA256())
    )


@pytest.fixture
def apple(settings: Any, tmp_path: Path) -> dict[str, Any]:
    wwdr_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    wwdr = _cert("Test WWDR", wwdr_key)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    cert = _cert("Pass Type ID: test", key, wwdr.subject, wwdr_key)
    files = {
        "cert": tmp_path / "cert.pem",
        "key": tmp_path / "key.pem",
        "wwdr": tmp_path / "wwdr.pem",
    }
    files["cert"].write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    files["wwdr"].write_bytes(wwdr.public_bytes(serialization.Encoding.PEM))
    files["key"].write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    settings.APPLE_WALLET_ENABLED = True
    settings.APPLE_PASS_TYPE_ID = PASS_TYPE
    settings.APPLE_TEAM_ID = "TEAM123456"
    settings.APPLE_PASS_CERT_FILE = str(files["cert"])
    settings.APPLE_PASS_KEY_FILE = str(files["key"])
    settings.APPLE_PASS_KEY_PASSWORD = ""
    settings.APPLE_WWDR_CERT_FILE = str(files["wwdr"])
    settings.APPLE_WALLET_WEB_SERVICE_URL = "https://api.example.test/api/v1/wallet/apple"
    return {"files": files, "tmp": tmp_path}


@pytest.fixture
def google(settings: Any, tmp_path: Path) -> rsa.RSAPrivateKey:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    )
    account = tmp_path / "account.json"
    account.write_text(
        json.dumps(
            {
                "client_email": "wallet@club.test",
                "private_key_id": "k1",
                "private_key": pem.decode(),
            }
        )
    )
    settings.GOOGLE_WALLET_ENABLED = True
    settings.GOOGLE_WALLET_ISSUER_ID = "3388000000000000000"
    settings.GOOGLE_WALLET_SERVICE_ACCOUNT_FILE = str(account)
    return key


@pytest.fixture
def member(make_user: Any, client: Client) -> Any:
    user = make_user(first_name="Ana", last_name="Ionescu")
    login_as(client, user, mfa=False)
    return user


# ---------------------------------------------------------------- Apple: the pass
def test_r020_apple_pass_content(apple: Any, member: Any) -> None:
    card = services.issue_card(SYSTEM, member)
    data = wallet_apple.pass_json(card)
    assert data["serialNumber"] == str(card.pk) and data["passTypeIdentifier"] == PASS_TYPE
    assert data["barcodes"][0] == {  # type: ignore[index]
        "format": "PKBarcodeFormatQR",
        "message": card.token,
        "messageEncoding": "iso-8859-1",
        "altText": card.number,
    }
    assert data["backgroundColor"] == "rgb(10,19,32)" and data["voided"] is False
    assert data["storeCard"]["primaryFields"][0]["value"] == "Ana Ionescu"  # type: ignore[index]


def test_r020_pkpass_is_signed_and_complete(apple: Any, member: Any) -> None:
    card = services.issue_card(SYSTEM, member)
    archive = zipfile.ZipFile(io.BytesIO(wallet_apple.build_pkpass(card)))
    names = set(archive.namelist())
    assert {
        "pass.json",
        "manifest.json",
        "signature",
        "icon.png",
        "logo@2x.png",
        "ro.lproj/pass.strings",
        "en.lproj/pass.strings",
    } <= names
    manifest = json.loads(archive.read("manifest.json"))
    import hashlib

    for name, digest in manifest.items():
        assert hashlib.sha1(archive.read(name), usedforsecurity=False).hexdigest() == digest
    assert "Membru" in archive.read("ro.lproj/pass.strings").decode("utf-16")
    assert "Member" in archive.read("en.lproj/pass.strings").decode("utf-16")
    openssl = shutil.which("openssl")
    if openssl:
        tmp = apple["tmp"]
        (tmp / "manifest.json").write_bytes(archive.read("manifest.json"))
        (tmp / "signature").write_bytes(archive.read("signature"))
        result = subprocess.run(  # noqa: S603 - fixed arguments, files made by this test
            [
                openssl,
                "cms",
                "-verify",
                "-binary",
                "-inform",
                "DER",
                "-in",
                str(tmp / "signature"),
                "-content",
                str(tmp / "manifest.json"),
                "-noverify",
                "-out",
                "/dev/null",
            ],
            capture_output=True,
            check=False,
        )
        assert result.returncode == 0, result.stderr


def test_the_pass_key_must_be_rsa(apple: Any) -> None:
    ec_key = ec.generate_private_key(ec.SECP256R1())
    apple["files"]["key"].write_bytes(
        ec_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    with pytest.raises(ValueError, match="RSA"):
        wallet_apple.signer_from_settings()


def test_member_downloads_the_apple_pass(api: Api, apple: Any, member: Any) -> None:
    card = api.get("/cards/mine").json()
    assert card["apple_wallet"] is True and card["google_wallet"] is False
    response = api.get("/cards/mine/apple.pkpass")
    assert response.status_code == 200 and response["Content-Type"] == wallet_apple.CONTENT_TYPE
    assert response["Cache-Control"] == "no-store"


def test_wallets_off_without_the_club_accounts(api: Api, member: Any) -> None:
    """Q24: until the certificates are on the server, the member uses the QR code."""
    assert api.get("/cards/mine").json()["apple_wallet"] is False
    for path in ("/cards/mine/apple.pkpass", "/cards/mine/google"):
        response = api.get(path)
        assert response.status_code == 503 and error_code(response) == "wallet.unavailable"


# ---------------------------------------------------------------- Apple: the web service
def auth(card: MemberCard) -> dict[str, Any]:
    return {"HTTP_AUTHORIZATION": f"ApplePass {card.wallet_auth_token}"}


def test_apple_web_service_flow(apple: Any, member: Any, time_machine: Any) -> None:
    time_machine.move_to("2027-03-15T09:00:00+02:00", tick=False)
    anon = Client()
    card = services.issue_card(SYSTEM, member)
    base = "/api/v1/wallet/apple/v1"
    reg = f"{base}/devices/iphone-1/registrations/{PASS_TYPE}/{card.pk}"
    assert anon.post(reg, {"pushToken": "p1"}, content_type="application/json").status_code == 401
    assert (
        anon.post(
            reg, {"pushToken": "p1"}, content_type="application/json", **auth(card)
        ).status_code
        == 201
    )
    assert (
        anon.post(
            reg, {"pushToken": "p2"}, content_type="application/json", **auth(card)
        ).status_code
        == 200
    )
    assert AppleDeviceRegistration.objects.get().push_token == "p2"

    wrong_type = f"{base}/devices/iphone-1/registrations/pass.other/{card.pk}"
    assert (
        anon.post(
            wrong_type, {"pushToken": "x"}, content_type="application/json", **auth(card)
        ).status_code
        == 401
    )
    bad_serial = f"{base}/devices/iphone-1/registrations/{PASS_TYPE}/not-a-uuid"
    assert (
        anon.post(
            bad_serial, {"pushToken": "x"}, content_type="application/json", **auth(card)
        ).status_code
        == 401
    )

    listing = f"{base}/devices/iphone-1/registrations/{PASS_TYPE}"
    first = anon.get(listing)
    assert first.status_code == 200 and first.json()["serialNumbers"] == [str(card.pk)]
    since = first.json()["lastUpdated"]
    assert anon.get(f"{listing}?passesUpdatedSince={since}").status_code == 204
    assert anon.get(f"{listing}?passesUpdatedSince=yesterday").status_code == 400
    assert anon.get(f"{base}/devices/iphone-1/registrations/pass.other").status_code == 404

    time_machine.move_to("2027-03-16T09:00:00+02:00", tick=False)
    services.card_changed(card)  # e.g. new LP after a validated match (R-023)
    assert anon.get(f"{listing}?passesUpdatedSince={since}").json()["serialNumbers"] == [
        str(card.pk)
    ]

    latest = f"{base}/passes/{PASS_TYPE}/{card.pk}"
    assert anon.get(latest).status_code == 401
    got = anon.get(latest, **auth(card))
    assert got.status_code == 200 and got["Content-Type"] == wallet_apple.CONTENT_TYPE
    modified = got["Last-Modified"]
    assert anon.get(latest, HTTP_IF_MODIFIED_SINCE=modified, **auth(card)).status_code == 304
    assert anon.get(latest, HTTP_IF_MODIFIED_SINCE="not a date", **auth(card)).status_code == 200
    older = "Mon, 01 Mar 2027 08:00:00 GMT"
    assert anon.get(latest, HTTP_IF_MODIFIED_SINCE=older, **auth(card)).status_code == 200

    assert (
        anon.post(f"{base}/log", {"logs": ["hello"]}, content_type="application/json").status_code
        == 200
    )
    assert anon.delete(reg).status_code == 401
    assert anon.delete(reg, **auth(card)).status_code == 200
    assert not AppleDeviceRegistration.objects.exists()


def test_apple_web_service_is_closed_when_disabled(member: Any) -> None:
    card = services.issue_card(SYSTEM, member)
    response = Client().get(f"/api/v1/wallet/apple/v1/passes/{PASS_TYPE}/{card.pk}", **auth(card))
    assert response.status_code == 401
    assert (
        Client().get(f"/api/v1/wallet/apple/v1/devices/x/registrations/{PASS_TYPE}").status_code
        == 404
    )


# ---------------------------------------------------------------- automatic updates (R-023)
class FakePusher:
    def __init__(self, answers: dict[str, Any]) -> None:
        self.answers = answers
        self.sent: list[str] = []

    def push(self, push_token: str) -> int:
        self.sent.append(push_token)
        answer = self.answers[push_token]
        if isinstance(answer, Exception):
            raise answer
        return int(answer)


def test_r023_changes_push_to_every_phone(
    apple: Any, member: Any, django_capture_on_commit_callbacks: Any
) -> None:
    card = services.issue_card(SYSTEM, member)
    from jungle.core import clock

    for device, token in (("a", "ok"), ("b", "gone"), ("c", "boom"), ("d", "busy")):
        AppleDeviceRegistration.objects.create(
            card=card, device_library_id=device, push_token=token, created_at=clock.now()
        )
    pusher = FakePusher({"ok": 200, "gone": 410, "boom": RuntimeError("network"), "busy": 503})
    wallet_apple.set_pusher(pusher)
    try:
        with django_capture_on_commit_callbacks(execute=True):
            services.card_changed(card)
        assert sorted(pusher.sent) == ["boom", "busy", "gone", "ok"]
        assert set(AppleDeviceRegistration.objects.values_list("device_library_id", flat=True)) == {
            "a",
            "c",
            "d",
        }
        # Reissuing voids the old card on the phones (they fetch it and see "voided").
        with django_capture_on_commit_callbacks(execute=True):
            services.issue_card(SYSTEM, member, "Card pierdut")
        assert wallet_apple.pass_json(MemberCard.objects.get(pk=card.pk))["voided"] is True
    finally:
        wallet_apple.set_pusher(wallet_apple.ApnsPusher())


def test_no_pushes_when_apple_is_off(member: Any) -> None:
    card = services.issue_card(SYSTEM, member)
    assert wallet_apple.refresh(card) == 0


# ---------------------------------------------------------------- Google
def _decode(part: str) -> Any:
    return json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4)))


def test_r020_google_save_link_is_a_signed_jwt(
    api: Api, google: rsa.RSAPrivateKey, member: Any
) -> None:
    card_json = api.get("/cards/mine").json()
    assert card_json["google_wallet"] is True
    url = api.get("/cards/mine/google").json()["url"]
    assert url.startswith(wallet_google.SAVE_URL)
    token = url.removeprefix(wallet_google.SAVE_URL)
    header, claims, signature = token.split(".")
    google.public_key().verify(
        base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4)),
        f"{header}.{claims}".encode(),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )
    payload = _decode(claims)
    assert payload["aud"] == "google" and payload["iss"] == "wallet@club.test"
    obj = payload["payload"]["genericObjects"][0]
    card = MemberCard.objects.get(pk=card_json["id"])
    assert obj["barcode"]["value"] == card.token and obj["state"] == "ACTIVE"
    assert obj["id"] == f"3388000000000000000.{card.pk.hex}"


class FakeTransport:
    def __init__(self, status: int | Exception) -> None:
        self.status = status
        self.tokens = 0
        self.patches: list[str] = []

    def access_token(self, assertion: str) -> str:
        self.tokens += 1
        return "access"

    def patch(self, url: str, token: str, body: dict[str, Any]) -> int:
        self.patches.append(url)
        if isinstance(self.status, Exception):
            raise self.status
        return self.status


@pytest.mark.parametrize(
    ("status", "updated"), [(200, True), (404, False), (500, False), (RuntimeError("down"), False)]
)
def test_r023_google_card_updates(google: Any, member: Any, status: Any, updated: bool) -> None:
    card = services.issue_card(SYSTEM, member)
    transport = FakeTransport(status)
    wallet_google.set_transport(transport)
    try:
        assert wallet_google.refresh(card) is updated
        wallet_google.refresh(card)
        assert transport.tokens <= 1  # the access token is reused
    finally:
        wallet_google.set_transport(wallet_google.HttpTransport())


def test_google_off_and_key_checks(settings: Any, tmp_path: Path, member: Any) -> None:
    card = services.issue_card(SYSTEM, member)
    assert wallet_google.refresh(card) is False
    ec_key = ec.generate_private_key(ec.SECP256R1())
    pem = ec_key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    )
    account = tmp_path / "ec.json"
    account.write_text(json.dumps({"client_email": "x@y", "private_key": pem.decode()}))
    settings.GOOGLE_WALLET_SERVICE_ACCOUNT_FILE = str(account)
    with pytest.raises(ValueError, match="RSA"):
        wallet_google.account_from_settings()


# ---------------------------------------------------------------- fields shown on the card
def test_the_league_can_add_fields(apple: Any, member: Any) -> None:
    card = services.issue_card(SYSTEM, member)

    def league(c: MemberCard) -> list[fields.CardField]:
        return [
            fields.CardField("rank", "Rang", "Rank", "Aur II"),
            fields.CardField("lp", "LP", "LP", "64"),
        ]

    fields.register(league)
    fields.register(league)  # registering twice changes nothing
    try:
        shown = wallet_apple.pass_json(card)["storeCard"]["secondaryFields"]  # type: ignore[index]
        assert [f["value"] for f in shown] == [f"{member.created_at:%m.%Y}", "Aur II", "64"]
        assert "Aur II" in json.dumps(wallet_google.card_object(card), ensure_ascii=False)
    finally:
        fields._providers.remove(league)


def test_no_email_for_people_without_one(
    make_user: Any, django_capture_on_commit_callbacks: Any
) -> None:
    from django.core import mail

    from jungle.accounts.models import User

    guest = make_user()
    User.objects.filter(pk=guest.pk).update(account_type="child", email=None)  # a child: no email
    guest.refresh_from_db()
    with django_capture_on_commit_callbacks(execute=True):
        services.issue_card(SYSTEM, guest)
    assert mail.outbox == []


def test_r023_a_new_name_refreshes_the_card(
    api: Api, member: Any, client: Client, time_machine: Any
) -> None:
    time_machine.move_to("2027-03-15T09:00:00+02:00", tick=False)
    login_as(client, member, mfa=False)
    card = services.issue_card(SYSTEM, member)
    time_machine.move_to("2027-03-15T10:00:00+02:00", tick=False)
    assert api.patch("/me", {"last_name": "Ionescu-Pop"}).status_code == 200
    card.refresh_from_db()
    assert card.updated_at.hour == 8  # 10:00 in Bucharest
    time_machine.move_to("2027-03-15T11:00:00+02:00", tick=False)
    api.patch("/me", {"preferred_language": "en"})
    card.refresh_from_db()
    assert card.updated_at.hour == 8  # the language is not on the card


def test_wallet_check_command(apple: Any, google: Any, settings: Any) -> None:
    from django.core.management import call_command

    out = io.StringIO()
    call_command("wallet_check", stdout=out)
    assert "Apple Wallet: pass de test semnat" in out.getvalue()
    assert "Google Wallet: link de test semnat" in out.getvalue()
    settings.APPLE_WALLET_ENABLED = settings.GOOGLE_WALLET_ENABLED = False
    out = io.StringIO()
    call_command("wallet_check", stdout=out)
    assert out.getvalue().count("dezactivat") == 2
    assert not MemberCard.objects.exists()
