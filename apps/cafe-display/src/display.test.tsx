import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type DisplayApi, displayApi, newOrders, type Order } from "./api";
import { ring } from "./sound";

const order = (id: string, number: number, status: string): Order => ({
  id,
  number,
  status,
  total: 2400,
  created_at: "2027-04-05T15:30:00Z",
  ready_at: null,
  lines: [{ name: "Espresso", unit_price: 1200, quantity: 2 }],
});

describe("the queue (§8.7)", () => {
  it("rings only for orders it had not seen, and not at the first load", () => {
    const a = order("a", 1, "new");
    const b = order("b", 2, "new");
    expect(newOrders(null, [a])).toEqual([]);
    expect(newOrders([a], [a, b])).toEqual([b]);
    expect(newOrders([a], [{ ...a, status: "preparing" }, { ...b, status: "ready" }])).toEqual([]);
  });

  it("calls the café display API with the device token", async () => {
    const seen: Request[] = [];
    const fetchImpl = vi.fn(async (input: Request) => {
      seen.push(input);
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    const api = displayApi("http://club/api/v1", "d.s", fetchImpl as unknown as typeof fetch);
    expect(await api.queue()).toEqual([]);
    await api.advance("o-1", "ready");
    expect(seen.map((r) => [r.method, r.url])).toEqual([
      ["GET", "http://club/api/v1/device/cafe/queue"],
      ["POST", "http://club/api/v1/device/cafe/orders/o-1/advance"],
    ]);
    expect(seen[1]?.headers.get("X-Device-Token")).toBe("d.s");
  });

  it("plays two short tones", () => {
    const started: number[] = [];
    const node = () => ({
      connect: vi.fn(() => node()),
      frequency: { value: 0 },
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      start: vi.fn((at: number) => started.push(at)),
      stop: vi.fn(),
    });
    ring({ currentTime: 10, createOscillator: node, createGain: node, destination: {} } as unknown as AudioContext);
    expect(started).toEqual([10, 10.18]);
  });
});

describe("the screen", () => {
  let queue: Order[];
  let api: { queue: ReturnType<typeof vi.fn>; advance: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    queue = [order("a", 1, "new"), order("b", 2, "ready")];
    api = {
      queue: vi.fn(async () => queue),
      advance: vi.fn(async (id: string, status: string) => {
        queue = queue.map((o) => (o.id === id ? { ...o, status } : o));
        return queue.find((o) => o.id === id);
      }),
    };
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_API_URL", "http://club/api/v1");
    vi.stubEnv("VITE_DEVICE_TOKEN", "d.s");
    vi.stubGlobal(
      "WebSocket",
      class {
        close() {}
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.doUnmock("./api");
  });

  async function mount() {
    vi.doMock("./api", async (original) => ({
      ...(await original<typeof import("./api")>()),
      displayApi: () => api as unknown as DisplayApi,
    }));
    const { App } = await import("./App");
    await act(async () => {
      render(<App />);
    });
  }

  it("shows the orders in their columns; a tap moves one on", async () => {
    await mount();
    expect(screen.getByRole("heading", { name: /Noi/ })).toBeTruthy();
    expect(screen.getByLabelText("Comanda 1").textContent).toContain("2 × Espresso");
    expect(screen.getByLabelText("Comanda 1").textContent).toContain("la 18:30");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Încep prepararea" }));
    });
    expect(api.advance).toHaveBeenCalledWith("a", "preparing");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Ridicată" }));
    });
    expect(api.advance).toHaveBeenCalledWith("b", "picked_up");
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByRole("heading", { name: /Preparing/ })).toBeTruthy();
  });

  it("announces a new order; says when the server is away or refuses", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    await mount();
    // The same module copy as the screen (the modules were reset for the mock).
    const { ApiError, Offline } = await import("@jungle/kiosk-kit");
    queue = [...queue, order("c", 3, "new")];
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText("Comandă nouă: 3")).toBeTruthy();
    api.queue.mockRejectedValueOnce(new Offline("x"));
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByRole("alert").textContent).toContain("Legătura cu serverul s-a întrerupt");
    api.advance.mockRejectedValueOnce(new ApiError("cafe.invalid_transition", {}, 409));
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Încep prepararea" })[0]!);
    });
    expect(screen.getAllByRole("alert").some((a) => a.textContent !== "")).toBe(true);
    vi.useRealTimers();
  });
});
