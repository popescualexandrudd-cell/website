/** The screens' logic without the page: time, the kept state, the live connection, texts. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screenApi, socketUrl } from "./api";
import { courtState, match } from "./fixtures";
import { playerDetails, playerName, rankText, rowDetails, upper } from "./i18n";
import { FIRST_RETRY_MS, LiveLink, type LiveStatus, MAX_RETRY_MS, PING_MS } from "./live";
import { keep, lastKept, STORAGE_KEY } from "./store";
import { clockOffset, hoursMinutes, minutesLeft, nextBoundary } from "./time";

describe("time on the screens (§8.5)", () => {
  it("counts the minutes left on the server's clock, rounded up", () => {
    const now = Date.parse("2027-04-05T11:43:00Z");
    expect(minutesLeft(match.ends_at, now)).toBe(47);
    expect(minutesLeft(match.ends_at, now + 30_000)).toBe(47);
    expect(minutesLeft(match.ends_at, Date.parse(match.ends_at) - 1000)).toBe(1);
    expect(minutesLeft(match.ends_at, Date.parse(match.ends_at) + 5000)).toBe(0);
    expect(hoursMinutes(47)).toBe("00:47");
    expect(hoursMinutes(95)).toBe("01:35");
    expect(hoursMinutes(-3)).toBe("00:00");
  });

  it("keeps the difference between the server's clock and the screen's", () => {
    expect(clockOffset("2027-04-05T11:43:00Z", Date.parse("2027-04-05T11:42:00Z"))).toBe(60_000);
    expect(clockOffset("not a date", 5)).toBe(0);
  });

  it("knows when a session ends or the next begins", () => {
    const now = Date.parse("2027-04-05T11:43:00Z");
    expect(nextBoundary([match.ends_at, "2027-04-05T13:00:00Z", null, undefined, "x"], now)).toBe(
      Date.parse(match.ends_at),
    );
    expect(nextBoundary([match.starts_at], now)).toBeNull();
  });
});

describe("the last state, kept in the browser", () => {
  afterEach(() => localStorage.clear());

  it("comes back after a restart", () => {
    keep(courtState, 123);
    expect(lastKept()).toEqual({ state: courtState, receivedAt: 123 });
  });

  it("ignores anything broken and survives a refusing storage", () => {
    for (const text of ["{", JSON.stringify({ receivedAt: 1 }), JSON.stringify({ state: { kind: "x" }, receivedAt: 1 })]) {
      localStorage.setItem(STORAGE_KEY, text);
      expect(lastKept()).toBeNull();
    }
    const refusing = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("full");
      },
    } as unknown as Storage;
    expect(() => keep(courtState, 1, refusing)).not.toThrow();
    expect(lastKept(refusing)).toBeNull();
    expect(lastKept(undefined)).toBeNull();
  });
});

describe("the public fields of a player (R-012)", () => {
  it("reads as in §8.5", () => {
    const [first, second] = match.teams[0] ?? [];
    expect(first && playerDetails("ro", first)).toBe("Diamant II · 67 LP · Nivel 5.2");
    expect(second && playerDetails("ro", second)).toBe("Diamant III · 12 LP · Nivel 5.0");
    expect(first && playerDetails("en", first)).toBe("Diamond II · 67 LP · Level 5.2");
  });

  it("shows nothing that is not known, and 'Jucător' for someone not public (Q55)", () => {
    const hidden = { name: "", tier: "", division: "", lp: null, level: null, position: null };
    expect(playerName("ro", hidden)).toBe("Jucător");
    expect(playerDetails("ro", hidden)).toBe("");
    expect(playerDetails("ro", { ...hidden, name: "Ana", level: 3 })).toBe("Nivel 3.0");
    expect(rankText("ro", "master", "")).toBe("Maestru");
    expect(rowDetails("ro", { position: 1, names: ["A"], tier: "", division: "", lp: 0, level: 3 })).toBe("0 LP");
    expect(upper("ro", "Teren 4 · meci oficial de ligă")).toBe("TEREN 4 · MECI OFICIAL DE LIGĂ");
    expect(upper("en", "court")).toBe("COURT");
  });
});

describe("the screens' API", () => {
  it("calls it with the device token, and opens the socket on the same server", async () => {
    const seen: Request[] = [];
    const fetchImpl = vi.fn(async (input: Request) => {
      seen.push(input);
      return new Response(JSON.stringify({ ticket: "t" }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    const api = screenApi("https://club.ro/api/v1", "d.s", fetchImpl as unknown as typeof fetch);
    await api.state();
    await api.ticket();
    expect(seen.map((r) => [r.method, r.url])).toEqual([
      ["GET", "https://club.ro/api/v1/device/screen/state"],
      ["POST", "https://club.ro/api/v1/device/screen/ticket"],
    ]);
    expect(seen[0]?.headers.get("X-Device-Token")).toBe("d.s");
    expect(socketUrl("https://club.ro/api/v1", "/ws/screens/", "a b")).toBe("wss://club.ro/ws/screens/?ticket=a%20b");
    expect(socketUrl("http://localhost:8000/api/v1/", "/ws/screens/", "t")).toBe("ws://localhost:8000/ws/screens/?ticket=t");
  });
});

class FakeSocket {
  static made: FakeSocket[] = [];
  readyState = 1;
  sent: string[] = [];
  closed = false;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(readonly url: string) {
    FakeSocket.made.push(this);
  }
  send(text: string) {
    this.sent.push(text);
  }
  close() {
    this.closed = true;
  }
  push(data: unknown) {
    this.onmessage?.({ data: typeof data === "string" ? data : JSON.stringify(data) } as MessageEvent);
  }
}

describe("the live connection (ADR-0005)", () => {
  let statuses: LiveStatus[];
  let changed: number;

  beforeEach(() => {
    vi.useFakeTimers();
    FakeSocket.made = [];
    statuses = [];
    changed = 0;
  });
  afterEach(() => vi.useRealTimers());

  const link = (getTicket: () => Promise<{ ticket: string; path: string }>) =>
    new LiveLink(
      "http://club/api/v1",
      getTicket,
      { onChanged: () => changed++, onStatus: (s) => statuses.push(s) },
      (url) => new FakeSocket(url) as unknown as WebSocket,
      () => 0,
    );

  it("opens with a ticket, reloads on hello and on every change, keeps the line alive", async () => {
    const live = link(async () => ({ ticket: "T1", path: "/ws/screens/" }));
    await live.connect();
    const socket = FakeSocket.made[0];
    expect(socket?.url).toBe("ws://club/ws/screens/?ticket=T1");
    socket?.push({ type: "hello" });
    expect(statuses).toEqual(["connecting", "live"]);
    expect(changed).toBe(1); // catch up on what changed while away
    socket?.push({ type: "changed", topic: "bookings" });
    socket?.push("not json");
    socket?.push({ type: "pong" });
    socket?.push(null);
    expect(changed).toBe(2);
    vi.advanceTimersByTime(PING_MS);
    expect(socket?.sent).toEqual([JSON.stringify({ type: "ping" })]);
    if (socket) socket.readyState = 3;
    vi.advanceTimersByTime(PING_MS);
    expect(socket?.sent).toHaveLength(1);
    live.close();
    expect(socket?.closed).toBe(true);
  });

  it("comes back by itself, waiting longer each time", async () => {
    let tickets = 0;
    const live = link(async () => {
      tickets++;
      if (tickets <= 2) throw new Error("server away");
      return { ticket: `T${tickets}`, path: "/ws/screens/" };
    });
    await live.connect();
    expect(statuses).toEqual(["connecting", "offline"]);
    await vi.advanceTimersByTimeAsync(FIRST_RETRY_MS);
    expect(tickets).toBe(2);
    await vi.advanceTimersByTimeAsync(FIRST_RETRY_MS);
    expect(tickets).toBe(2); // the second wait is twice as long
    await vi.advanceTimersByTimeAsync(FIRST_RETRY_MS);
    expect(tickets).toBe(3);
    const socket = FakeSocket.made[0];
    socket?.push({ type: "hello" });
    socket?.onclose?.();
    expect(statuses.at(-1)).toBe("offline");
    await vi.advanceTimersByTimeAsync(FIRST_RETRY_MS); // after hello the wait starts again from 1 s
    expect(tickets).toBe(4);
    live.close();
    socket?.onclose?.();
    await vi.advanceTimersByTimeAsync(MAX_RETRY_MS * 2);
    expect(tickets).toBe(4);
  });

  it("never waits more than half a minute, and stops when closed", async () => {
    let tickets = 0;
    const live = link(async () => {
      tickets++;
      throw new Error("away");
    });
    await live.connect();
    for (let i = 0; i < 8; i++) await vi.advanceTimersByTimeAsync(MAX_RETRY_MS);
    expect(tickets).toBeGreaterThanOrEqual(8);
    live.close();
    const before = tickets;
    await vi.advanceTimersByTimeAsync(MAX_RETRY_MS * 3);
    expect(tickets).toBe(before);
    await live.connect();
    expect(tickets).toBe(before);
  });

  it("gives up this attempt when the socket cannot be made, or the link closed meanwhile", async () => {
    const failing = new LiveLink(
      "http://club/api/v1",
      async () => ({ ticket: "T", path: "/ws/screens/" }),
      { onChanged: () => changed++, onStatus: (s) => statuses.push(s) },
      () => {
        throw new Error("blocked");
      },
      () => 0,
    );
    await failing.connect();
    expect(statuses).toEqual(["connecting", "offline"]);
    failing.close();

    let release: (value: { ticket: string; path: string }) => void = () => undefined;
    const slow = link(() => new Promise((resolve) => (release = resolve)));
    const connecting = slow.connect();
    slow.close();
    release({ ticket: "T", path: "/ws/screens/" });
    await connecting;
    expect(FakeSocket.made).toHaveLength(0);
  });

  it("uses the browser's WebSocket and a little randomness by default", async () => {
    const made: string[] = [];
    vi.stubGlobal(
      "WebSocket",
      class {
        constructor(url: string) {
          made.push(url);
        }
        close() {}
      },
    );
    const live = new LiveLink("http://club/api/v1", async () => ({ ticket: "T", path: "/ws/screens/" }), {
      onChanged: () => undefined,
      onStatus: () => undefined,
    });
    await live.connect();
    expect(made).toEqual(["ws://club/ws/screens/?ticket=T"]);
    live.close();
    vi.unstubAllGlobals();
  });
});

describe("the fixture", () => {
  it("is the example of §8.5", () => {
    expect(courtState.court?.current?.teams.flat().map((p) => p.name)).toEqual([
      "Popescu Alexandru Daniel",
      "Moșteanu Rareș",
      "Jucător 3",
      "Jucător 4",
    ]);
  });
});
