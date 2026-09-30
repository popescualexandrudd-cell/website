/**
 * Online booking (§9.3 `/rezervari`, R-040–R-043): the club's day and hours in Europe/Bucharest
 * (ADR-0010), the free start times of each court on the 30-minute grid (R-041) for a duration, from
 * the public availability (no personal data, R-012). The server decides everything again when the
 * booking is made (overlaps are refused by the database, R-043); this only shows the choices.
 */
import { CLUB_TZ, clubDay, type DayAvailability, type ResourceDay } from "./live";

export const GRID_MINUTES = 30;

/** Minutes that Europe/Bucharest is ahead of UTC at a moment (120 in winter, 180 in summer). */
export function clubOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLUB_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const local = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"));
  return Math.round((local - Math.floor(at.getTime() / 60_000) * 60_000) / 60_000);
}

/** The moment of a club-time day and hour ("2027-03-28", "10:30"), in UTC. */
export function clubToUtc(day: string, hm: string): Date {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const [h, mi] = hm.split(":").map(Number) as [number, number];
  const naive = Date.UTC(y, m - 1, d, h, mi);
  let guess = naive - clubOffsetMinutes(new Date(naive)) * 60_000;
  guess = naive - clubOffsetMinutes(new Date(guess)) * 60_000;
  return new Date(guess);
}

/** The next `count` club days from today ("YYYY-MM-DD"). */
export function nextDays(now: Date, count: number): string[] {
  const [y, m, d] = clubDay(now).split("-").map(Number) as [number, number, number];
  return Array.from({ length: count }, (_, i) => new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10));
}

const minutesOf = (hm: string) => {
  const [h, m] = hm.split(":").map(Number) as [number, number];
  return h * 60 + m;
};
const hmOf = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export type Slot = { time: string; startsAt: string; free: boolean };

/**
 * Every start on the grid from opening until the booking would end after closing, marked free when
 * it has not started yet and no busy interval of the court overlaps it.
 */
export function slotsFor(day: DayAvailability, court: ResourceDay, duration: number, now: Date): Slot[] {
  const open = minutesOf(day.open);
  const close = minutesOf(day.close);
  const busy = court.busy.map((b) => [Date.parse(b.starts_at), Date.parse(b.ends_at)] as const);
  const slots: Slot[] = [];
  for (let start = open; start + duration <= close; start += GRID_MINUTES) {
    const time = hmOf(start);
    const from = clubToUtc(day.day, time).getTime();
    const to = from + duration * 60_000;
    const free = from > now.getTime() && !busy.some(([s, e]) => s < to && from < e);
    slots.push({ time, startsAt: new Date(from).toISOString(), free });
  }
  return slots;
}

/** The courts a visitor books online: the padel courts (the Reformer goes by classes, R-101). */
export const onlineCourts = (day: DayAvailability) => day.resources.filter((r) => r.kind === "padel_court");
