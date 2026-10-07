/** The panel's daily operations (§8.6): the bookings calendar (new, drag to move, move and cancel
 * from the details, R-043 answered by the server), resources, prices (DE_STABILIT, Q21),
 * subscriptions (R-082, Q12, R-086), companies (R-088), classes (R-101) and attendance (R-073). */
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, clubDay, clubMinutes, clubMoment, hhmm, monday, toMinutes } from "../clock";
import { t } from "../i18n";
import { type Call, fakeApi, json, mountPanel, settle } from "../test-kit";
import { toBani, toLei } from "../ui";
import { Attendance, noticeText } from "./Attendance";
import { Calendar } from "./Calendar";
import { Classes } from "./Classes";
import { Corporate } from "./Corporate";
import { MODULES, allowed } from "./index";
import { Pricing } from "./Pricing";
import { Resources } from "./Resources";
import { Subscriptions } from "./Subscriptions";

const resource = (id: string, name: string, kind: string, extra: Record<string, unknown> = {}) => ({
  id,
  location_id: "l1",
  kind,
  slug: id,
  name,
  parent_id: null,
  capacity: null,
  attributes: {},
  is_active: true,
  sort_order: 1,
  ...extra,
});
const RESOURCES = [
  resource("r1", "Teren 1", "padel_court"),
  resource("r2", "Teren 2", "padel_court"),
  resource("s1", "Sala pilates", "pilates_studio", { capacity: 6 }),
  resource("f1", "Reformer 1", "reformer", { parent_id: "s1" }),
  resource("f5", "Reformer 5", "reformer", { parent_id: "s1", is_active: false }),
  resource("e1", "Sala de evenimente", "event_room"),
];
const booking = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  location_id: "l1",
  resource_id: "r1",
  resource_name: "Teren 1",
  coach_id: null,
  starts_at: "2027-03-16T08:00:00Z", // 10:00 at the club
  ends_at: "2027-03-16T09:30:00Z",
  status: "confirmed",
  session_type: "free_rental",
  source: "online",
  price_total: 18000,
  price_provisional: true,
  cancellation_outcome: "",
  cancelled_at: null,
  promoted_at: null,
  organizer_id: "u1",
  organizer_name: "Ana Pop",
  ...extra,
});
const USERS = { total: 1, items: [{ id: "u1", first_name: "Ana", last_name: "Pop", email: "ana@club.ro", phone: "", account_type: "full", is_active: true, is_demo: false }] };

let answers: Record<string, (body: unknown, url: URL) => Response>;
let calls: Call[];

function mount(ui: React.ReactNode, actions: string[], path: string[] = []) {
  const api = fakeApi(answers);
  calls = api.calls;
  return mountPanel(ui, api.fetchStub, actions, path);
}

const body = (method: string, path: string) => calls.filter((c) => c.method === method && c.path === path).at(-1)?.body;

async function submit(name: string) {
  await act(async () => {
    fireEvent.submit(screen.getByRole("form", { name }));
  });
  await settle();
}

async function withReason(button: string, reason = "cerut la telefon", scope: HTMLElement = document.body) {
  fireEvent.click(within(scope).getByRole("button", { name: button }));
  fireEvent.change(within(scope).getByLabelText("Motivul"), { target: { value: reason } });
  await submit(button);
}

