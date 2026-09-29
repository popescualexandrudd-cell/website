/** What the screens show (§8.5): the court during a match and while free, the lobby, and the
 * whole page: loading, live updates, the last state kept, never a blank screen. */
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScreenState } from "./api";
import { courtState, lobbyState, QR, SERVER_TIME } from "./fixtures";
import { keep, STORAGE_KEY } from "./store";
import { Court } from "./views/Court";
import { Lobby } from "./views/Lobby";
import { Announcements, Connection, ROTATE_MS, safeSvg } from "./views/parts";

const NOW = Date.parse(SERVER_TIME);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe("the court screen (§8.5)", () => {
  it("shows the example exactly", () => {
    render(<Court lang="ro" state={courtState} now={NOW} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "TEREN 4 · 14:00–15:30 · 90 MIN · MECI OFICIAL DE LIGĂ",
    );
    const players = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(players).toEqual([
      "Popescu Alexandru DanielLigăDiamant II · 67 LP · Nivel 5.2",
      "Moșteanu RareșLigăDiamant III · 12 LP · Nivel 5.0",
      "Jucător 3LigăPlatină I · 88 LP · Nivel 4.8",
      "Jucător 4LigăDiamant IV · 40 LP · Nivel 4.9",
    ]);
    expect(screen.getByText("vs")).toBeTruthy();
    expect(screen.getByText("Meciul zilei")).toBeTruthy();
    expect(screen.getByText("Timp rămas: 00:47 · Următorul: 15:30 Antrenament")).toBeTruthy();
    const qr = screen.getByRole("img", { name: "Cod QR spre https://junglepadel.ro/ro/liga" });
    expect(qr.querySelector("svg path")?.getAttribute("stroke")).toBe("currentColor");
  });

  it("names nobody who is not public, and works in English", () => {
    const hidden = { name: "", in_league: false, tier: "", division: "", lp: null, level: null, position: null };
    const current = courtState.court?.current;
    if (!current || !courtState.court) throw new Error("fixture");
    const state: ScreenState = {
      ...courtState,
      court: { ...courtState.court, next: null, current: { ...current, match_of_the_day: false, teams: [[hidden]] } },
    };
    render(<Court lang="en" state={state} now={NOW} />);
    expect(screen.getByText("Player")).toBeTruthy();
    expect(screen.queryByText("League")).toBeNull(); // Q55: the badge only for league players
    expect(screen.queryByText("vs")).toBeNull();
    expect(screen.queryByText("Match of the day")).toBeNull();
    expect(screen.getByText("Time left: 00:47")).toBeTruthy();
  });

  it("while free: the jungle, what comes next, standings, events, announcements", () => {
    if (!courtState.court) throw new Error("fixture");
    const free: ScreenState = { ...courtState, court: { ...courtState.court, current: null } };
    const { container } = render(<Court lang="ro" state={free} now={NOW} />);
    expect(container.querySelector("svg.jungle")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("heading", { name: "Teren 4" })).toBeTruthy();
    expect(screen.getByText("Teren liber")).toBeTruthy();
    expect(screen.getByText("Următorul: 15:30 Antrenament")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Clasament dublu" }).textContent).toContain("Popescu Alexandru Daniel");
    expect(screen.getByRole("region", { name: "Evenimente" }).textContent).toContain("Cupa Junglei");
    expect(screen.getByText("Turneu sâmbătă")).toBeTruthy();
  });

  it("shows nothing without a court (a lobby state never reaches it)", () => {
    const { container } = render(<Court lang="ro" state={lobbyState} now={NOW} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("the lobby screen (§8.5)", () => {
  it("every court, the Match of the day, standings, Kings, events, café orders ready", () => {
    render(<Lobby lang="ro" state={lobbyState} now={NOW} />);
    const courts = screen.getByRole("region", { name: "Terenurile" });
    expect(screen.getByRole("article", { name: "Teren 1" }).textContent).toBe("Teren 1 Liber");
    expect(courts.children).toHaveLength(2);
    const four = screen.getByRole("article", { name: "Teren 4" });
    expect(four.textContent).toContain("Meci oficial de ligă · 14:00–15:30");
    expect(four.textContent).toContain("Popescu Alexandru Daniel & Moșteanu Rareș vs Jucător 3 & Jucător 4");
    expect(four.textContent).toContain("Timp rămas: 00:47");
    expect(four.textContent).toContain("Următorul: 15:30 Antrenament");
    expect(screen.getByRole("region", { name: "Comenzi gata de ridicat" }).textContent).toBe("Comenzi gata de ridicat79");
    expect(screen.getByRole("region", { name: "Meciul zilei" }).textContent).toContain("Meciul zilei · Teren 4 · 14:00");
    expect(screen.getByRole("region", { name: "Regii Junglei" }).textContent).toContain("Regele JungleiMaestru · 310 LP");
    expect(screen.getByRole("region", { name: "Clasament perechi" }).textContent).toContain(
      "Popescu Alexandru Daniel & Moșteanu Rareș",
    );
    expect(screen.queryByRole("region", { name: "Clasament simplu" })).toBeNull();
    expect(screen.getByText("14:43")).toBeTruthy();
  });

  it("without café orders, Match of the day or events, those parts are left out", () => {
    const quiet: ScreenState = {
      ...lobbyState,
      cafe_ready: [],
      events: [{ title: "Seară deschisă", starts_at: null }],
      announcements: [],
      qr_svg: '<svg onload="alert(1)"></svg>',
      league: { ...lobbyState.league, match_of_the_day: null, kings: [] },
    };
    render(<Lobby lang="ro" state={quiet} now={NOW} />);
    expect(screen.queryByRole("region", { name: "Comenzi gata de ridicat" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Meciul zilei" })).toBeNull();
    expect(screen.getByRole("region", { name: "Evenimente" }).textContent).toBe("EvenimenteSeară deschisă");
    expect(screen.queryByRole("img")).toBeNull(); // an unexpected SVG is never inserted
  });
});

describe("the pieces", () => {
  it("accepts only a plain SVG from the server", () => {
    expect(safeSvg(QR)).toBe(true);
    for (const bad of ["<div>", '<svg><script>x</script></svg>', '<svg onload="x">', '<svg><a href="javascript:x"/></svg>', "<svg><foreignObject/></svg>"]) {
      expect(safeSvg(bad)).toBe(false);
    }
  });

  it("rotates the club's announcements", () => {
    vi.useFakeTimers();
    render(<Announcements lang="en" items={courtState.announcements} />);
    expect(screen.getByText("Saturday tournament")).toBeTruthy();
    act(() => vi.advanceTimersByTime(ROTATE_MS));
    expect(screen.getByText("Coffee of the day")).toBeTruthy();
    act(() => vi.advanceTimersByTime(ROTATE_MS));
    expect(screen.getByText("Saturday tournament")).toBeTruthy();
  });

  it("shows the connection discreetly: a dot when live, words and the data's time when not", () => {
    const { rerender } = render(<Connection lang="ro" status="live" receivedAt={null} />);
    expect(screen.getByRole("status").className).toContain("connection--live");
    rerender(<Connection lang="ro" status="offline" receivedAt={NOW} />);
    expect(screen.getByRole("status").textContent).toBe("Se reconectează… · date de la 14:43");
    rerender(<Connection lang="ro" status="connecting" receivedAt={null} />);
    expect(screen.getByRole("status").textContent).toBe("Se reconectează…");
  });
});

type Sockets = { url: string; send: (text: string) => void; onmessage?: (e: MessageEvent) => void; onclose?: () => void; onopen?: () => void; readyState: number }[];

describe("the page", () => {
  let sockets: Sockets;
  let answer: () => Response;
  let calls: string[];

  beforeEach(() => {
    sockets = [];
    calls = [];
    answer = () => json(courtState);
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_API_URL", "http://club/api/v1");
    vi.stubEnv("VITE_DEVICE_TOKEN", "d.s");
    vi.stubGlobal(
      "WebSocket",
      class {
        readyState = 1;
        onmessage?: (e: MessageEvent) => void;
        onclose?: () => void;
        onopen?: () => void;
        constructor(readonly url: string) {
          sockets.push(this as unknown as Sockets[number]);
        }
        send() {}
        close() {}
      },
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        calls.push(`${request.method} ${new URL(request.url).pathname}`);
        if (request.url.endsWith("/ticket")) return json({ ticket: "T", path: "/ws/screens/", expires_in: 60 });
        return answer();
      }),
    );
  });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  async function start() {
    const { App } = await import("./App");
    render(<App />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  const live = () => sockets.find((s) => s.url.startsWith("ws://club/ws/screens/"));

  it("loads the state, opens the live connection and reloads on every change", async () => {
    await start();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("TEREN 4");
    expect(live()?.url).toBe("ws://club/ws/screens/?ticket=T");
    await act(async () => {
      live()?.onmessage?.({ data: JSON.stringify({ type: "hello" }) } as MessageEvent);
    });
    expect(screen.getByRole("status").className).toContain("connection--live");
    answer = () => json(lobbyState);
    await act(async () => {
      live()?.onmessage?.({ data: JSON.stringify({ type: "changed", topic: "cafe" }) } as MessageEvent);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByRole("region", { name: "Comenzi gata de ridicat" })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").state.kind).toBe("lobby");
    expect(calls.filter((c) => c === "GET /api/v1/device/screen/state").length).toBeGreaterThanOrEqual(2);
  });

  it("keeps the last state on screen while the server is away", async () => {
    keep(courtState, NOW - 60_000);
    answer = () => {
      throw new TypeError("network down");
    };
    await start();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("TEREN 4");
    expect(screen.getByRole("status").textContent).toContain("Se reconectează…");
  });

  it("says so when the screen is refused, over the last state or alone", async () => {
    answer = () => json({ error: { code: "auth.forbidden", params: {} } }, 403);
    await start();
    expect(screen.getByRole("status").textContent).toBe("Ecranul nu are acces la server. Anunță recepția.");
    cleanup();
    keep(courtState, NOW);
    await start();
    expect(screen.getByRole("alert").textContent).toBe("Ecranul nu are acces la server. Anunță recepția.");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("TEREN 4");
  });

  it("without configuration: the jungle and a notice, never a blank screen", async () => {
    vi.stubEnv("VITE_DEVICE_TOKEN", "");
    await start();
    expect(screen.getByRole("heading", { name: "Jungle Padel" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Ecranul nu este înrolat. Anunță recepția.");
    await act(async () => {
      sockets[0]?.onclose?.();
    });
    expect(screen.getByRole("status").textContent).toBe("Ecranul nu primește configurarea. Anunță recepția.");
  });

  it("reloads by itself when the session ends, and every minute", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "setInterval", "Date"] });
    vi.setSystemTime(NOW);
    const current = courtState.court?.current;
    if (!current || !courtState.court) throw new Error("fixture");
    // The match ends in 5 seconds (not a change in the database: no notice comes for it).
    const ending: ScreenState = {
      ...courtState,
      court: { ...courtState.court, current: { ...current, ends_at: new Date(NOW + 5000).toISOString() } },
    };
    answer = () => json(ending);
    const { App, SAFETY_RELOAD_MS } = await import("./App");
    render(<App />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    const loads = () => calls.filter((c) => c === "GET /api/v1/device/screen/state").length;
    const first = loads();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000);
    });
    expect(loads()).toBe(first + 1);
    answer = () => json(courtState);
    const beforeMinute = loads();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAFETY_RELOAD_MS);
    });
    expect(loads()).toBeGreaterThan(beforeMinute);
  });

  it("shows the lobby in English with ?lang=en", async () => {
    answer = () => json(lobbyState);
    window.history.pushState({}, "", "/?lang=en");
    await start();
    expect(screen.getByRole("region", { name: "Orders ready to collect" })).toBeTruthy();
    window.history.pushState({}, "", "/");
  });
});
