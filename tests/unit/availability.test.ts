import { describe, expect, it } from "vitest";
import { formatInTimeZone } from "date-fns-tz";
import {
  exclusiveSlots,
  freePlacesThisMonth,
  groupOccurrences,
  groupSlots,
  isSlotAvailable,
  mergeIntervals,
  openWindowsForDate,
  subtractIntervals,
  zonedInstant,
  type EngineInput,
  type RuleInput,
} from "@/lib/availability";

const TZ = "Europe/Bucharest";
const HOUR = 3_600_000;
const date = (key: string) => new Date(`${key}T00:00:00Z`);
const local = (instant: Date) => formatInTimeZone(instant, TZ, "yyyy-MM-dd HH:mm");

function engine(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    settings: { timezone: TZ, minNoticeHours: 12, horizonDays: 60, bufferMinutes: 10, slotStepMinutes: 30 },
    rules: [],
    exceptions: [],
    bookings: [],
    groupSchedules: [],
    groupEnrollments: [],
    now: new Date("2026-03-01T06:00:00Z"),
    ...overrides,
  };
}

const weekdays = (start: string, end: string): RuleInput[] => [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startTime: start, endTime: end }));

describe("time zone conversion", () => {
  it("maps local wall-clock time to UTC on both sides of the spring change (29 March 2026)", () => {
    expect(zonedInstant("2026-03-28", "07:00", TZ).toISOString()).toBe("2026-03-28T05:00:00.000Z");
    expect(zonedInstant("2026-03-29", "07:00", TZ).toISOString()).toBe("2026-03-29T04:00:00.000Z");
  });

  it("maps local wall-clock time to UTC on both sides of the autumn change (25 October 2026)", () => {
    expect(zonedInstant("2026-10-24", "07:00", TZ).toISOString()).toBe("2026-10-24T04:00:00.000Z");
    expect(zonedInstant("2026-10-25", "07:00", TZ).toISOString()).toBe("2026-10-25T05:00:00.000Z");
  });
});

describe("interval algebra", () => {
  it("merges overlapping intervals and subtracts holes", () => {
    expect(mergeIntervals([{ start: 5, end: 10 }, { start: 0, end: 6 }, { start: 12, end: 13 }])).toEqual([
      { start: 0, end: 10 },
      { start: 12, end: 13 },
    ]);
    expect(subtractIntervals([{ start: 0, end: 10 }], [{ start: 3, end: 4 }, { start: 8, end: 20 }])).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 8 },
    ]);
  });
});

