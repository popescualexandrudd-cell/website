/** The league (§6: never a score in the panel, invariant 1), money (ADR-0009: corrections only as
 * reverse entries; R-067 idempotency), cash and fiscal (R-064, Z report, the kiosk PIN, Q54) and
 * the café (R-110…R-113) in the panel. */
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Call, fakeApi, json, mountPanel, settle } from "../test-kit";
import { Cafe } from "./Cafe";
import { Calendar } from "./Calendar";
import { Cash } from "./Cash";
import { League, scoreText } from "./League";
import { Money } from "./Money";

let answers: Record<string, (body: unknown, url: URL) => Response>;
let calls: Call[];

function mount(ui: React.ReactNode, actions: string[], path: string[] = []) {
  const api = fakeApi(answers);
  calls = api.calls;
  return mountPanel(ui, api.fetchStub, actions, path);
}

const last = (method: string, path: string) => calls.filter((c) => c.method === method && c.path === path).at(-1);
const refused = (code = "auth.forbidden", status = 403) => () => json({ error: { code, params: {} } }, status);

async function submit(name: string) {
  await act(async () => {
    fireEvent.submit(screen.getByRole("form", { name }));
  });
  await settle();
}

async function withReason(button: string, reason = "motiv scris", scope: HTMLElement = document.body) {
  fireEvent.click(within(scope).getByRole("button", { name: button }));
  fireEvent.change(within(scope).getByLabelText("Motivul"), { target: { value: reason } });
  await submit(button);
}

async function click(name: string | RegExp, scope: HTMLElement = document.body) {
  await act(async () => fireEvent.click(within(scope).getByRole("button", { name })));
  await settle();
}

