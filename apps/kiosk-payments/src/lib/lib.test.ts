import { ApiError, Offline, type Reply, type Signed } from "@jungle/kiosk-kit";
import en from "@jungle/i18n/messages/en.json";
import ro from "@jungle/i18n/messages/ro.json";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { dayFrom } from "../screens/Freeze";
import { startDays } from "../screens/Subscription";
import type { Payable, PaymentsApi, Product } from "./api";
import { paymentsApi } from "./api";
import {
  addPayable,
  cafeTotal,
  changeCafe,
  EMPTY,
  hasIndicativePrices,
  isEmpty,
  MAX_ENTRIES,
  quantityOf,
  remove,
  toItems,
  total,
} from "./basket";
import { errorText, t } from "./i18n";
import { CashPayment, holds, moneyInMachine, type PaymentView, payWithCredit } from "./payment";

const payable = (id: string, toPay = 24000): Payable => ({
  kind: "booking",
  subject_id: id,
  description: `Teren 1, ${id}`,
  price: 24000,
  to_pay: toPay,
  debt: false,
  starts_at: null,
  organizer: "",
});
const espresso: Product = { id: "p-1", name_ro: "Espresso", name_en: "Espresso", price: 1200, marker: "to_set" };
const water: Product = { id: "p-2", name_ro: "Apă", name_en: "Water", price: 800, marker: "confirmed" };

describe("the basket (§8.3, amounts in bani)", () => {
  it("R-060: a booking, all of it or a share; café products in one order", () => {
    let basket = addPayable(EMPTY, payable("b1"), 6000);
    basket = addPayable(basket, payable("b1"), 99999); // the same booking again: replaced, capped
    expect(basket.entries).toHaveLength(1);
    expect(basket.entries[0]?.amount).toBe(24000);
    basket = addPayable(basket, payable("b2", 8000), 0);
    expect(basket.entries[1]?.amount).toBe(1); // never zero: the server refuses it
    basket = changeCafe(changeCafe(changeCafe(basket, espresso, 2), water, 1), espresso, -1);
    expect(quantityOf(basket, "p-1")).toBe(1);
    expect(cafeTotal(basket)).toBe(2000);
    expect(total(basket)).toBe(24000 + 1 + 2000);
    expect(basket.cafe.map((l) => l.product.name_ro)).toEqual(["Apă", "Espresso"]);
    expect(hasIndicativePrices(basket)).toBe(true);
    expect(toItems(basket)).toEqual([
      { kind: "booking", subject_id: "b1", amount: 24000, cafe_lines: [] },
      { kind: "booking", subject_id: "b2", amount: 1, cafe_lines: [] },
      {
        kind: "cafe",
        subject_id: null,
        amount: null,
        cafe_lines: [
          { product_id: "p-2", quantity: 1 },
          { product_id: "p-1", quantity: 1 },
        ],
      },
    ]);
    basket = changeCafe(basket, water, 50);
    expect(quantityOf(basket, "p-2")).toBe(20);
    basket = remove(remove(basket, "cafe"), "booking:b1");
    expect(basket.cafe).toEqual([]);
    expect(basket.entries.map((e) => e.key)).toEqual(["booking:b2"]);
    expect(isEmpty(remove(basket, "booking:b2"))).toBe(true);
    expect(toItems(EMPTY)).toEqual([]);
    expect(hasIndicativePrices(changeCafe(EMPTY, water, 1))).toBe(false);
  });

  it("holds at most what the server takes in one payment", () => {
    let basket = EMPTY;
    for (let i = 0; i < MAX_ENTRIES + 3; i++) basket = addPayable(basket, payable(`b${i}`));
    expect(basket.entries).toHaveLength(MAX_ENTRIES);
  });
});

