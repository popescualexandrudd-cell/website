import { describe, expect, it } from "vitest";
import { ANPC_SAL_URL, CARD_TIERS, FACTS } from "./site";

describe("facts shown on the site come from docs/ (no invented numbers)", () => {
  it("matches the confirmed business facts", () => {
    expect(FACTS).toEqual({
      courts: 4,
      loungeHeightM: 3,
      parking: 28,
      seasonsOfPlay: 4,
      reformersAtOpening: 4,
      seasonMonths: 3,
    });
  });

  it("links the ANPC dispute resolution page over HTTPS", () => {
    expect(ANPC_SAL_URL).toMatch(/^https:\/\/anpc\.ro\//);
  });

  it("shows the four card tiers in ascending order", () => {
    expect(CARD_TIERS).toEqual(["silver", "gold", "platinum", "diamond"]);
  });
});
