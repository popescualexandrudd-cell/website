/**
 * A cash payment at the Payments Kiosk (§8.3), step by step. The server decides and signs
 * (ADR-0013); the Hardware Bridge moves the money and signs what it did; this page only
 * carries messages between the two and shows where things are:
 *
 * 1. `prepare`: the basket becomes a checkout; the bridge says, BEFORE any money goes in,
 *    whether it can give change (otherwise: exact amount only, or change as credit with the
 *    customer's explicit consent).
 * 2. `start`: the server's signed `cash.accept`; each note the bridge takes is signed, on its
 *    disk, and sent to the server at once (the server acknowledges, signed, and the bridge
 *    marks it as synced).
 * 3. When enough is in: `finish` → the signed change command → `settle` → the fiscal receipt
 *    (R-066) and the café order slip → `cash.close`.
 * 4. `cancel` at any time before that: the money in goes back; what the machine cannot give
 *    back becomes credit.
 *
 * Without a connection the page keeps retrying (the money is in the bridge's journal); a
 * refusal ends the payment with its code, which the screen translates.
 */
import { ApiError, type BridgeEvent, Offline, type Reply, type Signed } from "@jungle/kiosk-kit";
import type { Card, ChangeMode, Checkout, Item, PaymentsApi, Settled } from "./api";

export type Step =
  | "preparing"
  | "quote"
  | "collecting"
  | "finishing"
  | "printing"
  | "done"
  | "cancelling"
  | "cancelled"
  | "failed";

export type PaymentView = {
  step: Step;
  checkout: Checkout | null;
  /** Can the machine give change for this amount? Asked before any money goes in. */
  quote: { guaranteed: boolean; exactPossible: boolean } | null;
  mode: ChangeMode | null;
  inserted: number;
  due: number;
  dispensed: number;
  credited: number;
  orders: number[];
  /** A note the machine gave back (exact amount only). */
  returned: number;
  fault: string;
  receiptFailed: boolean;
  /** The server does not answer; the page keeps trying. */
  reconnecting: boolean;
  error: { code: string; params: Record<string, unknown> } | null;
};

export type BridgePort = {
  order: (command: Signed) => Promise<Reply>;
  request: (op: string, fields?: Record<string, unknown>) => Promise<Reply>;
};

export const HOLDING: Step[] = ["preparing", "collecting", "finishing", "printing", "cancelling"];

/** A payment that stopped with the customer's money still in the machine (and not settled). */
export function moneyInMachine(view: PaymentView): boolean {
  return view.step === "failed" && view.inserted > 0 && view.checkout?.status === "collecting";
}

/** The session stays open (no idle logout) while money is involved. */
export function holds(view: PaymentView | null): boolean {
  return view !== null && (HOLDING.includes(view.step) || moneyInMachine(view));
}
const RETRY_MS = 2000;
const RETRIES = 60; // two minutes; after that the bridge's journal settles it at the next start

const initial: PaymentView = {
  step: "preparing",
  checkout: null,
  quote: null,
  mode: null,
  inserted: 0,
  due: 0,
  dispensed: 0,
  credited: 0,
  orders: [],
  returned: 0,
  fault: "",
  receiptFailed: false,
  reconnecting: false,
  error: null,
};

export class CashPayment {
  private view: PaymentView = initial;
  private collected: Signed[] = [];
  private queue: Promise<unknown> = Promise.resolve();
  private finishing = false;

