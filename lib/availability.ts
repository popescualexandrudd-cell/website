/**
 * Availability engine. Pure functions over plain data, so the rules are unit-tested without a
 * database (tests/unit/availability.test.ts). All arithmetic happens on UTC instants; local
 * wall-clock times ("07:00") are converted per calendar day in the configured time zone, which
 * keeps daylight-saving changes (last Sunday of March and of October) correct.
 *
 * Free time = availability rules + extra-availability exceptions
 *           − blocked exceptions − active bookings,
 * where every busy interval keeps the break between lessons on both sides. Every lesson (for
 * one, two, three or a group) takes the coach's time exclusively, for the duration chosen.
 */
import { addDays, getISODay, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type AvailabilitySettings = {
  timezone: string;
  minNoticeHours: number;
  horizonDays: number;
  bufferMinutes: number;
  slotStepMinutes: number;
};

export type RuleInput = {
  weekday: number; // ISO: 1 = Monday … 7 = Sunday
  startTime: string; // "HH:mm", local
  endTime: string;
  validFrom?: Date | null; // calendar date (UTC midnight)
  validTo?: Date | null;
};

export type ExceptionInput = {
  date: Date; // calendar date (UTC midnight)
  startTime?: string | null;
  endTime?: string | null;
  type: "BLOCAT" | "DISPONIBIL_EXTRA";
};

/** A booked exclusive lesson: blocks [startsAt, blockedUntil) — blockedUntil already includes the break. */
export type BusyBooking = { startsAt: Date; blockedUntil: Date };

export type Interval = { start: number; end: number };

export type Slot = { start: Date; end: Date };
export type DaySlots = { date: string; slots: Slot[] };

const MINUTE = 60_000;

// ─── Calendar helpers ────────────────────────────────────────────────────────

/** Today's calendar date in the given time zone, as "yyyy-MM-dd". */
export function localDateKey(instant: Date, timezone: string): string {
  return formatInTimeZone(instant, timezone, "yyyy-MM-dd");
}

/** The UTC instant of a local wall-clock time on a local calendar date. */
export function zonedInstant(dateKey: string, time: string, timezone: string): Date {
  return fromZonedTime(`${dateKey}T${time.length === 5 ? `${time}:00` : time}`, timezone);
}

export function addDaysToKey(dateKey: string, days: number): string {
  const date = addDays(parseISO(`${dateKey}T00:00:00Z`), days);
  return date.toISOString().slice(0, 10);
}

export function isoWeekday(dateKey: string): number {
  // parseISO without a zone gives local midnight; getISODay reads it in local time, which is the same calendar date.
  return getISODay(parseISO(dateKey));
}

function dateKeyOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function inRange(dateKey: string, from?: Date | null, to?: Date | null): boolean {
  if (from && dateKey < dateKeyOf(from)) return false;
  if (to && dateKey > dateKeyOf(to)) return false;
  return true;
}

// ─── Interval algebra ────────────────────────────────────────────────────────

export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const current of sorted) {
    const last = out[out.length - 1];
    if (last && current.start <= last.end) last.end = Math.max(last.end, current.end);
    else out.push({ ...current });
  }
  return out;
}