// ---------------------------------------------------------------- the cash payment
const command = (type: string, extra: Record<string, unknown> = {}): Signed => ({
  payload: { type, txn: "c-1", ...extra },
  signature: "server",
});
const bridgeEvent = (type: string, id: string, amount = 0): Signed => ({
  payload: { type, txn: "c-1", event: id, amount },
  signature: "bridge",
});
const checkout = (changes: Record<string, unknown> = {}) => ({
  id: "c-1",
  status: "open",
  change_mode: "normal",
  amount_due: 24000,
  inserted: 0,
  dispensed: 0,
  credited: 0,
  fiscal_receipt: "",
  items: [],
  ...changes,
});

function fakes(overrides: Record<string, unknown> = {}, bridgeReplies: Record<string, Reply> = {}) {
  const api = {
    create: vi.fn(async () => checkout()),
    start: vi.fn(async () => ({ checkout: checkout({ status: "collecting" }), command: command("cash.accept") })),
    events: vi.fn(async (list: Signed[]) => ({
      recorded: list.map((e) => String(e.payload.event)),
      ack: list.length ? command("journal.ack") : null,
    })),
    finish: vi.fn(async () => ({ dispense: command("cash.dispense", { amount: 1000 }), settled: null })),
    settle: vi.fn(async () => ({
      checkout: checkout({ status: "settled", inserted: 25000, dispensed: 1000 }),
      orders: [7],
      receipt: command("fiscal.print"),
      close: command("cash.close"),
    })),
    cancel: vi.fn(async () => ({ stop: command("cash.stop"), refund: command("cash.dispense"), close: null })),
    refunded: vi.fn(async () => ({ credited: 500, close: command("cash.close") })),
    alert: vi.fn(async () => ({ ok: true })),
    ...overrides,
  } as unknown as PaymentsApi;
  const orders: string[] = [];
  const bridge = {
    order: vi.fn(async (c: Signed): Promise<Reply> => {
      const type = String(c.payload.type);
      orders.push(type);
      if (bridgeReplies[type]) return bridgeReplies[type];
      if (type === "cash.dispense") return { ok: true, signed: bridgeEvent("cash.dispensed", "d-1", 1000) };
      if (type === "fiscal.print") return { ok: true, signed: bridgeEvent("fiscal.printed", "f-1") };
      if (type === "cash.close") return { ok: true, signed: bridgeEvent("cash.closed", "x-1") };
      return { ok: true };
    }),
    request: vi.fn(async (op: string): Promise<Reply> => {
      if (bridgeReplies[op]) return bridgeReplies[op];
      if (op === "cash.quote") return { ok: true, change_guaranteed: true, exact_possible: true };
      return { ok: true };
    }),
  };
  const views: PaymentView[] = [];
  const payment = new CashPayment(api, bridge, { session: "s-1" }, (v) => views.push(v), async () => undefined);
  return { api, bridge, orders, views, payment };
}

const accepted = (id: string, amount: number, total: number) => ({
  event: "cash.accepted",
  signed: bridgeEvent("cash.accepted", id, amount),
  total,
  due: 24000,
});

