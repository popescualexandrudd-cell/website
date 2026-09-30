import { describe, expect, it } from "vitest";
import { chosen, lei, quoteBody, START, toggleSport } from "./packages";

describe("the package configurator (§9.2.10, R-081)", () => {
  it("starts with padel at the Activ intensity, monthly", () => {
    expect(quoteBody(START, "jungle-padel")).toEqual({
      location: "jungle-padel",
      selections: [{ sport: "padel", intensity: "active" }],
      period: "monthly",
    });
  });

  it("adds and removes sports, keeps at least one, in the configurator's order (R-080)", () => {
    const two = toggleSport(START, "pilates");
    const three = toggleSport(two, "tennis");
    expect(chosen(three)).toEqual(["padel", "tennis", "pilates"]);
    expect(quoteBody(three, "x").selections).toHaveLength(3);
    const back = toggleSport(toggleSport(three, "padel"), "tennis");
    expect(chosen(back)).toEqual(["pilates"]);
    expect(toggleSport(back, "pilates")).toBe(back); // the last sport stays
  });

  it("shows bani as lei, in the visitor's language (invariant 5: integers on the wire)", () => {
    expect(lei(72000, "ro")).toBe("720");
    expect(lei(184700, "ro")).toBe("1.847");
    expect(lei(12345, "ro")).toBe("123,45");
    expect(lei(184700, "en")).toBe("1,847");
  });
});