export function subtractIntervals(base: Interval[], remove: Interval[]): Interval[] {
  let result = mergeIntervals(base);
  for (const cut of mergeIntervals(remove)) {
    const next: Interval[] = [];
    for (const piece of result) {
      if (cut.end <= piece.start || cut.start >= piece.end) {
        next.push(piece);
        continue;
      }
      if (cut.start > piece.start) next.push({ start: piece.start, end: cut.start });
      if (cut.end < piece.end) next.push({ start: cut.end, end: piece.end });
    }
    result = next;
  }
  return result;
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

// ─── Windows ─────────────────────────────────────────────────────────────────

/** Open windows (before bookings) on one local calendar date. */
export function openWindowsForDate(
  dateKey: string,
  rules: RuleInput[],
  exceptions: ExceptionInput[],
  timezone: string,
): Interval[] {
  const weekday = isoWeekday(dateKey);
  const open: Interval[] = [];
  for (const rule of rules) {
    if (rule.weekday !== weekday || !inRange(dateKey, rule.validFrom, rule.validTo)) continue;
    open.push({
      start: zonedInstant(dateKey, rule.startTime, timezone).getTime(),
      end: zonedInstant(dateKey, rule.endTime, timezone).getTime(),
    });
  }
  const dayStart = zonedInstant(dateKey, "00:00", timezone).getTime();
  const dayEnd = zonedInstant(addDaysToKey(dateKey, 1), "00:00", timezone).getTime();
  const todays = exceptions.filter((e) => dateKeyOf(e.date) === dateKey);
  const toInterval = (e: ExceptionInput): Interval =>
    e.startTime && e.endTime
      ? {
          start: zonedInstant(dateKey, e.startTime, timezone).getTime(),
          end: zonedInstant(dateKey, e.endTime, timezone).getTime(),
        }
      : { start: dayStart, end: dayEnd };
  for (const extra of todays.filter((e) => e.type === "DISPONIBIL_EXTRA"))
    open.push(toInterval(extra));
  const blocked = todays.filter((e) => e.type === "BLOCAT").map(toInterval);
  return subtractIntervals(mergeIntervals(open), blocked);
}

export type EngineInput = {
  settings: AvailabilitySettings;
  rules: RuleInput[];
  exceptions: ExceptionInput[];
  bookings: BusyBooking[];
  now: Date;
};

/** Busy intervals: active bookings, each with the break that follows it. */
function busyIntervals(input: EngineInput): Interval[] {
  return mergeIntervals(
    input.bookings.map((b) => ({ start: b.startsAt.getTime(), end: b.blockedUntil.getTime() })),
  );
}

/** Can a lesson of `durationMin` start at `start`? Checks window, notice, horizon and conflicts. */
export function isSlotAvailable(input: EngineInput, start: Date, durationMin: number): boolean {
  const { settings, now } = input;
  const tz = settings.timezone;
  if (start.getTime() < now.getTime() + settings.minNoticeHours * 60 * MINUTE) return false;
  const dateKey = localDateKey(start, tz);
  const todayKey = localDateKey(now, tz);
  if (dateKey > addDaysToKey(todayKey, settings.horizonDays)) return false;
  const lesson: Interval = { start: start.getTime(), end: start.getTime() + durationMin * MINUTE };
  const windows = openWindowsForDate(dateKey, input.rules, input.exceptions, tz);
  if (!windows.some((w) => lesson.start >= w.start && lesson.end <= w.end)) return false;
  const withBreak: Interval = {
    start: lesson.start,
    end: lesson.end + settings.bufferMinutes * MINUTE,
  };
  return !busyIntervals(input).some((b) => overlaps(b, withBreak));
}

/**
 * Bookable start times for a lesson of `durationMin`, grouped by local date, from today until the
 * horizon (or `untilKey`). Starts sit on the step grid (:00, :30) and also right after each busy
 * interval, so the break never wastes a whole step.
 */
export function exclusiveSlots(
  input: EngineInput,
  durationMin: number,
  options: { fromKey?: string; untilKey?: string; limitDays?: number } = {},
): DaySlots[] {
  const { settings, now } = input;
  const tz = settings.timezone;
  const todayKey = localDateKey(now, tz);
  const horizonKey = addDaysToKey(todayKey, settings.horizonDays);
  const fromKey = options.fromKey && options.fromKey > todayKey ? options.fromKey : todayKey;
  const untilKey =
    options.untilKey && options.untilKey < horizonKey ? options.untilKey : horizonKey;
  const earliest = now.getTime() + settings.minNoticeHours * 60 * MINUTE;
  const step = Math.max(5, settings.slotStepMinutes) * MINUTE;
  const duration = durationMin * MINUTE;
  const buffer = settings.bufferMinutes * MINUTE;
  const busy = busyIntervals(input);

  const days: DaySlots[] = [];
  for (let key = fromKey; key <= untilKey; key = addDaysToKey(key, 1)) {
    if (options.limitDays && days.length >= options.limitDays) break;
    const windows = openWindowsForDate(key, input.rules, input.exceptions, tz);
    const slots: Slot[] = [];
    for (const window of windows) {
      const candidates = new Set<number>();
      const midnight = zonedInstant(key, "00:00", tz).getTime();
      const firstGrid = midnight + Math.ceil((window.start - midnight) / step) * step;
      for (let t = firstGrid; t + duration <= window.end; t += step) candidates.add(t);
      for (const b of busy)
        if (b.end >= window.start && b.end + duration <= window.end) candidates.add(b.end);
      for (const start of [...candidates].sort((a, b) => a - b)) {
        if (start < earliest) continue;
        const withBreak = { start, end: start + duration + buffer };
        if (busy.some((b) => overlaps(b, withBreak))) continue;
        slots.push({ start: new Date(start), end: new Date(start + duration) });
      }
    }
    if (slots.length > 0) days.push({ date: key, slots });
  }
  return days;
}

/**
 * "Places left this month" (home page): free one-hour lessons that can still be booked this
 * month, packed without overlap and with the break.
 */
export function freePlacesThisMonth(input: EngineInput, lessonMinutes = 60): number {
  const tz = input.settings.timezone;
  const todayKey = localDateKey(input.now, tz);
  const monthEndKey = (() => {
    const [year, month] = todayKey.split("-").map(Number) as [number, number];
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${todayKey.slice(0, 8)}${String(lastDay).padStart(2, "0")}`;
  })();
  const earliest = input.now.getTime() + input.settings.minNoticeHours * 60 * MINUTE;
  const buffer = input.settings.bufferMinutes * MINUTE;
  const lesson = lessonMinutes * MINUTE;
  const busy = busyIntervals(input).map((b) => ({ start: b.start - buffer, end: b.end }));
  let lessons = 0;
  for (let key = todayKey; key <= monthEndKey; key = addDaysToKey(key, 1)) {
    const windows = openWindowsForDate(key, input.rules, input.exceptions, tz)
      .map((w) => ({ start: Math.max(w.start, earliest), end: w.end }))
      .filter((w) => w.end > w.start);
    for (const free of subtractIntervals(windows, busy)) {
      lessons += Math.floor((free.end - free.start + buffer) / (lesson + buffer));
    }
  }
  return lessons;
}
