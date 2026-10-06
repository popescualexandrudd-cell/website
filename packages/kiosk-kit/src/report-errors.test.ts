import { afterEach, describe, expect, it, vi } from "vitest";
import { watchErrors } from "./report-errors";

afterEach(() => vi.unstubAllGlobals());

describe("device error reports (ADR-0017)", () => {
  it("sends each new error once a minute at most, and stops when asked", () => {
    const fetchStub = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchStub);
    const stop = watchErrors("kiosk-league", "https://device.club.test/api/v1/client-errors");
    window.dispatchEvent(new ErrorEvent("error", { message: "boom" }));
    window.dispatchEvent(new ErrorEvent("error", { message: "boom" }));
    window.dispatchEvent(new ErrorEvent("error", { message: "" }));
    const rejection = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(rejection, "reason", { value: new Error("lost") });
    window.dispatchEvent(rejection);
    const odd = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(odd, "reason", { value: undefined });
    window.dispatchEvent(odd);
    const bodies = fetchStub.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(bodies.map((b) => b.message)).toEqual(["boom", "error", "lost", "rejection"]);
    expect(bodies[0]).toMatchObject({ app: "kiosk-league", where: "/" });
    stop();
    window.dispatchEvent(new ErrorEvent("error", { message: "after" }));
    expect(fetchStub).toHaveBeenCalledTimes(4);
  });

  it("never breaks the screen", () => {
    vi.stubGlobal("fetch", () => {
      throw new Error("no fetch");
    });
    const stop = watchErrors("cafe-display", "/api/v1/client-errors");
    expect(() => window.dispatchEvent(new ErrorEvent("error", { message: "x" }))).not.toThrow();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(() => window.dispatchEvent(new ErrorEvent("error", { message: "y" }))).not.toThrow();
    stop();
  });
});
