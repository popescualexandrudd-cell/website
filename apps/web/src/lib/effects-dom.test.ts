import { describe, expect, it } from "vitest";
import { SECTION_OF, countingFrames, scrollProgress, tiltFor } from "./effects-dom";

describe("the effects that need a script (ADR-0023)", () => {
  it("counts a number up and always ends on the server's own text", () => {
    const frames = countingFrames("28", 6);
    expect(frames).toHaveLength(6);
    expect(frames.at(-1)).toBe("28");
    expect(frames.map(Number).every((n, i, all) => i === 0 || n >= (all[i - 1] as number))).toBe(true);
    expect(countingFrames("3 m", 4).at(-1)).toBe("3 m");
    expect(countingFrames("3 m", 4)[0]).toMatch(/^\d m$/);
    expect(countingFrames("1,5 kg", 3).at(-1)).toBe("1,5 kg");
    expect(countingFrames("1,5 kg", 3)[0]).toMatch(/^\d,\d kg$/);
    expect(countingFrames("fără cifre", 5)).toEqual(["fără cifre"]);
  });

  it("tilts a card towards the pointer, within the limit", () => {
    const box = { left: 0, top: 0, width: 200, height: 100 };
    expect(tiltFor(box, 100, 50, 8)).toEqual({
      rotateY: 0,
      rotateX: 0,
      glowX: 50,
      glowY: 50,
    });
    expect(tiltFor(box, 200, 0, 8)).toEqual({
      rotateY: 8,
      rotateX: 8,
      glowX: 100,
      glowY: 0,
    });
    expect(tiltFor(box, -50, 500, 8)).toEqual({
      rotateY: -8,
      rotateX: -8,
      glowX: 0,
      glowY: 100,
    });
  });

  it("measures how far the page is read", () => {
    expect(scrollProgress(0, 3000, 1000)).toBe(0);
    expect(scrollProgress(1000, 3000, 1000)).toBe(0.5);
    expect(scrollProgress(5000, 3000, 1000)).toBe(1);
    expect(scrollProgress(0, 800, 1000)).toBe(0);
  });

  it("maps every menu page, in both languages, to its home section", () => {
    const pairs: [string, string][] = [
      ["liga", "league"],
      ["tenis", "tennis"],
      ["pachete", "packages"],
      ["evenimente", "events"],
      ["cafenea", "cafe"],
    ];
    for (const [ro, en] of pairs) expect(SECTION_OF[ro]).toBe(SECTION_OF[en]);
    expect(SECTION_OF.contact).toBe("locatie");
  });
});
