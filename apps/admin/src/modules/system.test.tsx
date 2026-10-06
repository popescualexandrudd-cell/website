/** Events, devices (ADR-0012), settings and feature flags (ADR-0022), reports and exports
 * (ADR-0009 §3), the audit log, staff and roles (§8.1), the system status and the modules of the
 * later stages, in the panel. */
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Call, fakeApi, json, mountPanel, settle } from "../test-kit";
import { Audit } from "./Audit";
import { moments } from "./ClubCalendar";
import { Devices } from "./Devices";
import { Events } from "./Events";
import { MODULES, allowed } from "./index";
import { Reports } from "./Reports";
import { Settings } from "./Settings";
import { Staff, SystemStatus, upcoming } from "./System";

let answers: Record<string, (body: unknown, url: URL) => Response>;
let calls: Call[];

function mount(ui: React.ReactNode, actions: string[]) {
  const api = fakeApi(answers);
  calls = api.calls;
  return mountPanel(ui, api.fetchStub, actions);
}

const last = (method: string, path: string) => calls.filter((c) => c.method === method && c.path === path).at(-1);
const refused = (code = "auth.forbidden", status = 403) => () => json({ error: { code, params: {} } }, status);

async function submit(name: string) {
  await act(async () => {
    fireEvent.submit(screen.getByRole("form", { name }));
  });
  await settle();
}

async function click(name: string | RegExp, scope: HTMLElement = document.body) {
  await act(async () => fireEvent.click(within(scope).getByRole("button", { name })));
  await settle();
}

async function withReason(button: string, reason = "motiv scris", scope: HTMLElement = document.body) {
  fireEvent.click(within(scope).getByRole("button", { name: button }));
  fireEvent.change(within(scope).getByLabelText("Motivul"), { target: { value: reason } });
  await submit(button);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2027-03-16T08:00:00Z"));
  answers = {};
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the menu of the whole panel (§8.6)", () => {
  it("marks the modules of the later stages", () => {
    const later = MODULES.filter((m) => m.stage).map((m) => [m.route, m.stage]);
    expect(later).toEqual([["content", 11], ["translations", 11], ["community", 12]]);
    expect(allowed(MODULES, (a) => a === "users.view").map((m) => m.route)).toEqual(["users", "staff"]);
  });

  it("explains a later module", () => {
    const Later = upcoming("community", 12);
    mount(<Later />, []);
    expect(screen.getByRole("heading", { name: "Comunitate" })).toBeTruthy();
    expect(screen.getByText("Vine în Etapa 12. Până atunci, modulul e doar marcat în meniu.")).toBeTruthy();
  });
});

