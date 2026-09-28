"""ADR-0013 point 4: the append-only cash journal, and what happens after a power cut."""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from pathlib import Path

import pytest
from jungle_bridge import journal as j
from jungle_bridge.journal import Journal
from jungle_bridge.signing import Signer, load_or_create_key

from tests.conftest import DEVICE_ID, Clock


@pytest.fixture
def journal(tmp_path: Path, clock: Clock) -> Iterator[Journal]:
    signer = Signer(load_or_create_key(tmp_path / "k.pem"), DEVICE_ID, clock)
    opened = Journal(tmp_path / "db" / "cash.sqlite3", signer.sign, clock)
    yield opened
    opened.close()


def test_the_journal_is_durable_and_append_only(journal: Journal) -> None:
    assert journal.db.execute("PRAGMA journal_mode").fetchone()[0] == "wal"
    assert journal.db.execute("PRAGMA synchronous").fetchone()[0] == 2  # FULL
    event = journal.append("t-00000001", j.STARTED, 5000)
    assert event.envelope["payload"]["event"] == event.id
    assert event.envelope["payload"]["type"] == j.STARTED
    for statement in (
        "UPDATE events SET amount = 1",
        "DELETE FROM events",
    ):
        with pytest.raises(sqlite3.IntegrityError, match="append-only"):
            journal.db.execute(statement)
    journal.mark_synced([event.id])
    for statement in ("UPDATE synced SET at = 'x'", "DELETE FROM synced"):
        with pytest.raises(sqlite3.IntegrityError, match="append-only"):
            journal.db.execute(statement)
    assert journal.use_nonce("n-1")
    for statement in ("UPDATE commands SET at = 'x'", "DELETE FROM commands"):
        with pytest.raises(sqlite3.IntegrityError, match="append-only"):
            journal.db.execute(statement)


@pytest.mark.parametrize("amount", [-1, 1.5, True])
def test_amounts_are_whole_bani(journal: Journal, amount: object) -> None:
    with pytest.raises(ValueError, match="amount"):
        journal.append("t-00000001", j.ACCEPTED, amount)  # type: ignore[arg-type]


def test_after_a_power_cut_open_transactions_are_closed_for_reconciliation(
    tmp_path: Path, clock: Clock
) -> None:
    signer = Signer(load_or_create_key(tmp_path / "k.pem"), DEVICE_ID, clock)
    path = tmp_path / "cash.sqlite3"
    before = Journal(path, signer.sign, clock)
    before.append("t-open", j.STARTED, 12000)
    before.append("t-open", j.ACCEPTED, 5000)
    before.append("t-open", j.ACCEPTED, 10000)
    before.append("t-open", j.DISPENSED, 3000)
    before.append("t-done", j.STARTED, 1000)
    before.append("t-done", j.CLOSED, 1000)
    before.db.close()  # the power goes

    after = Journal(path, signer.sign, clock)
    assert after.open_transactions() == ["t-open"]
    (closed,) = after.recover()
    assert (closed.txn, closed.kind, closed.amount) == ("t-open", j.INTERRUPTED, 15000)
    assert closed.envelope["payload"]["dispensed"] == 3000
    assert after.open_transactions() == [] and after.recover() == []
    assert [e.kind for e in after.events("t-open")][-1] == j.INTERRUPTED
    assert len(after.events()) == 7
    after.close()


def test_sync_state_and_command_nonces(journal: Journal) -> None:
    first = journal.append("t-00000001", j.STARTED, 100)
    second = journal.append("t-00000001", j.ACCEPTED, 100)
    assert [e.id for e in journal.pending()] == [first.id, second.id]
    journal.mark_synced([first.id, "unknown", first.id])
    assert [e.id for e in journal.pending()] == [second.id]
    assert journal.use_nonce("n-1") and not journal.use_nonce("n-1")