async function pickCustomer(label = "Clientul") {
  fireEvent.change(screen.getByLabelText(label), { target: { value: "ana" } });
  await act(async () => fireEvent.keyDown(screen.getByLabelText(label), { key: "Enter" }));
  await settle();
  fireEvent.click(screen.getByRole("button", { name: "Pop Ana · ana@club.ro" }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2027-03-16T08:00:00Z")); // Tuesday, 10:00 at the club
  answers = {
    "GET /api/v1/staff/panel/resources": () => json(RESOURCES),
    "GET /api/v1/staff/panel/hours": () => json({ opens: "08:00", closes: "23:00" }),
    "GET /api/v1/staff/panel/coaches": () => json([{ id: "c1", name: "Mihai Antrenor" }]),
    "GET /api/v1/staff/bookings": () => json([booking("b1"), booking("b2", { status: "cancelled", resource_id: "r2" })]),
    "GET /api/v1/staff/users": () => json(USERS),
    "POST /api/v1/staff/bookings": () => json(booking("b3", { resource_id: "r2" }), 201),
    "POST /api/v1/staff/bookings/b1/move": () => json(booking("b1")),
    "POST /api/v1/bookings/b1/cancel": () => json(booking("b1", { status: "cancelled" })),
  };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("club time (ADR-0010)", () => {
  it("lays out and sends moments in Bucharest time across the change to summer time", () => {
    expect(clubMoment("2027-03-16", 600)).toBe("2027-03-16T10:00:00+02:00");
    expect(clubMoment("2027-03-28", 600)).toBe("2027-03-28T10:00:00+03:00"); // the opening month
    expect(clubMoment("2027-10-31", 1380)).toBe("2027-10-31T23:00:00+02:00");
    expect(clubDay("2027-03-31T22:30:00Z")).toBe("2027-04-01");
    expect(clubMinutes("2027-03-28T07:00:00Z")).toBe(600);
    expect(clubMinutes("2027-03-16T22:00:00Z", "2027-03-16")).toBe(1440); // midnight, the day after
    expect(clubMinutes("2027-03-15T21:00:00Z", "2027-03-16")).toBe(0);
    expect([toMinutes("08:30"), hhmm(630), addDays("2027-02-28", 1), monday("2027-03-21")]).toEqual([510, "10:30", "2027-03-01", "2027-03-15"]);
  });

  it("reads lei typed by staff as bani (ADR-0009)", () => {
    expect([toBani("60"), toBani("60,5"), toBani("60.05"), toBani("x"), toBani("1,234")]).toEqual([6000, 6050, 6005, null, null]);
    expect([toLei(6000), toLei(6050), toLei(5)]).toEqual(["60", "60,50", "0,05"]);
  });
});

describe("the menu (§8.6)", () => {
  it("shows each module only to the roles that may use it", () => {
    const routes = (actions: string[]) => allowed(MODULES, (a) => actions.includes(a)).map((m) => m.route);
    expect(routes(["bookings.view", "attendance.view"])).toEqual(["dashboard", "calendar", "classes", "attendance"]);
    expect(routes(["pricing.manage", "resources.manage"])).toEqual(["resources", "pricing"]);
  });
});

describe("the bookings calendar", () => {
  it("draws the day and books a free cell for a customer", async () => {
    const panel = mount(<Calendar />, ["bookings.view", "bookings.manage"]);
    await settle();
    expect(Array.from(document.querySelectorAll(".calendar__head")).map((h) => h.textContent)).toEqual(["Teren 1", "Teren 2", "Reformer 1", "Sala de evenimente"]);
    expect(screen.getByText(/anulate: 1/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ana Pop/ }).style.top).toBe(`${4 * 28}px`); // 10:00, two hours after 08:00
    expect((screen.getByRole("button", { name: "Sala de evenimente, 10:00" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Teren 2, 12:00" }));
    await settle();
    await pickCustomer();
    fireEvent.change(screen.getByLabelText("Tipul"), { target: { value: "lesson" } });
    fireEvent.change(screen.getByLabelText("Antrenorul"), { target: { value: "c1" } });
    fireEvent.change(screen.getByLabelText("Durata"), { target: { value: "60" } });
    await submit("Rezervare nouă");
    expect(body("POST", "/api/v1/staff/bookings")).toEqual({
      resource_id: "r2",
      starts_at: "2027-03-16T12:00:00+02:00",
      duration_minutes: 60,
      session_type: "lesson",
      for_user_id: "u1",
      customer_type: "standard",
      coach_id: "c1",
    });
    expect(panel.notify).toHaveBeenCalledWith("Rezervarea a fost făcută: 180 lei.");
  });

  it("moves a booking dragged onto another cell, with a reason", async () => {
    const panel = mount(<Calendar />, ["bookings.view", "bookings.manage"]);
    await settle();
    fireEvent.dragStart(screen.getByRole("button", { name: /Ana Pop/ }), { dataTransfer: { setData: vi.fn() } });
    fireEvent.dragOver(screen.getByRole("button", { name: "Teren 2, 12:00" }));
    fireEvent.drop(screen.getByRole("button", { name: "Teren 2, 12:00" }));
    const region = screen.getByRole("region", { name: "Mut rezervarea" });
    expect(within(region).getByText("Ana Pop → Teren 2, ora 12:00")).toBeTruthy();
    await withReason("Mut rezervarea", "cerut la telefon", region);
    expect(body("POST", "/api/v1/staff/bookings/b1/move")).toEqual({ resource_id: "r2", starts_at: "2027-03-16T12:00:00+02:00", reason: "cerut la telefon" });
    expect(panel.notify).toHaveBeenCalledWith("Rezervarea a fost mutată.");
    // A drop with nothing dragged, and "give up", change nothing.
    fireEvent.drop(screen.getByRole("button", { name: "Teren 2, 13:00" }));
    expect(screen.queryByRole("region", { name: "Mut rezervarea" })).toBeNull();
    fireEvent.dragStart(screen.getByRole("button", { name: /Ana Pop/ }));
    fireEvent.dragEnd(screen.getByRole("button", { name: /Ana Pop/ }));
    fireEvent.dragStart(screen.getByRole("button", { name: /Ana Pop/ }));
    fireEvent.drop(screen.getByRole("button", { name: "Teren 1, 15:00" }));
    fireEvent.click(within(screen.getByRole("region", { name: "Mut rezervarea" })).getByRole("button", { name: "Renunț" }));
    expect(screen.queryByRole("region", { name: "Mut rezervarea" })).toBeNull();
  });

  it("moves and cancels from the details, and shows the server's refusal", async () => {
    answers["POST /api/v1/staff/bookings/b1/move"] = () => json({ error: { code: "booking.slot_taken", params: {} } }, 409);
    const panel = mount(<Calendar />, ["bookings.view", "bookings.manage"]);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: /Ana Pop/ }));
    const details = screen.getByRole("region", { name: "Detaliile rezervării" });
    expect(within(details).getByText(/preț orientativ/)).toBeTruthy();
    expect(within(details).getByRole("link", { name: "Fișa clientului" }).getAttribute("href")).toBe("#/users/u1");
    fireEvent.click(within(details).getByRole("button", { name: "Mut rezervarea" }));
    fireEvent.change(within(details).getByLabelText("Resursa"), { target: { value: "r2" } });
    fireEvent.change(within(details).getByLabelText("Ora de început"), { target: { value: String(14 * 60) } });
    fireEvent.change(within(details).getByLabelText("Motivul"), { target: { value: "teren ud" } });
    await submit("Mut rezervarea");
    expect(body("POST", "/api/v1/staff/bookings/b1/move")).toMatchObject({ resource_id: "r2", starts_at: "2027-03-16T14:00:00+02:00" });
    expect(panel.fail).toHaveBeenCalled();
    fireEvent.click(within(details).getByRole("button", { name: "Renunț" }));
    fireEvent.click(within(details).getByRole("button", { name: "Anulez rezervarea" }));
    fireEvent.click(within(details).getByLabelText(/Fără taxă de anulare/));
    fireEvent.change(within(details).getByLabelText("Motivul"), { target: { value: "ploaie" } });
    await submit("Anulez rezervarea");
    expect(body("POST", "/api/v1/bookings/b1/cancel")).toEqual({ reason: "ploaie", waive: true });
    expect(panel.notify).toHaveBeenCalledWith("Rezervarea a fost anulată.");
    fireEvent.click(within(details).getByRole("button", { name: "Închide" }));
    expect(screen.queryByRole("region", { name: "Detaliile rezervării" })).toBeNull();
  });

  it("changes the day and stays read-only without bookings.manage", async () => {
    answers["GET /api/v1/staff/panel/hours"] = () => json({ error: { code: "auth.forbidden", params: {} } }, 403);
    answers["GET /api/v1/staff/bookings"] = () => json([booking("b1")]);
    mount(<Calendar />, ["bookings.view"]);
    await settle();
    expect((screen.getByRole("button", { name: "Teren 1, 08:00" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /Ana Pop/ }).getAttribute("draggable")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /Ana Pop/ }));
    expect(screen.queryByRole("button", { name: "Anulez rezervarea" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ziua următoare" }));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Ziua anterioară" }));
    fireEvent.click(screen.getByRole("button", { name: "Ziua anterioară" }));
    await settle();
    fireEvent.change(screen.getByLabelText("Ziua"), { target: { value: "2027-04-02" } });
    fireEvent.change(screen.getByLabelText("Ziua"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Azi" }));
    await settle();
    const days = calls.filter((c) => c.path === "/api/v1/staff/bookings").map((c) => new URLSearchParams(c.query).get("day"));
    expect(days).toEqual(expect.arrayContaining(["2027-03-16", "2027-03-17", "2027-03-15", "2027-04-02"]));
  });

  it("never shows the day before under the new day, even when its answer comes last", async () => {
    let late: (response: Response) => void = () => undefined;
    answers["GET /api/v1/staff/bookings"] = (_body, url) =>
      url.searchParams.get("day") === "2027-03-16"
        ? (new Promise<Response>((resolve) => (late = resolve)) as unknown as Response)
        : json([]);
    mount(<Calendar />, ["bookings.view", "bookings.manage"]);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Ziua următoare" }));
    await settle();
    await act(async () => late(json([booking("b1")])));
    await settle();
    expect(screen.queryByRole("button", { name: /Ana Pop/ })).toBeNull();
    expect(screen.queryByRole("region", { name: "În afara programului zilei" })).toBeNull();
  });

  it("lists a booking outside the day's hours under the grid, never over the 08:00 cells", async () => {
    // Yesterday 23:00–00:30 (club time): only its last half hour is on this day, before opening.
    const late = booking("b9", { starts_at: "2027-03-15T21:00:00Z", ends_at: "2027-03-15T22:30:00Z", organizer_name: "Dan Late" });
    answers["GET /api/v1/staff/bookings"] = () => json([booking("b1"), late]);
    mount(<Calendar />, ["bookings.view", "bookings.manage"]);
    await settle();
    const court = screen.getByRole("group", { name: "Teren 1" });
    expect(within(court).queryByRole("button", { name: /Dan Late/ })).toBeNull();
    expect(within(court).getByRole("button", { name: "Teren 1, 08:00" })).toBeTruthy();
    const outside = screen.getByRole("region", { name: "În afara programului zilei" });
    fireEvent.click(within(outside).getByRole("button", { name: "Teren 1 · 23:00–00:30 · Dan Late" }));
    expect(screen.getByRole("region", { name: "Detaliile rezervării" })).toBeTruthy();
    // Within the hours, nothing is listed apart.
    answers["GET /api/v1/staff/bookings"] = () => json([booking("b4", { starts_at: "2027-03-17T08:00:00Z", ends_at: "2027-03-17T09:30:00Z" })]);
    fireEvent.click(screen.getByRole("button", { name: "Ziua următoare" }));
    await settle();
    expect(screen.queryByRole("region", { name: "În afara programului zilei" })).toBeNull();
  });

  it("books a Reformer lesson and reports a refused booking", async () => {
    answers["POST /api/v1/staff/bookings"] = () => json({ error: { code: "booking.slot_taken", params: {} } }, 409);
    const panel = mount(<Calendar />, ["bookings.view", "bookings.manage"]);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Reformer 1, 09:00" }));
    await settle();
    const form = screen.getByRole("form", { name: "Rezervare nouă" });
    expect((within(form).getByLabelText("Durata") as HTMLSelectElement).value).toBe("60");
    await pickCustomer();
    fireEvent.click(screen.getByRole("button", { name: "schimb" }));
    await pickCustomer();
    fireEvent.change(screen.getByLabelText("Antrenorul"), { target: { value: "c1" } });
    await submit("Rezervare nouă");
    expect(panel.fail).toHaveBeenCalled();
    fireEvent.click(within(form).getByRole("button", { name: "Renunț" }));
    expect(screen.queryByRole("form", { name: "Rezervare nouă" })).toBeNull();
  });
});

describe("resources", () => {
  beforeEach(() => {
    answers["POST /api/v1/staff/resources"] = () => json(resource("f6", "Reformer 6", "reformer"), 201);
    answers["PATCH /api/v1/staff/resources/f5"] = () => json(resource("f5", "Reformer 5", "reformer"));
  });

  it("adds a Reformer to the studio and puts one back in use, with a reason (Q46)", async () => {
    const panel = mount(<Resources />, ["resources.manage"]);
    await settle();
    expect(screen.getAllByText("Scoasă din uz")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Resursă nouă" }));
    const form = screen.getByRole("form", { name: "Resursă nouă" });
    fireEvent.change(within(form).getByLabelText("Nume"), { target: { value: " Reformer 6 " } });
    fireEvent.change(within(form).getByLabelText(/Cod în adresă/), { target: { value: "reformer-6" } });
    fireEvent.change(within(form).getByLabelText("Tipul"), { target: { value: "reformer" } });
    fireEvent.change(within(form).getByLabelText("Sala"), { target: { value: "s1" } });
    fireEvent.change(within(form).getByLabelText("Capacitate"), { target: { value: "1" } });
    await submit("Resursă nouă");
    expect(body("POST", "/api/v1/staff/resources")).toMatchObject({ name: "Reformer 6", kind: "reformer", parent_id: "s1", capacity: 1, is_active: true });
    const row = screen.getByRole("row", { name: /Reformer 5/ });
    await withReason("Repun în uz", "al cincilea aparat a sosit", row);
    expect(body("PATCH", "/api/v1/staff/resources/f5")).toEqual({ is_active: true, reason: "al cincilea aparat a sosit" });
    fireEvent.click(within(row).getByRole("button", { name: "Modific" }));
    fireEvent.change(within(row).getByLabelText("Nume"), { target: { value: "Reformer V" } });
    fireEvent.change(within(row).getByLabelText("Capacitate"), { target: { value: "" } });
    fireEvent.change(within(row).getByLabelText("Motivul"), { target: { value: "redenumire" } });
    await submit("Modific");
    expect(body("PATCH", "/api/v1/staff/resources/f5")).toEqual({ name: "Reformer V", capacity: null, reason: "redenumire" });
    expect(panel.notify).toHaveBeenCalledWith("S-a salvat.");
  });

  it("is read-only without the permission and reports a refused creation", async () => {
    answers["POST /api/v1/staff/resources"] = () => json({ error: { code: "resources.slug_taken", params: {} } }, 409);
    mount(<Resources />, []);
    await settle();
    expect(screen.queryByRole("button", { name: "Scot din uz" })).toBeNull();
    cleanup();
    const panel = mount(<Resources />, ["resources.manage"]);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Resursă nouă" }));
    const form = screen.getByRole("form", { name: "Resursă nouă" });
    fireEvent.change(within(form).getByLabelText("Nume"), { target: { value: "Teren 3" } });
    fireEvent.change(within(form).getByLabelText(/Cod în adresă/), { target: { value: "teren-1" } });
    await submit("Resursă nouă");
    expect(body("POST", "/api/v1/staff/resources")).toMatchObject({ kind: "padel_court", parent_id: null, capacity: null });
    expect(panel.fail).toHaveBeenCalled();
  });
});

describe("prices (Q21)", () => {
  const rate = { id: "p1", resource_kind: "padel_court", product: "rental", band: "peak", customer_type: "standard", season: "all", amount_per_half_hour: 6000, marker: "to_set", note: "", updated_at: "2027-03-01T10:00:00Z" };
  beforeEach(() => {
    answers["GET /api/v1/pricing/jungle/rates"] = () => json([rate, { ...rate, id: "p2", band: "off_peak", marker: "confirmed" }]);
    answers["GET /api/v1/subscriptions/options"] = () =>
      json({ intensities: { start: 4, active: 8, pro: 12 }, bundle_discounts: {}, period_discounts: {}, start_rule_below_sessions: 8, rates: [{ sport: "padel", sessions_per_month: 8, monthly_price: 40000, marker: "to_set" }] });
    answers["PUT /api/v1/staff/pricing/rates"] = () => json(rate);
    answers["PUT /api/v1/staff/subscriptions/rates"] = () => json({});
  });

  it("changes an hourly rate and a subscription rate, marking the owner's decision", async () => {
    const panel = mount(<Pricing />, ["pricing.manage"]);
    await settle();
    expect(screen.getAllByText("DE_STABILIT")).toHaveLength(2);
    const peak = screen.getByRole("form", { name: "Teren de padel · Închiriere · Vârf (17–22)" });
    expect((within(peak).getByRole("textbox") as HTMLInputElement).value).toBe("120");
    fireEvent.change(within(peak).getByRole("textbox"), { target: { value: "120,01" } });
    await submit("Teren de padel · Închiriere · Vârf (17–22)");
    expect(screen.getByRole("alert").textContent).toMatch(/număr par de bani/);
    fireEvent.change(within(peak).getByRole("textbox"), { target: { value: "130" } });
    fireEvent.click(within(peak).getByLabelText("Hotărât de proprietar"));
    await submit("Teren de padel · Închiriere · Vârf (17–22)");
    expect(body("PUT", "/api/v1/staff/pricing/rates")).toMatchObject({ location_id: "l1", band: "peak", amount_per_half_hour: 6500, confirmed: true });
    const monthly = screen.getByRole("form", { name: "Padel · 8" });
    fireEvent.change(within(monthly).getByRole("textbox"), { target: { value: "450" } });
    await submit("Padel · 8");
    expect(body("PUT", "/api/v1/staff/subscriptions/rates")).toEqual({ location_id: "l1", sport: "padel", sessions_per_month: 8, monthly_price: 45000, confirmed: false });
    expect(panel.notify).toHaveBeenCalledTimes(2);
  });

  it("shows the prices only, without the permission, and reports a refusal", async () => {
    mount(<Pricing />, []);
    await settle();
    expect(screen.getAllByText("120 lei")).toHaveLength(2);
    expect(screen.getByText("400 lei")).toBeTruthy();
    cleanup();
    answers["PUT /api/v1/staff/pricing/rates"] = () => json({ error: { code: "auth.forbidden", params: {} } }, 403);
    const panel = mount(<Pricing />, ["pricing.manage"]);
    await settle();
    await submit("Teren de padel · Închiriere · Vârf (17–22)");
    expect(panel.fail).toHaveBeenCalled();
  });
});

describe("subscriptions (R-082, R-086, Q12)", () => {
  const sub = (id: string, status: string, extra: Record<string, unknown> = {}) => ({
    id,
    user_id: "u1",
    user_name: "Pop Ana",
    corporate: "",
    period: "monthly",
    starts_on: "2027-03-15",
    ends_on: "2027-04-15",
    status,
    custom: false,
    price_total: 40000,
    price_provisional: false,
    frozen_days: 0,
    usage: [{ sport: "padel", sessions_per_month: 8, used_this_month: 3, makeups_available: 1, peak_allowed: true }],
    ...extra,
  });
  beforeEach(() => {
    answers["GET /api/v1/staff/panel/subscriptions"] = () =>
      json([sub("s1", "active", { corporate: "Firma SRL", frozen_days: 7, custom: true, price_provisional: true }), sub("s2", "pending_payment")]);
    answers["GET /api/v1/subscriptions/options"] = () => json({ intensities: { start: 4, active: 8, pro: 12 }, bundle_discounts: {}, period_discounts: {}, start_rule_below_sessions: 8, rates: [] });
    answers["GET /api/v1/staff/panel/corporate"] = () => json([{ id: "c1", name: "Firma SRL", registration_code: "", billing_email: "", is_active: true, members: [] }]);
    answers["POST /api/v1/subscriptions/s1/freeze"] = () => json({ starts_on: "2027-03-16", ends_on: "2027-03-23" });
    answers["POST /api/v1/subscriptions/s2/cancel"] = () => json(sub("s2", "cancelled"));
    answers["POST /api/v1/staff/subscriptions"] = () => json(sub("s3", "active"), 201);
  });

  it("lists, filters, freezes and drops an unpaid order", async () => {
    const panel = mount(<Subscriptions />, ["subscriptions.manage"]);
    await settle();
    expect(screen.getAllByText("Padel: 3/8 · recuperări: 1")).toHaveLength(2);
    expect(screen.getByText("înghețat: 7 zile")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Starea"), { target: { value: "active" } });
    await settle();
    expect(calls.at(-1)?.query).toContain("status=active");
    fireEvent.click(screen.getByRole("button", { name: "Îngheț" }));
    fireEvent.change(screen.getByLabelText("Zile"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("De la"), { target: { value: "2027-03-16" } });
    await submit("Îngheț");
    expect(body("POST", "/api/v1/subscriptions/s1/freeze")).toEqual({ starts_on: "2027-03-16", days: 7 });
    expect(panel.notify).toHaveBeenCalledWith("Abonamentul e înghețat: 16 mar. 2027 – 23 mar. 2027.");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Renunț la comandă" })));
    await settle();
    expect(calls.some((c) => c.path === "/api/v1/subscriptions/s2/cancel")).toBe(true);
  });

  it("sells a subscription with a custom intensity, billed to a company (Q12, Q35)", async () => {
    const panel = mount(<Subscriptions />, ["subscriptions.manage", "corporate.manage"]);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Abonament nou" }));
    await settle();
    await pickCustomer();
    fireEvent.change(screen.getByLabelText("Perioada"), { target: { value: "quarterly" } });
    fireEvent.change(screen.getByLabelText("Începe la"), { target: { value: "2027-04-01" } });
    fireEvent.change(screen.getByLabelText("Plătit de firmă"), { target: { value: "c1" } });
    fireEvent.click(screen.getByRole("button", { name: "Adaug un sport" }));
    fireEvent.click(screen.getByRole("button", { name: "Adaug un sport" }));
    expect(screen.queryByRole("button", { name: "Adaug un sport" })).toBeNull(); // at most three
    fireEvent.click(screen.getAllByRole("button", { name: "Scot" })[2] as HTMLElement);
    const second = screen.getByRole("group", { name: "Sportul 2" });
    fireEvent.change(within(second).getByLabelText("Sportul"), { target: { value: "pilates" } });
    fireEvent.change(within(second).getByLabelText("Intensitatea"), { target: { value: "" } });
    fireEvent.change(within(second).getByLabelText("Ședințe pe lună"), { target: { value: "6" } });
    fireEvent.change(within(second).getByLabelText("Preț pe lună (lei)"), { target: { value: "abc" } });
    await submit("Abonament nou");
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.change(within(second).getByLabelText("Preț pe lună (lei)"), { target: { value: "350" } });
    await submit("Abonament nou");
    expect(body("POST", "/api/v1/staff/subscriptions")).toEqual({
      location_id: "l1",
      user_id: "u1",
      period: "quarterly",
      starts_on: "2027-04-01",
      corporate_id: "c1",
      selections: [
        { sport: "padel", intensity: "active", sessions: 0, monthly_price: null },
        { sport: "pilates", intensity: "", sessions: 6, monthly_price: 35000 },
      ],
    });
    expect(panel.notify).toHaveBeenCalledWith("Abonamentul a fost creat: 400 lei.");
  });

  it("reports refusals", async () => {
    answers["GET /api/v1/staff/panel/subscriptions"] = () => json([sub("s1", "active"), sub("s2", "pending_payment")]);
    for (const key of ["POST /api/v1/subscriptions/s1/freeze", "POST /api/v1/subscriptions/s2/cancel", "POST /api/v1/staff/subscriptions"]) {
      answers[key] = () => json({ error: { code: "subscriptions.freeze_limit", params: { remaining: 0 } } }, 422);
    }
    const panel = mount(<Subscriptions />, ["subscriptions.manage"]);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Îngheț" }));
    await submit("Îngheț");
    fireEvent.click(screen.getByRole("button", { name: "Renunț" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Renunț la comandă" })));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Abonament nou" }));
    await settle();
    expect(screen.queryByLabelText("Plătit de firmă")).toBeNull(); // no companies without corporate.manage
    await submit("Abonament nou"); // nobody picked yet: nothing is sent
    await pickCustomer();
    await submit("Abonament nou");
    expect(panel.fail).toHaveBeenCalledTimes(3);
    cleanup();
    answers["GET /api/v1/staff/panel/subscriptions"] = () => json([]);
    mount(<Subscriptions />, ["subscriptions.manage"]);
    await settle();
    expect(screen.getByText("Niciun abonament.")).toBeTruthy();
  });
});

describe("companies (R-088)", () => {
  const company = { id: "c1", name: "Firma SRL", registration_code: "RO123", billing_email: "facturi@firma.ro", is_active: true, members: [{ id: "u2", name: "Ban Ion" }] };
  beforeEach(() => {
    answers["GET /api/v1/staff/panel/corporate"] = () => json([company, { ...company, id: "c2", name: "Veche SRL", is_active: false, registration_code: "", billing_email: "", members: [] }]);
    answers["POST /api/v1/staff/corporate"] = () => json({}, 201);
    answers["POST /api/v1/staff/corporate/c1/members"] = () => json({ ok: true }, 201);
    answers["POST /api/v1/staff/corporate/c1/members/u2/remove"] = () => json({ ok: true });
    answers["GET /api/v1/staff/corporate/c1/report"] = () => json({ account_id: "c1", year: 2027, month: 3, billed: 120000, members: [{ user_id: "u2", name: "Ban Ion", sessions: { padel: 4 } }, { user_id: "u3", name: "Nou", sessions: {} }] });
  });

  it("creates a company, adds and removes employees and reads the month's report", async () => {
    const panel = mount(<Corporate />, ["corporate.manage"]);
    await settle();
    expect(screen.getByText("RO123 · facturi@firma.ro")).toBeTruthy();
    expect(screen.getByText(/inactivă/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Firmă nouă" }));
    fireEvent.change(screen.getByLabelText("Numele firmei"), { target: { value: " Nouă SRL " } });
    fireEvent.change(screen.getByLabelText("CUI"), { target: { value: "RO9" } });
    fireEvent.change(screen.getByLabelText("Email pentru facturi"), { target: { value: "f@n.ro" } });
    await submit("Firmă nouă");
    expect(body("POST", "/api/v1/staff/corporate")).toEqual({ location_id: "l1", name: "Nouă SRL", registration_code: "RO9", billing_email: "f@n.ro" });
    const card = screen.getByRole("article", { name: "Firma SRL" });
    await act(async () => fireEvent.click(within(card).getByRole("button", { name: "Scot pe Ban Ion" })));
    await settle();
    expect(panel.notify).toHaveBeenCalledWith("Angajatul a fost scos.");
    fireEvent.change(within(card).getByLabelText("Angajat"), { target: { value: "ana" } });
    await act(async () => fireEvent.click(within(card).getByRole("button", { name: "Găsește" })));
    await settle();
    fireEvent.click(within(card).getByRole("button", { name: "Pop Ana · ana@club.ro" }));
    await act(async () => fireEvent.click(within(card).getByRole("button", { name: "Adaug angajatul" })));
    await settle();
    expect(body("POST", "/api/v1/staff/corporate/c1/members")).toEqual({ user_id: "u1" });
    fireEvent.change(within(card).getByLabelText("Luna"), { target: { value: "2027-03" } });
    await act(async () => fireEvent.click(within(card).getByRole("button", { name: "Raportul lunii" })));
    await settle();
    expect(calls.at(-1)?.query).toBe("?year=2027&month=3");
    expect(within(card).getByText("Facturat: 1.200 lei")).toBeTruthy();
    expect(within(card).getByText("Padel: 4")).toBeTruthy();
  });

  it("reports refusals and says when there is no company", async () => {
    for (const key of ["POST /api/v1/staff/corporate", "GET /api/v1/staff/corporate/c1/report", "GET /api/v1/staff/users"]) {
      answers[key] = () => json({ error: { code: "auth.forbidden", params: {} } }, 403);
    }
    const panel = mount(<Corporate />, ["corporate.manage"]);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Firmă nouă" }));
    fireEvent.change(screen.getByLabelText("Numele firmei"), { target: { value: "X" } });
    await submit("Firmă nouă");
    const card = screen.getByRole("article", { name: "Firma SRL" });
    await act(async () => fireEvent.click(within(card).getByRole("button", { name: "Raportul lunii" })));
    await act(async () => fireEvent.click(within(card).getByRole("button", { name: "Găsește" })));
    await settle();
    expect(panel.fail).toHaveBeenCalledTimes(3);
    cleanup();
    answers["GET /api/v1/staff/panel/corporate"] = () => json([]);
    mount(<Corporate />, ["corporate.manage"]);
    await settle();
    expect(screen.getByText("Nicio firmă.")).toBeTruthy();
  });
});

describe("classes (R-101)", () => {
  const cls = (id: string, starts: string, extra: Record<string, unknown> = {}) => ({
    id,
    kind: "beginner",
    studio_id: "s1",
    studio: "Sala pilates",
    instructor_id: "c1",
    instructor: "Mihai Antrenor",
    starts_at: starts,
    ends_at: starts.replace("16:00", "16:50"),
    capacity: 4,
    enrolled: 3,
    waiting: 1,
    status: "scheduled",
    price_total: 4000,
    price_provisional: false,
    ...extra,
  });
  beforeEach(() => {
    answers["GET /api/v1/staff/panel/classes"] = () => json([cls("k1", "2027-03-16T16:00:00Z"), cls("k2", "2027-03-18T16:00:00Z", { status: "cancelled" })]);
    answers["POST /api/v1/staff/classes"] = () => json({}, 201);
    answers["GET /api/v1/staff/classes/k1/roster"] = () =>
      json({
        session: { id: "k1", kind: "beginner", studio_id: "s1", instructor_name: "Mihai Antrenor", starts_at: "2027-03-16T16:00:00Z", ends_at: "2027-03-16T16:50:00Z", capacity: 4, places_left: 1, price_total: 4000, price_provisional: false },
        people: [
          { enrollment_id: "e1", user_id: "u1", name: "Ana Pop", status: "enrolled" },
          { enrollment_id: "e2", user_id: "u2", name: "Ion Ban", status: "waitlisted" },
        ],
      });
    answers["POST /api/v1/staff/scans"] = () => json({ id: "x", kind: "class_entry", user_id: "u1", booking_id: null, enrollment_id: "e1", resource_id: null, scanned_at: "2027-03-16T15:55:00Z" }, 201);
  });

  it("shows the week and adds a class in club time", async () => {
    const panel = mount(<Classes />, ["bookings.view", "classes.manage"]);
    await settle();
    expect(new URLSearchParams(calls[0]?.query).get("week_of")).toBe("2027-03-15");
    expect(screen.getByText("Ocupate 3 din 4 · în așteptare: 1")).toBeTruthy();
    expect(screen.getByText("Anulată")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /18:00–18:50 · Începători/ })[0]?.getAttribute("href")).toBe("#/classes/k1");
    fireEvent.click(screen.getByRole("button", { name: "Clasă nouă" }));
    await settle();
    expect(screen.getByText("Aparate Reformer în uz în sală: 1")).toBeTruthy();
    const form = screen.getByRole("form", { name: "Clasă nouă" });
    fireEvent.change(within(form).getByLabelText("Sala"), { target: { value: "s1" } });
    fireEvent.change(within(form).getByLabelText("Instructorul"), { target: { value: "c1" } });
    fireEvent.change(within(form).getByLabelText("Nivelul"), { target: { value: "advanced" } });
    fireEvent.change(within(form).getByLabelText("Ziua"), { target: { value: "2027-03-29" } });
    fireEvent.change(within(form).getByLabelText("Ora"), { target: { value: "19:00" } });
    fireEvent.change(within(form).getByLabelText("Durata (minute)"), { target: { value: "55" } });
    fireEvent.change(within(form).getByLabelText("Locuri"), { target: { value: "4" } });
    await submit("Clasă nouă");
    expect(body("POST", "/api/v1/staff/classes")).toEqual({
      studio_id: "s1",
      instructor_id: "c1",
      kind: "advanced",
      starts_at: "2027-03-29T19:00:00+03:00",
      duration_minutes: 55,
      capacity: 4,
    });
    expect(panel.notify).toHaveBeenCalledWith("Clasa a fost adăugată.");
    fireEvent.click(screen.getByRole("button", { name: "Săptămâna următoare" }));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Săptămâna anterioară" }));
    await settle();
    const weeks = calls.filter((c) => c.path === "/api/v1/staff/panel/classes").map((c) => new URLSearchParams(c.query).get("week_of"));
    expect(weeks).toContain("2027-03-22");
  });

  it("marks who came from the list of participants (R-070)", async () => {
    const panel = mount(<Classes />, ["bookings.view", "attendance.record"], ["k1"]);
    expect(screen.getByText("Se încarcă…")).toBeTruthy();
    await settle();
    expect(screen.getByText("Mihai Antrenor · Locuri libere: 1")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "A venit" })).toHaveLength(1); // not the one waiting
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "A venit" })));
    await settle();
    expect(body("POST", "/api/v1/staff/scans")).toEqual({ kind: "class_entry", location_id: "l1", card_token: "", class_session_id: "k1", user_id: "u1" });
    expect(panel.notify).toHaveBeenCalledWith("Prezența lui Ana Pop a fost trecută.");
  });

  it("reports refusals and empty lists", async () => {
    answers["POST /api/v1/staff/classes"] = () => json({ error: { code: "validation.invalid", params: {} } }, 422);
    answers["POST /api/v1/staff/scans"] = () => json({ error: { code: "auth.forbidden", params: {} } }, 403);
    const panel = mount(<Classes />, ["bookings.view", "classes.manage"]);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Clasă nouă" }));
    await settle();
    fireEvent.change(screen.getByLabelText("Instructorul"), { target: { value: "c1" } });
    await submit("Clasă nouă");
    expect(body("POST", "/api/v1/staff/classes")).toMatchObject({ studio_id: "s1", starts_at: "2027-03-16T18:00:00+02:00" });
    cleanup();
    mount(<Classes />, ["bookings.view", "attendance.record"], ["k1"]);
    await settle();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "A venit" })));
    await settle();
    expect(panel.fail).toHaveBeenCalled();
    cleanup();
    answers["GET /api/v1/staff/panel/classes"] = () => json([]);
    answers["GET /api/v1/staff/classes/k1/roster"] = () =>
      json({ session: { id: "k1", kind: "beginner", studio_id: "s1", instructor_name: "M", starts_at: "2027-03-16T16:00:00Z", ends_at: "2027-03-16T16:50:00Z", capacity: 4, places_left: 4, price_total: 0, price_provisional: false }, people: [] });
    mount(<Classes />, ["bookings.view"]);
    await settle();
    expect(screen.getByText("Nicio clasă în această săptămână.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Clasă nouă" })).toBeNull();
    cleanup();
    mount(<Classes />, ["bookings.view"], ["k1"]);
    await settle();
    expect(screen.getByText("Nimeni înscris încă.")).toBeTruthy();
  });
});