describe("a cash payment (§8.3, ADR-0013)", () => {
  it("quote → notes (each sent at once, acknowledged) → change → fiscal receipt → close", async () => {
    const { api, orders, payment } = fakes();
    await payment.prepare([{ kind: "booking", subject_id: "b1", amount: null, cafe_lines: [] }]);
    expect(payment.state.step).toBe("quote");
    expect(payment.state.quote).toEqual({ guaranteed: true, exactPossible: true });
    await payment.start("normal");
    expect(payment.state.step).toBe("collecting");
    expect(holds(payment.state)).toBe(true);
    await payment.onEvent(accepted("a-1", 20000, 20000));
    await payment.onEvent({ event: "cash.accepted", signed: { payload: { txn: "another" }, signature: "x" } });
    await payment.onEvent(accepted("a-2", 5000, 25000));
    expect(payment.state.inserted).toBe(25000);
    await payment.onEvent({ event: "cash.complete", txn: "other", total: 1 }); // not this payment
    expect(payment.state.step).toBe("collecting");
    await payment.onEvent({ event: "cash.complete", txn: "c-1", total: 25000 });
    const state = payment.state;
    expect(state.step).toBe("done");
    expect([state.dispensed, state.credited, state.orders, state.receiptFailed]).toEqual([1000, 0, [7], false]);
    expect(holds(state)).toBe(false);
    expect(orders).toEqual([
      "cash.accept",
      "journal.ack",
      "journal.ack",
      "cash.dispense",
      "fiscal.print",
      "cash.close",
      "journal.ack",
    ]);
    const finish = vi.mocked(api.finish).mock.calls[0]!;
    expect(finish[1].map((e: Signed) => e.payload.event)).toEqual(["a-1", "a-2"]);
    const lastEvents = vi.mocked(api.events).mock.calls.at(-1)![0];
    expect(lastEvents.map((e: Signed) => e.payload.event)).toEqual(["f-1", "x-1"]);
  });

  it("no change in the machine: exact amount only, or change as credit with consent; a returned note", async () => {
    const { payment, api } = fakes(
      {
        finish: vi.fn(async () => ({
          dispense: null,
          settled: {
            checkout: checkout({ status: "settled", credited: 0 }),
            orders: [],
            receipt: null,
            close: command("cash.close"),
          },
        })),
      },
      { "cash.quote": { ok: true, change_guaranteed: false, exact_possible: true } },
    );
    await payment.prepare([]);
    expect(payment.state.quote).toEqual({ guaranteed: false, exactPossible: true });
    await payment.start("exact");
    expect(vi.mocked(api.start).mock.calls[0]![2]).toBe("exact");
    await payment.onEvent({ event: "cash.returned", amount: 20000 });
    expect(payment.state.returned).toBe(20000);
    await payment.onEvent(accepted("a-1", 5000, 24000));
    expect(payment.state.returned).toBe(0);
    await payment.onEvent({ event: "cash.complete", txn: "c-1" });
    expect(payment.state.step).toBe("done");
    await payment.start("normal"); // too late: nothing happens
    expect(api.start).toHaveBeenCalledTimes(1);
  });

  it("cancelling: the money goes back, what the machine keeps becomes credit", async () => {
    const { payment, orders } = fakes();
    await payment.prepare([]);
    await payment.start("normal");
    await payment.onEvent(accepted("a-1", 10000, 10000));
    await payment.cancel();
    expect(payment.state.step).toBe("cancelled");
    expect(payment.state.credited).toBe(500);
    expect(orders.slice(-4)).toEqual(["cash.stop", "cash.dispense", "cash.close", "journal.ack"]);
    await payment.cancel(); // already cancelled: nothing happens
    expect(payment.state.step).toBe("cancelled");
  });

  it("cancelling before any money, or with no money in: just stop and close", async () => {
    const quote = fakes({ cancel: vi.fn(async () => ({ stop: null, refund: null, close: null })) });
    await quote.payment.prepare([]);
    await quote.payment.cancel();
    expect(quote.payment.state.step).toBe("cancelled");
    expect(quote.orders).toEqual([]);
    const empty = fakes({ cancel: vi.fn(async () => ({ stop: command("cash.stop"), refund: null, close: command("cash.close") })) });
    await empty.payment.prepare([]);
    await empty.payment.start("normal");
    await empty.payment.cancel();
    expect(empty.orders.slice(-3)).toEqual(["cash.stop", "cash.close", "journal.ack"]);
  });

  it("a jam is reported to the staff; a refused refund leaves the money on screen", async () => {
    const { payment, api } = fakes({}, { "cash.dispense": { ok: false, error: "signature" } });
    await payment.prepare([]);
    await payment.start("normal");
    await payment.onEvent(accepted("a-1", 5000, 5000));
    await payment.onEvent({ event: "fault", device: "cash", code: "note_jam" });
    expect(payment.state.fault).toBe("note_jam");
    expect(api.alert).toHaveBeenCalledWith("note_jam");
    await payment.cancel();
    expect(payment.state.step).toBe("failed");
    expect(payment.state.error?.code).toBe("bridge.signature");
    expect(moneyInMachine(payment.state)).toBe(true);
    expect(holds(payment.state)).toBe(true);
  });

  it("without a connection it keeps trying; a note the page missed comes from the journal", async () => {
    let calls = 0;
    const finish = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Offline("network");
      if (calls === 2) throw new ApiError("checkout.not_enough", {}, 409);
      return {
        dispense: null,
        settled: { checkout: checkout({ status: "settled" }), orders: [], receipt: null, close: command("cash.close") },
      };
    });
    const { payment, api, views } = fakes(
      { finish },
      { "journal.pending": { ok: true, events: [bridgeEvent("cash.accepted", "missed", 4000)] } },
    );
    await payment.prepare([]);
    await payment.start("normal");
    await payment.onEvent(accepted("a-1", 20000, 20000));
    await payment.onEvent({ event: "cash.complete", txn: "c-1" });
    expect(views.some((v) => v.reconnecting)).toBe(true);
    expect(payment.state.reconnecting).toBe(false);
    expect(payment.state.step).toBe("done");
    const synced = vi.mocked(api.events).mock.calls.map((c) => c[0].map((e: Signed) => e.payload.event));
    expect(synced).toContainEqual(["missed"]);
  });

  it("a receipt printer out of paper: the payment stands, the staff is told", async () => {
    const { payment, api } = fakes({}, { "fiscal.print": { ok: false, error: "paper_out" } });
    await payment.prepare([]);
    await payment.start("normal");
    await payment.onEvent(accepted("a-1", 25000, 25000));
    await payment.onEvent({ event: "cash.complete", txn: "c-1" });
    expect(payment.state.step).toBe("done");
    expect(payment.state.receiptFailed).toBe(true);
    expect(api.alert).toHaveBeenCalledWith("paper_out");
    const offline = fakes({}, { "fiscal.print": { ok: false, error: "offline" } });
    await offline.payment.prepare([]);
    await offline.payment.start("normal");
    await offline.payment.onEvent(accepted("a-1", 25000, 25000));
    await offline.payment.onEvent({ event: "cash.complete", txn: "c-1" });
    expect(offline.api.alert).toHaveBeenCalledWith("offline");
  });

  it("refusals end the payment with their code", async () => {
    const refused = fakes({ create: vi.fn(async () => Promise.reject(new ApiError("checkout.busy", {}, 409))) });
    await refused.payment.prepare([]);
    expect(refused.payment.state.error).toEqual({ code: "checkout.busy", params: {} });
    const noQuote = fakes({}, { "cash.quote": { ok: false, error: "disconnected" } });
    await noQuote.payment.prepare([]);
    expect(noQuote.payment.state.error?.code).toBe("bridge.disconnected");
    const noStart = fakes({}, { "cash.accept": { ok: false, error: "busy" } });
    await noStart.payment.prepare([]);
    await noStart.payment.start("normal");
    expect(noStart.payment.state.error?.code).toBe("bridge.busy");
    expect(noStart.api.cancel).toHaveBeenCalledWith("c-1", []);
    const down = fakes({ create: vi.fn(async () => Promise.reject(new Offline("x"))) });
    await down.payment.prepare([]);
    expect(down.payment.state.error?.code).toBe("offline");
    const odd = fakes({ create: vi.fn(async () => Promise.reject(new Error("?"))) });
    await odd.payment.prepare([]);
    expect(odd.payment.state.error?.code).toBe("unknown");
    await odd.payment.start("normal"); // no checkout: nothing happens
    await odd.payment.cancel();
    expect(odd.api.start).not.toHaveBeenCalled();
  });

  it("gives up after two minutes offline; the bridge's journal settles it later", async () => {
    const { payment } = fakes({ finish: vi.fn(async () => Promise.reject(new Offline("x"))) });
    await payment.prepare([]);
    await payment.start("normal");
    await payment.onEvent(accepted("a-1", 25000, 25000));
    await payment.onEvent({ event: "cash.complete", txn: "c-1" });
    expect(payment.state.error?.code).toBe("offline");
    expect(moneyInMachine(payment.state)).toBe(true);
  });
});

