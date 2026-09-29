import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KioskContext, type PayKiosk } from "../kiosk";
import type { Idle, PaymentsApi, Session } from "../lib/api";
import { addPayable, changeCafe, EMPTY } from "../lib/basket";
import type { CashPayment, PaymentView } from "../lib/payment";
import { BasketScreen } from "./Basket";
import { Cafe } from "./Cafe";
import { CheckoutScreen } from "./Checkout";
import { Home } from "./Home";
import { IdleScreen } from "./Idle";
import { SplitScreen } from "./Split";

afterEach(cleanup);

const booking = {
  kind: "booking",
  subject_id: "b-1",
  description: "Teren 1, 5 apr., 19:00–20:30",
  price: 24000,
  to_pay: 24000,
  debt: false,
  starts_at: "2027-04-05T16:00:00Z",
  organizer: "",
};

function session(changes: Partial<Session> = {}): Session {
  return {
    session: "s-1",
    first_name: "Ana",
    last_name: "Pop",
    language: "ro",
    credit: 0,
    payables: [booking, { ...booking, subject_id: "b-0", description: "Neprezentare 4 apr.", debt: true, to_pay: 16000 }],
    shared: [],
    vouchers: [],
    subscriptions: [],
    ...changes,
  };
}

const idle: Idle = {
  location_slug: "jungle-padel",
  location_name: "Jungle Padel",
  menu: [
    {
      id: "c-1",
      name_ro: "Cafea",
      name_en: "Coffee",
      products: [{ id: "p-1", name_ro: "Espresso", name_en: "Espresso", price: 1200, marker: "to_set" }],
    },
  ],
};

function mount(ui: React.ReactNode, changes: Partial<PayKiosk> = {}) {
  const kiosk: PayKiosk = {
    lang: "ro",
    api: {} as PaymentsApi,
    idle,
    session: session(),
    card: { session: "s-1" },
    basket: EMPTY,
    setBasket: vi.fn(),
    splitting: null,
    split: vi.fn(),
    group: [],
    setGroup: vi.fn(),
    offline: false,
    bridge: null,
    goto: vi.fn(),
    refresh: vi.fn(async () => undefined),
    notify: vi.fn(),
    fail: vi.fn(),
    takeNextScan: vi.fn(),
    logout: vi.fn(),
    pay: vi.fn(),
    payment: null,
    paymentView: null,
    paymentBack: "home",
    endPayment: vi.fn(),
    ...changes,
  };
  render(<KioskContext.Provider value={kiosk}>{ui}</KioskContext.Provider>);
  return kiosk;
}