describe("events", () => {
  const request = (id: string, status: string) => ({
    id,
    status,
    requester_id: "u1",
    requester_name: `Ana ${id}`,
    requester_email: id === "e1" ? "ana@club.ro" : "",
    room_id: "r9",
    starts_at: "2027-04-10T15:00:00Z",
    ends_at: "2027-04-10T19:00:00Z",
    guests: 30,
    message: id === "e1" ? "Aniversare" : "",
    booking_id: null,
    decision_note: status === "pending" ? "" : "Sala e ocupată",
  });

  it("approves or declines a request with a note", async () => {
    answers = {
      "GET /api/v1/staff/events": () => json([request("e1", "pending"), request("e2", "pending"), request("e3", "declined")]),
      "POST /api/v1/staff/events/e1/decision": () => json({}),
      "POST /api/v1/staff/events/e2/decision": refused("events.room_taken", 409),
      "GET /api/v1/staff/club-events": () => json([]),
    };
    const panel = mount(<Events />, ["events.manage"]);
    await settle();
    const first = screen.getByRole("article", { name: "Ana e1" });
    expect(within(first).getByText("Aniversare")).toBeTruthy();
    fireEvent.change(within(first).getByLabelText(/Răspunsul pentru client/), { target: { value: " Vă așteptăm! " } });
    await click("Aprob (rezerv sala)", first);
    expect(last("POST", "/api/v1/staff/events/e1/decision")?.body).toEqual({ approve: true, note: "Vă așteptăm!" });
    expect(panel.notify).toHaveBeenCalledWith("Cererea a fost aprobată; sala e rezervată.");
    await click("Refuz", screen.getByRole("article", { name: "Ana e2" }));
    expect(last("POST", "/api/v1/staff/events/e2/decision")?.body).toEqual({ approve: false, note: "" });
    expect(panel.fail).toHaveBeenCalled();
    expect(screen.getByText("Sala e ocupată")).toBeTruthy();
    cleanup();
    answers["GET /api/v1/staff/events"] = () => json([]);
    mount(<Events />, ["events.manage"]);
    await settle();
    expect(screen.getByText("Nicio cerere în așteptare.")).toBeTruthy();
    expect(screen.getByText("Niciun eveniment în calendar.")).toBeTruthy();
  });

  const clubEvent = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    kind: "dj_night",
    title_ro: `Seară ${id}`,
    title_en: `Night ${id}`,
    text_ro: "",
    text_en: "",
    starts_at: "2027-03-26T18:00:00Z", // 20:00 at the club
    ends_at: "2027-03-26T21:00:00Z",
    published: false,
    cancelled_at: null,
    cancel_reason: "",
    is_demo: false,
    ...extra,
  });

  it("R-110: the public calendar: add, change, publish, withdraw and cancel", async () => {
    answers = {
      "GET /api/v1/staff/events": () => json([]),
      "GET /api/v1/staff/club-events": () =>
        json([
          clubEvent("c1"),
          clubEvent("c2", { published: true, is_demo: true }),
          clubEvent("c3", { published: true, cancelled_at: "2027-03-16T07:00:00Z", cancel_reason: "DJ bolnav" }),
        ]),
      "POST /api/v1/staff/club-events": () => json(clubEvent("c4"), 201),
      "PUT /api/v1/staff/club-events/c1": () => json(clubEvent("c1")),
      "POST /api/v1/staff/club-events/c1/publication": () => json(clubEvent("c1", { published: true })),
      "POST /api/v1/staff/club-events/c2/publication": () => json(clubEvent("c2")),
      "POST /api/v1/staff/club-events/c2/cancel": () => json(clubEvent("c2")),
    };
    const panel = mount(<Events />, ["events.manage"]);
    await settle();
    const rows = () => ({
      draft: screen.getByRole("row", { name: /Seară c1/ }),
      live: screen.getByRole("row", { name: /Seară c2/ }),
      gone: screen.getByRole("row", { name: /Seară c3/ }),
    });
    expect(within(rows().draft).getByText("Ciornă")).toBeTruthy();
    expect(within(rows().live).getByText(/demo/)).toBeTruthy();
    expect(within(rows().gone).getByText(/DJ bolnav/)).toBeTruthy();
    expect(within(rows().gone).queryByRole("button")).toBeNull(); // cancelled: nothing more to do

    // a new event past midnight, published at once
    const add = screen.getByRole("form", { name: "Adaugă un eveniment" });
    fireEvent.change(within(add).getByLabelText("Tipul"), { target: { value: "social" } });
    fireEvent.change(within(add).getByLabelText("Titlul (română)"), { target: { value: "Americano" } });
    fireEvent.change(within(add).getByLabelText("Titlul (engleză)"), { target: { value: "Americano" } });
    fireEvent.change(within(add).getByLabelText("Ziua"), { target: { value: "2027-03-20" } });
    fireEvent.change(within(add).getByLabelText("Începe la"), { target: { value: "22:00" } });
    fireEvent.change(within(add).getByLabelText("Se termină la"), { target: { value: "01:00" } });
    fireEvent.click(within(add).getByLabelText("Publică pe site acum"));
    await submit("Adaugă un eveniment");
    expect(last("POST", "/api/v1/staff/club-events")?.body).toEqual({
      kind: "social",
      title_ro: "Americano",
      title_en: "Americano",
      text_ro: "",
      text_en: "",
      starts_at: "2027-03-20T22:00:00+02:00",
      ends_at: "2027-03-21T01:00:00+02:00",
      location_id: "l1",
      published: true,
    });
    expect(panel.notify).toHaveBeenCalledWith("Evenimentul a fost adăugat.");
    expect((within(add).getByLabelText("Titlul (română)") as HTMLInputElement).value).toBe("");

    // changed with a reason, the form filled in from the event
    await click("Modifică", rows().draft);
    const change = screen.getByRole("form", { name: "Modifică evenimentul" });
    expect((within(change).getByLabelText("Titlul (română)") as HTMLInputElement).value).toBe("Seară c1");
    expect((within(change).getByLabelText("Începe la") as HTMLInputElement).value).toBe("20:00");
    fireEvent.change(within(change).getByLabelText("Titlul (română)"), { target: { value: "Seară cu DJ" } });
    fireEvent.change(within(change).getByLabelText("Motivul"), { target: { value: "titlu corectat" } });
    await submit("Modifică evenimentul");
    expect(last("PUT", "/api/v1/staff/club-events/c1")?.body).toMatchObject({
      title_ro: "Seară cu DJ",
      starts_at: "2027-03-26T20:00:00+02:00",
      ends_at: "2027-03-26T23:00:00+02:00",
      reason: "titlu corectat",
    });
    expect(panel.notify).toHaveBeenCalledWith("Modificările au fost salvate.");
    expect(screen.queryByRole("form", { name: "Modifică evenimentul" })).toBeNull();
    // changing one's mind closes the form
    await click("Modifică", rows().draft);
    await click("Renunț", screen.getByRole("form", { name: "Modifică evenimentul" }));
    expect(screen.getByRole("form", { name: "Adaugă un eveniment" })).toBeTruthy();

    await withReason("Publică pe site", "gata de anunțat", rows().draft);
    expect(last("POST", "/api/v1/staff/club-events/c1/publication")?.body).toEqual({ published: true, reason: "gata de anunțat" });
    expect(panel.notify).toHaveBeenCalledWith("Evenimentul apare pe site.");
    await withReason("Retrage de pe site", "se amână", rows().live);
    expect(last("POST", "/api/v1/staff/club-events/c2/publication")?.body).toEqual({ published: false, reason: "se amână" });
    expect(panel.notify).toHaveBeenCalledWith("Evenimentul a fost retras de pe site.");
    await withReason("Anulează evenimentul", "ploaie de meciuri", rows().live);
    expect(last("POST", "/api/v1/staff/club-events/c2/cancel")?.body).toEqual({ reason: "ploaie de meciuri" });
    expect(panel.notify).toHaveBeenCalledWith("Evenimentul a fost anulat; pe site apare „Anulat” până la ora lui de sfârșit.");
    expect(panel.fail).not.toHaveBeenCalled();
  });

  it("R-110: a refused change is said, the form stays filled in", async () => {
    answers = {
      "GET /api/v1/staff/events": () => json([]),
      "GET /api/v1/staff/club-events": () => json([]),
      "POST /api/v1/staff/club-events": refused("events.invalid_time", 422),
    };
    const panel = mount(<Events />, ["events.manage"]);
    await settle();
    const add = screen.getByRole("form", { name: "Adaugă un eveniment" });
    fireEvent.change(within(add).getByLabelText("Titlul (română)"), { target: { value: "Seară" } });
    await submit("Adaugă un eveniment");
    expect(panel.fail).toHaveBeenCalled();
    expect((within(add).getByLabelText("Titlul (română)") as HTMLInputElement).value).toBe("Seară");
  });

  it("R-110: the moments of a form, in club time across the clock change (ADR-0010)", () => {
    expect(moments({ day: "2027-03-27", start: "22:00", end: "02:00" })).toEqual({
      starts_at: "2027-03-27T22:00:00+02:00",
      ends_at: "2027-03-28T02:00:00+02:00",
    });
    expect(moments({ day: "2027-03-28", start: "20:00", end: "23:00" })).toEqual({
      starts_at: "2027-03-28T20:00:00+03:00",
      ends_at: "2027-03-28T23:00:00+03:00",
    });
  });
});