describe("the credit in the account pays (§8.3 flow 6, R-067)", () => {
  it("item by item, each with its own key; café orders are returned", async () => {
    const payBalance = vi.fn(async (_card: unknown, item: { kind: string }, _key: string) => ({
      amount: 100,
      order: item.kind === "cafe" ? 12 : null,
    }));
    const orders = await payWithCredit(
      { payBalance } as unknown as PaymentsApi,
      { session: "s" },
      [
        { kind: "booking", subject_id: "b", amount: 100, cafe_lines: [] },
        { kind: "cafe", subject_id: null, amount: null, cafe_lines: [] },
      ],
      (i) => `key-${i}`,
    );
    expect(orders).toEqual([12]);
    expect(payBalance.mock.calls.map((c) => c[2])).toEqual(["key-0", "key-1"]);
  });
});

describe("days in club time (ADR-0010)", () => {
  it("a subscription starts today or on the 1st of next month", () => {
    expect(startDays(new Date("2027-03-31T22:30:00Z"))).toEqual(["2027-04-01", "2027-05-01"]);
    expect(startDays(new Date("2027-12-15T10:00:00Z"))).toEqual(["2027-12-15", "2028-01-01"]);
  });

  it("a freeze starts some days from today", () => {
    expect(dayFrom(new Date("2027-03-27T23:30:00Z"), 1)).toBe("2027-03-29"); // already the 28th in Bucharest
    expect(dayFrom(new Date("2027-12-31T10:00:00Z"), 1)).toBe("2028-01-01");
  });
});

