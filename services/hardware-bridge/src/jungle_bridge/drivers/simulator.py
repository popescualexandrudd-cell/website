"""Complete simulators for every device (§8.4, §13.4), so the whole system can be tested without
hardware. Each one can be told to fail the way the real device can: a jammed note, not enough
change, a full cassette, a power cut, no paper, a printer offline.

In development the kiosk drives them through the bridge (`sim.*` messages, only when
`BRIDGE_SIMULATOR_CONTROL=1`): a scanned card, an inserted note, a fault.
"""

from __future__ import annotations

import asyncio
import shutil
import time
from typing import Any

from jungle_bridge.drivers.base import (
    CashDevice,
    DeviceFault,
    Devices,
    FiscalPrinter,
    Health,
    ReceiptLine,
    ReceiptPrinter,
    Scanner,
)

LEU = 100
# What the acceptor takes and what the recycler gives back (a demo set until the model is
# chosen, Q23).
ACCEPTED = (1 * LEU, 5 * LEU, 10 * LEU, 50 * LEU, 100 * LEU, 200 * LEU)
RECYCLED = (1 * LEU, 5 * LEU, 10 * LEU, 50 * LEU)
CASH_FAULTS = ("note_jam", "cassette_full", "power_loss")
PRINTER_FAULTS = ("paper_out", "offline")


class SimScanner(Scanner):
    def __init__(self) -> None:
        self.codes: asyncio.Queue[str] = asyncio.Queue()

    def feed(self, code: str) -> None:
        """A card held in front of the reader."""
        self.codes.put_nowait(code)

    async def read(self) -> str:
        return await self.codes.get()


class SimCash(CashDevice):
    def __init__(self, levels: dict[int, int] | None = None, capacity: int = 500):
        self.stock = dict(levels if levels is not None else dict.fromkeys(RECYCLED, 20))
        self.capacity = capacity  # notes the cassette holds
        self.cassette: list[int] = []
        self.escrow: int | None = None
        self.returned: list[int] = []  # notes given back to the customer
        self.enabled = False
        self.notes: asyncio.Queue[int] = asyncio.Queue()
        self.fault: str | None = None

    def fail(self, fault: str | None) -> None:
        if fault is not None and fault not in (*CASH_FAULTS, "insufficient_change"):
            raise ValueError(fault)
        self.fault = fault

    def insert(self, value: int) -> None:
        """A note pushed into the acceptor."""
        if value not in ACCEPTED:
            raise DeviceFault("cash", "note_rejected")
        self.notes.put_nowait(value)

    async def enable(self) -> None:
        if self.fault == "power_loss":
            raise DeviceFault("cash", "power_loss")
        self.enabled = True

    async def disable(self) -> None:
        self.enabled = False

    async def next_note(self) -> int:
        value = await self.notes.get()
        if not self.enabled:
            self.returned.append(value)
            raise DeviceFault("cash", "disabled")
        if self.fault in CASH_FAULTS:
            raise DeviceFault("cash", str(self.fault))
        if value not in self.stock and len(self.cassette) >= self.capacity:
            self.returned.append(value)
            raise DeviceFault("cash", "cassette_full")
        self.escrow = value
        return value

    async def stack(self) -> None:
        value, self.escrow = self.escrow, None
        if value is None:
            raise DeviceFault("cash", "no_escrow")
        if value in self.stock:
            self.stock[value] += 1  # recycled: available for change
        else:
            self.cassette.append(value)

    async def return_escrow(self) -> None:
        if self.escrow is not None:
            self.returned.append(self.escrow)
        self.escrow = None

    def _reachable(self, amount: int) -> dict[int, dict[int, int]]:
        """Every total up to `amount` the recycler can give, with the fewest notes."""
        best: dict[int, dict[int, int]] = {0: {}}
        for value in sorted(self.stock, reverse=True):
            for total, used in list(best.items()):
                for count in range(1, self.stock[value] + 1):
                    reached = total + value * count
                    if reached > amount:
                        break
                    candidate = {**used, value: count}
                    if reached not in best or sum(candidate.values()) < sum(best[reached].values()):
                        best[reached] = candidate
        return best

    def can_dispense(self, amount: int) -> bool:
        return self.fault != "insufficient_change" and amount in self._reachable(amount)

    def dispensable(self, amount: int) -> int:
        if self.fault == "insufficient_change":
            return 0
        return max(self._reachable(amount))

    async def dispense(self, amount: int) -> dict[int, int]:
        if self.fault in ("power_loss", "note_jam"):
            raise DeviceFault("cash", str(self.fault))
        plan = self._reachable(amount).get(amount) if self.fault != "insufficient_change" else None
        if plan is None:
            raise DeviceFault("cash", "insufficient_change")
        for value, count in plan.items():
            self.stock[value] -= count
        return plan

    def levels(self) -> dict[int, int]:
        return dict(self.stock)

    def cassette_space(self) -> int:
        return self.capacity - len(self.cassette)

    def cassette_amount(self) -> int:
        return sum(self.cassette)

    async def refill(self, notes: dict[int, int]) -> int:
        if any(value not in self.stock for value in notes):
            raise DeviceFault("cash", "not_recycled")
        for value, count in notes.items():
            self.stock[value] += count
        return sum(value * count for value, count in notes.items())

    async def empty_cassette(self) -> int:
        amount, self.cassette = sum(self.cassette), []
        return amount


class SimFiscalPrinter(FiscalPrinter):
    def __init__(self) -> None:
        self.receipts: list[tuple[list[ReceiptLine], dict[str, int]]] = []
        self.z_reports = 0
        self.fault: str | None = None

    def fail(self, fault: str | None) -> None:
        if fault is not None and fault not in PRINTER_FAULTS:
            raise ValueError(fault)
        self.fault = fault

    async def print_receipt(self, lines: list[ReceiptLine], paid: dict[str, int]) -> str:
        if self.fault is not None:
            raise DeviceFault("fiscal", self.fault)
        total = sum(line.quantity * line.unit_price for line in lines)
        if not lines or sum(paid.values()) < total:
            raise DeviceFault("fiscal", "receipt_invalid")
        self.receipts.append((lines, paid))
        return f"SIM-{len(self.receipts):06d}"

    async def z_report(self) -> str:
        if self.fault is not None:
            raise DeviceFault("fiscal", self.fault)
        self.z_reports += 1
        return f"SIM-Z-{self.z_reports:04d}"


class SimReceiptPrinter(ReceiptPrinter):
    def __init__(self) -> None:
        self.printed: list[list[str]] = []
        self.fault: str | None = None

    def fail(self, fault: str | None) -> None:
        if fault is not None and fault not in PRINTER_FAULTS:
            raise ValueError(fault)
        self.fault = fault

    async def print(self, lines: list[str]) -> None:
        if self.fault is not None:
            raise DeviceFault("receipt", self.fault)
        self.printed.append(list(lines))


class SimHealth(Health):
    def __init__(self, path: str = "/") -> None:
        self.path = path
        self.started = time.monotonic()
        self.temperature_c = 41.0

    async def status(self) -> dict[str, Any]:
        disk = shutil.disk_usage(self.path)
        return {
            "temperature_c": self.temperature_c,
            "disk_free_mb": disk.free // (1024 * 1024),
            "uptime_s": int(time.monotonic() - self.started),
        }


def simulated(health_path: str = "/") -> Devices:
    return Devices(
        scanner=SimScanner(),
        cash=SimCash(),
        fiscal=SimFiscalPrinter(),
        receipt=SimReceiptPrinter(),
        health=SimHealth(health_path),
    )
