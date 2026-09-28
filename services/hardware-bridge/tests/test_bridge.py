"""The bridge's messages (ADR-0013): scans, health, slips, and cash only on the server's
signed commands, written to disk before anyone hears of a note."""

from __future__ import annotations

import asyncio
import json
from typing import Any

import pytest
from jungle_bridge import journal as j
from jungle_bridge.bridge import Bridge
from jungle_bridge.drivers.simulator import LEU, SimCash
from jungle_bridge.signing import parse_public_key

from tests.conftest import DEVICE_ID, Server

pytestmark = pytest.mark.anyio


class Page:
    """A kiosk page connected to the bridge."""

    def __init__(self, bridge: Bridge):
        self.bridge = bridge
        self.pushed: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        bridge.clients.add(self.send)

    async def send(self, text: str) -> None:
        await self.pushed.put(json.loads(text))

    async def next(self) -> dict[str, Any]:
        return await asyncio.wait_for(self.pushed.get(), 2)

    async def ask(self, op: str, **fields: Any) -> dict[str, Any]:
        return await self.bridge.handle(json.dumps({"id": 1, "op": op, **fields}))

    async def order(self, server: Server, op: str, **fields: Any) -> dict[str, Any]:
        """A command signed by the club server, passed on by the page."""
        return await self.ask(op, command=server.command(op, **fields))


async def test_hello_and_health(bridge: Bridge) -> None:
    page = Page(bridge)
    hello = await page.ask("hello")
    assert hello == {
        "id": 1,
        "ok": True,
        "device": DEVICE_ID,
        "public_key": bridge.signer.public_key,
        "device_token": f"{DEVICE_ID}.secret",
        "api_url": "https://club.example/api/v1",
        "simulator": True,
    }
    parse_public_key(hello["public_key"])
    health = await page.ask("health")
    assert health["ok"] and health["open_transactions"] == [] and health["pending_sync"] == 0
    assert health["cash_levels"][str(LEU)] == 20


async def test_malformed_and_unknown_messages(bridge: Bridge) -> None:
    assert await bridge.handle("nu e json") == {"ok": False, "error": "bad_json"}
    assert await bridge.handle(b"\xff") == {"ok": False, "error": "bad_json"}
    assert await bridge.handle("[1]") == {"ok": False, "error": "bad_json"}
    reply = await bridge.handle('{"op": "format.disk"}')
    assert reply == {"id": None, "ok": False, "error": "unknown_op"}


async def test_a_scanned_card_is_pushed_signed(bridge: Bridge) -> None:
    page = Page(bridge)
    loop = asyncio.create_task(bridge.scanner_loop())
    assert (await page.ask("sim.scan", code="CARD-1"))["ok"]
    pushed = await page.next()
    assert pushed["event"] == "scan"
    payload = pushed["signed"]["payload"]
    assert (payload["code"], payload["type"], payload["device"]) == ("CARD-1", "scan", DEVICE_ID)
    loop.cancel()
    for code in ("", 5, "x" * 201):
        assert (await page.ask("sim.scan", code=code))["error"] == "invalid"


async def test_a_closed_page_does_not_stop_the_others(bridge: Bridge) -> None:
    page = Page(bridge)

    async def gone(_: str) -> None:
        raise ConnectionError

    bridge.clients.add(gone)
    await bridge.broadcast({"event": "x"})
    assert await page.next() == {"event": "x"}
    assert gone not in bridge.clients


async def test_simulator_control_is_off_in_production(make_bridge: Any) -> None:
    bridge = make_bridge(BRIDGE_SIMULATOR_CONTROL="0")
    page = Page(bridge)
    for op in ("sim.scan", "sim.insert", "sim.fault"):
        assert (await page.ask(op, code="x"))["error"] == "not_simulator"


async def test_simulator_control_needs_simulated_devices(bridge: Bridge) -> None:
    page = Page(bridge)
    real: Any = object()
    bridge.devices.scanner = real
    bridge.devices.cash = real
    bridge.devices.receipt = real
    assert (await page.ask("sim.scan", code="x"))["error"] == "not_simulator"
    assert (await page.ask("sim.insert", amount=LEU))["error"] == "not_simulator"
    assert (await page.ask("sim.fault", device="receipt", fault=None))["error"] == "not_simulator"


