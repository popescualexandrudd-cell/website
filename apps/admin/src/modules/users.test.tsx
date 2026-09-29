/** Users (R-004) and levels (R-003) in the panel: search, a person's page, the staff actions
 * with their reason (Q55 "no name on the screens", roles, cards, erasure). */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminApi } from "../api";
import { type Panel, PanelContext } from "../panel";
import { Levels } from "./Levels";
import { Users } from "./Users";

type Call = { method: string; path: string; body: unknown };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const person = {
  id: "u1",
  first_name: "Ana",
  last_name: "Pop",
  email: "ana@club.ro",
  email_verified_at: "2027-01-01T10:00:00Z",
  phone: "+40700000000",
  date_of_birth: "1990-05-01",
  account_type: "full",
  preferred_language: "ro",
  created_at: "2027-01-01T10:00:00Z",
  mfa_enabled: false,
  is_active: true,
  is_demo: false,
  guardian_ids: [],
  roles: [{ id: 7, role: "coach", location_id: null }],
  consents: [{ document_kind: "terms", document_version: 1, action: "accepted", language: "ro", occurred_at: "2027-01-01T10:00:00Z", text_sha256: "x", device_id: null }],
};
const profile = {
  in_league: true,
  level_validated: "3.50",
  level_waiting: false,
  hidden_on_screens: false,
  cards: [{ id: "k1", number: "JP-0001", status: "active", issued_at: "2027-01-02T10:00:00Z", revoked_at: null, revoke_reason: "" }],
  bookings: [{ id: "b1", resource: "Teren 1", starts_at: "2027-03-15T16:00:00Z", ends_at: "2027-03-15T17:00:00Z", status: "confirmed", session_type: "training" }],
};

let calls: Call[];
let answers: Record<string, (body: unknown) => Response>;

beforeEach(() => {
  calls = [];
  answers = {
    "GET /api/v1/staff/users": () =>
      json({ total: 30, items: [{ id: "u1", first_name: "Ana", last_name: "Pop", email: "ana@club.ro", phone: "", account_type: "full", is_active: true, is_demo: true }] }),
    "GET /api/v1/staff/users/u1": () => json(person),
    "GET /api/v1/staff/panel/users/u1/profile": () => json(profile),
    "GET /api/v1/staff/customers/u1/account": () => json({ credit: 5000, debt: 1200 }),
    "POST /api/v1/staff/guests": () => json({ ...person, id: "u9" }, 201),
    "POST /api/v1/staff/panel/users/u1/hidden-on-screens": () => json({ hidden_on_screens: true }),
    "POST /api/v1/staff/users/u1/active": () => json(person),
    "POST /api/v1/staff/users/u1/roles": () => json({ id: 8, role: "reception", location_id: "l1" }, 201),
    "POST /api/v1/staff/roles/7/revoke": () => json({ ok: true }),
    "POST /api/v1/staff/cards/reissue": () => json({}),
    "POST /api/v1/staff/cards/k1/block": () => json({}),
    "POST /api/v1/staff/users/u1/erase": () => json({ ok: true }),
    "GET /api/v1/staff/league/questionnaires": () =>
      json([
        { id: "q1", user_id: "u2", name: "Dan Ionescu", answers: { band: "3.0" }, estimated_level: "3.00", submitted_at: "2027-03-14T10:00:00Z", validated_at: null, validated_level: null },
        { id: "q2", user_id: "u3", name: "Gata", answers: {}, estimated_level: "2.00", submitted_at: "2027-03-14T10:00:00Z", validated_at: "2027-03-14T11:00:00Z", validated_level: "2.00" },
      ]),
    "POST /api/v1/staff/league/questionnaires/q1/validate": () => json({}),
  };
});

afterEach(() => {
  cleanup();
});

const fetchStub = async (request: Request) => {
  const url = new URL(request.url);
  const body = request.method === "GET" ? null : await request.clone().json().catch(() => null);
  calls.push({ method: request.method, path: url.pathname, body });
  const answer = answers[`${request.method} ${url.pathname}`];
  return answer ? answer(body) : json({ error: { code: "common.not_found", params: {} } }, 404);
};

function mount(ui: React.ReactNode, path: string[] = [], actions: string[] = []) {
  const panel: Panel = {
    api: adminApi(fetchStub as unknown as typeof fetch, () => "csrftoken=T"),
    lang: "ro",
    permissions: { user: { id: "me", first_name: "Eu", last_name: "Admin", email: null }, roles: ["admin"], scopes: [{ location_id: "l1", location_name: "Jungle Padel", actions }] },
    locationId: "l1",
    can: (a) => actions.includes(a),
    notify: vi.fn(),
    fail: vi.fn(),
    go: vi.fn(),
    path,
  };
  render(<PanelContext.Provider value={panel}>{ui}</PanelContext.Provider>);
  return panel;
}

const settle = () => act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
});

async function withReason(button: string, reason = "cerere scrisă") {
  fireEvent.click(screen.getByRole("button", { name: button }));
  fireEvent.change(screen.getByLabelText("Motivul"), { target: { value: reason } });
  await act(async () => {
    fireEvent.submit(screen.getByRole("form", { name: button }));
  });
  await settle();
}

