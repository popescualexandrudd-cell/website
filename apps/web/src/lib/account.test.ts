import { describe, expect, it } from "vitest";
import { type Booking, codeOf, outcome, sortBookings } from "./account";

const booking = (id: string, starts: string, ends: string, status = "confirmed"): Booking =>
  ({ id, starts_at: starts, ends_at: ends, status }) as Booking;

describe("the account's API answers (ADR-0011)", () => {
  it("reads only well-formed error codes", () => {
    expect(codeOf({ error: { code: "auth.invalid_credentials" } })).toBe("auth.invalid_credentials");
    expect(codeOf({ error: { code: "<script>" } })).toBeNull();
    expect(codeOf(undefined)).toBeNull();
  });

  it("gives the data, the code and its parameters, or offline when the network fails", async () => {
    const ok = await outcome(async () => ({ data: { a: 1 }, response: new Response("{}") }));
    expect(ok).toEqual({ ok: true, data: { a: 1 } });
    const refused = await outcome(async () => ({
      error: { error: { code: "accounts.too_young_for_self_registration", params: { min_age: 14, nested: { x: 1 } } } },
      response: new Response("{}", { status: 400 }),
    }));
    expect(refused).toEqual({ ok: false, code: "accounts.too_young_for_self_registration", params: { min_age: 14 } });
    const offline = await outcome(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(offline).toEqual({ ok: false, code: null, params: {} });
  });
});

describe("the bookings on the account page", () => {
  it("upcoming soonest first; past latest first; cancelled last", () => {
    const now = new Date("2027-04-10T12:00:00Z");
    const list = [
      booking("later", "2027-04-12T16:00:00Z", "2027-04-12T17:30:00Z"),
      booking("soon", "2027-04-10T15:00:00Z", "2027-04-10T16:00:00Z"),
      booking("playing", "2027-04-10T11:30:00Z", "2027-04-10T13:00:00Z"),
      booking("old", "2027-04-01T10:00:00Z", "2027-04-01T11:00:00Z"),
      booking("yesterday", "2027-04-09T10:00:00Z", "2027-04-09T11:00:00Z"),
      booking("gone", "2027-04-11T10:00:00Z", "2027-04-11T11:00:00Z", "cancelled"),
    ];
    const { upcoming, past } = sortBookings(list, now);
    expect(upcoming.map((b) => b.id)).toEqual(["playing", "soon", "later"]);
    expect(past.map((b) => b.id)).toEqual(["yesterday", "old", "gone"]);
  });
});
