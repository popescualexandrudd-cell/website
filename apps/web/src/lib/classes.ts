/**
 * The Pilates Reformer section (§9.2.9): the class types (R-101) and the schedule of the next days,
 * read from the public API (`GET /api/v1/classes`), grouped by club day (Europe/Bucharest, ADR-0010).
 * Pure functions, so the page and the tests share them.
 */
import { clubClock, clubDay } from "./live";

/** R-101, in the order the studio presents them. */
export const KINDS = [
  "beginner",
  "intermediate",
  "advanced",
  "private",
  "duo",
  "group",
  "racket_players",
  "mothers",
] as const;

export type ClassItem = {
  id: string;
  kind: string;
  instructor_name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  places_left: number;
};
export type Slot = ClassItem & { from: string; to: string };
export type ClassDay = { day: string; classes: Slot[] };

/** A club day moved by whole days ("2027-03-27" + 1 = "2027-03-28"), whatever the clock change. */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The classes still to start in the next `days` club days (today included), by time, per day. */
export function schedule(list: ClassItem[], now: Date, days = 7): ClassDay[] {
  const first = clubDay(now);
  const last = addDays(first, days - 1);
  const out: ClassDay[] = [];
  const upcoming = list
    .filter((item) => new Date(item.starts_at) > now)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  for (const item of upcoming) {
    const start = new Date(item.starts_at);
    const day = clubDay(start);
    if (day < first || day > last) continue;
    const slot = { ...item, from: clubClock(start), to: clubClock(new Date(item.ends_at)) };
    const current = out.at(-1);
    if (current && current.day === day) current.classes.push(slot);
    else out.push({ day, classes: [slot] });
  }
  return out;
}