describe("attendance (R-073)", () => {
  beforeEach(() => {
    answers["GET /api/v1/staff/notices"] = () =>
      json([
        { id: "n1", kind: "no_show_block", payload: { name: "Ion Ban", no_shows: 3 }, created_at: "2027-03-16T07:00:00Z", read_at: null },
        { id: "n2", kind: "checkout.cash_attention", payload: { problem: "change_not_given" }, created_at: "2027-03-16T06:00:00Z", read_at: "2027-03-16T06:30:00Z" },
      ]);
    answers["POST /api/v1/staff/notices/n1/read"] = () => json({});
    answers["GET /api/v1/staff/restrictions"] = () => json([{ id: "x1", user_id: "u2", name: "Ion Ban", no_show_count: 3, created_at: "2027-03-16T07:00:00Z", lifted_at: null }]);
    answers["POST /api/v1/staff/restrictions/x1/lift"] = () => json({});
    answers["POST /api/v1/staff/scans"] = () => json({ id: "s", kind: "arrival", user_id: "u1", booking_id: null, enrollment_id: null, resource_id: null, scanned_at: "2027-03-16T08:00:00Z" }, 201);
  });

  it("reads the notices, lifts a block with a reason and records a scan by hand", async () => {
    const panel = mount(<Attendance />, ["attendance.view", "restrictions.manage", "attendance.record"]);
    await settle();
    expect(screen.getByText(/Ion Ban a fost blocat după neprezentări \(3\)/)).toBeTruthy();
    expect(screen.getByText(/Numerar de verificat: restul nu a putut fi dat/)).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Am citit" })));
    await settle();
    expect(calls.find((c) => c.path.endsWith("/n1/read"))?.query).toBe("?location_id=l1");
    await withReason("Ridic blocarea", "a explicat absențele");
    expect(body("POST", "/api/v1/staff/restrictions/x1/lift")).toEqual({ location_id: "l1", reason: "a explicat absențele" });
    expect(panel.notify).toHaveBeenCalledWith("Blocarea a fost ridicată.");
    await pickCustomer("Persoana");
    fireEvent.change(screen.getByLabelText("Ce trec"), { target: { value: "court_entry" } });
    fireEvent.change(screen.getByLabelText("Terenul"), { target: { value: "r2" } });
    await submit("Prezență trecută manual");
    expect(body("POST", "/api/v1/staff/scans")).toEqual({ kind: "court_entry", location_id: "l1", card_token: "", user_id: "u1", resource_id: "r2" });
    expect(panel.notify).toHaveBeenCalledWith("Am trecut prezența lui Pop Ana · ana@club.ro la 10:00.");
    await pickCustomer("Persoana");
    fireEvent.change(screen.getByLabelText("Ce trec"), { target: { value: "arrival" } });
    await submit("Prezență trecută manual");
    expect(body("POST", "/api/v1/staff/scans")).toMatchObject({ kind: "arrival", resource_id: null });
  });

  it("shows only what the role may use, the empty lists and the refusals", async () => {
    answers["GET /api/v1/staff/notices"] = () => json([]);
    answers["GET /api/v1/staff/restrictions"] = () => json([]);
    answers["POST /api/v1/staff/scans"] = () => json({ error: { code: "attendance.no_booking", params: {} } }, 409);
    answers["POST /api/v1/staff/notices/n1/read"] = () => json({ error: { code: "common.not_found", params: {} } }, 404);
    const panel = mount(<Attendance />, ["attendance.view", "attendance.record"]);
    await settle();
    expect(screen.getByText("Nicio notificare.")).toBeTruthy();
    expect(screen.queryByText("Jucători blocați după neprezentări")).toBeNull();
    await submit("Prezență trecută manual"); // nobody picked: nothing is sent
    await pickCustomer("Persoana");
    await submit("Prezență trecută manual");
    expect(panel.fail).toHaveBeenCalled();
    cleanup();
    mount(<Attendance />, ["restrictions.manage"]);
    await settle();
    expect(screen.getByText("Niciun jucător blocat.")).toBeTruthy();
    expect(screen.queryByText("Notificări pentru personal")).toBeNull();
    const tr = (key: string, params?: Record<string, unknown>) => t("ro", key, params);
    expect(noticeText(tr, { id: "n", kind: "other.kind", payload: {}, created_at: "", read_at: null })).toBe("other.kind");
    expect(noticeText(tr, { id: "n", kind: "no_show_block", payload: {}, created_at: "", read_at: null })).toMatch(/blocat/);
    cleanup();
    answers["GET /api/v1/staff/notices"] = () => json([{ id: "n1", kind: "no_show_block", payload: { name: "X", no_shows: 3 }, created_at: "2027-03-16T07:00:00Z", read_at: null }]);
    const second = mount(<Attendance />, ["attendance.view"]);
    await settle();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Am citit" })));
    await settle();
    expect(second.fail).toHaveBeenCalled();
  });
});

