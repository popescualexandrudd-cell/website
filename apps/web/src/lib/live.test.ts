import { describe, expect, it } from "vitest";
import { clubClock, clubDay, courtsNow, type DayAvailability, nextTournament } from "./live";

const day = (resources: DayAvailability["resources"]): DayAvailability => ({ day: "2027-04-05", open: "08:00", close: "23:00", resources });
const court = (id: string, busy: [string, string][] = []) => ({
  id,
  kind: "padel_court",
  name: `Teren ${id}`,
  busy: busy.map(([starts_at, ends_at]) => ({ starts_at, ends_at })),
});

describe("now at the club, in club time (ADR-0010)", () => {
  it("reads the day and the clock in Bucharest, across the change to summer time", () => {
    expect(clubDay(new Date("2027-03-27T22:30:00Z"))).toBe("2027-03-28"); // 00:30 in Bucharest
    expect(clubClock(new Date("2027-03-28T00:30:00Z"))).toBe("02:30"); // still winter time
    expect(clubClock(new Date("2027-03-28T01:30:00Z"))).toBe("04:30"); // summer time from 03:00
  });

  it("R-012: says busy, free or closed, never who plays; back-to-back bookings join", () => {
    const now = new Date("2027-04-05T15:10:00Z"); // 18:10
    const states = courtsNow(
      day([
        court("1", [
          ["2027-04-05T15:00:00Z", "2027-04-05T16:30:00Z"],
          ["2027-04-05T16:30:00Z", "2027-04-05T17:30:00Z"],
          ["2027-04-05T18:00:00Z", "2027-04-05T19:00:00Z"],
        ]),
        court("2", [["2027-04-05T17:00:00Z", "2027-04-05T18:30:00Z"]]),
        court("3"),
        { id: "r", kind: "reformer", name: "Reformer 1", busy: [] },
      ]),
      now,
    );
    expect(states).toEqual([
      { id: "1", name: "Teren 1", state: "busy", until: "2027-04-05T17:30:00.000Z" },
      { id: "2", name: "Teren 2", state: "free", until: "2027-04-05T17:00:00Z" },
      { id: "3", name: "Teren 3", state: "free", until: null },
    ]);
  });

  it("is closed outside the opening hours, unless a booking is still running", () => {
    const late = new Date("2027-04-05T20:10:00Z"); // 23:10
    const states = courtsNow(day([court("1"), court("4", [["2027-04-05T19:30:00Z", "2027-04-05T21:00:00Z"]])]), late);
    expect(states.map((c) => c.state)).toEqual(["closed", "busy"]);
    expect(courtsNow(day([court("1")]), new Date("2027-04-05T04:00:00Z"))[0]?.state).toBe("closed"); // 07:00
  });

  it("the next tournament is the first one still ahead, neither cancelled nor over", () => {
    const now = new Date("2027-04-05T12:00:00Z");
    const t = (id: string, starts_at: string, status: string) => ({ id, name: id, starts_at, status });
    expect(
      nextTournament(
        [
          t("over", "2027-04-01T10:00:00Z", "finished"),
          t("cancelled", "2027-04-06T10:00:00Z", "cancelled"),
          t("later", "2027-04-20T10:00:00Z", "registration"),
          t("soon", "2027-04-10T10:00:00Z", "registration"),
          t("started", "2027-04-05T08:00:00Z", "in_progress"),
        ],
        now,
      )?.id,
    ).toBe("soon");
    expect(nextTournament([], now)).toBeNull();
  });
});