  constructor(
    private readonly api: PaymentsApi,
    private readonly bridge: BridgePort,
    private readonly card: Card,
    private readonly onChange: (view: PaymentView) => void,
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {}

  get state(): PaymentView {
    return this.view;
  }

  private set(changes: Partial<PaymentView>): void {
    this.view = { ...this.view, ...changes };
    this.onChange(this.view);
  }

  private fail(error: unknown): void {
    if (error instanceof ApiError) this.set({ step: "failed", error: { code: error.code, params: error.params } });
    else if (error instanceof Offline) this.set({ step: "failed", error: { code: "offline", params: {} } });
    else this.set({ step: "failed", error: { code: "unknown", params: {} } });
  }

  /** Server calls that must get through while money is involved. */
  private async retrying<T>(call: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        const result = await call();
        if (this.view.reconnecting) this.set({ reconnecting: false });
        return result;
      } catch (error) {
        if (!(error instanceof Offline) || attempt >= RETRIES) throw error;
        if (!this.view.reconnecting) this.set({ reconnecting: true });
        await this.sleep(RETRY_MS);
      }
    }
  }

  /** Sends what the bridge signed to the server, then passes the server's signed ack back. */
  private async sync(events: Signed[]): Promise<void> {
    if (events.length === 0) return;
    const answer = await this.retrying(() => this.api.events(events));
    if (answer.ack) await this.bridge.order(answer.ack as Signed);
  }

  private async order(command: Signed): Promise<Reply> {
    const reply = await this.bridge.order(command);
    if (!reply.ok) throw new ApiError(`bridge.${reply.error ?? "unknown"}`, {}, 0);
    return reply;
  }

  // ------------------------------------------------------------ 1. the checkout and the quote
  async prepare(items: Item[]): Promise<void> {
    this.set({ ...initial });
    try {
      const checkout = await this.api.create(this.card, items);
      const quote = await this.bridge.request("cash.quote", { amount: checkout.amount_due });
      if (!quote.ok) throw new ApiError(`bridge.${quote.error ?? "unknown"}`, {}, 0);
      this.set({
        step: "quote",
        checkout,
        due: checkout.amount_due,
        quote: { guaranteed: quote.change_guaranteed === true, exactPossible: quote.exact_possible === true },
      });
    } catch (error) {
      this.fail(error);
    }
  }

  // ------------------------------------------------------------ 2. money in
  async start(mode: ChangeMode): Promise<void> {
    const checkout = this.view.checkout;
    if (!checkout || this.view.step !== "quote") return;
    this.set({ mode, step: "collecting" });
    try {
      const started = await this.api.start(checkout.id, this.card, mode);
      this.set({ checkout: started.checkout });
      const reply = await this.bridge.order(started.command as Signed);
      if (!reply.ok) {
        // The machine did not start: nothing went in; the server closes the checkout.
        await this.api.cancel(checkout.id, []).catch(() => undefined);
        throw new ApiError(`bridge.${reply.error ?? "unknown"}`, {}, 0);
      }
    } catch (error) {
      this.fail(error);
    }
  }

  /** What the bridge pushes while this payment is on screen. */
  onEvent(event: BridgeEvent): Promise<unknown> {
    const txn = this.view.checkout?.id;
    const signed = event.signed as Signed | undefined;
    if (event.event === "cash.accepted" && signed && signed.payload.txn === txn) {
      this.collected.push(signed);
      this.set({ inserted: Number(event.total ?? this.view.inserted), returned: 0 });
      this.queue = this.queue.then(() => this.sync([signed])).catch(() => undefined);
    } else if (event.event === "cash.returned") {
      this.set({ returned: Number(event.amount ?? 0) });
    } else if (event.event === "cash.complete" && event.txn === txn) {
      this.queue = this.queue.then(() => this.finish());
    } else if (event.event === "fault") {
      const code = String(event.code ?? "");
      this.set({ fault: code });
      void this.api.alert(code).catch(() => undefined);
    }
    return this.queue;
  }

  // ------------------------------------------------------------ 3. change, receipt, close
  private async finish(): Promise<void> {
    const checkout = this.view.checkout;
    if (!checkout || this.finishing || this.view.step !== "collecting") return;
    this.finishing = true;
    this.set({ step: "finishing" });
    try {
      let result;
      try {
        result = await this.retrying(() => this.api.finish(checkout.id, this.collected));
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== "checkout.not_enough") throw error;
        // A note this page did not hear about (a reload): the bridge's journal has it.
        const pending = await this.bridge.request("journal.pending");
        await this.sync((pending.events as Signed[] | undefined) ?? []);
        result = await this.retrying(() => this.api.finish(checkout.id, []));
      }
      // Paid in full: from here on the money is the club's, whatever happens on screen.
      this.set({ checkout: { ...checkout, status: "paid" } });
      let settled: Settled;
      if (result.dispense) {
        const change = await this.order(result.dispense as Signed);
        settled = await this.retrying(() => this.api.settle(checkout.id, [change.signed as Signed]));
      } else {
        settled = result.settled as Settled;
      }
      await this.print(settled);
    } catch (error) {
      this.fail(error);
    }
  }

  private async print(settled: Settled): Promise<void> {
    this.set({
      step: "printing",
      checkout: settled.checkout,
      orders: settled.orders,
      dispensed: settled.checkout.dispensed,
      credited: settled.checkout.credited,
    });
    const signed: Signed[] = [];
    if (settled.receipt) {
      const receipt = await this.bridge.order(settled.receipt as Signed);
      if (receipt.ok && receipt.signed) signed.push(receipt.signed as Signed);
      else {
        this.set({ receiptFailed: true });
        void this.api.alert(receipt.error === "paper_out" ? "paper_out" : "offline").catch(() => undefined);
      }
    }
    if (settled.orders.length > 0) {
      await this.bridge.request("receipt.print", {
        lines: ["JUNGLE PADEL", ...settled.orders.map((n) => `Comanda / Order #${n}`)],
      });
    }
    const closed = await this.bridge.order(settled.close as Signed);
    if (closed.ok && closed.signed) signed.push(closed.signed as Signed);
    await this.sync(signed).catch(() => undefined); // the journal sends them later otherwise
    this.set({ step: "done" });
  }

  // ------------------------------------------------------------ 4. cancelling
  async cancel(): Promise<void> {
    const checkout = this.view.checkout;
    if (!checkout || !["quote", "collecting", "failed"].includes(this.view.step) || this.finishing) return;
    this.set({ step: "cancelling" });
    try {
      const answer = await this.retrying(() => this.api.cancel(checkout.id, this.collected));
      if (answer.stop) await this.bridge.order(answer.stop as Signed);
      let credited = 0;
      const signed: Signed[] = [];
      if (answer.refund) {
        const back = await this.order(answer.refund as Signed);
        const done = await this.retrying(() => this.api.refunded(checkout.id, [back.signed as Signed]));
        credited = done.credited;
        const closed = await this.bridge.order(done.close as Signed);
        if (closed.ok && closed.signed) signed.push(closed.signed as Signed);
      } else if (answer.close) {
        const closed = await this.bridge.order(answer.close as Signed);
        if (closed.ok && closed.signed) signed.push(closed.signed as Signed);
      }
      await this.sync(signed).catch(() => undefined);
      this.set({ step: "cancelled", credited });
    } catch (error) {
      this.fail(error);
    }
  }
}

/** The credit in the account pays, item by item (§8.3 flow 6); each with its own key, so a
 * repeated tap never pays twice (R-067). */
export async function payWithCredit(
  api: PaymentsApi,
  card: Card,
  items: Item[],
  key: (index: number) => string,
): Promise<number[]> {
  const orders: number[] = [];
  for (const [index, item] of items.entries()) {
    const paid = await api.payBalance(card, item, key(index));
    if (paid.order !== null && paid.order !== undefined) orders.push(paid.order);
  }
  return orders;
}
