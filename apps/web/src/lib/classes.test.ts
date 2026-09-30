import { describe, expect, it } from "vitest";
import { addDays, type ClassItem, KINDS, schedule } from "./classes";

const item = (id: string, starts: string, ends: string, places = 2): ClassItem => ({
  id,
  kind: "beginner",
  instructor_name: "Ana",
  starts_at: starts,
  ends_at: ends,
  capacity: 4,
  places_left: places,
});

describe("the Pilates schedule (§9.2.9)", () => {
  it("lists the eight class types of R-101", () => {
    expect(KINDS).toHaveLength(8);
    expect(KINDS).toContain("racket_players");
    expect(KINDS).toContain("mothers");
  });

  it("moves a club day by whole days, across the clock change (ADR-0010)", () => {
    expect(addDays("2027-03-27", 1)).toBe("2027-03-28");
    expect(addDays("2027-03-28", 1)).toBe("2027-03-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("groups the next seven club days by day, in time order, in club time", () => {
    const now = new Date("2027-03-26T08:00:00Z"); // 10:00 in Bucharest, two days before summer time
    const list = [
      item("late", "2027-03-28T16:00:00Z", "2027-03-28T17:00:00Z"), // 19:00 summer time (UTC+3)
      item("gone", "2027-03-26T07:00:00Z", "2027-03-26T08:00:00Z"), // already started
      item("first", "2027-03-26T16:00:00Z", "2027-03-26T17:00:00Z", 0), // 18:00 today
      item("past-midnight-utc", "2027-03-26T22:30:00Z", "2027-03-26T23:30:00Z"), // 00:30 on the 27th
      item("too-far", "2027-04-02T06:00:00Z", "2027-04-02T07:00:00Z"), // the 8th day
      item("last-day", "2027-04-01T06:00:00Z", "2027-04-01T07:00:00Z"), // 09:00 on the 7th day
    ];
    const days = schedule(list, now);
    expect(days.map((d) => d.day)).toEqual(["2027-03-26", "2027-03-27", "2027-03-28", "2027-04-01"]);
    expect(days[0]?.classes.map((c) => [c.id, c.from, c.to])).toEqual([["first", "18:00", "19:00"]]);
    expect(days[1]?.classes[0]?.from).toBe("00:30");
    expect(days[2]?.classes[0]?.from).toBe("19:00");
    expect(schedule([], now)).toEqual([]);
  });
});
