import { describe, expect, it, vi } from "vitest";
import { ApiError, apiOrigin, deviceHeaders, Offline, unwrap } from "./api";
import { type BridgeEvent, BridgeLink } from "./bridge";
import { createI18n, formatDate, formatMoney, formatTime } from "./i18n";
import { createWedge, MAX_GAP_MS } from "./wedge";

describe("texts (RO/EN, club time, lei)", () => {
  const { t, errorText } = createI18n("kiosk");

  it("reads a namespace with ICU parameters; a missing key shows itself", () => {
    expect(t("ro", "session.hello", { name: "Ana" })).toBe("Salut, Ana!");
    expect(t("en", "session.hello", { name: "Ana" })).toBe("Hi, Ana!");
    expect(t("en", "nu.exista")).toBe("nu.exista");
    expect(createI18n("payKiosk").t("ro", "idle.scan")).toBe("Scanează cardul");
  });

  it("translates API error codes, with times in Europe/Bucharest (ADR-0010)", () => {
    const text = errorText("ro", "league.window_not_open", {
      opens: "2027-04-05T08:00:00Z",
      closes: "2027-04-05T08:30:00Z",
    });
    expect(text).toBe("Scorul se poate introduce între 11:00 și 11:30.");
    expect(errorText("ro", "league.players_not_scanned", { missing: ["Ana", "Ion"] })).toContain("Ana, Ion");
    expect(errorText("ro", "cod.necunoscut")).toBe(t("ro", "errors.generic"));
    expect(formatTime("en", "2027-03-28T10:00:00Z")).toBe("13:00"); // after the change to summer time
  });

  it("shows bani as lei (ADR-0009) and days as the club reads them", () => {
    expect(formatMoney("ro", 24000)).toBe("240 lei");
    expect(formatMoney("ro", 1250)).toBe("12,50 lei");
    expect(formatMoney("en", 1250)).toBe("12.50 lei");
    expect(formatMoney("ro", 500000)).toBe("5.000 lei");
    expect(formatDate("ro", "2027-04-05")).toMatch(/^5 apr\.? 2027$/);
    expect(formatDate("en", "2027-03-31T22:30:00Z")).toBe("1 Apr 2027"); // already the 1st in Bucharest
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

describe("API answers", () => {
  const response = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  it("network failures and server errors mean offline; refusals keep their code", async () => {
    await expect(unwrap(Promise.reject(new TypeError("fetch failed")))).rejects.toBeInstanceOf(Offline);
    await expect(unwrap(Promise.resolve({ response: response(502, {}) }))).rejects.toBeInstanceOf(Offline);
    const bare = await unwrap(Promise.resolve({ error: undefined, response: response(400, {}) })).catch((e: unknown) => e);
    expect((bare as ApiError).code).toBe("unknown");
    const coded = await unwrap(
      Promise.resolve({ error: { error: { code: "checkout.busy", params: { x: 1 } } }, response: response(409, {}) }),
    ).catch((e: unknown) => e);
    expect(coded).toBeInstanceOf(ApiError);
    expect([(coded as ApiError).code, (coded as ApiError).params, (coded as ApiError).status]).toEqual([
      "checkout.busy",
      { x: 1 },
      409,
    ]);
    expect(await unwrap(Promise.resolve({ data: 5, response: response(200, 5) }))).toBe(5);
  });

  it("the API root and the device header", () => {
    expect(apiOrigin("http://club/api/v1/")).toBe("http://club");
    expect(apiOrigin("https://api.club")).toBe("https://api.club");
    expect(deviceHeaders("d.s")).toEqual({ "X-Device-Token": "d.s" });
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
  it("says hello, forwards signed scans and cash events, reconnects", async () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [];
    const events: string[] = [];
    const link = new BridgeLink(
      "ws://127.0.0.1:8765",
      {
        onScan: (signed) => events.push(`scan:${String(signed.payload.code)}`),
        onStatus: (up) => events.push(up ? "up" : "down"),
        onHello: (hello) => events.push(`hello:${hello.device}`),
        onEvent: (event: BridgeEvent) => events.push(`event:${event.event}`),
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
    first.push({ event: "scan" }); // a scan without a signature is ignored
    first.push({ event: "cash.accepted", signed: { payload: {}, signature: "s" }, total: 5000 });
    first.push("nu e json");
    first.push({ id: 999, ok: true });
    void link.simulateNote(5000);
    void link.simulateFault("cash", "note_jam");
    void link.order({ payload: { type: "cash.accept", txn: "t-1" }, signature: "sig" });
    const pending = link.simulateScan("C2");
    expect(first.sent.slice(1).map((m) => JSON.parse(m))).toMatchObject([
      { op: "sim.insert", amount: 5000 },
      { op: "sim.fault", device: "cash", fault: "note_jam" },
      { op: "cash.accept", command: { payload: { type: "cash.accept" }, signature: "sig" } },
      { op: "sim.scan", code: "C2" },
    ]);
    first.close();
    expect(await pending).toEqual({ ok: false, error: "disconnected" });
    vi.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(2);
    link.close();
    vi.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(2);
    expect(events).toEqual(["up", "hello:d-1", "scan:C1", "event:cash.accepted", "down", "down"]);
    vi.useRealTimers();
  });

  it("a hello the bridge refused changes nothing; events without a handler are dropped", async () => {
    const sockets: FakeSocket[] = [];
    const hellos: string[] = [];
    const link = new BridgeLink(
      "ws://127.0.0.1:8765",
      { onScan: () => undefined, onStatus: () => undefined, onHello: (h) => hellos.push(h.device) },
      () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket as unknown as WebSocket;
      },
    );
    link.connect();
    sockets[0]!.open();
    const hello = JSON.parse(sockets[0]!.sent[0]!);
    sockets[0]!.push({ event: "fault", code: "note_jam" });
    sockets[0]!.push({ id: hello.id, ok: false, error: "busy" });
    await Promise.resolve();
    expect(hellos).toEqual([]);
    link.close();
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
