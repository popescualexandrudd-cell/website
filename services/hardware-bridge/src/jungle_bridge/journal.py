"""The local cash journal (ADR-0013 point 4): append-only SQLite, WAL, `synchronous=FULL`.

Every banknote accepted is written to disk, signed, BEFORE anything else happens (before the
kiosk hears about it), so a power cut never loses a leu without a trace. Nothing is ever changed
or deleted (the database refuses it with triggers); that an event reached the server is itself
a new row. At start-up the transactions left open are found and closed with an `interrupted`
event, which the server reconciles (each event has a unique id, so sending again is harmless).

The server's commands are recorded here too, by nonce, so a replayed command is refused even
after a restart.
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    txn TEXT NOT NULL,
    kind TEXT NOT NULL,
    amount INTEGER NOT NULL,
    at TEXT NOT NULL,
    envelope TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS synced (
    event_id TEXT PRIMARY KEY REFERENCES events(id),
    at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS commands (
    nonce TEXT PRIMARY KEY,
    at TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events
    BEGIN SELECT RAISE(ABORT, 'append-only'); END;
CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events
    BEGIN SELECT RAISE(ABORT, 'append-only'); END;
CREATE TRIGGER IF NOT EXISTS synced_no_update BEFORE UPDATE ON synced
    BEGIN SELECT RAISE(ABORT, 'append-only'); END;
CREATE TRIGGER IF NOT EXISTS synced_no_delete BEFORE DELETE ON synced
    BEGIN SELECT RAISE(ABORT, 'append-only'); END;
CREATE TRIGGER IF NOT EXISTS commands_no_update BEFORE UPDATE ON commands
    BEGIN SELECT RAISE(ABORT, 'append-only'); END;
CREATE TRIGGER IF NOT EXISTS commands_no_delete BEFORE DELETE ON commands
    BEGIN SELECT RAISE(ABORT, 'append-only'); END;
"""

# Event kinds. A transaction starts with `started` and ends with `closed` or `interrupted`.
STARTED = "cash.started"
ACCEPTED = "cash.accepted"
DISPENSED = "cash.dispensed"
CLOSED = "cash.closed"
INTERRUPTED = "cash.interrupted"
ENDINGS = (CLOSED, INTERRUPTED)
# Staff operations on the cash box, and the fiscal register (Stage 8).
REFILLED = "cash.refilled"
EMPTIED = "cash.emptied"
COUNTED = "cash.counted"
FISCAL_PRINTED = "fiscal.printed"
Z_REPORT = "fiscal.z"


@dataclass(frozen=True)
class Event:
    id: str
    txn: str
    kind: str
    amount: int
    at: str
    envelope: dict[str, Any]


Sign = Callable[..., dict[str, Any]]


class Journal:
    def __init__(self, path: Path, sign: Sign, clock: Callable[[], datetime]):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path, isolation_level=None, check_same_thread=False)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript(SCHEMA)
        self.sign = sign
        self.clock = clock

    def close(self) -> None:
        self.db.close()

    # ------------------------------------------------------------ events
    def append(self, txn: str, kind: str, amount: int, **extra: Any) -> Event:
        """Signs and stores one event; returns only once it is on disk."""
        if not isinstance(amount, int) or isinstance(amount, bool) or amount < 0:
            raise ValueError("amount")
        event_id = str(uuid.uuid4())
        envelope = self.sign(kind, event=event_id, txn=txn, amount=amount, **extra)
        at = str(envelope["payload"]["at"])
        self.db.execute(
            "INSERT INTO events (id, txn, kind, amount, at, envelope) VALUES (?, ?, ?, ?, ?, ?)",
            (event_id, txn, kind, amount, at, json.dumps(envelope, sort_keys=True)),
        )
        return Event(event_id, txn, kind, amount, at, envelope)

    def _events(self, where: str = "", params: tuple[Any, ...] = ()) -> list[Event]:
        rows = self.db.execute(
            f"SELECT id, txn, kind, amount, at, envelope FROM events {where} ORDER BY seq",  # noqa: S608
            params,
        ).fetchall()
        return [Event(r[0], r[1], r[2], r[3], r[4], json.loads(r[5])) for r in rows]

    def has(self, txn: str, kind: str) -> bool:
        row = self.db.execute(
            "SELECT 1 FROM events WHERE txn = ? AND kind = ? LIMIT 1", (txn, kind)
        ).fetchone()
        return row is not None

    def events(self, txn: str | None = None) -> list[Event]:
        return self._events("WHERE txn = ?", (txn,)) if txn else self._events()

    def total(self, txn: str, kind: str) -> int:
        row = self.db.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM events WHERE txn = ? AND kind = ?", (txn, kind)
        ).fetchone()
        return int(row[0])

    def is_open(self, txn: str) -> bool:
        kinds = {e.kind for e in self.events(txn)}
        return STARTED in kinds and not kinds & set(ENDINGS)

    def open_transactions(self) -> list[str]:
        started = [e.txn for e in self._events("WHERE kind = ?", (STARTED,))]
        return [txn for txn in started if self.is_open(txn)]

    def recover(self) -> list[Event]:
        """At start-up: closes each transaction a crash left open, with what was inserted and
        what was given back, for the server to reconcile."""
        return [
            self.append(
                txn,
                INTERRUPTED,
                self.total(txn, ACCEPTED),
                dispensed=self.total(txn, DISPENSED),
            )
            for txn in self.open_transactions()
        ]

    # ------------------------------------------------------------ sync with the server
    def pending(self) -> list[Event]:
        return self._events("WHERE id NOT IN (SELECT event_id FROM synced)")

    def mark_synced(self, ids: list[str]) -> None:
        at = self.clock().isoformat()
        known = {e.id for e in self.pending()}
        for event_id in dict.fromkeys(ids):
            if event_id in known:
                self.db.execute("INSERT INTO synced (event_id, at) VALUES (?, ?)", (event_id, at))

    # ------------------------------------------------------------ server commands, once each
    def use_nonce(self, nonce: str) -> bool:
        """False when this command was already executed (a replay)."""
        try:
            self.db.execute(
                "INSERT INTO commands (nonce, at) VALUES (?, ?)", (nonce, self.clock().isoformat())
            )
        except sqlite3.IntegrityError:
            return False
        return True