describe("devices (ADR-0012)", () => {
  const device = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    kind: "screen",
    location_id: "l1",
    name: `Ecran ${id}`,
    resource_id: null,
    is_active: true,
    enrolled_at: "2027-03-01T10:00:00Z",
    last_seen_at: "2027-03-16T07:59:00Z",
    created_at: "2027-03-01T10:00:00Z",
    ...extra,
  });
  beforeEach(() => {
    answers = {
      "GET /api/v1/staff/devices": () => json([device("d1"), device("d2", { enrolled_at: null, last_seen_at: null, is_active: false, kind: "league_kiosk" }), device("d3", { location_id: "other" })]),
      "GET /api/v1/staff/panel/resources": () => json([{ id: "r1", location_id: "l1", kind: "padel_court", slug: "t1", name: "Teren 1", parent_id: null, capacity: null, attributes: {}, is_active: true, sort_order: 1 }]),
      "POST /api/v1/staff/devices": () => json(device("d4"), 201),
      "POST /api/v1/staff/devices/d1/active": () => json(device("d1", { is_active: false })),
      "POST /api/v1/staff/devices/d2/enroll": () => json({ device: device("d2"), token: "tok-123" }),
    };
  });

  it("adds a court screen, disables a device with a reason, enrols one and shows its token once", async () => {
    const panel = mount(<Devices />, ["devices.manage"]);
    await settle();
    expect(screen.queryByText("Ecran d3")).toBeNull(); // another location
    expect(screen.getByText("nevăzut încă")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Dispozitiv nou" }));
    fireEvent.change(screen.getByLabelText("Nume"), { target: { value: " Ecran Teren 1 " } });
    fireEvent.change(screen.getByLabelText("Terenul (pentru ecran)"), { target: { value: "r1" } });
    await submit("Dispozitiv nou");
    expect(last("POST", "/api/v1/staff/devices")?.body).toEqual({ location_id: "l1", name: "Ecran Teren 1", kind: "screen", resource_id: "r1" });
    fireEvent.click(screen.getByRole("button", { name: "Dispozitiv nou" }));
    fireEvent.change(screen.getByLabelText("Nume"), { target: { value: "Chioșc" } });
    fireEvent.change(screen.getByLabelText("Tipul"), { target: { value: "payments_kiosk" } });
    answers["POST /api/v1/staff/devices"] = refused();
    await submit("Dispozitiv nou");
    expect(last("POST", "/api/v1/staff/devices")?.body).toMatchObject({ kind: "payments_kiosk", resource_id: null });
    expect(panel.fail).toHaveBeenCalledTimes(1);
    await withReason("Dezactivez", "chioșc furat", screen.getByRole("row", { name: /Ecran d1/ }));
    expect(last("POST", "/api/v1/staff/devices/d1/active")?.body).toEqual({ is_active: false, reason: "chioșc furat" });
    const row = screen.getByRole("row", { name: /Ecran d2/ });
    expect(within(row).getByRole("button", { name: "Reactivez" })).toBeTruthy();
    fireEvent.click(within(row).getByRole("button", { name: "Înrolez" }));
    fireEvent.change(within(row).getByLabelText(/Cheia publică/), { target: { value: " AAAA= " } });
    fireEvent.change(within(row).getByLabelText(/Amprenta/), { target: { value: "ab:cd" } });
    await submit("Înrolez");
    expect(last("POST", "/api/v1/staff/devices/d2/enroll")?.body).toEqual({ public_key: "AAAA=", certificate_fingerprint: "ab:cd" });
    const token = screen.getByRole("region", { name: "Tokenul dispozitivului" });
    expect(within(token).getByText("tok-123")).toBeTruthy();
    fireEvent.click(within(token).getByRole("button", { name: "L-am pus pe dispozitiv" }));
    expect(screen.queryByText("tok-123")).toBeNull();
    fireEvent.click(within(screen.getByRole("row", { name: /Ecran d1/ })).getByRole("button", { name: "Înrolez din nou" }));
    fireEvent.click(within(screen.getByRole("row", { name: /Ecran d1/ })).getByRole("button", { name: "Renunț" }));
    answers["POST /api/v1/staff/devices/d2/enroll"] = refused();
    fireEvent.click(within(screen.getByRole("row", { name: /Ecran d2/ })).getByRole("button", { name: "Înrolez" }));
    await submit("Înrolez");
    expect(panel.fail).toHaveBeenCalledTimes(2);
    cleanup();
    answers["GET /api/v1/staff/devices"] = () => json([]);
    mount(<Devices />, ["devices.manage"]);
    await settle();
    expect(screen.getByText("Niciun dispozitiv la această locație.")).toBeTruthy();
  });
});