const USERS = { total: 1, items: [{ id: "u1", first_name: "Ana", last_name: "Pop", email: "ana@club.ro", phone: "", account_type: "full", is_active: true, is_demo: false }] };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2027-03-16T08:00:00Z"));
  answers = { "GET /api/v1/staff/users": () => json(USERS) };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the league (§6)", () => {
  const match = (id: string, status: string) => ({
    id,
    kind: "official",
    status,
    court: "Teren 1",
    finished_at: "2027-03-15T18:30:00Z",
    window_closes_at: "2027-03-15T19:00:00Z",
    payment_deadline: null,
    note: "contestat de Dan",
    booking_id: "b1",
    score: { sets: [{ a: 6, b: 4 }, { a: 3, b: 6 }] },
    players: [
      { first_name: "Ana", last_name: "Pop", side: "a", response: "confirmed" },
      { first_name: "Dan", last_name: "Ion", side: "b", response: "disputed" },
      { first_name: "Ion", last_name: "Ban", side: "b", response: "" },
    ],
    transitions: [{ at: "2027-03-15T18:35:00Z", status: "disputed", reason: "scor greșit", checks: {} }, { at: "2027-03-15T18:34:00Z", status: "proposed", reason: "", checks: {} }],
  });
  const season = (id: string, status: string, extra: Record<string, unknown> = {}) => ({
    id,
    number: 1,
    name: `Sezonul ${id}`,
    starts_at: "2027-03-28T00:00:00+03:00",
    ends_at: "2027-06-28T00:00:00+03:00",
    status,
    is_calibration: false,
    ...extra,
  });
  const tournament = { id: "t1", name: "Cupa Primăverii", format: "knockout", team_size: 2, starts_at: "2027-04-10T07:00:00Z", registration_closes_at: "2027-04-08T20:00:00Z", entry_fee: 10000, fee_provisional: true, max_entries: 16, entries: 4, status: "registration" };
  const detail = (status: string) => ({
    ...tournament,
    status,
    entries_list: [{ id: "e1", players: [{ id: "u1", first_name: "Ana", last_name: "Pop" }], seed: 1, position: null, bonus_lp: 0 }, { id: "e2", players: [], seed: null, position: null, bonus_lp: 0 }],
    fixtures: [
      { id: "f1", round: 1, slot: 1, phase: "main", status: "ready", court: "", starts_at: null, team_a: [{ id: "u1", first_name: "Ana", last_name: "Pop" }], team_b: [], score: {}, winner: "" },
      { id: "f2", round: 1, slot: 2, phase: "main", status: "ready", court: "Teren 2", starts_at: "2027-04-10T08:00:00Z", team_a: [], team_b: [], score: {}, winner: "" },
      { id: "f3", round: 1, slot: 3, phase: "main", status: "done", court: "Teren 1", starts_at: "2027-04-10T07:00:00Z", team_a: [], team_b: [], score: {}, winner: "a" },
    ],
  });
  beforeEach(() => {
    Object.assign(answers, {
      "GET /api/v1/staff/league/matches": (_: unknown, url: URL) => json(url.searchParams.get("status") === "applied" ? [] : [match("m1", "disputed")]),
      "POST /api/v1/staff/league/matches/m1/resolve": () => json(match("m1", "applied")),
      "GET /api/v1/staff/panel/league/seasons": () => json([season("s2", "planned"), season("s1", "active", { is_calibration: true }), season("s0", "closed")]),
      "POST /api/v1/staff/league/seasons": () => json(season("s3", "planned"), 201),
      "POST /api/v1/staff/league/seasons/s2/activate": () => json(season("s2", "active")),
      "POST /api/v1/staff/league/seasons/s1/close": () => json(season("s1", "closed")),
      "POST /api/v1/staff/league/seasons/s0/rebuild": refused("league.season_closed", 409),
      "GET /api/v1/league/tournaments": () => json([tournament]),
      "POST /api/v1/staff/league/tournaments": () => json(tournament, 201),
      "GET /api/v1/league/tournaments/t1": () => json(detail("registration")),
      "POST /api/v1/staff/league/tournaments/t1/draw": () => json(detail("in_progress")),
      "POST /api/v1/staff/league/tournaments/t1/cancel": () => json({ ...tournament, status: "cancelled" }),
      "POST /api/v1/staff/league/fixtures/f1/schedule": () => json({}),
      "POST /api/v1/staff/league/fixtures/f2/finished": () => json({}),
      "GET /api/v1/league/match-of-the-day": () => json({ found: true, chosen_by_admin: true, court: "Teren 1", starts_at: "2027-03-16T17:00:00Z", reasons: [], players: [{ id: "u1", first_name: "Ana", last_name: "Pop", division: "", level: 3.5, lp: 120, position: 1, tier: "gold" }] }),
      "POST /api/v1/staff/league/match-of-the-day": () => json({ found: false, chosen_by_admin: false, court: "", starts_at: null, reasons: [], players: [] }),
    });
  });

  it("decides a disputed match with a reason, never with a score (invariant 1)", async () => {
    const panel = mount(<League />, ["league.manage"]);
    await settle();
    const card = screen.getByRole("article", { name: "Meciul de pe Teren 1" });
    expect(within(card).getByText("Scorul: 6–4, 3–6")).toBeTruthy();
    expect(within(card).getByText(/Dan Ion · echipa B · a contestat/)).toBeTruthy();
    expect(within(card).getByText(/Ion Ban · echipa B · —/)).toBeTruthy();
    expect(within(card).queryByRole("spinbutton")).toBeNull(); // no score field anywhere
    await withReason("Aplic scorul", "video verificat", card);
    expect(last("POST", "/api/v1/staff/league/matches/m1/resolve")?.body).toEqual({ action: "apply", reason: "video verificat" });
    await withReason("Redeschid", "a doua verificare", card);
    await withReason("Anulez meciul", "meci nejucat", card);
    expect(panel.notify).toHaveBeenCalledWith("Meciul a fost anulat.");
    fireEvent.change(screen.getByLabelText("Starea"), { target: { value: "applied" } });
    await settle();
    expect(screen.getByText("Niciun meci în această stare.")).toBeTruthy();
    expect([scoreText({}), scoreText({ sets: [{ a: 7 }] })]).toEqual(["—", "7–?"]);
  });

  it("creates, starts, closes and rebuilds seasons", async () => {
    const panel = mount(<League />, ["league.manage"]);
    await settle();
    expect(screen.getByText(/calibrare/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sezon nou" }));
    const form = screen.getByRole("form", { name: "Sezon nou" });
    fireEvent.change(within(form).getByLabelText("Numărul"), { target: { value: "2" } });
    fireEvent.change(within(form).getByLabelText("Numele"), { target: { value: " Sezonul 2 " } });
    fireEvent.change(within(form).getByLabelText("De la"), { target: { value: "2027-07-01" } });
    fireEvent.change(within(form).getByLabelText("Până la"), { target: { value: "2027-10-01" } });
    fireEvent.click(within(form).getByLabelText(/calibrare/));
    await submit("Sezon nou");
    expect(last("POST", "/api/v1/staff/league/seasons")?.body).toEqual({
      location_id: "l1",
      number: 2,
      name: "Sezonul 2",
      starts_at: "2027-07-01T00:00:00+03:00",
      ends_at: "2027-10-01T00:00:00+03:00",
      is_calibration: true,
    });
    await click("Pornesc sezonul");
    await click("Închei sezonul");
    expect(panel.notify).toHaveBeenCalledWith("Sezonul s-a încheiat: clasamentul final și recompensele au fost acordate.");
    const closed = screen.getByRole("row", { name: /Sezonul s0/ });
    await click("Recalculez clasamentul", closed);
    expect(panel.fail).toHaveBeenCalled();
    answers["POST /api/v1/staff/league/seasons"] = refused("validation.invalid", 422);
    fireEvent.click(screen.getByRole("button", { name: "Sezon nou" }));
    fireEvent.change(screen.getByLabelText("Până la"), { target: { value: "2027-10-01" } });
    await submit("Sezon nou");
    expect(panel.fail).toHaveBeenCalledTimes(2);
  });

  it("runs a tournament: create, draw, put a match on a court, mark it finished, cancel", async () => {
    const panel = mount(<League />, ["league.manage"]);
    await settle();
    expect(screen.getByText(/100 lei · DE_STABILIT/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Turneu nou" }));
    const form = screen.getByRole("form", { name: "Turneu nou" });
    fireEvent.change(within(form).getByLabelText("Numele"), { target: { value: "Americano de vineri" } });
    fireEvent.change(within(form).getByLabelText("Formatul"), { target: { value: "americano" } });
    fireEvent.change(within(form).getByLabelText("Echipe"), { target: { value: "1" } });
    fireEvent.change(within(form).getByLabelText("Ziua"), { target: { value: "2027-04-02" } });
    fireEvent.change(within(form).getByLabelText("Ora"), { target: { value: "18:00" } });
    fireEvent.change(within(form).getByLabelText("Înscrieri până la"), { target: { value: "2027-04-01" } });
    fireEvent.change(within(form).getByLabelText("Taxa de înscriere (lei)"), { target: { value: "x" } });
    await submit("Turneu nou");
    expect(panel.fail).toHaveBeenCalledTimes(1);
    fireEvent.change(within(form).getByLabelText("Taxa de înscriere (lei)"), { target: { value: "50" } });
    fireEvent.change(within(form).getByLabelText("Număr maxim de echipe"), { target: { value: "12" } });
    await submit("Turneu nou");
    expect(last("POST", "/api/v1/staff/league/tournaments")?.body).toMatchObject({
      name: "Americano de vineri",
      format: "americano",
      team_size: 1,
      starts_at: "2027-04-02T18:00:00+03:00",
      registration_closes_at: "2027-04-01T23:59:00+03:00",
      entry_fee: 5000,
      max_entries: 12,
    });
    fireEvent.click(screen.getByRole("button", { name: "Cupa Primăverii" }));
    expect(screen.getByText("Se încarcă…")).toBeTruthy();
    await settle();
    const region = screen.getByRole("region", { name: "Cupa Primăverii" });
    expect(within(region).getByText(/Ana Pop · cap de serie 1/)).toBeTruthy();
    await click("Fac tragerea la sorți", region);
    expect(panel.notify).toHaveBeenCalledWith("Tragerea la sorți a fost făcută.");
    const row = within(region).getByRole("row", { name: /Runda 1, meciul 1/ });
    fireEvent.change(within(row).getByLabelText("Codul rezervării"), { target: { value: " b77 " } });
    await click("Pun pe teren", row);
    expect(last("POST", "/api/v1/staff/league/fixtures/f1/schedule")?.body).toEqual({ booking_id: "b77" });
    await click("Meci terminat", within(region).getByRole("row", { name: /Runda 1, meciul 2/ }));
    expect(within(region).getByText("câștigă echipa A")).toBeTruthy();
    await withReason("Anulez turneul", "prea puține înscrieri", region);
    expect(last("POST", "/api/v1/staff/league/tournaments/t1/cancel")?.body).toEqual({ reason: "prea puține înscrieri" });
    answers["POST /api/v1/staff/league/fixtures/f2/finished"] = refused("league.fixture_not_ready", 409);
    await click("Meci terminat", within(region).getByRole("row", { name: /Runda 1, meciul 2/ }));
    expect(panel.fail).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Cupa Primăverii" }));
    expect(screen.queryByRole("region", { name: "Cupa Primăverii" })).toBeNull();
  });

  it("chooses the Match of the Day, with a reason", async () => {
    const panel = mount(<League />, ["league.manage"]);
    await settle();
    expect(screen.getByText("Teren 1 · Ana Pop · ales de administrator")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Aleg Meciul zilei" }));
    fireEvent.change(screen.getByLabelText("Codul rezervării"), { target: { value: "b9" } });
    fireEvent.change(screen.getByLabelText("Motivul"), { target: { value: "finala ligii" } });
    answers["GET /api/v1/league/match-of-the-day"] = () => json({ found: false, chosen_by_admin: false, court: "", starts_at: null, reasons: [], players: [] });
    await submit("Aleg Meciul zilei");
    expect(last("POST", "/api/v1/staff/league/match-of-the-day")?.body).toEqual({ location_id: "l1", booking_id: "b9", reason: "finala ligii" });
    expect(screen.getByText("Niciun Meci al zilei azi.")).toBeTruthy();
    expect(panel.notify).toHaveBeenCalledWith("S-a salvat.");
  });

  it("shows a tournament that is finished without actions", async () => {
    answers["GET /api/v1/league/tournaments/t1"] = () => json({ ...detail("finished"), fixtures: [] });
    mount(<League />, ["league.manage"]);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Cupa Primăverii" }));
    await settle();
    const region = screen.getByRole("region", { name: "Cupa Primăverii" });
    expect(within(region).queryByRole("button", { name: "Fac tragerea la sorți" })).toBeNull();
    expect(within(region).queryByRole("button", { name: "Anulez turneul" })).toBeNull();
  });
});

describe("payments and the ledger (ADR-0009)", () => {
  const tx = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    kind: "sale",
    description: "Cafenea",
    reason: "",
    actor: "Chioșc Plăți 1",
    subject: "",
    created_at: "2027-03-16T07:30:00Z",
    reverses_id: null,
    reversed: false,
    entries: [
      { account: "cash:x", kind: "cash", amount: 1500 },
      { account: "revenue:x", kind: "revenue", amount: -1500 },
    ],
    ...extra,
  });
  const voucher = (id: string, kind: string, value: number, status = "active") => ({
    id,
    code: `C${id}`,
    holder_id: "u1",
    holder: "Pop Ana",
    kind,
    value,
    target: "any",
    valid_from: "2027-03-16",
    valid_until: "2027-06-14",
    source: "manual",
    reason: "compensație",
    status,
    issued_at: "2027-03-16T08:00:00Z",
    redeemed_at: null,
  });
  beforeEach(() => {
    Object.assign(answers, {
      "GET /api/v1/staff/panel/transactions": () => json([tx("t2", { kind: "reversal", reason: "greșeală", reverses_id: "t1" }), tx("t1", { reversed: true }), tx("t3", { actor: "" })]),
      "POST /api/v1/staff/ledger/transactions/t3/reverse": () => json({}),
      "GET /api/v1/staff/panel/vouchers": () => json([voucher("1", "amount", 5000), voucher("2", "hour", 60, "redeemed"), voucher("3", "percent", 20)]),
      "POST /api/v1/staff/vouchers": () => json(voucher("9", "amount", 2500), 201),
      "POST /api/v1/staff/vouchers/1/cancel": () => json(voucher("1", "amount", 5000, "cancelled")),
    });
  });

  it("corrects a transaction only with a reverse entry and a reason", async () => {
    const panel = mount(<Money />, ["payments.view", "ledger.correct"]);
    await settle();
    expect(screen.getByText("Motiv: greșeală")).toBeTruthy();
    expect(screen.getByText("corectată (înregistrare inversă)")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Corectez (înregistrare inversă)" })).toHaveLength(1); // not a correction, not twice
    expect(screen.getAllByText("Numerar: 15 lei")).toHaveLength(3);
    await withReason("Corectez (înregistrare inversă)", "sumă greșită");
    expect(last("POST", "/api/v1/staff/ledger/transactions/t3/reverse")?.body).toEqual({ reason: "sumă greșită" });
    expect(panel.notify).toHaveBeenCalledWith("Corecția a fost înregistrată.");
    fireEvent.click(screen.getByRole("button", { name: "Ziua anterioară" }));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Ziua următoare" }));
    fireEvent.change(screen.getByLabelText("Ziua"), { target: { value: "2027-03-01" } });
    fireEvent.change(screen.getByLabelText("Ziua"), { target: { value: "" } });
    await settle();
    const days = calls.filter((c) => c.path === "/api/v1/staff/panel/transactions").map((c) => new URLSearchParams(c.query).get("day"));
    expect(days).toEqual(expect.arrayContaining(["2027-03-16", "2027-03-15", "2027-03-01"]));
  });

  it("issues and cancels vouchers", async () => {
    const panel = mount(<Money />, ["vouchers.manage"]);
    await settle();
    expect(screen.queryByText("Registrul zilei")).toBeNull();
    expect(screen.getByText("50 lei · Orice")).toBeTruthy();
    expect(screen.getByText("60 min · Orice")).toBeTruthy();
    expect(screen.getByText("20% · Orice")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Voucher nou" }));
    await submit("Voucher nou"); // nobody picked: nothing is sent
    fireEvent.change(screen.getByLabelText("Clientul"), { target: { value: "ana" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Găsește" })));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Pop Ana · ana@club.ro" }));
    fireEvent.change(screen.getByLabelText("Suma (lei)"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Motivul"), { target: { value: "teren ud" } });
    await submit("Voucher nou");
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Suma (lei)"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Pentru"), { target: { value: "booking" } });
    fireEvent.change(screen.getByLabelText("Valabil (zile)"), { target: { value: "30" } });
    await submit("Voucher nou");
    expect(last("POST", "/api/v1/staff/vouchers")?.body).toEqual({ location_id: "l1", holder_id: "u1", kind: "amount", value: 2500, target: "booking", valid_days: 30, reason: "teren ud" });
    expect(panel.notify).toHaveBeenCalledWith("Voucherul C9 a fost emis.");
    fireEvent.click(screen.getByRole("button", { name: "Voucher nou" }));
    fireEvent.change(screen.getByLabelText("Clientul"), { target: { value: "ana" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Găsește" })));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Pop Ana · ana@club.ro" }));
    fireEvent.change(screen.getByLabelText("Tipul"), { target: { value: "percent" } });
    fireEvent.change(screen.getByLabelText("Procent"), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("Motivul"), { target: { value: "fidelitate" } });
    answers["POST /api/v1/staff/vouchers"] = refused();
    await submit("Voucher nou");
    expect(last("POST", "/api/v1/staff/vouchers")?.body).toMatchObject({ kind: "percent", value: 15 });
    expect(panel.fail).toHaveBeenCalled();
    const row = screen.getByRole("row", { name: /C1/ });
    await withReason("Anulez voucherul", "emis din greșeală", row);
    expect(last("POST", "/api/v1/staff/vouchers/1/cancel")?.body).toEqual({ location_id: "l1", reason: "emis din greșeală" });
    fireEvent.change(screen.getByLabelText("Starea"), { target: { value: "" } });
    answers["GET /api/v1/staff/panel/vouchers"] = () => json([]);
    fireEvent.change(screen.getByLabelText("Starea"), { target: { value: "redeemed" } });
    await settle();
    expect(screen.getByText("Niciun voucher.")).toBeTruthy();
  });

  it("says when the day has no transactions", async () => {
    answers["GET /api/v1/staff/panel/transactions"] = () => json([]);
    mount(<Money />, ["payments.view"]);
    await settle();
    expect(screen.getByText("Nicio tranzacție în această zi.")).toBeTruthy();
    expect(screen.queryByText("Vouchere")).toBeNull();
  });
});

describe("a payment recorded for a booking (Q9, R-067)", () => {
  beforeEach(() => {
    Object.assign(answers, {
      "GET /api/v1/staff/panel/resources": () => json([{ id: "r1", location_id: "l1", kind: "padel_court", slug: "t1", name: "Teren 1", parent_id: null, capacity: null, attributes: {}, is_active: true, sort_order: 1 }]),
      "GET /api/v1/staff/panel/hours": () => json({ opens: "08:00", closes: "23:00" }),
      "GET /api/v1/staff/bookings": () =>
        json([{ id: "b1", location_id: "l1", resource_id: "r1", resource_name: "Teren 1", coach_id: null, starts_at: "2027-03-16T08:00:00Z", ends_at: "2027-03-16T09:30:00Z", status: "confirmed", session_type: "free_rental", source: "online", price_total: 18050, price_provisional: false, cancellation_outcome: "", cancelled_at: null, promoted_at: null, organizer_id: "u1", organizer_name: "Ana Pop" }]),
      "POST /api/v1/staff/payments": refused("payments.overpaid", 409),
    });
  });

  it("records cash with one key per attempt, a new key for another amount", async () => {
    const panel = mount(<Calendar />, ["bookings.view", "bookings.manage", "payments.record"]);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: /Ana Pop/ }));
    expect(screen.getByText("b1")).toBeTruthy(); // the booking code, for a tournament match
    const details = screen.getByRole("region", { name: "Detaliile rezervării" });
    fireEvent.click(within(details).getByRole("button", { name: "Înregistrez o plată" }));
    expect((within(details).getByLabelText("Suma (lei, numerar)") as HTMLInputElement).value).toBe("180,50");
    fireEvent.change(within(details).getByLabelText("Motivul"), { target: { value: "chioșcul era oprit" } });
    await submit("Înregistrez o plată");
    await submit("Înregistrez o plată");
    const keys = calls.filter((c) => c.path === "/api/v1/staff/payments");
    expect(keys).toHaveLength(2);
    expect(keys[0]?.body).toEqual({ payer_id: "u1", booking_id: "b1", amount: 18050, method: "cash", tendered: 18050, reason: "chioșcul era oprit" });
    expect(keys[0]?.idempotencyKey).toBeTruthy();
    expect(keys[1]?.idempotencyKey).toBe(keys[0]?.idempotencyKey); // the retry: the same key
    fireEvent.change(within(details).getByLabelText("Suma (lei, numerar)"), { target: { value: "0" } });
    await submit("Înregistrez o plată");
    expect(calls.filter((c) => c.path === "/api/v1/staff/payments")).toHaveLength(2); // nothing sent for 0
    answers["POST /api/v1/staff/payments"] = () => json({ id: "p", transaction_id: "x", amount: 10000, change: 0, tendered: 10000, method: "cash", fiscal_receipt: "", created_at: "2027-03-16T08:00:00Z" }, 201);
    fireEvent.change(within(details).getByLabelText("Suma (lei, numerar)"), { target: { value: "100" } });
    await submit("Înregistrez o plată");
    expect(panel.notify).toHaveBeenCalledWith("Plata de 100 lei a fost înregistrată.");
    expect(last("POST", "/api/v1/staff/payments")?.idempotencyKey).not.toBe(keys[0]?.idempotencyKey);
    expect(panel.fail).toHaveBeenCalledTimes(3);
  });
});