describe("exclusive lesson slots", () => {
  it("keeps the same local hours on the day the clocks go forward", () => {
    const input = engine({ rules: [{ weekday: 7, startTime: "07:00", endTime: "09:00" }] });
    const days = exclusiveSlots(input, 60, { fromKey: "2026-03-29", untilKey: "2026-03-29" });
    expect(days).toHaveLength(1);
    expect(days[0]?.slots.map((s) => local(s.start))).toEqual(["2026-03-29 07:00", "2026-03-29 07:30", "2026-03-29 08:00"]);
    expect(days[0]?.slots[0]?.start.toISOString()).toBe("2026-03-29T04:00:00.000Z");
  });

  it("keeps the same local hours on the day the clocks go back", () => {
    const input = engine({ rules: [{ weekday: 7, startTime: "07:00", endTime: "09:00" }], now: new Date("2026-10-01T06:00:00Z") });
    const days = exclusiveSlots(input, 60, { fromKey: "2026-10-25", untilKey: "2026-10-25" });
    expect(days[0]?.slots.map((s) => local(s.start))).toEqual(["2026-10-25 07:00", "2026-10-25 07:30", "2026-10-25 08:00"]);
    expect(days[0]?.slots[0]?.start.toISOString()).toBe("2026-10-25T05:00:00.000Z");
  });

  it("measures a window across the spring jump in real time (02:00–05:00 lasts two hours)", () => {
    const input = engine({
      exceptions: [{ date: date("2026-03-29"), startTime: "02:00", endTime: "05:00", type: "DISPONIBIL_EXTRA" }],
    });
    const windows = openWindowsForDate("2026-03-29", input.rules, input.exceptions, TZ);
    expect(windows).toHaveLength(1);
    expect((windows[0]!.end - windows[0]!.start) / HOUR).toBe(2);
    const slots = exclusiveSlots(input, 60, { fromKey: "2026-03-29", untilKey: "2026-03-29" })[0]?.slots ?? [];
    expect(slots.map((s) => formatInTimeZone(s.start, TZ, "HH:mm"))).toEqual(["02:00", "02:30", "04:00"]);
    for (const slot of slots) expect(slot.end.getTime() - slot.start.getTime()).toBe(HOUR);
  });

  it("measures a window across the autumn change in real time (02:00–05:00 lasts four hours)", () => {
    const input = engine({
      now: new Date("2026-10-01T06:00:00Z"),
      exceptions: [{ date: date("2026-10-25"), startTime: "02:00", endTime: "05:00", type: "DISPONIBIL_EXTRA" }],
    });
    const windows = openWindowsForDate("2026-10-25", input.rules, input.exceptions, TZ);
    expect((windows[0]!.end - windows[0]!.start) / HOUR).toBe(4);
    expect(exclusiveSlots(input, 60, { fromKey: "2026-10-25", untilKey: "2026-10-25" })[0]?.slots).toHaveLength(7);
  });

  it("keeps the break between lessons on both sides of a booking", () => {
    const input = engine({
      rules: weekdays("08:00", "14:00"),
      bookings: [{ startsAt: zonedInstant("2026-03-10", "10:00", TZ), blockedUntil: zonedInstant("2026-03-10", "11:10", TZ) }],
    });
    const times = (exclusiveSlots(input, 60, { fromKey: "2026-03-10", untilKey: "2026-03-10" })[0]?.slots ?? []).map((s) =>
      formatInTimeZone(s.start, TZ, "HH:mm"),
    );
    expect(times).toContain("08:30");
    expect(times).not.toContain("09:00"); // would end at 10:00 with no break before the booked lesson
    expect(times).not.toContain("10:30");
    expect(times).not.toContain("11:00");
    expect(times).toContain("11:10"); // right after the booked lesson and its break
    expect(times).toContain("11:30");
  });

  it("respects the minimum notice and the horizon", () => {
    const now = zonedInstant("2026-03-10", "06:00", TZ);
    const input = engine({ rules: weekdays("08:00", "20:00"), now, settings: { ...engine().settings, horizonDays: 3 } });
    const days = exclusiveSlots(input, 60);
    const first = days[0]?.slots[0];
    expect(first && first.start.getTime() >= now.getTime() + 12 * HOUR).toBe(true);
    expect(days.at(-1)?.date).toBe("2026-03-13");
    expect(days.some((d) => d.date > "2026-03-13")).toBe(false);
  });

  it("removes whole blocked days and blocked hours", () => {
    const input = engine({
      rules: weekdays("08:00", "12:00"),
      exceptions: [
        { date: date("2026-03-10"), type: "BLOCAT" },
        { date: date("2026-03-11"), startTime: "08:00", endTime: "10:00", type: "BLOCAT" },
      ],
    });
    const days = exclusiveSlots(input, 60, { fromKey: "2026-03-10", untilKey: "2026-03-11" });
    expect(days.map((d) => d.date)).toEqual(["2026-03-11"]);
    expect(formatInTimeZone(days[0]!.slots[0]!.start, TZ, "HH:mm")).toBe("10:00");
  });

  it("honours validity dates on rules", () => {
    const input = engine({ rules: [{ weekday: 2, startTime: "08:00", endTime: "10:00", validFrom: date("2026-03-17") }] });
    const days = exclusiveSlots(input, 60, { fromKey: "2026-03-10", untilKey: "2026-03-17" });
    expect(days.map((d) => d.date)).toEqual(["2026-03-17"]);
  });

  it("treats group sessions as busy time for private lessons", () => {
    const input = engine({
      rules: weekdays("16:00", "20:00"),
      groupSchedules: [
        { id: "g1", programId: "p", weekday: 2, startTime: "17:00", durationMin: 60, capacity: 6, membersCount: 0, active: true },
      ],
    });
    const times = (exclusiveSlots(input, 60, { fromKey: "2026-03-10", untilKey: "2026-03-10" })[0]?.slots ?? []).map((s) =>
      formatInTimeZone(s.start, TZ, "HH:mm"),
    );
    expect(times).toEqual(["18:10", "18:30", "19:00"]);
  });

  it("answers point checks the same way", () => {
    const input = engine({
      rules: weekdays("08:00", "12:00"),
      bookings: [{ startsAt: zonedInstant("2026-03-10", "10:00", TZ), blockedUntil: zonedInstant("2026-03-10", "11:10", TZ) }],
    });
    expect(isSlotAvailable(input, zonedInstant("2026-03-10", "08:00", TZ), 60)).toBe(true);
    expect(isSlotAvailable(input, zonedInstant("2026-03-10", "09:30", TZ), 60)).toBe(false);
    expect(isSlotAvailable(input, zonedInstant("2026-03-10", "11:30", TZ), 60)).toBe(false); // ends after the window
    expect(isSlotAvailable(input, zonedInstant("2026-03-14", "09:00", TZ), 60)).toBe(false); // Saturday: no rule
  });
});

describe("group sessions", () => {
  const schedule = { id: "g1", programId: "mini", weekday: 2, startTime: "17:00", durationMin: 45, capacity: 6, membersCount: 2, active: true };

  it("counts the spots left in each occurrence", () => {
    const start = zonedInstant("2026-03-10", "17:00", TZ);
    const occurrences = groupOccurrences([schedule], "2026-03-09", "2026-03-17", [], [{ groupScheduleId: "g1", startsAt: start, participants: 1 }], TZ);
    expect(occurrences).toHaveLength(2);
    expect(occurrences[0]?.spotsLeft).toBe(3);
    expect(occurrences[1]?.spotsLeft).toBe(4);
  });

  it("skips sessions on blocked days and outside the season", () => {
    const occurrences = groupOccurrences(
      [{ ...schedule, seasonTo: date("2026-03-16") }],
      "2026-03-09",
      "2026-03-31",
      [{ date: date("2026-03-10"), type: "BLOCAT" }],
      [],
      TZ,
    );
    expect(occurrences).toHaveLength(0);
  });

  it("lists upcoming sessions for one programme only", () => {
    const input = engine({ groupSchedules: [schedule, { ...schedule, id: "g2", programId: "other" }], settings: { ...engine().settings, horizonDays: 14 } });
    expect(groupSlots(input, "mini").every((o) => o.programId === "mini")).toBe(true);
    expect(groupSlots(input, "mini")).toHaveLength(2);
  });
});

describe("free places this month", () => {
  it("packs one-hour lessons with the break, and adds free group spots", () => {
    const input = engine({
      now: zonedInstant("2026-03-30", "06:00", TZ), // Monday; notice pushes the start to 18:00 today
      rules: [{ weekday: 2, startTime: "08:00", endTime: "11:30" }],
      groupSchedules: [{ id: "g", programId: "p", weekday: 3, startTime: "17:00", durationMin: 60, capacity: 6, membersCount: 4, active: true }],
    });
    // Tuesday 31 March: 3.5 hours → 3 lessons with 10-minute breaks; plus 2 group spots.
    expect(freePlacesThisMonth(input)).toBe(5);
  });
});