describe("users (R-004)", () => {
  it("searches, pages and creates a guest account", async () => {
    const panel = mount(<Users />, [], ["users.view", "accounts.create_guest"]);
    await settle();
    expect(screen.getByRole("link", { name: "Pop Ana" }).getAttribute("href")).toBe("#/users/u1");
    expect(screen.getByText("1–25 din 30")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Caută după nume, email sau telefon"), { target: { value: " ana " } });
    await act(async () => fireEvent.submit(screen.getByRole("search")));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Înainte" }));
    await settle();
    expect(calls.filter((c) => c.path === "/api/v1/staff/users").length).toBeGreaterThanOrEqual(3);
    fireEvent.click(screen.getByRole("button", { name: "Înapoi" }));
    fireEvent.click(screen.getByRole("button", { name: "Cont nou la recepție" }));
    for (const [label, value] of [["Prenume", "Ion"], ["Nume", "Vasile"], ["Email", "ion@x.ro"]]) {
      fireEvent.change(screen.getAllByLabelText(label as string).at(-1) as HTMLElement, { target: { value } });
    }
    await act(async () => fireEvent.submit(screen.getByRole("form", { name: "Cont nou la recepție" })));
    await settle();
    expect(calls.find((c) => c.path === "/api/v1/staff/guests")?.body).toMatchObject({ first_name: "Ion", email: "ion@x.ro" });
    expect(panel.go).toHaveBeenCalledWith("users/u9");
  });

  it("shows the person and runs the staff actions with a reason", async () => {
    const panel = mount(<Users />, ["u1"], ["users.view", "users.manage", "roles.manage", "cards.manage", "privacy.requests", "payments.view"]);
    await settle();
    expect(screen.getByRole("heading", { name: "Pop Ana" })).toBeTruthy();
    expect(screen.getByText("50 lei")).toBeTruthy();
    expect(screen.getByText("În ligă")).toBeTruthy();
    expect(screen.getByText("Apare pe nume")).toBeTruthy();
    expect(screen.getByText(/Antrenor \/ instructor · Toate locațiile/)).toBeTruthy();
    await withReason("Nu mai afișa numele pe ecrane");
    expect(calls.find((c) => c.path.endsWith("hidden-on-screens"))?.body).toEqual({ location_id: "l1", hidden: true, note: "cerere scrisă" });
    await withReason("Dezactivez contul");
    expect(calls.find((c) => c.path.endsWith("/active"))?.body).toEqual({ is_active: false, reason: "cerere scrisă" });
    await withReason("Card nou");
    expect(calls.find((c) => c.path.endsWith("/reissue"))?.body).toMatchObject({ user_id: "u1", print_card: true });
    await withReason("Blochez cardul");
    expect(calls.some((c) => c.path === "/api/v1/staff/cards/k1/block")).toBe(true);
    await withReason("Retrag rolul");
    expect(calls.some((c) => c.path === "/api/v1/staff/roles/7/revoke")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Dau un rol" }));
    fireEvent.change(screen.getByLabelText("Rolul"), { target: { value: "reception" } });
    fireEvent.change(screen.getByLabelText("Motivul"), { target: { value: "angajare" } });
    await act(async () => fireEvent.submit(screen.getByRole("form", { name: "Dau un rol" })));
    await settle();
    expect(calls.find((c) => c.path.endsWith("/roles"))?.body).toEqual({ role: "reception", location_id: "l1", reason: "angajare" });
    fireEvent.click(screen.getByRole("button", { name: "Șterg contul (GDPR)" }));
    fireEvent.click(screen.getByLabelText(/Creditul rămas se pierde/));
    fireEvent.change(screen.getByLabelText("Motivul"), { target: { value: "cererea clientului" } });
    await act(async () => fireEvent.submit(screen.getByRole("form", { name: "Șterg contul (GDPR)" })));
    await settle();
    expect(calls.find((c) => c.path.endsWith("/erase"))?.body).toEqual({ reason: "cererea clientului", forfeit_credit: true });
    expect(panel.notify).toHaveBeenCalled();
  });

  it("hides what the role may not do, and reports a refusal", async () => {
    answers["POST /api/v1/staff/cards/reissue"] = () => json({ error: { code: "auth.forbidden", params: {} } }, 403);
    const panel = mount(<Users />, ["u1"], ["users.view", "cards.manage"]);
    await settle();
    expect(screen.queryByRole("button", { name: "Dezactivez contul" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Dau un rol" })).toBeNull();
    expect(screen.queryByText("Credit în cont")).toBeNull();
    await withReason("Card nou");
    expect(panel.fail).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Renunț" }));
  });
});

describe("levels (R-003)", () => {
  it("validates a waiting questionnaire with the level chosen", async () => {
    const panel = mount(<Levels />, [], ["league.validate_levels"]);
    await settle();
    expect(screen.queryByText("Gata")).toBeNull(); // already validated
    fireEvent.change(screen.getByLabelText("Nivelul (estimat 3.00)"), { target: { value: "3.4" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Validez" })));
    await settle();
    expect(calls.find((c) => c.path.endsWith("/validate"))?.body).toEqual({ location_id: "l1", level: "3.4", note: "" });
    expect(panel.notify).toHaveBeenCalledWith("Nivelul a fost validat.");
  });

  it("says when nothing waits and reports errors", async () => {
    answers["GET /api/v1/staff/league/questionnaires"] = () => json([]);
    mount(<Levels />, [], []);
    await settle();
    expect(screen.getByText("Niciun chestionar în așteptare.")).toBeTruthy();
    cleanup();
    answers["GET /api/v1/staff/league/questionnaires"] = () => json([{ id: "q1", user_id: "u2", name: "Dan", answers: {}, estimated_level: "3.00", submitted_at: "2027-03-14T10:00:00Z", validated_at: null, validated_level: null }]);
    answers["POST /api/v1/staff/league/questionnaires/q1/validate"] = () => json({ error: { code: "validation.invalid", params: {} } }, 422);
    const panel = mount(<Levels />, [], []);
    await settle();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Validez" })));
    await settle();
    expect(panel.fail).toHaveBeenCalled();
  });
});