describe("cash and fiscal (R-064)", () => {
  const cash = {
    safe: 40000,
    kiosks: [
      { device_id: "d1", name: "Chioșc Plăți 1", is_active: true, in_box: 6000, received_today: 10000, change_given_today: 500, moved_today: -4000 },
      { device_id: "d2", name: "Chioșc Plăți 2", is_active: false, in_box: 0, received_today: 0, change_given_today: 0, moved_today: 0 },
    ],
    operations: [
      { id: "o1", device: "Chioșc Plăți 1", kind: "day_close", staff: "Ion Casier", amount: 6000, ledger_amount: 6000, difference: 0, result: { number: 12, day: { received: 10000, change_given: 500, moved_to_or_from_safe: -4000 } }, created_at: "2027-03-15T21:00:00Z", completed_at: "2027-03-15T21:01:00Z" },
      { id: "o2", device: "Chioșc Plăți 1", kind: "count", staff: "Ion Casier", amount: 5900, ledger_amount: 6000, difference: -100, result: {}, created_at: "2027-03-15T20:00:00Z", completed_at: "2027-03-15T20:01:00Z" },
      { id: "o3", device: "Chioșc Plăți 1", kind: "refill", staff: "Ion Casier", amount: null, ledger_amount: null, difference: null, result: {}, created_at: "2027-03-15T19:00:00Z", completed_at: null },
      { id: "o4", device: "Chioșc Plăți 1", kind: "day_close", staff: "Ion Casier", amount: 0, ledger_amount: null, difference: null, result: {}, created_at: "2027-03-14T21:00:00Z", completed_at: "2027-03-14T21:01:00Z" },
    ],
  };
  beforeEach(() => {
    Object.assign(answers, {
      "GET /api/v1/staff/panel/cash": () => json(cash),
      "POST /api/v1/staff/kiosk-pin": () => json({ ok: true }),
    });
  });

  it("shows the kiosks, the safe, the differences and the Z reports", async () => {
    mount(<Cash />, ["payments.view"]);
    await settle();
    expect(screen.getByText("400 lei")).toBeTruthy();
    expect(screen.getByText(/Chioșc Plăți 2 · dezactivat/)).toBeTruthy();
    expect(screen.getByText("Diferență față de registru: -1 leu (registrul: 60 lei)".replace("-1 leu", "-1 lei"))).toBeTruthy();
    expect(screen.getByText("Raport Z nr. 12")).toBeTruthy();
    expect(screen.getByText("Raport Z nr. —")).toBeTruthy();
    expect(screen.getByText("în curs")).toBeTruthy();
    expect(screen.queryByRole("form", { name: "PIN-ul meu pentru chioșc" })).toBeNull();
  });

  it("sets the staff member's kiosk PIN (Q54)", async () => {
    answers["GET /api/v1/staff/panel/cash"] = () => json({ safe: 0, kiosks: [], operations: [] });
    const panel = mount(<Cash />, ["cash.manage"]);
    await settle();
    expect(screen.getByText("Niciun Chioșc de Plăți la această locație.")).toBeTruthy();
    expect(screen.getByText("Nicio operațiune încă.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("PIN nou (6 cifre)"), { target: { value: "482913" } });
    fireEvent.change(screen.getByLabelText("Repetă PIN-ul"), { target: { value: "482914" } });
    await submit("PIN-ul meu pentru chioșc");
    expect(screen.getByRole("alert").textContent).toBe("Cele două PIN-uri nu sunt la fel.");
    fireEvent.change(screen.getByLabelText("Repetă PIN-ul"), { target: { value: "482913" } });
    await submit("PIN-ul meu pentru chioșc");
    expect(last("POST", "/api/v1/staff/kiosk-pin")?.body).toEqual({ pin: "482913" });
    expect(panel.notify).toHaveBeenCalledWith("PIN-ul a fost salvat.");
    answers["POST /api/v1/staff/kiosk-pin"] = refused("payments.pin_weak", 422);
    fireEvent.change(screen.getByLabelText("PIN nou (6 cifre)"), { target: { value: "111111" } });
    fireEvent.change(screen.getByLabelText("Repetă PIN-ul"), { target: { value: "111111" } });
    await submit("PIN-ul meu pentru chioșc");
    expect(panel.fail).toHaveBeenCalled();
  });
});

describe("the café (R-110…R-113)", () => {
  const order = (id: string, status: string, number: number) => ({ id, number, status, total: 2400, created_at: "2027-03-16T07:50:00Z", ready_at: null, lines: [{ name: "Espresso", quantity: 2, unit_price: 1200 }] });
  const menu = [
    {
      id: "c1",
      name_ro: "Băuturi",
      name_en: "Drinks",
      sort_order: 1,
      products: [
        { id: "p1", name_ro: "Espresso", name_en: "Espresso", price: 1200, marker: "to_set", is_available: true, sort_order: 1 },
        { id: "p2", name_ro: "Limonadă", name_en: "Lemonade", price: 1800, marker: "confirmed", is_available: false, sort_order: 2 },
      ],
    },
  ];
  beforeEach(() => {
    Object.assign(answers, {
      "GET /api/v1/staff/cafe/queue": () => json([order("o1", "new", 7), order("o2", "preparing", 8), order("o3", "ready", 9), order("o4", "picked_up", 10)]),
      "POST /api/v1/staff/cafe/orders/o1/status": () => json(order("o1", "preparing", 7)),
      "POST /api/v1/staff/cafe/orders/o2/status": refused("cafe.invalid_transition", 409),
      "POST /api/v1/staff/cafe/orders/o1/cancel": () => json(order("o1", "cancelled", 7)),
      "POST /api/v1/staff/cafe/orders": () => json(order("o9", "new", 11), 201),
      "GET /api/v1/staff/panel/cafe/menu": () => json(menu),
      "PUT /api/v1/staff/cafe/products/p1": () => json({}),
      "POST /api/v1/staff/cafe/products": () => json({}, 201),
      "POST /api/v1/staff/cafe/categories": () => json({}, 201),
    });
  });

  it("moves orders along, cancels one with a reason, takes one at the bar with an idempotency key", async () => {
    const panel = mount(<Cafe />, ["cafe.orders", "cafe.manage", "payments.record"]);
    await settle();
    await click("Încep prepararea", screen.getByRole("row", { name: /#7/ }));
    expect(last("POST", "/api/v1/staff/cafe/orders/o1/status")?.body).toEqual({ status: "preparing" });
    await click("E gata", screen.getByRole("row", { name: /#8/ }));
    expect(panel.fail).toHaveBeenCalledTimes(1);
    expect(within(screen.getByRole("row", { name: /#9/ })).getByRole("button", { name: "A fost ridicată" })).toBeTruthy();
    expect(within(screen.getByRole("row", { name: /#10/ })).queryByRole("button")).toBeNull();
    await withReason("Anulez comanda", "clientul a plecat", screen.getByRole("row", { name: /#7/ }));
    expect(last("POST", "/api/v1/staff/cafe/orders/o1/cancel")?.body).toEqual({ reason: "clientul a plecat" });
    const counter = screen.getByRole("region", { name: "Comandă la bar" });
    expect(within(counter).queryByLabelText(/Limonadă/)).toBeNull(); // off the menu: not sold at the bar
    await withReason("Trec comanda", "chioșcul era ocupat"); // nothing chosen: refused before sending
    expect(calls.some((c) => c.method === "POST" && c.path === "/api/v1/staff/cafe/orders")).toBe(false);
    fireEvent.change(within(counter).getByLabelText(/Espresso · 12 lei/), { target: { value: "2" } });
    expect(screen.getByText("Total: 24 lei")).toBeTruthy();
    await withReason("Trec comanda", "chioșcul era ocupat");
    expect(last("POST", "/api/v1/staff/cafe/orders")?.idempotencyKey).toBeTruthy();
    expect(last("POST", "/api/v1/staff/cafe/orders")?.body).toEqual({ location_id: "l1", lines: [{ product_id: "p1", quantity: 2 }], method: "cash", tendered: 2400, reason: "chioșcul era ocupat" });
    expect(panel.notify).toHaveBeenCalledWith("Comanda #11 a fost trecută.");
  });

  it("edits the menu: a price confirmed by the owner, a product taken off, a new category", async () => {
    const panel = mount(<Cafe />, ["cafe.manage"]);
    await settle();
    expect(screen.queryByText("Comenzile")).toBeNull();
    const espresso = screen.getByRole("form", { name: "Espresso" });
    expect(within(espresso).getByText("DE_STABILIT")).toBeTruthy();
    fireEvent.change(within(espresso).getByLabelText("Preț (lei)"), { target: { value: "13,5" } });
    fireEvent.click(within(espresso).getByLabelText("În meniu"));
    fireEvent.click(within(espresso).getByLabelText("Hotărât de proprietar"));
    await submit("Espresso");
    expect(last("PUT", "/api/v1/staff/cafe/products/p1")?.body).toEqual({ location_id: "l1", category_id: "c1", name_ro: "Espresso", name_en: "Espresso", price: 1350, is_available: false, confirmed: true, sort_order: 1 });
    const added = screen.getByRole("form", { name: "Produs nou în Băuturi" });
    fireEvent.change(within(added).getByLabelText("Nume (RO)"), { target: { value: "Ceai" } });
    fireEvent.change(within(added).getByLabelText("Nume (EN)"), { target: { value: "Tea" } });
    fireEvent.change(within(added).getByLabelText("Preț (lei)"), { target: { value: "abc" } });
    await submit("Produs nou în Băuturi");
    expect(within(added).getByRole("alert")).toBeTruthy();
    fireEvent.change(within(added).getByLabelText("Preț (lei)"), { target: { value: "10" } });
    await submit("Produs nou în Băuturi");
    expect(last("POST", "/api/v1/staff/cafe/products")?.body).toMatchObject({ name_ro: "Ceai", price: 1000, sort_order: 3 });
    expect((within(added).getByLabelText("Nume (RO)") as HTMLInputElement).value).toBe("");
    const category = screen.getByRole("form", { name: "Categorie nouă" });
    fireEvent.change(within(category).getByLabelText("Nume (RO)"), { target: { value: "Gustări" } });
    fireEvent.change(within(category).getByLabelText("Nume (EN)"), { target: { value: "Snacks" } });
    await submit("Categorie nouă");
    expect(last("POST", "/api/v1/staff/cafe/categories")?.body).toEqual({ location_id: "l1", name_ro: "Gustări", name_en: "Snacks", sort_order: 2 });
    answers["POST /api/v1/staff/cafe/categories"] = refused();
    answers["PUT /api/v1/staff/cafe/products/p1"] = refused();
    await submit("Categorie nouă");
    await submit("Espresso");
    expect(panel.fail).toHaveBeenCalledTimes(2);
  });

  it("says when no order is waiting", async () => {
    answers["GET /api/v1/staff/cafe/queue"] = () => json([]);
    mount(<Cafe />, ["cafe.orders"]);
    await settle();
    expect(screen.getByText("Nicio comandă în lucru.")).toBeTruthy();
    expect(screen.queryByText("Comandă la bar")).toBeNull();
  });
});