async def test_slips_and_faults(bridge: Bridge) -> None:
    page = Page(bridge)
    assert (await page.ask("receipt.print", lines=["Jungle Padel"]))["ok"]
    for lines in (None, [], ["x" * 65], [1], ["a"] * 61):
        assert (await page.ask("receipt.print", lines=lines))["error"] == "invalid"
    assert (await page.ask("sim.fault", device="receipt", fault="paper_out"))["ok"]
    reply = await page.ask("receipt.print", lines=["x"])
    assert (reply["error"], reply["device"]) == ("paper_out", "receipt")
    assert (await page.ask("sim.fault", device="receipt", fault="jam"))["error"] == "invalid"
    assert (await page.ask("sim.fault", device="receipt", fault=3))["error"] == "invalid"
    assert (await page.ask("sim.fault", device="fiscal", fault=None))["ok"]
    assert (await page.ask("sim.fault", device="cash", fault=None))["ok"]
    assert (await page.ask("sim.fault", device="disk", fault=None))["error"] == "not_simulator"


async def test_change_is_checked_before_a_payment(bridge: Bridge) -> None:
    page = Page(bridge)
    assert (await page.ask("cash.check", amount=0))["can_give_change"] is True
    assert (await page.ask("cash.check", amount=37 * LEU))["can_give_change"] is True
    assert (await page.ask("cash.check", amount=10_000 * LEU))["can_give_change"] is False
    for amount in (-1, "5", True, 20_000 * LEU):
        assert (await page.ask("cash.check", amount=amount))["error"] == "invalid"


async def test_a_cash_payment_on_signed_commands(bridge: Bridge, server: Server) -> None:
    page = Page(bridge)
    txn = "txn-0001"
    started = await page.order(server, "cash.accept", txn=txn, amount=12 * LEU)
    assert started == {"id": 1, "ok": True, "txn": txn}
    busy = await page.order(server, "cash.accept", txn="txn-0002", amount=LEU)
    assert busy["error"] == "busy"
    for value in (10 * LEU, 5 * LEU):
        assert (await page.ask("sim.insert", amount=value))["ok"]
    first, second, complete = await page.next(), await page.next(), await page.next()
    assert first["event"] == second["event"] == "cash.accepted"
    assert (first["total"], second["total"], second["due"]) == (10 * LEU, 15 * LEU, 12 * LEU)
    assert first["signed"]["payload"]["type"] == j.ACCEPTED
    assert complete == {"event": "cash.complete", "txn": txn, "total": 15 * LEU}
    assert bridge.journal.total(txn, j.ACCEPTED) == 15 * LEU  # on disk

    change = await page.order(server, "cash.dispense", txn=txn, amount=3 * LEU)
    assert change["ok"] and change["signed"]["payload"]["notes"] == {str(LEU): 3}
    closed = await page.order(server, "cash.close", txn=txn)
    assert closed["signed"]["payload"]["amount"] == 15 * LEU
    assert closed["signed"]["payload"]["dispensed"] == 3 * LEU
    again = await page.order(server, "cash.dispense", txn=txn, amount=LEU)
    assert again["error"] == "txn_unknown"  # closed: nothing more is paid out
    reused = await page.order(server, "cash.accept", txn=txn, amount=LEU)
    assert reused["error"] == "txn_used"
    health = await page.ask("health")
    assert health["pending_sync"] == 5 and health["open_transactions"] == []


async def test_a_page_cannot_pay_itself(bridge: Bridge, server: Server) -> None:
    page = Page(bridge)
    unsigned = await page.ask("cash.dispense", command={"payload": {"txn": "x", "amount": 1}})
    assert unsigned["error"] == "signature" and unsigned["reason"] == "malformed"
    replayed = server.command("cash.accept", txn="txn-0009", amount=LEU)
    assert (await page.ask("cash.accept", command=replayed))["ok"]
    assert (await page.ask("cash.accept", command=replayed))["reason"] == "replay"
    bad = await page.order(server, "cash.accept", txn="x", amount=LEU)
    assert bad["error"] == "invalid"
    unknown = await page.order(server, "cash.stop", txn="txn-none-1")
    assert unknown["error"] == "txn_unknown"


async def test_without_the_servers_key_no_cash_command_runs(
    make_bridge: Any, server: Server
) -> None:
    bridge = make_bridge(BRIDGE_SERVER_PUBLIC_KEY="")
    reply = await Page(bridge).order(server, "cash.accept", txn="txn-0001", amount=LEU)
    assert reply["reason"] == "no_server_key"


