import { describe, expect, it } from "vitest";
import { clubOffsetMinutes, clubToUtc, nextDays, onlineCourts, slotsFor } from "./booking";
import type { DayAvailability } from "./live";

describe("club time (ADR-0010, Europe/Bucharest)", () => {
  it("knows winter and summer", () => {
    expect(clubOffsetMinutes(new Date("2027-01-15T12:00:00Z"))).toBe(120);
    expect(clubOffsetMinutes(new Date("2027-07-15T12:00:00Z"))).toBe(180);
  });

  it("turns a club hour into UTC, also on the days the clocks change (the opening month)", () => {
    expect(clubToUtc("2027-03-27", "10:00").toISOString()).toBe("2027-03-27T08:00:00.000Z");
    // 28.03.2027: at 03:00 the clocks go to 04:00; the club opens at 08:00 summer time.
    expect(clubToUtc("2027-03-28", "08:00").toISOString()).toBe("2027-03-28T05:00:00.000Z");
    expect(clubToUtc("2027-10-31", "08:00").toISOString()).toBe("2027-10-31T06:00:00.000Z");
  });

  it("lists the next club days, starting today in Bucharest", () => {
    // 23:30 UTC on 27.03 is already 28.03 in Bucharest.
    expect(nextDays(new Date("2027-03-27T23:30:00Z"), 3)).toEqual(["2027-03-28", "2027-03-29", "2027-03-30"]);
  });
});

describe("the free start times (R-041, R-043)", () => {
  const day: DayAvailability = {
    day: "2027-04-10",
    open: "08:00",
    close: "11:00",
    resources: [
      { id: "c1", kind: "padel_court", name: "Teren 1", busy: [{ starts_at: "2027-04-10T06:00:00Z", ends_at: "2027-04-10T07:00:00Z" }] },
      { id: "r1", kind: "reformer", name: "Reformer 1", busy: [] },
    ],
  };
  const court = day.resources[0]!;

  it("steps by 30 minutes and never runs past closing", () => {
    expect(slotsFor(day, court, 90, new Date("2027-04-01T00:00:00Z")).map((s) => s.time)).toEqual(["08:00", "08:30", "09:00", "09:30"]);
  });

  it("marks what overlaps a booking as taken; a booking may start when another ends", () => {
    // Busy 09:00–10:00 club time (UTC+3 in April); 60 minutes; now 07:40.
    const slots = slotsFor(day, court, 60, new Date("2027-04-10T04:40:00Z"));
    expect(slots.map((s) => [s.time, s.free])).toEqual([
      ["08:00", true], // ends 09:00, when the other starts
      ["08:30", false],
      ["09:00", false],
      ["09:30", false],
      ["10:00", true],
    ]);
    expect(slots[0]?.startsAt).toBe("2027-04-10T05:00:00.000Z");
  });

  it("marks what has already started as taken", () => {
    const slots = slotsFor(day, court, 60, new Date("2027-04-10T05:10:00Z"));
    expect(slots[0]).toMatchObject({ time: "08:00", free: false });
  });

  it("offers only the padel courts online", () => {
    expect(onlineCourts(day).map((r) => r.id)).toEqual(["c1"]);
  });
});
