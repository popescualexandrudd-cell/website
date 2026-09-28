import { describe, expect, it, vi } from "vitest";
import { ApiError, kioskApi, Offline, unwrap } from "./api";
import { BridgeLink } from "./bridge";
import { errorText, formatTime, t } from "./i18n";
import { describe as describeScore, emptySet, limit, needsTiebreak, teamsValid, toScore } from "./score";
import { createWedge, MAX_GAP_MS } from "./wedge";

describe("i18n (RO/EN, club time)", () => {
  it("formats kiosk texts with ICU parameters", () => {
    expect(t("ro", "session.hello", { name: "Ana" })).toBe("Salut, Ana!");
    expect(t("en", "session.hello", { name: "Ana" })).toBe("Hi, Ana!");
    expect(t("ro", "actions.count", { count: 3 })).toBe("3 de făcut");
    expect(t("en", "nu.exista")).toBe("nu.exista");
  });

  it("translates API error codes, times in Europe/Bucharest (ADR-0010)", () => {
    const text = errorText("ro", "league.window_not_open", {
      opens: "2027-04-05T08:00:00Z",
      closes: "2027-04-05T08:30:00Z",
    });
    expect(text).toBe("Scorul se poate introduce între 11:00 și 11:30.");
    expect(errorText("en", "cards.invalid")).toMatch(/card/);
    expect(errorText("ro", "league.players_not_scanned", { missing: ["Ana", "Ion"] })).toContain("Ana, Ion");
    expect(errorText("ro", "cod.necunoscut")).toBe(t("ro", "errors.generic"));
    expect(formatTime("en", "2027-03-28T10:00:00Z")).toBe("13:00"); // after the change to summer time
  });
});

describe("keyboard-wedge scanner", () => {
  it("collects fast keys and ends at Enter", () => {
    let clock = 0;
    const codes: string[] = [];
    const feed = createWedge((c) => codes.push(c), () => clock);
    for (const key of [..."ABCDEF12", "Enter"]) {
      clock += 5;
      feed(key);
    }
    for (const key of [..."AB", "Shift", "Enter"]) feed(key); // too short
    clock += MAX_GAP_MS + 1;
    feed("X");
    clock += MAX_GAP_MS + 1; // a human typing slowly
    feed("Y");
    feed("Enter");
    expect(codes).toEqual(["ABCDEF12"]);
  });
});

describe("score entry (§6.7, §6.8)", () => {
  it("builds the score the server validates", () => {
    const tie = { ...emptySet(), a: 7, b: 6, tbA: 7, tbB: 4 };
    expect(needsTiebreak(tie)).toBe(true);
    expect(needsTiebreak({ ...tie, superTiebreak: true })).toBe(false);
    expect(limit(emptySet())).toBe(7);
    expect(limit({ ...emptySet(), superTiebreak: true })).toBe(30);
    const score = toScore([{ ...emptySet(), a: 6, b: 3 }, tie], false);
    expect(score).toEqual({
      sets: [
        { a: 6, b: 3, tiebreak: null, super_tiebreak: false },
        { a: 7, b: 6, tiebreak: [7, 4], super_tiebreak: false },
      ],
      unfinished: false,
    });
    expect(describeScore(score)).toBe("6–3, 7–6 (7–4)");
    expect(describeScore({})).toBe("");
    expect(teamsValid(["a", "b"], ["c", "d"])).toBe(true);
    expect(teamsValid(["a"], ["c", "d"])).toBe(false);
    expect(teamsValid([], [])).toBe(false);
  });
});

describe("API client", () => {
  const response = (status: number, body: unknown) =>
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  it("sends the device token and turns refusals into stable codes", async () => {
    const seen: Request[] = [];
    const fetchImpl = vi.fn(async (input: Request) => {
      seen.push(input);
      return response(403, { error: { code: "league.score_kiosk_only", params: {} } });
    });
    const api = kioskApi("http://club/api/v1/", "dev.secret", fetchImpl as unknown as typeof fetch);
    const error = await api.idle().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("league.score_kiosk_only");
    expect(seen[0]?.url).toBe("http://club/api/v1/kiosk/league/idle");
    expect(seen[0]?.headers.get("X-Device-Token")).toBe("dev.secret");
  });

  it("network failures and server errors mean offline", async () => {
    await expect(unwrap(Promise.reject(new TypeError("fetch failed")))).rejects.toBeInstanceOf(Offline);
    await expect(unwrap(Promise.resolve({ response: response(502, {}) }))).rejects.toBeInstanceOf(Offline);
    const bare = await unwrap(Promise.resolve({ error: undefined, response: response(400, {}) })).catch((e: unknown) => e);
    expect((bare as ApiError).code).toBe("unknown");
    expect(await unwrap(Promise.resolve({ data: 5, response: response(200, 5) }))).toBe(5);
  });
});

class FakeSocket {
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  send(text: string) {
    this.sent.push(text);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  push(message: unknown) {
    this.onmessage?.({ data: typeof message === "string" ? message : JSON.stringify(message) });
  }
}

describe("Hardware Bridge link (ADR-0013)", () => {
  it("says hello, forwards signed scans, reconnects", async () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [];
    const events: string[] = [];
    const link = new BridgeLink(
      "ws://127.0.0.1:8765",
      {
        onScan: (signed) => events.push(`scan:${String(signed.payload.code)}`),
        onStatus: (up) => events.push(up ? "up" : "down"),
        onHello: (hello) => events.push(`hello:${hello.device}`),
      },
      () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket as unknown as WebSocket;
      },
    );
    expect(await link.simulateScan("X")).toEqual({ ok: false, error: "disconnected" });
    link.connect();
    const first = sockets[0]!;
    first.open();
    const hello = JSON.parse(first.sent[0]!);
    expect(hello.op).toBe("hello");
    first.push({ id: hello.id, ok: true, device: "d-1" });
    await Promise.resolve();
    first.push({ event: "scan", signed: { payload: { code: "C1" }, signature: "s" } });
    first.push("nu e json");
    first.push({ id: 999, ok: true });
    const pending = link.simulateScan("C2");
    expect(JSON.parse(first.sent[1]!)).toMatchObject({ op: "sim.scan", code: "C2" });
    first.close();
    expect(await pending).toEqual({ ok: false, error: "disconnected" });
    vi.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(2);
    link.close();
    vi.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(2);
    expect(events).toEqual(["up", "hello:d-1", "scan:C1", "down", "down"]);
    vi.useRealTimers();
  });

  it("keeps trying when the socket cannot be created", () => {
    vi.useFakeTimers();
    let attempts = 0;
    const link = new BridgeLink(
      "ws://127.0.0.1:1",
      { onScan: () => undefined, onStatus: () => undefined, onHello: () => undefined },
      () => {
        attempts += 1;
        throw new Error("refused");
      },
    );
    link.connect();
    vi.advanceTimersByTime(1000 + 2000 + 4000);
    expect(attempts).toBe(4);
    link.close();
    vi.useRealTimers();
  });
});

describe("rank names (§6.5)", () => {
  it("translates tiers and divisions", async () => {
    const { rankName } = await import("./i18n");
    expect(rankName("ro", "gold", "II")).toBe("Aur II");
    expect(rankName("en", "master", "")).toBe("Master");
    expect(rankName("ro", "", "")).toBe("");
  });
});
