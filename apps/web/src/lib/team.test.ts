import { describe, expect, it } from "vitest";
import { COACHES, coachesOf, SPORTS } from "./team";

describe("the team (Q65)", () => {
  it("has two coaches for each sport", () => {
    for (const sport of SPORTS) expect(coachesOf(sport)).toHaveLength(2);
  });

  it("marks every placeholder name as fictional (invariant 12)", () => {
    expect(COACHES.every((coach) => coach.fictional)).toBe(true);
  });
});
