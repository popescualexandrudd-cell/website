"""What the bridge does with each message from the kiosk page (ADR-0013), independent of the
WebSocket that carries it (`server.py`), so it can be tested directly.

From the page (JSON, with an optional `id` echoed in the reply):
- `hello`: who the device is, its public key, and the device token for the API;
- `health`: machine state, change available, open cash transactions, events not yet synced;
- `receipt.print`: a non-fiscal slip;
- `cash.check`: whether the recycler can give this change (asked BEFORE a payment, §8.3);
- `cash.accept`, `cash.dispense`, `cash.stop`, `cash.close`: only as a `command` signed by the
  server (a compromised page cannot pay itself out);
- `sim.scan`, `sim.insert`, `sim.fault`: drive the simulators, only with simulator control on.

To the page (pushed): `scan` (the code, signed by the bridge: the page forwards it to the
server as is), `cash.accepted` (each note, signed, already on disk), `cash.complete`, `fault`.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any

from jungle_bridge import journal as cash_journal
from jungle_bridge.config import Settings
from jungle_bridge.drivers.base import DeviceFault, Devices
from jungle_bridge.drivers.simulator import (
    SimCash,
    SimFiscalPrinter,
    SimReceiptPrinter,
    SimScanner,
)
from jungle_bridge.journal import Journal
from jungle_bridge.signing import SignatureError, Signer, Verifier, parse_public_key

log = logging.getLogger(__name__)

Send = Callable[[str], Awaitable[None]]
MAX_RECEIPT_LINES = 60
MAX_LINE = 64
MAX_AMOUNT = 1_000_000  # 10 000 RON: far above anything paid at a kiosk


class Refused(Exception):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _amount(value: Any) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or not 0 < value <= MAX_AMOUNT:
        raise Refused("invalid")
    return value


def _txn(value: Any) -> str:
    if not isinstance(value, str) or not 8 <= len(value) <= 64:
        raise Refused("invalid")
    return value


class Bridge:
    def __init__(
        self,
        settings: Settings,
        devices: Devices,
        signer: Signer,
        journal: Journal,
        clock: Callable[[], datetime],
    ):
        self.settings = settings
        self.devices = devices
        self.signer = signer
        self.journal = journal
        server_key = (
            parse_public_key(settings.server_public_key) if settings.server_public_key else None
        )
        self.verifier = Verifier(
            server_key, settings.device_id, settings.window_seconds, clock, journal.use_nonce
        )
        self.clients: set[Send] = set()
        self.collecting: asyncio.Task[None] | None = None
        self.recovered = journal.recover()

    # ------------------------------------------------------------ pushing to the pages
    async def broadcast(self, message: dict[str, Any]) -> None:
        text = json.dumps(message)
        for send in list(self.clients):
            try:
                await send(text)
            except Exception:  # a page that went away must not stop the others
                log.info("dropping a closed kiosk page")
                self.clients.discard(send)

    async def scanner_loop(self) -> None:
        """Each code read is signed and pushed to the kiosk page."""
        while True:
            code = await self.devices.scanner.read()
            await self.broadcast({"event": "scan", "signed": self.signer.sign("scan", code=code)})

    async def _collect(self, txn: str, due: int) -> None:
        cash = self.devices.cash
        try:
            while self.journal.total(txn, cash_journal.ACCEPTED) < due:
                value = await cash.next_note()
                # On disk first (ADR-0013): only then does anyone hear about the note.
                event = self.journal.append(txn, cash_journal.ACCEPTED, value)
                await self.broadcast(
                    {
                        "event": "cash.accepted",
                        "signed": event.envelope,
                        "total": self.journal.total(txn, cash_journal.ACCEPTED),
                        "due": due,
                    }
                )
            await cash.disable()
            total = self.journal.total(txn, cash_journal.ACCEPTED)
            await self.broadcast({"event": "cash.complete", "txn": txn, "total": total})
        except DeviceFault as fault:
            await cash.disable()
            await self.broadcast({"event": "fault", "device": fault.device, "code": fault.code})

    # ------------------------------------------------------------ messages from the pages
    async def handle(self, raw: str | bytes) -> dict[str, Any]:
        try:
            message = json.loads(raw)
        except (ValueError, UnicodeDecodeError):
            return {"ok": False, "error": "bad_json"}
        if not isinstance(message, dict):
            return {"ok": False, "error": "bad_json"}
        reply: dict[str, Any] = {"id": message.get("id")}
        try:
            reply.update(await self._dispatch(str(message.get("op", "")), message))
            reply["ok"] = True
        except Refused as exc:
            reply.update(ok=False, error=exc.code)
        except SignatureError as exc:
            reply.update(ok=False, error="signature", reason=str(exc))
        except DeviceFault as fault:
            reply.update(ok=False, error=fault.code, device=fault.device)
        return reply

    async def _dispatch(self, op: str, message: dict[str, Any]) -> dict[str, Any]:
        simple: dict[str, Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]] = {
            "hello": self._hello,
            "health": self._health,
            "receipt.print": self._receipt,
            "cash.check": self._cash_check,
            "cash.accept": self._cash_accept,
            "cash.dispense": self._cash_dispense,
            "cash.stop": self._cash_stop,
            "cash.close": self._cash_close,
            "sim.scan": self._sim_scan,
            "sim.insert": self._sim_insert,
            "sim.fault": self._sim_fault,
        }
        if op not in simple:
            raise Refused("unknown_op")
        if op.startswith("sim.") and not self.settings.simulator_control:
            raise Refused("not_simulator")
        return await simple[op](message)

    async def _hello(self, _: dict[str, Any]) -> dict[str, Any]:
        return {
            "device": self.settings.device_id,
            "public_key": self.signer.public_key,
            "device_token": self.settings.device_token,
            "api_url": self.settings.api_url,
            "simulator": self.settings.simulator_control,
        }

    async def _health(self, _: dict[str, Any]) -> dict[str, Any]:
        return {
            "health": await self.devices.health.status(),
            "cash_levels": {str(k): v for k, v in sorted(self.devices.cash.levels().items())},
            "open_transactions": self.journal.open_transactions(),
            "pending_sync": len(self.journal.pending()),
        }

    async def _receipt(self, message: dict[str, Any]) -> dict[str, Any]:
        lines = message.get("lines")
        if (
            not isinstance(lines, list)
            or not 0 < len(lines) <= MAX_RECEIPT_LINES
            or not all(isinstance(line, str) and len(line) <= MAX_LINE for line in lines)
        ):
            raise Refused("invalid")
        await self.devices.receipt.print(lines)
        return {}

    async def _cash_check(self, message: dict[str, Any]) -> dict[str, Any]:
        amount = message.get("amount")
        if amount == 0:
            return {"can_give_change": True}
        return {"can_give_change": self.devices.cash.can_dispense(_amount(amount))}

    def _command(self, message: dict[str, Any], kind: str) -> tuple[str, dict[str, Any]]:
        payload = self.verifier.verify(message.get("command"), kind)
        return _txn(payload.get("txn")), payload

    async def _cash_accept(self, message: dict[str, Any]) -> dict[str, Any]:
        txn, payload = self._command(message, "cash.accept")
        due = _amount(payload.get("amount"))
        if self.collecting is not None and not self.collecting.done():
            raise Refused("busy")
        if self.journal.events(txn):
            raise Refused("txn_used")
        await self.devices.cash.enable()
        self.journal.append(txn, cash_journal.STARTED, due)
        self.collecting = asyncio.create_task(self._collect(txn, due))
        return {"txn": txn}

    def _open(self, txn: str) -> None:
        if not self.journal.is_open(txn):
            raise Refused("txn_unknown")

    async def _cash_stop(self, message: dict[str, Any]) -> dict[str, Any]:
        txn, _ = self._command(message, "cash.stop")
        self._open(txn)
        await self._stop_collecting()
        return {"txn": txn, "total": self.journal.total(txn, cash_journal.ACCEPTED)}

    async def _stop_collecting(self) -> None:
        if self.collecting is not None:
            self.collecting.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.collecting
            self.collecting = None
        await self.devices.cash.disable()

    async def _cash_dispense(self, message: dict[str, Any]) -> dict[str, Any]:
        txn, payload = self._command(message, "cash.dispense")
        amount = _amount(payload.get("amount"))
        self._open(txn)
        given = await self.devices.cash.dispense(amount)
        event = self.journal.append(
            txn, cash_journal.DISPENSED, amount, notes={str(k): v for k, v in given.items()}
        )
        return {"txn": txn, "signed": event.envelope}

    async def _cash_close(self, message: dict[str, Any]) -> dict[str, Any]:
        txn, _ = self._command(message, "cash.close")
        self._open(txn)
        await self._stop_collecting()
        event = self.journal.append(
            txn,
            cash_journal.CLOSED,
            self.journal.total(txn, cash_journal.ACCEPTED),
            dispensed=self.journal.total(txn, cash_journal.DISPENSED),
        )
        return {"txn": txn, "signed": event.envelope}

    # ------------------------------------------------------------ simulator control (dev only)
    async def _sim_scan(self, message: dict[str, Any]) -> dict[str, Any]:
        code = message.get("code")
        scanner = self.devices.scanner
        if not isinstance(code, str) or not 0 < len(code) <= 200:
            raise Refused("invalid")
        if not isinstance(scanner, SimScanner):
            raise Refused("not_simulator")
        scanner.feed(code)
        return {}

    async def _sim_insert(self, message: dict[str, Any]) -> dict[str, Any]:
        cash = self.devices.cash
        if not isinstance(cash, SimCash):
            raise Refused("not_simulator")
        cash.insert(_amount(message.get("amount")))
        return {}

    async def _sim_fault(self, message: dict[str, Any]) -> dict[str, Any]:
        targets = {
            "cash": self.devices.cash,
            "fiscal": self.devices.fiscal,
            "receipt": self.devices.receipt,
        }
        device = targets.get(str(message.get("device")))
        fault = message.get("fault")
        if not isinstance(device, SimCash | SimFiscalPrinter | SimReceiptPrinter):
            raise Refused("not_simulator")
        if fault is not None and not isinstance(fault, str):
            raise Refused("invalid")
        try:
            device.fail(fault)
        except ValueError as exc:
            raise Refused("invalid") from exc
        return {}