describe("idle (§8.3)", () => {
  it("shows the call to scan, the menu with indicative prices, the staff entry", async () => {
    const options = vi.fn(async () => ({
      intensities: { start: 4 },
      bundle_discounts: {},
      period_discounts: {},
      start_rule_below_sessions: 0,
      rates: [{ sport: "padel", sessions_per_month: 4, monthly_price: 30000, marker: "to_set" }],
    }));
    const onStaff = vi.fn();
    await act(async () => {
      mount(<IdleScreen onStaff={onStaff} />, { session: null, api: { options } as unknown as PaymentsApi });
    });
    expect(screen.getByText("Scanează cardul")).toBeTruthy();
    expect(screen.getByText("Espresso")).toBeTruthy();
    expect(screen.getByText(/12 lei/)).toBeTruthy();
    expect(screen.getByText(/300 lei \/ lună/)).toBeTruthy();
    expect(screen.getAllByLabelText("preț orientativ")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Personal" }));
    expect(onStaff).toHaveBeenCalled();
  });

  it("says so when payments are unavailable", () => {
    mount(<IdleScreen onStaff={vi.fn()} />, {
      session: null,
      offline: true,
      idle: { ...idle, menu: [] },
      api: { options: vi.fn(async () => Promise.reject(new Error("x"))) } as unknown as PaymentsApi,
    });
    expect(screen.getByText("Plățile sunt temporar indisponibile.")).toBeTruthy();
    expect(screen.getByText("Meniul apare în curând.")).toBeTruthy();
  });
});

describe("the session (§8.3 flows 1–3)", () => {
  it("debts are marked; a booking can be paid whole or split", () => {
    const kiosk = mount(<Home />);
    expect(screen.getByText("Datorie")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Plătesc 240 lei" }));
    expect(kiosk.setBasket).toHaveBeenCalled();
    expect(kiosk.goto).toHaveBeenCalledWith("basket");
    fireEvent.click(screen.getByRole("button", { name: "Împarte ora" }));
    expect(kiosk.split).toHaveBeenCalledWith("b-1");
  });

  it("check-in (R-030) and the partners' bookings", async () => {
    const checkIn = vi.fn(async () => ({ first_name: "Ana", scanned_at: "2027-04-05T15:55:00Z" }));
    const kiosk = mount(<Home />, {
      api: { checkIn } as unknown as PaymentsApi,
      session: session({
        payables: [],
        shared: [{ ...booking, subject_id: "b-9", organizer: "Ion D." }],
        subscriptions: [{ id: "s", description: "Padel", ends_on: "2027-05-01" }],
      }),
    });
    expect(screen.getByText("Nu ai nimic de plătit acum.")).toBeTruthy();
    expect(screen.getByText(/rezervată de Ion D\./)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Plătesc partea mea" }));
    expect(kiosk.split).toHaveBeenCalledWith("b-9");
    expect(screen.queryByRole("button", { name: /voucher/i })).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Check-in" }));
    });
    expect(kiosk.notify).toHaveBeenCalledWith("Check-in făcut la 18:55. Joc frumos, Ana!");
  });
});

describe("the basket (§8.3)", () => {
  it("cash always; credit only when it covers everything", async () => {
    const basket = changeCafe(addPayable(EMPTY, booking), idle.menu[0]!.products[0]!, 2);
    const payBalance = vi.fn(async (_c: unknown, item: { kind: string }) => ({ amount: 1, order: item.kind === "cafe" ? 5 : null }));
    const kiosk = mount(<BasketScreen />, {
      basket,
      session: session({ credit: 30000 }),
      api: { payBalance } as unknown as PaymentsApi,
    });
    expect(screen.getByText("Total: 264 lei")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Plătesc cu numerar" }));
    expect(kiosk.pay).toHaveBeenCalledWith(expect.any(Array), undefined, "home");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Plătesc din credit (300 lei)" }));
    });
    expect(payBalance).toHaveBeenCalledTimes(2);
    expect(kiosk.notify).toHaveBeenCalledWith("Plătit din credit. Comanda ta: nr. 5.");
    cleanup();
    mount(<BasketScreen />, { basket, session: session({ credit: 1000 }) });
    expect((screen.getByRole("button", { name: /din credit/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/nu ajunge pentru tot coșul/)).toBeTruthy();
  });

  it("no new payment without a connection to the server (§8.3)", () => {
    mount(<BasketScreen />, { basket: addPayable(EMPTY, booking), offline: true });
    expect((screen.getByRole("button", { name: "Plătesc cu numerar" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("the café (§8.3 flow 5)", () => {
  it("adds products to the basket", () => {
    const kiosk = mount(<Cafe />);
    fireEvent.click(screen.getByRole("button", { name: "Mai mult: Espresso" }));
    expect(kiosk.setBasket).toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Mergi la coș" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

function view(changes: Partial<PaymentView>): PaymentView {
  return {
    step: "quote",
    checkout: null,
    quote: { guaranteed: true, exactPossible: true },
    mode: null,
    inserted: 0,
    due: 24000,
    dispensed: 0,
    credited: 0,
    orders: [],
    returned: 0,
    fault: "",
    receiptFailed: false,
    reconnecting: false,
    error: null,
    ...changes,
  };
}

describe("paying in cash (§8.3)", () => {
  const payment = () => ({ start: vi.fn(), cancel: vi.fn() }) as unknown as CashPayment;

  it("warns BEFORE any money goes in; credit for the change only with explicit consent", () => {
    const current = payment();
    mount(<CheckoutScreen />, { payment: current, paymentView: view({ quote: { guaranteed: false, exactPossible: true } }) });
    expect(screen.getByRole("alert").textContent).toContain("Momentan acceptăm doar suma exactă");
    const credit = screen.getByRole("button", { name: "Plătesc; restul în cont" }) as HTMLButtonElement;
    expect(credit.disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(credit);
    expect(current.start).toHaveBeenCalledWith("credit");
    fireEvent.click(screen.getByRole("button", { name: "Plătesc suma exactă (240 lei)" }));
    expect(current.start).toHaveBeenCalledWith("exact");
  });

  it("change guaranteed: insert money; while collecting, the progress and a way out", () => {
    const current = payment();
    mount(<CheckoutScreen />, { payment: current, paymentView: view({}) });
    fireEvent.click(screen.getByRole("button", { name: "Introduc bani" }));
    expect(current.start).toHaveBeenCalledWith("normal");
    cleanup();
    mount(<CheckoutScreen />, {
      payment: current,
      paymentView: view({ step: "collecting", inserted: 20000, fault: "note_jam", returned: 5000 }),
    });
    expect(screen.getByText("Introdus: 200 lei din 240 lei")).toBeTruthy();
    expect(screen.getByText("Mai ai de introdus 40 lei")).toBeTruthy();
    expect(screen.getByText(/Blocaj de bancnotă/)).toBeTruthy();
    expect(screen.getByText(/Bancnota de 50 lei/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Anulez și primesc banii înapoi" }));
    expect(current.cancel).toHaveBeenCalled();
  });

  it("done: change, credit, the café order number, the receipt", () => {
    const kiosk = mount(<CheckoutScreen />, {
      payment: payment(),
      paymentView: view({ step: "done", dispensed: 1000, credited: 300, orders: [7], receiptFailed: true }),
    });
    expect(screen.getByText("Ia-ți restul: 10 lei.")).toBeTruthy();
    expect(screen.getByText("3 lei au intrat în contul tău ca credit.")).toBeTruthy();
    expect(screen.getByText(/Comanda ta: nr. 7/)).toBeTruthy();
    expect(screen.getByText(/Bonul fiscal nu s-a putut tipări/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Gata" }));
    expect(kiosk.endPayment).toHaveBeenCalled();
  });

  it("a failure with money in the machine has only one way out: getting it back", () => {
    const current = payment();
    mount(<CheckoutScreen />, {
      payment: current,
      paymentView: view({
        step: "failed",
        inserted: 5000,
        checkout: { status: "collecting" } as PaymentView["checkout"],
        error: { code: "offline", params: {} },
      }),
    });
    expect(screen.queryByRole("button", { name: "Gata" })).toBeNull();
    expect(screen.getByText(/Ai introdus 50 lei/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Anulez și primesc banii înapoi" }));
    expect(current.cancel).toHaveBeenCalled();
    cleanup();
    mount(<CheckoutScreen />, {
      payment: current,
      paymentView: view({ step: "failed", error: { code: "checkout.busy", params: {} } }),
    });
    expect(screen.getByRole("alert").textContent).toBeTruthy();
    expect(screen.getByRole("button", { name: "Gata" })).toBeTruthy();
    cleanup();
    mount(<CheckoutScreen />, { payment: current, paymentView: view({ step: "cancelled", credited: 500 }) });
    expect(screen.getByText(/nu a putut da înapoi 5 lei/)).toBeTruthy();
  });
});

describe("splitting the hour (R-060, R-061)", () => {
  it("shows the shares and what is left, live; each player pays their share", async () => {
    const split = vi.fn(async (_id: string, parts: number) => ({
      price: 24000,
      paid: 6000,
      to_pay: 18000,
      shares: Array.from({ length: parts }, () => 24000 / parts),
    }));
    let kiosk: PayKiosk | undefined;
    await act(async () => {
      kiosk = mount(<SplitScreen />, {
        splitting: "b-1",
        api: { split } as unknown as PaymentsApi,
        group: [{ name: "Ion D.", card: { session: "s-2" } }],
      });
    });
    expect(screen.getByText("Mai sunt de plătit: 180 lei")).toBeTruthy();
    expect(split).toHaveBeenCalledWith("b-1", 4);
    fireEvent.click(screen.getByRole("button", { name: "Ion D. plătește 60 lei" }));
    expect(kiosk?.pay).toHaveBeenCalledWith(
      [{ kind: "booking", subject_id: "b-1", amount: 6000, cafe_lines: [] }],
      { session: "s-2" },
      "split",
    );
    fireEvent.click(screen.getByRole("button", { name: "Adaugă un jucător (scanează cardul lui)" }));
    expect(kiosk?.takeNextScan).toHaveBeenCalled();
  });
});
