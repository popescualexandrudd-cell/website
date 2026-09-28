"""§13.4: the simulators behave like the devices, faults included."""

from __future__ import annotations

from pathlib import Path

import pytest
from jungle_bridge.drivers.base import DeviceFault, ReceiptLine
from jungle_bridge.drivers.simulator import (
    LEU,
    SimCash,
    SimFiscalPrinter,
    SimHealth,
    SimReceiptPrinter,
    SimScanner,
)

pytestmark = pytest.mark.anyio


async def test_scanner_reads_what_is_fed() -> None:
    scanner = SimScanner()
    scanner.feed("CARD-1")
    assert await scanner.read() == "CARD-1"


async def test_cash_accepts_recycles_and_stacks() -> None:
    cash = SimCash({LEU: 0, 5 * LEU: 0}, capacity=1)
    cash.insert(5 * LEU)
    with pytest.raises(DeviceFault, match="disabled"):  # the acceptor is off
        await cash.next_note()
    await cash.enable()
    cash.insert(5 * LEU)
    assert await cash.next_note() == 5 * LEU
    assert cash.levels() == {LEU: 0, 5 * LEU: 1}  # kept for change
    cash.insert(100 * LEU)
    assert await cash.next_note() == 100 * LEU
    assert cash.cassette == 1
    cash.insert(100 * LEU)
    with pytest.raises(DeviceFault, match="cassette_full"):
        await cash.next_note()
    with pytest.raises(DeviceFault, match="note_rejected"):
        cash.insert(3 * LEU)
    await cash.disable()
    assert not cash.enabled


@pytest.mark.parametrize("fault", ["note_jam", "power_loss", "cassette_full"])
async def test_cash_faults(fault: str) -> None:
    cash = SimCash()
    await cash.enable()
    cash.fail(fault)
    cash.insert(10 * LEU)
    with pytest.raises(DeviceFault, match=fault):
        await cash.next_note()
    if fault == "power_loss":
        with pytest.raises(DeviceFault, match="power_loss"):
            await cash.enable()
    cash.fail(None)
    await cash.enable()


async def test_change_uses_the_fewest_notes_available() -> None:
    cash = SimCash({LEU: 3, 5 * LEU: 1, 10 * LEU: 2, 50 * LEU: 0})
    assert cash.can_dispense(23 * LEU)
    assert await cash.dispense(23 * LEU) == {10 * LEU: 2, LEU: 3}
    assert not cash.can_dispense(4 * LEU)  # only one 5 left
    with pytest.raises(DeviceFault, match="insufficient_change"):
        await cash.dispense(4 * LEU)
    assert await cash.dispense(5 * LEU) == {5 * LEU: 1}
    cash.fail("insufficient_change")
    assert not cash.can_dispense(0)
    with pytest.raises(DeviceFault, match="insufficient_change"):
        await cash.dispense(LEU)
    cash.fail("note_jam")
    with pytest.raises(DeviceFault, match="note_jam"):
        await cash.dispense(LEU)
    with pytest.raises(ValueError, match="nope"):
        cash.fail("nope")


async def test_printers() -> None:
    fiscal = SimFiscalPrinter()
    lines = [ReceiptLine("Cafea", 2, 1200, "A")]
    assert await fiscal.print_receipt(lines, {"cash": 2400}) == "SIM-000001"
    with pytest.raises(DeviceFault, match="receipt_invalid"):
        await fiscal.print_receipt(lines, {"cash": 2000})
    with pytest.raises(DeviceFault, match="receipt_invalid"):
        await fiscal.print_receipt([], {"cash": 0})
    assert await fiscal.z_report() == "SIM-Z-0001"
    fiscal.fail("paper_out")
    with pytest.raises(DeviceFault, match="paper_out"):
        await fiscal.print_receipt(lines, {"cash": 2400})
    with pytest.raises(DeviceFault, match="paper_out"):
        await fiscal.z_report()
    with pytest.raises(ValueError, match="jam"):
        fiscal.fail("jam")

    slips = SimReceiptPrinter()
    await slips.print(["Jungle Padel", "Mulțumim!"])
    assert slips.printed == [["Jungle Padel", "Mulțumim!"]]
    slips.fail("offline")
    with pytest.raises(DeviceFault, match="offline"):
        await slips.print(["x"])
    with pytest.raises(ValueError, match="jam"):
        slips.fail("jam")
    slips.fail(None)
    await slips.print(["y"])


async def test_health(tmp_path: Path) -> None:
    status = await SimHealth(str(tmp_path)).status()
    assert set(status) == {"temperature_c", "disk_free_mb", "uptime_s"}
    assert status["disk_free_mb"] >= 0
