/** Q57: the full site only when the owner turned on `full_site`; any doubt keeps the pre-launch page. */
import { describe, expect, it, vi } from "vitest";
import { flagsFrom, modeFrom, siteFlags, siteMode } from "./flags";

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

  it("ADR-0023: the effects and the hero video only on the full site, only when turned on", async () => {
    const all = [
      { key: "full_site", enabled: true },
      { key: "web_effects", enabled: true },
      { key: "web_hero_video", enabled: true },
    ];
    expect(flagsFrom(all)).toEqual({ mode: "full", effects: true, heroVideo: true, children: false, assistant: false });
    expect(flagsFrom(all.slice(0, 2))).toEqual({ mode: "full", effects: true, heroVideo: false, children: false, assistant: false });
    expect(flagsFrom([{ key: "full_site", enabled: true }, { key: "web_effects", enabled: "true" }]).effects).toBe(false);
    // The pre-launch page never gets them (Q64).
    expect(flagsFrom([{ key: "full_site", enabled: false }, ...all.slice(1)])).toEqual({ mode: "prelaunch", effects: false, heroVideo: false, children: false, assistant: false });
    expect(flagsFrom(null)).toEqual({ mode: "prelaunch", effects: false, heroVideo: false, children: false, assistant: false });
    expect(flagsFrom([...all, { key: "child_accounts", enabled: true }]).children).toBe(true); // Q7
    expect(flagsFrom([...all, { key: "ai", enabled: true }]).assistant).toBe(true); // ADR-0019
    expect(flagsFrom([{ key: "full_site", enabled: false }, { key: "ai", enabled: true }]).assistant).toBe(false);
    expect(flagsFrom([{ key: "full_site", enabled: false }, { key: "child_accounts", enabled: true }]).children).toBe(false);
    expect(await siteFlags(answer(all) as unknown as typeof fetch)).toEqual({ mode: "full", effects: true, heroVideo: true, children: false, assistant: false });
  });
});
