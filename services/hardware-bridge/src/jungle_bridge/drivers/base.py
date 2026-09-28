"""The device interfaces (§8.4). A real driver is written for each model once it is bought
(Q23); until then the simulators in `simulator.py` stand in for all of them, faults included.

Money is always an integer number of bani (RON × 100), never a float (ADR-0009).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


class DeviceFault(Exception):
    """A device problem the kiosk shows and the staff fixes (stable code, translated in the UI):
    note_jam, insufficient_change, cassette_full, power_loss, paper_out, offline."""

    def __init__(self, device: str, code: str):
        super().__init__(f"{device}: {code}")
        self.device = device
        self.code = code


class Scanner(ABC):
    """The QR reader (USB keyboard, HID or serial)."""

    @abstractmethod
    async def read(self) -> str:
        """Waits for the next code read."""


class CashDevice(ABC):
    """Banknote acceptor and recycler that gives change (SSP, ccTalk, MDB: checked on the
    model bought, never assumed)."""

    @abstractmethod
    async def enable(self) -> None:
        """Starts accepting notes."""

    @abstractmethod
    async def disable(self) -> None:
        """Stops accepting notes (a note being read is finished first)."""

    @abstractmethod
    async def next_note(self) -> int:
        """Waits for the next note accepted and stacked; returns its value in bani."""

    @abstractmethod
    def can_dispense(self, amount: int) -> bool:
        """Whether the recycler holds exactly this change (asked before a payment starts)."""

    @abstractmethod
    async def dispense(self, amount: int) -> dict[int, int]:
        """Pays out `amount`; returns the notes given, {value: count}."""

    @abstractmethod
    def levels(self) -> dict[int, int]:
        """The notes available for change, {value: count}."""


@dataclass(frozen=True)
class ReceiptLine:
    name: str
    quantity: int
    unit_price: int  # bani
    vat_group: str  # the fiscal printer's VAT group (confirmed with the accountant)


class FiscalPrinter(ABC):
    """The fiscal cash register (the manufacturer's driver)."""

    @abstractmethod
    async def print_receipt(self, lines: list[ReceiptLine], paid: dict[str, int]) -> str:
        """Prints a fiscal receipt; returns its number. `paid`: {method: bani}."""

    @abstractmethod
    async def z_report(self) -> str:
        """The daily closing report; returns its number."""


class ReceiptPrinter(ABC):
    """Non-fiscal slips (ESC/POS)."""

    @abstractmethod
    async def print(self, lines: list[str]) -> None:
        """Prints the lines and cuts the paper."""


class Health(ABC):
    """The machine's state: temperature, free space, uptime."""

    @abstractmethod
    async def status(self) -> dict[str, Any]:
        """A JSON-safe snapshot."""


@dataclass
class Devices:
    scanner: Scanner
    cash: CashDevice
    fiscal: FiscalPrinter
    receipt: ReceiptPrinter
    health: Health
