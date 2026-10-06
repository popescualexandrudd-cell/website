import { afterEach, describe, expect, it, vi } from "vitest";
import { errorReport, reportError } from "./report-error";

afterEach(() => vi.unstubAllGlobals());

describe("error reports (ADR-0017)", () => {
  it("keeps only short, known fields", () => {
    const report = errorReport("/ro/rezervari", { message: "x".repeat(900), digest: "d".repeat(99) });
    expect(report.app).toBe("web");
    expect(report.message).toHaveLength(500);
    expect(report.digest).toHaveLength(64);
    expect(errorReport("/", {})).toEqual({ app: "web", message: "error", where: "/", digest: "" });
  });

  it("posts to the club's backend and never throws", async () => {
    const fetchStub = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchStub);
    reportError("/ro", { message: "boom" });
    const [url, init] = fetchStub.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toMatch(/\/api\/v1\/client-errors$/);
    expect(JSON.parse(String(init.body))).toMatchObject({ app: "web", message: "boom", where: "/ro" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(() => reportError("/ro", { message: "boom" })).not.toThrow();
    vi.stubGlobal("fetch", () => {
      throw new Error("no fetch");
    });
    expect(() => reportError("/ro", { message: "boom" })).not.toThrow();
  });
});