async def test_stopping_and_a_jammed_note(bridge: Bridge, server: Server) -> None:
    page = Page(bridge)
    cash = bridge.devices.cash
    assert isinstance(cash, SimCash)
    await page.order(server, "cash.accept", txn="txn-0001", amount=50 * LEU)
    await page.ask("sim.insert", amount=10 * LEU)
    assert (await page.next())["total"] == 10 * LEU
    stopped = await page.order(server, "cash.stop", txn="txn-0001")
    assert stopped["total"] == 10 * LEU and not cash.enabled and bridge.collecting is None
    await page.order(server, "cash.close", txn="txn-0001")

    await page.order(server, "cash.accept", txn="txn-0002", amount=50 * LEU)
    await page.ask("sim.fault", device="cash", fault="note_jam")
    await page.ask("sim.insert", amount=10 * LEU)
    assert await page.next() == {"event": "fault", "device": "cash", "code": "note_jam"}

    cash.fail("insufficient_change")  # no change at all: reported as 0, signed
    await pay(page, server, "txn-nochange", LEU, [5 * LEU])
    await page.next(), await page.next()
    none = await page.order(
        server, "cash.dispense", txn="txn-nochange", amount=4 * LEU, allow_partial=True
    )
    assert none["given"] == 0 and none["signed"]["payload"]["fault"] == ""
    assert not cash.enabled and bridge.journal.is_open("txn-0002")  # the server decides
    assert (await page.ask("sim.insert", amount=3 * LEU))["error"] == "note_rejected"

    cash.fail("power_loss")
    reply = await page.order(server, "cash.accept", txn="txn-0003", amount=LEU)
    assert (reply["error"], reply["device"]) == ("power_loss", "cash")
    assert bridge.journal.events("txn-0003") == []  # nothing started


async def test_after_a_power_cut_the_bridge_reconciles(make_bridge: Any, server: Server) -> None:
    before = make_bridge()
    page = Page(before)
    await page.order(server, "cash.accept", txn="txn-0001", amount=50 * LEU)
    await page.ask("sim.insert", amount=10 * LEU)
    await page.next()
    assert before.collecting is not None
    before.collecting.cancel()
    before.journal.close()  # the power goes; the note is on disk

    after = make_bridge()
    (event,) = after.recovered
    assert (event.txn, event.kind, event.amount) == ("txn-0001", j.INTERRUPTED, 10 * LEU)
    assert after.journal.open_transactions() == []


# ---------------------------------------------------------------- Stage 8: the Payments Kiosk
LINES = [{"name": "Teren 1, 90 min", "quantity": 1, "unit_price": 12 * LEU, "vat_group": "A"}]


async def pay(
    page: Page, server: Server, txn: str, due: int, notes: list[int], **extra: Any
) -> None:
    started = await page.order(server, "cash.accept", txn=txn, amount=due, **extra)
    assert started["ok"], started
    for value in notes:
        await page.ask("sim.insert", amount=value)


async def test_exact_only_gives_back_notes_that_need_change(bridge: Bridge, server: Server) -> None:
    page = Page(bridge)
    await pay(
        page,
        server,
        "txn-exact",
        12 * LEU,
        [50 * LEU, 10 * LEU, 5 * LEU, LEU, LEU],
        exact_only=True,
    )
    events = [await page.next() for _ in range(5)]
    assert events[0] == {"event": "cash.returned", "amount": 50 * LEU}
    assert events[2] == {"event": "cash.returned", "amount": 5 * LEU}
    assert [e["total"] for e in events if e["event"] == "cash.accepted"] == [
        10 * LEU,
        11 * LEU,
        12 * LEU,
    ]
    assert (await page.next())["event"] == "cash.complete"


async def test_partial_change_is_reported_signed(bridge: Bridge, server: Server) -> None:
    page = Page(bridge)
    cash = bridge.devices.cash
    assert isinstance(cash, SimCash)
    cash.stock = {LEU: 2, 5 * LEU: 0, 10 * LEU: 0, 50 * LEU: 0}
    await pay(page, server, "txn-change", 12 * LEU, [50 * LEU])
    await page.next(), await page.next()
    change = await page.order(
        server, "cash.dispense", txn="txn-change", amount=38 * LEU, allow_partial=True
    )
    assert change["given"] == 2 * LEU
    payload = change["signed"]["payload"]
    assert (payload["amount"], payload["asked"], payload["fault"]) == (2 * LEU, 38 * LEU, "")
    again = await page.order(
        server, "cash.dispense", txn="txn-change", amount=LEU, allow_partial=True
    )
    assert again["error"] == "already_dispensed"

    await pay(page, server, "txn-jammed", LEU, [LEU])
    await page.next(), await page.next()
    cash.stock[LEU] = 5
    cash.fail("note_jam")
    jammed = await page.order(
        server, "cash.dispense", txn="txn-jammed", amount=LEU, allow_partial=True
    )
    assert jammed["given"] == 0 and jammed["signed"]["payload"]["fault"] == "note_jam"
    assert await page.next() == {"event": "fault", "device": "cash", "code": "note_jam"}


