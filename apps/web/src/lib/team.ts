/**
 * The coaches shown in section 15 (§9.2.15). Q65 (owner, 30.09.2026): until the real team is
 * announced, two FICTIONAL names per sport, each marked "fictional name" on the site (invariant 12:
 * demo content is labelled). Replace them here with the real team, then drop `fictional`.
 */
export type Sport = "padel" | "tennis" | "pilates";
export type Coach = { name: string; sport: Sport; fictional: boolean };

export const COACHES: readonly Coach[] = [
  { name: "Andrei Mocanu", sport: "padel", fictional: true },
  { name: "Ioana Vlad", sport: "padel", fictional: true },
  { name: "Radu Petrescu", sport: "tennis", fictional: true },
  { name: "Maria Stan", sport: "tennis", fictional: true },
  { name: "Cristina Barbu", sport: "pilates", fictional: true },
  { name: "Alexandra Neagu", sport: "pilates", fictional: true },
];

export const SPORTS: readonly Sport[] = ["padel", "tennis", "pilates"];

/** The coaches of a sport, in the order above. */
export function coachesOf(sport: Sport, list: readonly Coach[] = COACHES): Coach[] {
  return list.filter((coach) => coach.sport === sport);
}