describe("settings and feature flags (ADR-0022)", () => {
  beforeEach(() => {
    answers = {
      "GET /api/v1/staff/pending-decisions": () => json([{ key: "screens.names", value: "all", marker: "to_confirm", description: "Numele pe ecrane", question: "Cine apare pe nume?" }, { key: "pricing.x", value: 1, marker: "to_set", description: "Un preț", question: "" }]),
      "GET /api/v1/staff/config": () =>
        json([
          { key: "bookings.opening_hours", value: { weekday: ["08:00", "23:00"] }, marker: "confirmed", version: 2, effective_from: "2027-03-01T00:00:00Z", description: "Programul de funcționare" },
          { key: "auth.login_max_failures", value: 5, marker: "default", version: 0, effective_from: null, description: "Încercări greșite" },
        ]),
      "GET /api/v1/config/flags": () => json([{ key: "parkour", enabled: false, description: "Parkour (ascuns la lansare)" }]),
      "PUT /api/v1/staff/flags/parkour": () => json({ key: "parkour", enabled: true, description: "" }),
      "POST /api/v1/staff/config/auth.login_max_failures": () => json({}, 201),
    };
  });

  it("lists what waits for the owner, turns a flag on with a reason, publishes a new version in club time", async () => {
    const panel = mount(<Settings />, ["config.view", "config.manage", "flags.manage"]);
    await settle();
    expect(screen.getByText("Cine apare pe nume?")).toBeTruthy();
    expect(screen.getByText("Un preț")).toBeTruthy();
    await withReason("Pornesc parkour", "deschidem zona de parkour");
    expect(last("PUT", "/api/v1/staff/flags/parkour")?.body).toEqual({ enabled: true, reason: "deschidem zona de parkour" });
    fireEvent.change(screen.getByLabelText("Caută o setare"), { target: { value: "încercări" } });
    expect(screen.queryByText("Programul de funcționare")).toBeNull();
    fireEvent.change(screen.getByLabelText("Caută o setare"), { target: { value: "auth" } });
    fireEvent.click(screen.getByRole("button", { name: "Schimb" }));
    const form = screen.getByRole("form", { name: "Schimb auth.login_max_failures" });
    fireEvent.change(within(form).getByLabelText("Valoarea (JSON)"), { target: { value: "{nu e json" } });
    fireEvent.change(within(form).getByLabelText("Motivul"), { target: { value: "decizia proprietarului" } });
    await submit("Schimb auth.login_max_failures");
    expect(within(form).getByRole("alert")).toBeTruthy();
    fireEvent.change(within(form).getByLabelText("Valoarea (JSON)"), { target: { value: "6" } });
    fireEvent.change(within(form).getByLabelText(/Se aplică de la/), { target: { value: "2027-03-28T10:00" } });
    await submit("Schimb auth.login_max_failures");
    expect(last("POST", "/api/v1/staff/config/auth.login_max_failures")?.body).toEqual({
      value: 6,
      marker: "confirmed",
      reason: "decizia proprietarului",
      effective_from: "2027-03-28T10:00:00+03:00",
    });
    expect(panel.notify).toHaveBeenCalledWith("Versiunea nouă pentru auth.login_max_failures a fost publicată.");
    fireEvent.change(screen.getByLabelText("Caută o setare"), { target: { value: "" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Schimb" })[0] as HTMLElement);
    const hours = screen.getByRole("form", { name: "Schimb bookings.opening_hours" });
    fireEvent.change(within(hours).getByLabelText("Starea deciziei"), { target: { value: "to_confirm" } });
    fireEvent.change(within(hours).getByLabelText("Motivul"), { target: { value: "de discutat" } });
    answers["POST /api/v1/staff/config/bookings.opening_hours"] = refused("config.invalid_value", 422);
    await submit("Schimb bookings.opening_hours");
    expect(last("POST", "/api/v1/staff/config/bookings.opening_hours")?.body).toMatchObject({ marker: "to_confirm", effective_from: null });
    expect(panel.fail).toHaveBeenCalled();
    fireEvent.click(within(hours).getByRole("button", { name: "Renunț" }));
  });

  it("is read-only without the permissions, and says when nothing waits", async () => {
    answers["GET /api/v1/staff/pending-decisions"] = () => json([]);
    answers["GET /api/v1/config/flags"] = () => json([{ key: "parkour", enabled: true, description: "Parkour" }]);
    mount(<Settings />, ["config.view"]);
    await settle();
    expect(screen.getByText("Nimic de confirmat.")).toBeTruthy();
    expect(screen.getByText("Pornit")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Opresc parkour" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Schimb" })).toBeNull();
  });
});

describe("reports and exports (ADR-0009 §3)", () => {
  const report = {
    first: "2027-03-01",
    last: "2027-03-16",
    revenue_total: 14900,
    revenue: { cafe: 2400, other: 500, padel: 12000 },
    discounts: 3000,
    cash_taken: 11400,
    bookings: { free_rental: 2, training: 1 },
    cancelled: 1,
    no_shows: 1,
    courts: [{ name: "Teren 1", booked_minutes: 180, open_minutes: 1800, percent: 10 }],
    class_places: 2,
    class_attended: 1,
    new_accounts: 4,
  };

  it("shows the period's figures and links the audited CSV exports", async () => {
    answers = {
      "GET /api/v1/staff/panel/reports": () => json(report),
      "GET /api/v1/staff/waitlist/stats": () => json({ by_status: { pending: 3, confirmed: 12, withdrawn: 1 }, confirmed_by_level: {} }),
    };
    mount(<Reports />, ["reports.view", "waitlist.view", "waitlist.export"]);
    await settle();
    expect(new URLSearchParams(calls[0]?.query).get("first")).toBe("2027-03-01");
    expect(screen.getByText("149 lei")).toBeTruthy();
    expect(screen.getByText("Altele")).toBeTruthy();
    expect(screen.getByText("10%")).toBeTruthy();
    expect(screen.getByText("3 h din 30 h")).toBeTruthy();
    expect(screen.getByText("Clase: 2 locuri ocupate, 1 prezenți.")).toBeTruthy();
    expect(screen.getByText("Confirmați: 12")).toBeTruthy();
    const ledger = screen.getByRole("link", { name: /Export registru/ }).getAttribute("href") ?? "";
    expect(ledger).toBe("/api/v1/staff/panel/reports/export.csv?location_id=l1&kind=transactions&first=2027-03-01&last=2027-03-16");
    expect(screen.getByRole("link", { name: /Export listă de așteptare/ }).getAttribute("href")).toBe("/api/v1/staff/waitlist/export.csv");
    fireEvent.click(screen.getByRole("button", { name: "Ultimele 7 zile" }));
    await settle();
    expect(new URLSearchParams(calls.at(-1)?.query).get("first")).toBe("2027-03-10");
    fireEvent.change(screen.getByLabelText("De la"), { target: { value: "2027-02-01" } });
    fireEvent.change(screen.getByLabelText("Până la"), { target: { value: "2027-02-28" } });
    fireEvent.change(screen.getByLabelText("Până la"), { target: { value: "" } });
    await settle();
    expect(screen.getByRole("link", { name: /Export rezervări/ }).getAttribute("href")).toContain("first=2027-02-01&last=2027-02-28");
  });

  it("shows only the waiting list to a role without reports", async () => {
    answers = { "GET /api/v1/staff/waitlist/stats": () => json({ by_status: { pending: 0 }, confirmed_by_level: {} }) };
    mount(<Reports />, ["waitlist.view"]);
    await settle();
    expect(screen.queryByRole("link", { name: /Export registru/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Export listă/ })).toBeNull();
    expect(screen.getByText("Neconfirmați: 0")).toBeTruthy();
  });
});

describe("the audit log", () => {
  const entry = (id: number, extra: Record<string, unknown> = {}) => ({
    id,
    occurred_at: "2027-03-16T07:00:00Z",
    action: "booking.moved",
    target_type: "bookings.booking",
    target_id: "b1",
    actor_kind: "user",
    actor_label: "Recepție Club",
    actor_user_id: "u9",
    actor_device_id: null,
    reason: "cerut la telefon",
    before: { resource: "r1" },
    after: { resource: "r2" },
    request_id: "",
    ...extra,
  });

  it("filters and pages the entries, with what changed", async () => {
    answers = { "GET /api/v1/staff/audit": (_, url) => json({ total: 120, items: [entry(Number(url.searchParams.get("offset")) + 1), entry(999, { actor_label: "", actor_kind: "system", reason: "", before: null, after: null })] }) };
    mount(<Audit />, ["audit.view"]);
    await settle();
    expect(screen.getByText("Motiv: cerut la telefon")).toBeTruthy();
    expect(screen.getByText("Sistem")).toBeTruthy();
    expect(screen.getAllByText("Ce s-a schimbat")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Acțiunea"), { target: { value: " booking.moved " } });
    fireEvent.change(screen.getByLabelText("Tipul obiectului"), { target: { value: "bookings.booking" } });
    fireEvent.change(screen.getByLabelText("ID-ul obiectului"), { target: { value: "b1" } });
    await act(async () => fireEvent.submit(screen.getByRole("search")));
    await settle();
    expect(calls.at(-1)?.query).toBe("?action=booking.moved&target_type=bookings.booking&target_id=b1&limit=50&offset=0");
    fireEvent.click(screen.getByRole("button", { name: "Înainte" }));
    await settle();
    expect(screen.getByText("51–100 din 120")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Înapoi" }));
    await settle();
    cleanup();
    answers = { "GET /api/v1/staff/audit": () => json({ total: 0, items: [] }) };
    mount(<Audit />, ["audit.view"]);
    await settle();
    expect(screen.getByText("Nicio înregistrare.")).toBeTruthy();
  });
});

describe("staff, roles and the system status", () => {
  it("lists the staff with their 2FA and the matrix of roles", async () => {
    answers = {
      "GET /api/v1/staff/panel/staff": () =>
        json({
          matrix: { admin: ["bookings.view", "reports.view"], reception: ["bookings.view"] },
          people: [
            { id: "u1", name: "Pop Ana", email: "ana@club.ro", mfa_enabled: true, is_active: true, roles: [{ id: 1, role: "reception", location: "Jungle Padel" }] },
            { id: "u2", name: "Ion Dan", email: "", mfa_enabled: false, is_active: false, roles: [{ id: 2, role: "admin", location: "" }] },
          ],
        }),
    };
    mount(<Staff />, ["users.view"]);
    await settle();
    expect(screen.getByText("Recepție · Jungle Padel")).toBeTruthy();
    expect(screen.getByText("Admin · Toate locațiile")).toBeTruthy();
    expect(screen.getByText("2FA neconfigurat")).toBeTruthy();
    const reports = screen.getByRole("row", { name: /reports\.view/ });
    expect(within(reports).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Da", "—"]);
  });

  it("shows the release, the clock, the database, the cache and the devices", async () => {
    let cacheUp = false;
    answers = {
      "GET /api/v1/staff/panel/system": () =>
        json({
          version: "v10.0",
          server_time: "2027-03-16T08:00:00Z",
          time_zone: "Europe/Bucharest",
          database: true,
          cache: cacheUp,
          pending_decisions: 3,
          devices: [
            { id: "d1", name: "Ecran 1", kind: "screen", is_active: true, enrolled: true, online: true, last_seen_at: "2027-03-16T07:59:00Z" },
            { id: "d2", name: "Chioșc", kind: "league_kiosk", is_active: true, enrolled: true, online: false, last_seen_at: "2027-03-16T06:00:00Z" },
            { id: "d3", name: "Afișaj", kind: "cafe_display", is_active: true, enrolled: false, online: false, last_seen_at: null },
            { id: "d4", name: "Vechi", kind: "screen", is_active: false, enrolled: true, online: false, last_seen_at: null },
          ],
        }),
    };
    mount(<SystemStatus />, ["config.view"]);
    await settle();
    expect(screen.getByText("v10.0")).toBeTruthy();
    expect(screen.getByText(/10:00 \(Europe\/Bucharest\)/)).toBeTruthy();
    expect(screen.getByText("Indisponibil")).toBeTruthy();
    expect(screen.getByRole("link", { name: "3" }).getAttribute("href")).toBe("#/settings");
    expect(within(screen.getByRole("row", { name: /Chioșc/ })).getByText("Offline")).toBeTruthy();
    expect(within(screen.getByRole("row", { name: /Afișaj/ })).getByText("Neînrolat")).toBeTruthy();
    expect(within(screen.getByRole("row", { name: /Vechi/ })).getByText("Dezactivat")).toBeTruthy();
    cacheUp = true;
    await click("Reîncarc");
    expect(screen.queryByText("Indisponibil")).toBeNull();
    cleanup();
    answers["GET /api/v1/staff/panel/system"] = () => json({ version: "dev", server_time: "2027-03-16T08:00:00Z", time_zone: "Europe/Bucharest", database: true, cache: true, pending_decisions: 0, devices: [] });
    mount(<SystemStatus />, ["config.view"]);
    await settle();
    expect(screen.getByText("Niciun dispozitiv la această locație.")).toBeTruthy();
  });
});
