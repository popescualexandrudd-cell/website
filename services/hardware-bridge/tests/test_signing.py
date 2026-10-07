"""ADR-0013: the bridge's key, its signed messages and the server's signed commands."""

from __future__ import annotations

import base64
import os
import stat
from pathlib import Path
from typing import Any

import pytest
from cryptography.hazmat.primitives.asymmetric.ec import SECP256R1, generate_private_key
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption, PrivateFormat
from jungle_bridge.signing import (
    SignatureError,
    Signer,
    Verifier,
    canonical,
    load_or_create_key,
    now_utc,
    parse_public_key,
    public_key_b64,
)

from tests.conftest import DEVICE_ID, Clock, Server


def test_the_key_is_created_once_readable_only_by_the_service(tmp_path: Path) -> None:
    path = tmp_path / "keys" / "bridge-key.pem"
    key = load_or_create_key(path)
    if os.name == "posix":  # Windows keeps no Unix modes: there the folder's NTFS rights protect it
        assert stat.S_IMODE(path.stat().st_mode) == 0o600
    assert public_key_b64(load_or_create_key(path)) == public_key_b64(key)
    assert len(base64.b64decode(public_key_b64(key))) == 32


def test_a_key_of_another_kind_is_refused(tmp_path: Path) -> None:
    path = tmp_path / "ec.pem"
    other = generate_private_key(SECP256R1())
    path.write_bytes(other.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()))
    with pytest.raises(SignatureError, match="key_not_ed25519"):
        load_or_create_key(path)


def test_signed_messages_verify_with_the_public_key(tmp_path: Path, clock: Clock) -> None:
    key = load_or_create_key(tmp_path / "k.pem")
    signer = Signer(key, DEVICE_ID, clock)
    message = signer.sign("scan", code="ABC")
    payload = message["payload"]
    assert payload == {
        "code": "ABC",
        "device": DEVICE_ID,
        "type": "scan",
        "nonce": payload["nonce"],
        "at": "2027-04-05T09:00:00+00:00",
    }
    assert len(payload["nonce"]) == 32
    public = parse_public_key(signer.public_key)
    public.verify(base64.b64decode(message["signature"]), canonical(payload))
    assert signer.sign("scan", code="ABC")["payload"]["nonce"] != payload["nonce"]
    assert canonical({"b": 1, "a": "ă"}) == '{"a":"ă","b":1}'.encode()
    assert now_utc().tzinfo is not None


def test_invalid_public_keys(tmp_path: Path) -> None:
    for value in ("%%%", base64.b64encode(b"short").decode()):
        with pytest.raises(SignatureError, match="key_invalid"):
            parse_public_key(value)
    assert isinstance(
        parse_public_key(public_key_b64(load_or_create_key(tmp_path / "k.pem"))),
        Ed25519PublicKey,
    )


def verifier(server: Server, clock: Clock, seen: set[str] | None = None) -> Verifier:
    used = seen if seen is not None else set()

    def once(nonce: str) -> bool:
        if nonce in used:
            return False
        used.add(nonce)
        return True

    return Verifier(parse_public_key(server.public_key), DEVICE_ID, 120, clock, once)


def test_server_commands_are_accepted_once(server: Server, clock: Clock) -> None:
    check = verifier(server, clock)
    command = server.command("cash.dispense", txn="t-00000001", amount=1200)
    assert check.verify(command, "cash.dispense")["amount"] == 1200
    with pytest.raises(SignatureError, match="replay"):
        check.verify(command, "cash.dispense")


@pytest.mark.parametrize(
    ("change", "reason"),
    [
        ("no_server_key", "no_server_key"),
        ("not_a_dict", "malformed"),
        ("payload_not_a_dict", "malformed"),
        ("tampered", "signature"),
        ("bad_base64", "signature"),
        ("no_nonce", "signature"),
        ("bad_time", "signature"),
        ("other_device", "wrong_target"),
        ("other_type", "wrong_target"),
        ("naive_time", "stale"),
        ("stale", "stale"),
        ("short_nonce", "nonce"),
    ],
)
def test_invalid_commands_are_refused(
    server: Server, clock: Clock, change: str, reason: str
) -> None:
    check = verifier(server, clock)
    fields: dict[str, Any] = {"txn": "t-00000001", "amount": 1200}
    overrides = {
        "other_device": {"device": "alt"},
        "other_type": {"type": "cash.accept"},
        "naive_time": {"at": "2027-04-05T09:00:00"},
        "bad_time": {"at": "ieri"},
        "short_nonce": {"nonce": "abc"},
    }
    command: Any = server.command("cash.dispense", **fields, **overrides.get(change, {}))
    if change == "no_server_key":
        check.server_key = None
    if change == "not_a_dict":
        command = "text"
    if change == "payload_not_a_dict":
        command = {"payload": [], "signature": "x"}
    if change == "tampered":
        command["payload"]["amount"] = 999_999
    if change == "bad_base64":
        command["signature"] = "%%%"
    if change == "no_nonce":
        del command["payload"]["nonce"]
    if change == "stale":
        clock.advance(121)
    with pytest.raises(SignatureError) as exc:
        check.verify(command, "cash.dispense")
    assert str(exc.value) == reason
