import { describe, expect, it } from "vitest";
import { recommend, type FinderGroup, type FinderProgram } from "@/lib/finder";
import { textAndList } from "@/lib/markdown";

const programs: FinderProgram[] = [
  { slug: "initiere", name: "Inițiere", summary: "" },
  { slug: "competitie", name: "Competiție", summary: "" },
  { slug: "amatori", name: "Amatori", summary: "" },
];
const groups: FinderGroup[] = [
  { name: "Minge roșie", summary: "", ageMin: 4, ageMax: 7, programSlug: "initiere" },
  { name: "Minge portocalie", summary: "", ageMin: 8, ageMax: 9, programSlug: "initiere" },
  { name: "Minge verde", summary: "", ageMin: 9, ageMax: 11, programSlug: "competitie" },
  { name: "Minge galbenă", summary: "", ageMin: 11, ageMax: 18, programSlug: "competitie" },
];
const data = { programs, groups };

describe("programme finder", () => {
  it("places a child in the group for their age and sends them to an assessment", () => {
    const result = recommend(
      { who: "copil", age: 6, experience: "niciodata", goal: "placere" },
      data,
    );
    expect(result).toMatchObject({
      kind: "group",
      group: { name: "Minge roșie" },
      next: "evaluation",
    });
  });

  it("prefers the competition group where two groups share an age", () => {
    const racing = recommend(
      { who: "copil", age: 9, experience: "turnee", goal: "competitie" },
      data,
    );
    expect(racing.kind === "group" && racing.group.name).toBe("Minge verde");
    const fun = recommend({ who: "copil", age: 9, experience: "putin", goal: "placere" }, data);
    expect(fun.kind === "group" && fun.group.name).toBe("Minge portocalie");
  });

  it("gives adults a programme and online booking", () => {
    expect(
      recommend({ who: "adult", age: null, experience: "niciodata", goal: "placere" }, data),
    ).toMatchObject({
      kind: "program",
      program: { slug: "initiere" },
      next: "booking",
    });
    expect(
      recommend({ who: "adult", age: null, experience: "regulat", goal: "progres" }, data),
    ).toMatchObject({
      program: { slug: "amatori" },
    });
    expect(
      recommend({ who: "adult", age: null, experience: "turnee", goal: "placere" }, data),
    ).toMatchObject({
      program: { slug: "competitie" },
    });
  });

  it("falls back to a programme, then to contact, when nothing fits", () => {
    expect(
      recommend(
        { who: "copil", age: 17, experience: "putin", goal: "placere" },
        { programs, groups: [] },
      ),
    ).toMatchObject({ kind: "program", program: { slug: "initiere" }, next: "evaluation" });
    expect(
      recommend(
        { who: "adult", age: null, experience: "putin", goal: "placere" },
        { programs: [], groups: [] },
      ),
    ).toEqual({ kind: "none", next: "contact" });
  });
});

describe("story text", () => {
  it("splits the introduction from the numbered milestones", () => {
    const { intro, items } = textAndList(
      "Clubul a pornit în 2013.\n1. **2013.** Primele terenuri.\n2. **Azi.** Opt terenuri.",
    );
    expect(intro).toBe("Clubul a pornit în 2013.");
    expect(items).toEqual([
      { title: "2013", text: "Primele terenuri." },
      { title: "Azi", text: "Opt terenuri." },
    ]);
  });
});
