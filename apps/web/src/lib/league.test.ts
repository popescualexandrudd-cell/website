import { describe, expect, it } from "vitest";
import { type Choice, LEVELS, maxLp, previewQuery, RANKS, rankFromKey, rankKey } from "./league";

const CHOICE: Choice = {
  you: 3.5,
  partner: 4,
  rivalA: 3,
  rivalB: 4.5,
  rank: { tier: "gold", division: "II" },
  lp: 50,
  result: "win",
  kind: "official",
};

describe("the league section (§9.2.7)", () => {
  it("lists the 21 ranks in order, Bronze IV to Master (§6.5)", () => {
    expect(RANKS).toHaveLength(21);
    expect(RANKS[0]).toEqual({ tier: "bronze", division: "IV" });
    expect(RANKS[3]).toEqual({ tier: "bronze", division: "I" });
    expect(RANKS[19]).toEqual({ tier: "diamond", division: "I" });
    expect(RANKS[20]).toEqual({ tier: "master", division: null });
  });

  it("keys a rank for a select and back", () => {
    expect(rankKey({ tier: "gold", division: "II" })).toBe("gold-II");
    expect(rankKey({ tier: "master", division: null })).toBe("master");
    for (const rank of RANKS) expect(rankFromKey(rankKey(rank))).toEqual(rank);
    expect(rankFromKey("nonsense")).toEqual(RANKS[0]);
  });

  it("offers the levels 1.0 to 7.0 in half points", () => {
    expect(LEVELS[0]).toBe(1);
    expect(LEVELS.at(-1)).toBe(7);
    expect(LEVELS).toContain(3.5);
  });

  it("sends the choice to the engine through the API, never computing LP here", () => {
    expect(previewQuery(CHOICE, "jungle-padel")).toEqual({
      location: "jungle-padel",
      you: 3.5,
      partner: 4,
      rival_a: 3,
      rival_b: 4.5,
      tier: "gold",
      division: "II",
      lp: 50,
      result: "win",
      kind: "official",
    });
    // Master has no division and more room for LP; LP stays within the rank.
    const master = previewQuery({ ...CHOICE, rank: { tier: "master", division: null }, lp: 320 }, "jungle-padel");
    expect(master).not.toHaveProperty("division");
    expect(master.lp).toBe(320);
    expect(previewQuery({ ...CHOICE, lp: 320 }, "jungle-padel").lp).toBe(99);
    expect(previewQuery({ ...CHOICE, lp: -4 }, "jungle-padel").lp).toBe(0);
    expect(maxLp({ tier: "master", division: null })).toBe(500);
  });
});
