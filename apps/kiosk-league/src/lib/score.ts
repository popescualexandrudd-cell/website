/**
 * The score as it is entered on the kiosk, set by set (§6.7, §6.8). The server validates it
 * (impossible scores are refused with a precise code); here we only keep the entry tidy.
 */
import type { Score } from "./api";

export type SetEntry = { a: number; b: number; tbA: number; tbB: number; superTiebreak: boolean };

export const emptySet = (): SetEntry => ({ a: 0, b: 0, tbA: 0, tbB: 0, superTiebreak: false });

/** A 7–6 set needs the tie-break points. */
export function needsTiebreak(set: SetEntry): boolean {
  return !set.superTiebreak && Math.max(set.a, set.b) === 7 && Math.min(set.a, set.b) === 6;
}

/** Games in a set go 0–7; a super tie-break's points go up to 30. */
export function limit(set: SetEntry): number {
  return set.superTiebreak ? 30 : 7;
}

export function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

export function toScore(sets: SetEntry[], unfinished: boolean): Score {
  return {
    sets: sets.map((s) => ({
      a: s.a,
      b: s.b,
      tiebreak: needsTiebreak(s) ? [s.tbA, s.tbB] : null,
      super_tiebreak: s.superTiebreak,
    })),
    unfinished,
  };
}

/** "6–3, 7–6 (7–5)" for confirmation screens. */
export function describe(score: Record<string, unknown>): string {
  const sets = Array.isArray(score.sets) ? (score.sets as Record<string, unknown>[]) : [];
  return sets
    .map((s) => {
      const tb = Array.isArray(s.tiebreak) ? ` (${s.tiebreak.join("–")})` : "";
      return `${String(s.a)}–${String(s.b)}${tb}`;
    })
    .join(", ");
}

/** Teams: the same number of players on each side, one or two (§6.9). */
export function teamsValid(teamA: string[], teamB: string[]): boolean {
  return teamA.length >= 1 && teamA.length <= 2 && teamA.length === teamB.length;
}
