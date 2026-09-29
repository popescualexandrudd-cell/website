/**
 * "Now at the club" (§9.2.4): what the public data says about this moment, in club time
 * (Europe/Bucharest, ADR-0010). Pure functions, so the page and the tests share them. Only data
 * without personal details beyond R-012: the courts say free, busy or closed, never who plays.
 */
export const CLUB_TZ = "Europe/Bucharest";

export type Interval = { starts_at: string; ends_at: string };
export type ResourceDay = { id: string; kind: string; name: string; busy: Interval[] };
export type DayAvailability = { day: string; open: string; close: string; resources: ResourceDay[] };
export type CourtNow =
  | { id: string; name: string; state: "busy"; until: string }
  | { id: string; name: string; state: "free"; until: string | null }
  | { id: string; name: string; state: "closed" };
export type Tournament = { id: string; name: string; starts_at: string; status: string };

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: CLUB_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: CLUB_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** The club-time day of a moment: "2027-03-28". */
export function clubDay(moment: Date): string {
  return dayFormat.format(moment);
}

/** The club-time clock of a moment: "08:30". */
export function clubClock(moment: Date): string {
  return timeFormat.format(moment);
}

/**
 * Each padel court now: busy until the end of the bookings that follow one another without a gap;
 * free until the next booking of the day (null: free until closing); closed outside the opening
 * hours. A booking in progress shows as busy even outside the hours.
 */
export function courtsNow(day: DayAvailability, now: Date): CourtNow[] {
  const at = now.getTime();
  const clock = clubClock(now);
  const open = clock >= day.open && clock < day.close;
  return day.resources
    .filter((r) => r.kind === "padel_court")
    .map((court) => {
      const busy = [...court.busy].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
      const current = busy.find((b) => Date.parse(b.starts_at) <= at && at < Date.parse(b.ends_at));
      if (current) {
        let until = Date.parse(current.ends_at);
        for (const next of busy) {
          if (Date.parse(next.starts_at) === until) until = Date.parse(next.ends_at);
        }
        return { id: court.id, name: court.name, state: "busy", until: new Date(until).toISOString() };
      }
      if (!open) return { id: court.id, name: court.name, state: "closed" };
      const next = busy.find((b) => Date.parse(b.starts_at) > at);
      return { id: court.id, name: court.name, state: "free", until: next ? next.starts_at : null };
    });
}

/** The next tournament that has not started and is not cancelled or over, or null. */
export function nextTournament(list: Tournament[], now: Date): Tournament | null {
  const at = now.getTime();
  const upcoming = list
    .filter((t) => (t.status === "registration" || t.status === "in_progress") && Date.parse(t.starts_at) > at)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  return upcoming[0] ?? null;
}
