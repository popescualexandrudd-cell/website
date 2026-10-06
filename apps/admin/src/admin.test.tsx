/** The panel's shell (§8.6, ADR-0011): CSRF on changes, sign-in with two-factor authentication,
 * the menu by permissions and location, the live dashboard. */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminApi,
  ApiError,
  csrfFromCookie,
  Offline,
  unwrap,
  withCsrf,
} from "./api";
import { App } from "./App";
import { Login } from "./Login";
import { allowed, MODULES } from "./modules";
import { actionsAt } from "./panel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
  window.location.hash = "";
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const error = (code: string, status: number) =>
  json({ error: { code, params: {} } }, status);

const permissions = {
  user: {
    id: "u1",
    first_name: "Ana",
    last_name: "Manager",
    email: "ana@club.ro",
  },
  roles: ["manager"],
  scopes: [
    {
      location_id: "l1",
      location_name: "Jungle Padel",
      location_slug: "jungle",
      actions: ["bookings.view", "users.view"],
    },
    {
      location_id: "l2",
      location_name: "Alt club",
      location_slug: "jungle",
      actions: [],
    },
  ],
};

const board = {
  day: "2027-03-15",
  bookings_today: 2,
  occupancy_percent: 7,
  cash_taken_today: 12000,
  revenue_today: 12000,
  unread_notices: 2,
  pending_decisions: 1,
  inactive_devices: 0,
  courts: [
    {
      id: "c1",
      name: "Teren 1",
      busy: true,
      until: "2027-03-15T08:30:00Z",
      session_type: "free_rental",
      booked_minutes_today: 120,
      open_minutes_today: 900,
    },
    {
      id: "c2",
      name: "Teren 2",
      busy: false,
      until: null,
      session_type: "",
      booked_minutes_today: 0,
      open_minutes_today: 900,
    },
  ],
};

describe("the API link", () => {
  it("reads the CSRF cookie and sends it on changes only, with the session cookie", async () => {
    expect(csrfFromCookie("a=1; csrftoken=abc%3D; b=2")).toBe("abc=");
    expect(csrfFromCookie("a=1")).toBe("");
    const seen: Request[] = [];
    const fetchImpl = vi.fn(async (request: Request) => {
      seen.push(request);
      return json({ ok: true });
    });
    const send = withCsrf(
      fetchImpl as unknown as typeof fetch,
      () => "csrftoken=T1",
    );
    await send(new Request("http://x/api/v1/auth/session"));
    await send(new Request("http://x/api/v1/auth/logout", { method: "POST" }));
    expect(seen[0]?.headers.get("X-CSRFToken")).toBeNull();
    expect(seen[1]?.headers.get("X-CSRFToken")).toBe("T1");
    expect(seen[1]?.credentials).toBe("same-origin");
  });

  it("calls the panel endpoints", async () => {
    const urls: string[] = [];
    const api = adminApi(
      (async (request: Request) => {
        urls.push(
          `${request.method} ${new URL(request.url).pathname}${new URL(request.url).search}`,
        );
        return json({});
      }) as unknown as typeof fetch,
      () => "",
    );
    await api.dashboard("l1");
    await api.permissions();
    expect(urls).toEqual([
      "GET /api/v1/staff/panel/dashboard?location_id=l1",
      "GET /api/v1/staff/panel/permissions",
    ]);
  });

  it("a server answer with a code says why (the AI off); without one, the connection is lost", async () => {
    const off = {
      error: { error: { code: "ai.unavailable", params: {} } },
      response: new Response(null, { status: 503 }),
    };
    await expect(unwrap(Promise.resolve(off))).rejects.toEqual(
      new ApiError("ai.unavailable", {}, 503),
    );
    await expect(
      unwrap(
        Promise.resolve({
          error: {},
          response: new Response(null, { status: 502 }),
        }),
      ),
    ).rejects.toBeInstanceOf(Offline);
    await expect(
      unwrap(Promise.reject(new TypeError("fetch failed"))),
    ).rejects.toBeInstanceOf(Offline);
    const refused = {
      error: {},
      response: new Response(null, { status: 403 }),
    };
    await expect(unwrap(Promise.resolve(refused))).rejects.toMatchObject({
      code: "unknown",
      status: 403,
    });
  });
});

