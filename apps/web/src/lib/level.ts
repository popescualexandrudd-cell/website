/**
 * The level simulator (§9.2.6): the questions, their order and what the answers send to the API
 * (`GET /api/v1/league/level-guess`). The level itself is computed on the server with the official
 * questionnaire's formula (R-003, Q47), never here. Someone who never played answers three
 * questions (padel, racket sports, goal); the others six.
 */
export const OPTIONS = {
  padel: ["never", "under_year", "one_to_three", "over_three"],
  skill: ["first", "rallies", "walls", "tactics", "competition", "elite"],
  tournaments: ["none", "club", "regional_national"],
  racket: ["none", "recreational", "competitive"],
  frequency: ["rarely", "monthly", "weekly", "several"],
  goal: ["learn", "play", "compete"],
} as const;

export type Question = keyof typeof OPTIONS;
export type Answers = { [Q in Question]?: (typeof OPTIONS)[Q][number] };
/** Answers ready to send: the three questions everyone answers, and the others when asked. */
export type Complete = Answers & Required<Pick<Answers, "padel" | "racket" | "goal">>;

const ORDER: readonly Question[] = ["padel", "skill", "tournaments", "racket", "frequency", "goal"];
const ABOUT_THE_GAME: readonly Question[] = ["skill", "tournaments", "frequency"];

/** The questions asked for these answers: the questions about one's game only after playing. */
export function questions(answers: Answers): Question[] {
  return ORDER.filter((q) => answers.padel !== "never" || !ABOUT_THE_GAME.includes(q));
}

/** The query sent to the API: the answers to the questions asked, nothing else. */
export function query(answers: Answers): Answers {
  return Object.fromEntries(questions(answers).flatMap((q) => (answers[q] === undefined ? [] : [[q, answers[q]]])));
}

/** True when every question asked has an answer. */
export function complete(answers: Answers): answers is Complete {
  return questions(answers).every((q) => answers[q] !== undefined);
}

/** Where a level (1.0–7.0) sits on the scale, from 0 to 1. */
export function onScale(level: number): number {
  return (Math.min(7, Math.max(1, level)) - 1) / 6;
}

/** The key of a band's texts: "3.5" → "b35". */
export function bandKey(band: string): string {
  return `b${band.replace(".", "")}`;
}
