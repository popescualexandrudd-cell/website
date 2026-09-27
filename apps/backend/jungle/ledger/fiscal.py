"""Fiscal receipts (R-066): an adapter per cash-register model (rule 5 of CLAUDE.md).

Every cash payment asks the configured register for a receipt. Until the model is chosen
(Q23) the simulator answers; its receipt numbers start with `SIM-` and are not fiscal
documents. VAT and fiscal categories are confirmed with the club's accountant (Q26).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Protocol

from django.conf import settings


@dataclass(frozen=True)
class ReceiptLine:
    text: str
    amount: int  # bani


class FiscalPrinter(Protocol):
    def print_receipt(self, lines: list[ReceiptLine], cash_tendered: int) -> str:
        """Prints the receipt and returns its number."""
        ...


class SimulatedFiscalPrinter:
    def print_receipt(self, lines: list[ReceiptLine], cash_tendered: int) -> str:
        if cash_tendered < sum(line.amount for line in lines):
            raise ValueError("cash tendered is less than the receipt total")
        return f"SIM-{uuid.uuid4().hex[:12].upper()}"


PRINTERS: dict[str, type[SimulatedFiscalPrinter]] = {"simulator": SimulatedFiscalPrinter}


def printer() -> FiscalPrinter:
    return PRINTERS[settings.FISCAL_PRINTER]()
