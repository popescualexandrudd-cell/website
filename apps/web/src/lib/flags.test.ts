/** Q57: the full site only when the owner turned on `full_site`; any doubt keeps the pre-launch page. */
import { describe, expect, it, vi } from "vitest";
import { modeFrom, siteMode } from "./flags";

const answer = (body: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => body }) as unknown as Response);

describe("site mode", () => {
  it("is full only with the full_site flag on", () => {
    expect(modeFrom([{ key: "full_site", enabled: true }])).toBe("full");
    expect(modeFrom([{ key: "full_site", enabled: false }, { key: "parkour", enabled: true }])).toBe("prelaunch");
    expect(modeFrom([{ key: "full_site", enabled: "true" }])).toBe("prelaunch");
    expect(modeFrom([null, { key: "other", enabled: true }])).toBe("prelaunch");
    expect(modeFrom({ key: "full_site", enabled: true })).toBe("prelaunch");
  });

  it("reads the flags with the cache tag, and falls back to pre-launch without the API", async () => {
    const ok = answer([{ key: "full_site", enabled: true }]);
    expect(await siteMode(ok as unknown as typeof fetch)).toBe("full");
    expect(ok).toHaveBeenCalledWith("http://localhost:8000/api/v1/config/flags", { next: { revalidate: 300, tags: ["flags"] } });
    expect(await siteMode(answer([], false) as unknown as typeof fetch)).toBe("prelaunch");
    const down = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await siteMode(down as unknown as typeof fetch)).toBe("prelaunch");
  });
});
