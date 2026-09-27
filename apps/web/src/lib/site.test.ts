import { describe, expect, it } from "vitest";
import { FACTS } from "./site";

describe("facts shown on the site come from docs/ (no invented numbers)", () => {
  it("matches the confirmed business facts", () => {
    expect(FACTS).toEqual({ courts: 4, reformersAtOpening: 4, parking: 28, seasonMonths: 3 });
  });
});
