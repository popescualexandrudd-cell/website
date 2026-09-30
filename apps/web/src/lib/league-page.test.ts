import { describe, expect, it, vi } from "vitest";
import { filterRows, filtersFrom, fold, profile, queryFor, scoreText, seasons, type StandingRow } from "./league-page";

const row = (position: number, tier: string, names: [string, string][]): StandingRow => ({
  position,
  players: names.map(([first_name, last_name]) => ({ id: null, first_name, last_name })),
  tier,
  division: "I",
  level: 3,
  lp: 10,
  eligible: true,
});

describe("the league page's choices (§9.3)", () => {
  it("falls back to the defaults for anything unknown", () => {
    expect(filtersFrom({})).toEqual({ ladder: "doubles", season: null, tier: null, q: "" });
    expect(filtersFrom({ ladder: "mixed", season: "x1", rank: "wood", q: "  " })).toEqual({ ladder: "doubles", season: null, tier: null, q: "" });
  });

  it("reads a ladder, a season, a rank and a search", () => {
    expect(filtersFrom({ ladder: "pairs", season: "3", rank: "gold", q: " Ana " })).toEqual({ ladder: "pairs", season: 3, tier: "gold", q: "Ana" });
    expect(filtersFrom({ ladder: ["singles", "pairs"] }).ladder).toBe("singles");
    expect(filtersFrom({ q: "x".repeat(200) }).q).toHaveLength(60);
  });

  it("leaves the defaults out of the address", () => {
    const filters = filtersFrom({ ladder: "singles", season: "2", rank: "master", q: "Ion" });
    expect(queryFor(filters)).toEqual({ ladder: "singles", season: "2", rank: "master", q: "Ion" });
    expect(queryFor(filters, { ladder: "doubles", season: null, tier: null, q: "" })).toEqual({});
  });
});

describe("filtering the standings", () => {
  const rows = [row(1, "gold", [["Ștefan", "Popa"]]), row(2, "silver", [["Ana", "Ionescu"], ["Radu", "Ene"]]), row(3, "gold", [["Maria", "Stan"]])];

  it("by rank and by name, without diacritics, keeping the order", () => {
    expect(filterRows(rows, "gold", "").map((r) => r.position)).toEqual([1, 3]);
    expect(filterRows(rows, null, "stefan").map((r) => r.position)).toEqual([1]);
    expect(filterRows(rows, null, "ene").map((r) => r.position)).toEqual([2]);
    expect(filterRows(rows, "silver", "maria")).toEqual([]);
    expect(fold("ȘTEFĂNESCU")).toBe("stefanescu");
  });
});

describe("a score", () => {
  it("lists the sets, team A first", () => {
    expect(scoreText({ sets: [{ a: 6, b: 4 }, { a: 3, b: 6 }, { a: 10, b: 8 }] })).toBe("6–4, 3–6, 10–8");
    expect(scoreText({})).toBe("");
  });
});

describe("reading the API", () => {
  it("sorts the seasons newest first and says null when the API fails", async () => {
    const ok = vi.fn(async () => new Response(JSON.stringify([{ number: 1 }, { number: 3 }, { number: 2 }])));
    expect((await seasons(ok as unknown as typeof fetch))?.map((s) => s.number)).toEqual([3, 2, 1]);
    const down = vi.fn(async () => new Response("", { status: 500 }));
    expect(await seasons(down as unknown as typeof fetch)).toBeNull();
    const broken = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await seasons(broken as unknown as typeof fetch)).toBeNull();
  });

  it("never asks the API for a player id that is not a UUID", async () => {
    const spy = vi.fn();
    expect(await profile("../admin", spy as unknown as typeof fetch)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});