async def test_change_quote_before_paying(bridge: Bridge) -> None:
    page = Page(bridge)
    full = await page.ask("cash.quote", amount=12 * LEU)
    assert full["change_guaranteed"] is True and full["exact_possible"] is True
    bani = await page.ask("cash.quote", amount=1234)
    assert bani["change_guaranteed"] is False and bani["exact_possible"] is False
    cash = bridge.devices.cash
    assert isinstance(cash, SimCash)
    cash.stock = {LEU: 1, 5 * LEU: 0, 10 * LEU: 0, 50 * LEU: 0}
    assert (await page.ask("cash.quote", amount=12 * LEU))["change_guaranteed"] is False
    health = await page.ask("health")
    assert "low_change" in health["alerts"]
    cash.cassette = [100 * LEU] * (cash.capacity - 1)
    assert "cassette_full" in (await page.ask("health"))["alerts"]


async def test_staff_operations(bridge: Bridge, server: Server) -> None:
    page = Page(bridge)
    cash = bridge.devices.cash
    assert isinstance(cash, SimCash)
    refill = await page.order(server, "cash.refill", txn="op-refill-1", notes={str(LEU): 10})
    assert refill["signed"]["payload"]["amount"] == 10 * LEU and cash.levels()[LEU] == 30
    used = await page.order(server, "cash.refill", txn="op-refill-1", notes={str(LEU): 1})
    assert used["error"] == "txn_used"
    for notes in (None, {}, {"x": 1}, {str(LEU): 0}, {str(LEU): True}):
        bad = await page.order(server, "cash.refill", txn=f"op-bad-{id(notes)}", notes=notes)
        assert bad["error"] == "invalid"
    wrong = await page.order(server, "cash.refill", txn="op-refill-2", notes={str(200 * LEU): 1})
    assert wrong["error"] == "not_recycled"
    cash.cassette = [100 * LEU, 200 * LEU]
    emptied = await page.order(server, "cash.empty", txn="op-empty-1")
    assert emptied["signed"]["payload"]["amount"] == 300 * LEU and cash.cassette == []
    counted = await page.order(server, "cash.count", txn="op-count-1")
    payload = counted["signed"]["payload"]
    assert payload["amount"] == sum(v * n for v, n in cash.levels().items())
    assert payload["cassette"] == 0 and payload["recycler"][str(LEU)] == 30
    z = await page.order(server, "fiscal.z", txn="op-zreport-1")
    assert z["number"] == "SIM-Z-0001" and z["signed"]["payload"]["type"] == "fiscal.z"


async def test_fiscal_receipt_once_per_transaction(bridge: Bridge, server: Server) -> None:
    page = Page(bridge)
    unknown = await page.order(
        server, "fiscal.print", txn="txn-none-9", lines=LINES, paid={"cash": 1200}
    )
    assert unknown["error"] == "txn_unknown"
    await pay(page, server, "txn-receipt", 12 * LEU, [10 * LEU, LEU, LEU])
    for _ in range(4):
        await page.next()
    for lines in (
        None,
        [],
        [{"name": "x"}],
        [{**LINES[0], "vat_group": "Z"}],
        [LINES[0]] * 61,
        ["x"],
    ):
        bad = await page.order(
            server, "fiscal.print", txn="txn-receipt", lines=lines, paid={"cash": 1200}
        )
        assert bad["error"] == "invalid"
    for paid in (None, {"cash": -1}, {"cash": True}):
        bad = await page.order(server, "fiscal.print", txn="txn-receipt", lines=LINES, paid=paid)
        assert bad["error"] == "invalid"
    await page.ask("sim.fault", device="fiscal", fault="paper_out")
    jam = await page.order(
        server, "fiscal.print", txn="txn-receipt", lines=LINES, paid={"cash": 1200}
    )
    assert jam["error"] == "paper_out"
    await page.ask("sim.fault", device="fiscal", fault=None)
    printed = await page.order(
        server, "fiscal.print", txn="txn-receipt", lines=LINES, paid={"cash": 1200}
    )
    assert printed["receipt"] == "SIM-000001"
    assert printed["signed"]["payload"]["receipt"] == "SIM-000001"
    again = await page.order(
        server, "fiscal.print", txn="txn-receipt", lines=LINES, paid={"cash": 1200}
    )
    assert again["error"] == "already_printed"


async def test_journal_sync_with_the_servers_acknowledgement(
    bridge: Bridge, server: Server
) -> None:
    page = Page(bridge)
    await page.order(server, "cash.refill", txn="op-refill-9", notes={str(LEU): 1})
    pending = (await page.ask("journal.pending"))["events"]
    assert len(pending) == 1
    ids = [pending[0]["payload"]["event"]]
    assert (await page.order(server, "journal.ack", ids=ids))["pending"] == 0
    assert (await page.order(server, "journal.ack", ids="x"))["error"] == "invalid"
    unsigned = await page.ask("journal.ack", command={"payload": {"ids": ids}})
    assert unsigned["error"] == "signature"
