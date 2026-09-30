import { describe, expect, it } from "vitest";
import { httpsOrNull, tennisClubUrl } from "./links";

const answer = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe("the tennis club link (Q20, Q58)", () => {
  it("links only an https address", () => {
    expect(httpsOrNull("https://tenis.example.test")).toBe("https://tenis.example.test");
    expect(httpsOrNull("http://tenis.example.test")).toBeNull();
    expect(httpsOrNull('https://x" onclick="y')).toBeNull();
    expect(httpsOrNull(null)).toBeNull();
  });

  it("reads the address set in the panel, or none", async () => {
    expect(await tennisClubUrl(answer({ tennis_club_url: "https://tenis.example.test" }))).toBe("https://tenis.example.test");
    expect(await tennisClubUrl(answer({ tennis_club_url: null }))).toBeNull();
    expect(await tennisClubUrl(answer({}, false))).toBeNull();
    const down = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await tennisClubUrl(down)).toBeNull();
  });
});
