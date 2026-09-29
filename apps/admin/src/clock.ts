/**
 * Club time in the panel (ADR-0010): the calendar is laid out in Europe/Bucharest whatever the
 * computer's own zone, and a moment chosen on it ("16.03.2027, 10:00 at the club") is sent to the
 * server with the club's offset of that day (+02:00 in winter, +03:00 in summer).
 */
import { TIME_ZONE } from "@jungle/kiosk-kit";

const parts = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function wall(ms: number): { day: string; minutes: number } {
  const p = Object.fromEntries(parts.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/** The club's calendar day of a moment: "2027-03-16". */
export function clubDay(moment: string | number): string {
  return wall(typeof moment === "number" ? moment : Date.parse(moment)).day;
}

/** Minutes since midnight at the club on `day` (10:30 → 630); a moment on a later day counts
 * from the same midnight (the next midnight → 1440), an earlier one gives 0. */
export function clubMinutes(moment: string, day: string = clubDay(moment)): number {
  const { day: its, minutes } = wall(Date.parse(moment));
  if (its === day) return minutes;
  return its > day ? 1440 : 0;
}

/** "08:00" → 480. */
export function toMinutes(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

/** 630 → "10:30". */
export function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** The ISO moment of a club day and time: ("2027-03-16", 600) → "2027-03-16T10:00:00+02:00". */
export function clubMoment(day: string, minutes: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const naive = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  // The offset is the one in force at that moment; one correction step covers the DST change.
  let offset = 0;
  for (let i = 0; i < 2; i += 1) {
    const w = wall(naive - offset);
    const [wy, wm, wd] = w.day.split("-").map(Number) as [number, number, number];
    offset = Date.UTC(wy, wm - 1, wd, Math.floor(w.minutes / 60), w.minutes % 60) - (naive - offset);
  }
  const total = Math.round(offset / 60_000);
  const sign = total >= 0 ? "+" : "-";
  const zone = `${sign}${hhmm(Math.abs(total))}`;
  return `${day}T${hhmm(minutes)}:00${zone}`;
}

/** The day after (or before, with a negative count). */
export function addDays(day: string, count: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + count)).toISOString().slice(0, 10);
}

/** Monday of the week of `day`. */
export function monday(day: string): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return addDays(day, -weekday);
}
