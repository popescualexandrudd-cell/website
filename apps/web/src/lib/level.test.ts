import { describe, expect, it } from "vitest";
import { bandKey, complete, onScale, query, questions } from "./level";

describe("the level simulator (§9.2.6)", () => {
  it("asks about one's game only after playing padel", () => {
    expect(questions({})).toEqual(["padel", "skill", "tournaments", "racket", "frequency", "goal"]);
    expect(questions({ padel: "under_year" })).toHaveLength(6);
    expect(questions({ padel: "never" })).toEqual(["padel", "racket", "goal"]);
  });

  it("sends only the answers to the questions asked (R-003: the server computes the level)", () => {
    const played = {
      padel: "one_to_three",
      skill: "walls",
      tournaments: "club",
      racket: "none",
      frequency: "weekly",
      goal: "compete",
    } as const;
    expect(query(played)).toEqual(played);
    // Changing the first answer to "never" drops the answers about one's game.
    expect(query({ ...played, padel: "never" })).toEqual({ padel: "never", racket: "none", goal: "compete" });
    expect(query({ padel: "never" })).toEqual({ padel: "never" });
  });

  it("is complete when every question asked has an answer", () => {
    expect(complete({})).toBe(false);
    expect(complete({ padel: "never", racket: "none" })).toBe(false);
    expect(complete({ padel: "never", racket: "none", goal: "learn" })).toBe(true);
    expect(complete({ padel: "over_three", racket: "none", goal: "learn" })).toBe(false);
  });

  it("places a level on the 1.0–7.0 scale", () => {
    expect(onScale(1)).toBe(0);
    expect(onScale(4)).toBe(0.5);
    expect(onScale(7)).toBe(1);
    expect(onScale(0.5)).toBe(0);
    expect(onScale(9)).toBe(1);
  });

  it("names the band's texts", () => {
    expect(bandKey("1.0")).toBe("b10");
    expect(bandKey("3.5")).toBe("b35");
  });
});