describe("signing in (ADR-0011)", () => {
  function apiWith(overrides: Record<string, unknown>) {
    return {
      csrf: vi.fn(async () => ({ csrf_token: "t" })),
      login: vi.fn(async () => ({ mfa_setup_required: false, user: {} })),
      mfaSetup: vi.fn(async () => ({
        secret: "ABCDEF",
        otpauth_uri: "otpauth://totp/x",
      })),
      mfaConfirm: vi.fn(async () => ({ recovery_codes: ["r1", "r2"] })),
      ...overrides,
    } as never;
  }

  const fill = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

  it("asks for the code when the account has two-factor authentication", async () => {
    const { ApiError } = await import("./api");
    const login = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("auth.mfa_code_required", {}, 403))
      .mockResolvedValueOnce({ mfa_setup_required: false });
    const done = vi.fn();
    render(<Login api={apiWith({ login })} lang="ro" onDone={done} />);
    fill("Email", " ana@club.ro ");
    fill("Parola", "secret");
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Intră" })),
    );
    fill("Codul din aplicația de autentificare", "123456");
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Intră" })),
    );
    expect(login).toHaveBeenLastCalledWith("ana@club.ro", "secret", "123456");
    expect(done).toHaveBeenCalled();
  });

  it("sets up two-factor authentication first, then shows the recovery codes once", async () => {
    const done = vi.fn();
    const api = apiWith({
      login: vi.fn(async () => ({ mfa_setup_required: true })),
    });
    render(<Login api={api} lang="ro" onDone={done} />);
    fill("Email", "ana@club.ro");
    fill("Parola", "secret");
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Intră" })),
    );
    expect(
      screen.getByLabelText("Cheia pentru aplicația de autentificare")
        .textContent,
    ).toBe("ABCDEF");
    fill("Codul din aplicația de autentificare", "654321");
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Confirm" })),
    );
    expect(screen.getByLabelText("Codurile de rezervă").textContent).toBe(
      "r1r2",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Le-am salvat, intru în panou" }),
    );
    expect(done).toHaveBeenCalled();
  });

  it("explains a refusal, an outage and anything else", async () => {
    const { ApiError, Offline } = await import("./api");
    const login = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("auth.invalid_credentials", {}, 401))
      .mockRejectedValueOnce(new Offline("x"))
      .mockRejectedValueOnce(new Error("?"));
    render(<Login api={apiWith({ login })} lang="ro" onDone={vi.fn()} />);
    fill("Email", "a@b.ro");
    fill("Parola", "x");
    for (let i = 0; i < 3; i++) {
      await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: "Intră" })),
      );
      expect(screen.getByRole("alert").textContent).not.toBe("");
    }
    expect(screen.getByRole("alert").textContent).toBe(
      "Ceva nu a mers. Încearcă din nou.",
    );
  });
});

describe("the panel", () => {
  let answers: Record<string, () => Response>;

  beforeEach(() => {
    answers = {
      "/api/v1/staff/panel/permissions": () => json(permissions),
      "/api/v1/staff/panel/dashboard": () => json(board),
      "/api/v1/auth/logout": () => json({ ok: true }),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const answer = answers[new URL(request.url).pathname];
        return answer ? answer() : error("common.not_found", 404);
      }),
    );
  });

  async function start() {
    render(<App />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  it("shows the modules allowed at the location and the dashboard", async () => {
    await start();
    expect(
      screen
        .getByRole("link", { name: "Tablou de bord" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.getByText("7%")).toBeTruthy();
    expect(screen.getAllByText("120 lei")).toHaveLength(2); // cash taken, revenue
    expect(screen.getByText("Notificări necitite: 2")).toBeTruthy();
    expect(screen.getByRole("row", { name: /Teren 1/ }).textContent).toContain(
      "Închiriere, până la 10:30",
    );
    expect(screen.getByRole("row", { name: /Teren 2/ }).textContent).toContain(
      "Liber0 h din 15 h",
    );
    expect(localStorage.getItem("jungle.admin.location")).toBe("l1");
    fireEvent.click(
      screen.getByRole("button", { name: /Decizii ale proprietarului/ }),
    );
    expect(window.location.hash).toBe("#/settings");
    // At a location where the role gives nothing, no module.
    await act(async () =>
      fireEvent.change(screen.getByLabelText("Locația"), {
        target: { value: "l2" },
      }),
    );
    expect(screen.getByText("Nu ai acces la niciun modul aici.")).toBeTruthy();
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "English" })),
    );
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });

  it("asks to sign in without a session, refuses without a staff role, and signs out", async () => {
    answers["/api/v1/staff/panel/permissions"] = () =>
      error("auth.required", 401);
    await start();
    expect(
      screen.getByRole("heading", { name: "Administrare Jungle Padel" }),
    ).toBeTruthy();
    cleanup();
    answers["/api/v1/staff/panel/permissions"] = () =>
      error("auth.mfa_required", 403);
    await start();
    expect(
      screen.getByRole("heading", { name: "Administrare Jungle Padel" }),
    ).toBeTruthy();
    cleanup();
    answers["/api/v1/staff/panel/permissions"] = () =>
      error("auth.forbidden", 403);
    await start();
    expect(
      screen.getByRole("heading", { name: "Nu ai acces la panou" }),
    ).toBeTruthy();
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Ieșire" })),
    );
    expect(
      screen.getByRole("heading", { name: "Administrare Jungle Padel" }),
    ).toBeTruthy();
  });

  it("reports errors of a module and goes back to sign-in when the session ends", async () => {
    answers["/api/v1/staff/panel/dashboard"] = () =>
      error("auth.forbidden", 403);
    await start();
    expect(screen.getByRole("alert").textContent).toContain("Închide");
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Închide" })),
    );
    expect(screen.queryByRole("alert")).toBeNull();
    answers["/api/v1/staff/panel/dashboard"] = () =>
      error("auth.required", 401);
    cleanup();
    await start();
    expect(
      screen.getByRole("heading", { name: "Administrare Jungle Padel" }),
    ).toBeTruthy();
  });
});

describe("permissions", () => {
  it("keeps only the modules one may use", () => {
    expect(actionsAt(permissions, "l1").has("users.view")).toBe(true);
    expect(actionsAt(permissions, "nowhere").size).toBe(0);
    expect(allowed(MODULES, () => false)).toEqual([]);
    expect(
      allowed(MODULES, (a) => a === "bookings.view").map((m) => m.route),
    ).toContain("dashboard");
  });
});
