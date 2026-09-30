import { describe, expect, it } from "vitest";
import { type CalendarItem, eventsCalendar, kindOf, when, wording } from "./events";

const answer = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

const item = (changes: Partial<CalendarItem> = {}): CalendarItem => ({
  id: "e1",
  kind: "dj_night",
  title_ro: "Seară cu DJ",
  title_en: "DJ night",
  text_ro: "Muzică pe terenuri.",
  text_en: "Music on the courts.",
  starts_at: "2027-03-19T18:00:00Z",
  ends_at: "2027-03-19T21:00:00Z",
  cancelled: false,
  demo: false,
  tournament: null,
  ...changes,
});

describe("the club's calendar (§9.2.12, R-110)", () => {
  it("reads the calendar from the API, or says it could not", async () => {
    const calendar = { items: [item()], room: { capacity: 20, price_per_hour: 20000, provisional: true } };
    expect(await eventsCalendar(answer(calendar))).toEqual(calendar);
    expect(await eventsCalendar(answer({ items: [] }))).toEqual({ items: [], room: null });
    expect(await eventsCalendar(answer({ error: {} }))).toBeNull();
    expect(await eventsCalendar(answer({}, false))).toBeNull();
    const down = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await eventsCalendar(down)).toBeNull();
  });

  it("speaks the page's language (R-140)", () => {
    expect(wording(item(), "ro")).toEqual({ title: "Seară cu DJ", text: "Muzică pe terenuri." });
    expect(wording(item(), "en")).toEqual({ title: "DJ night", text: "Music on the courts." });
    expect(wording(item({ title_en: "", text_en: "" }), "en")).toEqual({ title: "Seară cu DJ", text: "" });
  });

  it("names a kind it does not know as a club event", () => {
    expect(kindOf(item({ kind: "tournament" }))).toBe("tournament");
    expect(kindOf(item({ kind: "parkour" }))).toBe("club");
  });

  it("tells the time in club time, across the clock change (ADR-0010)", () => {
    expect(when(item())).toEqual({ day: "2027-03-19", from: "20:00", to: "23:00", endDay: null });
    // Summer time from Sunday 28.03.2027: 20:00 at the club is 17:00 UTC.
    expect(when(item({ starts_at: "2027-03-28T17:00:00Z", ends_at: "2027-03-28T20:00:00Z" }))).toEqual({
      day: "2027-03-28",
      from: "20:00",
      to: "23:00",
      endDay: null,
    });
    // Past midnight: the end day is said; ending at midnight is still the same evening.
    expect(when(item({ ends_at: "2027-03-19T23:30:00Z" }))).toEqual({ day: "2027-03-19", from: "20:00", to: "01:30", endDay: "2027-03-20" });
    expect(when(item({ ends_at: "2027-03-19T22:00:00Z" })).endDay).toBeNull();
    // A tournament has no end.
    expect(when(item({ ends_at: null }))).toEqual({ day: "2027-03-19", from: "20:00", to: null, endDay: null });
  });
});
