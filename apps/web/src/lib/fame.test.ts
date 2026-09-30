import { describe, expect, it } from "vitest";
import { hallOfFame } from "./fame";

const answer = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe("the Hall of Fame (§9.2.14, LG-134)", () => {
  it("reads the closed seasons from the API, or says it could not", async () => {
    const season = {
      number: 1,
      name: "Sezonul 1",
      ends_at: "2027-06-30T21:00:00Z",
      entries: [],
    };
    expect(await hallOfFame(answer([season]))).toEqual([season]);
    expect(await hallOfFame(answer({ error: {} }))).toBeNull();
    expect(await hallOfFame(answer([], false))).toBeNull();
    const down = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await hallOfFame(down)).toBeNull();
  });
});