describe("API client", () => {
  it("sends the device token to the Payments Kiosk API", async () => {
    const seen: Request[] = [];
    const fetchImpl = vi.fn(async (input: Request) => {
      seen.push(input);
      return new Response(JSON.stringify({ error: { code: "checkout.kiosk_only", params: {} } }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    });
    const api = paymentsApi("http://club/api/v1", "dev.secret", fetchImpl as unknown as typeof fetch);
    const error = await api.idle().catch((e: unknown) => e);
    expect((error as ApiError).code).toBe("checkout.kiosk_only");
    expect(seen[0]?.url).toBe("http://club/api/v1/kiosk/payments/idle");
    expect(seen[0]?.headers.get("X-Device-Token")).toBe("dev.secret");
  });
});

describe("texts (RO/EN)", () => {
  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
    });
  }

  it("every text the screens use exists in Romanian and English", () => {
    const lookup = (tree: unknown, key: string) =>
      key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree);
    const missing: string[] = [];
    for (const file of sources(join(__dirname, ".."))) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      for (const match of readFileSync(file, "utf8").matchAll(/\bt\((?:lang, )?"([^"]+)"/g)) {
        const key = match[1]!;
        for (const [name, catalogue] of [["ro", ro], ["en", en]] as const) {
          if (typeof lookup((catalogue as Record<string, unknown>).payKiosk, key) !== "string") missing.push(`${name}:${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("formats and translates the API's codes", () => {
    expect(t("ro", "home.hello", { name: "Ana" })).toBe("Salut, Ana!");
    expect(t("en", "pay.inserted", { inserted: "200 lei", due: "240 lei" })).toBe("Inserted: 200 lei of 240 lei");
    expect(errorText("ro", "checkout.pin_locked", { minutes: 15 })).toContain("15");
    expect(errorText("ro", "cod.necunoscut")).toBe(t("ro", "errors.generic"));
  });
});
