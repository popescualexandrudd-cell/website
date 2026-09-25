/**
 * "Find your programme": three answers (who, how much they have played, what they want) lead to
 * a junior academy group or a training programme, and to the next step. Pure, so it runs in the
 * browser and in tests.
 */

export type FinderWho = "copil" | "adult";
export type FinderExperience = "niciodata" | "putin" | "regulat" | "turnee";
export type FinderGoal = "placere" | "progres" | "competitie";

export type FinderAnswers = {
  who: FinderWho;
  /** The child's age; ignored for adults. */
  age: number | null;
  experience: FinderExperience;
  goal: FinderGoal;
};

export type FinderProgram = { slug: string; name: string; summary: string };
export type FinderGroup = {
  name: string;
  summary: string;
  ageMin: number | null;
  ageMax: number | null;
  programSlug: string | null;
};

export type FinderResult =
  | { kind: "group"; group: FinderGroup; next: "evaluation" }
  | { kind: "program"; program: FinderProgram; next: "booking" | "evaluation" }
  | { kind: "none"; next: "contact" };

const COMPETITION = "competitie";
const BEGINNERS = "initiere";
const RECREATIONAL = "amatori";

export function recommend(
  answers: FinderAnswers,
  data: { programs: FinderProgram[]; groups: FinderGroup[] },
): FinderResult {
  const program = (slug: string) => data.programs.find((p) => p.slug === slug) ?? null;
  const wantsCompetition = answers.goal === "competitie" || answers.experience === "turnee";

  if (answers.who === "copil" && answers.age !== null) {
    const age = answers.age;
    const fits = data.groups.filter(
      (g) => (g.ageMin === null || g.ageMin <= age) && (g.ageMax === null || age <= g.ageMax),
    );
    // Where two groups share an age, the competition group suits a child who plays tournaments.
    const group =
      (wantsCompetition ? fits.find((g) => g.programSlug === COMPETITION) : undefined) ??
      (!wantsCompetition ? fits.find((g) => g.programSlug !== COMPETITION) : undefined) ??
      fits[0];
    if (group) return { kind: "group", group, next: "evaluation" };
    const fallback = program(wantsCompetition ? COMPETITION : BEGINNERS);
    return fallback
      ? { kind: "program", program: fallback, next: "evaluation" }
      : { kind: "none", next: "contact" };
  }

  const slug = wantsCompetition
    ? COMPETITION
    : answers.experience === "niciodata"
      ? BEGINNERS
      : RECREATIONAL;
  const chosen = program(slug) ?? program(BEGINNERS) ?? data.programs[0] ?? null;
  return chosen
    ? { kind: "program", program: chosen, next: "booking" }
    : { kind: "none", next: "contact" };
}
