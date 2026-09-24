import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addDaysToKey, isoWeekday, localDateKey, zonedInstant } from "@/lib/availability";
import {
  cancelByClient,
  createBooking,
  isOverlapError,
  type CreateBookingInput,
} from "@/lib/booking";
import { manageToken } from "@/lib/email/messages";
import { hashToken } from "@/lib/tokens";

const TZ = "Europe/Bucharest";
let initiereId = "";
let competitieId = "";
let individualId = "";
let pairId = "";
let groupId = "";

/** A weekday at least three days ahead, so notice and opening hours never interfere. */
function futureWeekday(offsetDays = 3): string {
  let key = addDaysToKey(localDateKey(new Date(), TZ), offsetDays);
  while (isoWeekday(key) > 5) key = addDaysToKey(key, 1);
  return key;
}

function input(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return {
    programId: initiereId,
    lessonTypeId: individualId,
    durationMin: 60,
    startsAt: zonedInstant(futureWeekday(), "10:00", TZ),
    name: "Test Client",
    email: `test-${Math.random().toString(36).slice(2)}@example.com`,
    phone: "0722123456",
    participants: 1,
    locale: "ro",
    source: "SITE",
    policyVersion: "test",
    ...overrides,
  };
}

beforeAll(async () => {
  initiereId = (await db.program.findUniqueOrThrow({ where: { slug: "initiere" } })).id;
  competitieId = (await db.program.findUniqueOrThrow({ where: { slug: "competitie" } })).id;
  const lesson = (slug: string) => db.lessonType.findUniqueOrThrow({ where: { slug } });
  individualId = (await lesson("lectie-individuala")).id;
  pairId = (await lesson("lectie-in-doi")).id;
  groupId = (await lesson("lectie-de-grup")).id;
});

beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE "EmailLog", "Booking", "Client" RESTART IDENTITY CASCADE');
});

describe("creating bookings", () => {
  it("creates a request that waits for the coach, with a hashed manage token", async () => {
    const result = await createBooking(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("IN_ASTEPTARE");
    const row = await db.booking.findUniqueOrThrow({ where: { id: result.bookingId } });
    expect(row.cancelTokenHash).toBe(hashToken(manageToken(row.id)));
    expect(row.cancelTokenHash).not.toContain(result.manageToken);
    expect(row.blockedUntil.getTime() - row.endsAt.getTime()).toBe(10 * 60_000);
  });

  it("lets exactly one of many simultaneous requests win the same slot", async () => {
    const startsAt = zonedInstant(futureWeekday(4), "12:00", TZ);
    const results = await Promise.all(
      Array.from({ length: 6 }, () => createBooking(input({ startsAt }))),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    for (const r of results.filter((r) => !r.ok))
      expect(["conflict", "unavailable"]).toContain(r.ok ? "" : r.error);
    expect(await db.booking.count({ where: { startsAt } })).toBe(1);
  });

  it("keeps the break between lessons, also for different programmes and lesson types", async () => {
    const day = futureWeekday(5);
    expect((await createBooking(input({ startsAt: zonedInstant(day, "10:00", TZ) }))).ok).toBe(
      true,
    );
    const tooClose = await createBooking(
      input({
        programId: competitieId,
        lessonTypeId: pairId,
        participants: 2,
        startsAt: zonedInstant(day, "11:05", TZ),
      }),
    );
    expect(tooClose.ok).toBe(false);
    const afterBreak = await createBooking(
      input({
        programId: competitieId,
        lessonTypeId: pairId,
        participants: 2,
        startsAt: zonedInstant(day, "11:10", TZ),
      }),
    );
    expect(afterBreak.ok).toBe(true);
  });

  it("is protected by the database even when the application checks are bypassed", async () => {
    const first = await createBooking(
      input({ startsAt: zonedInstant(futureWeekday(6), "15:00", TZ) }),
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const existing = await db.booking.findUniqueOrThrow({ where: { id: first.bookingId } });
    let error: unknown = null;
    try {
      await db.booking.create({
        data: {
          code: "TN-DIRECT",
          programId: existing.programId,
          startsAt: new Date(existing.startsAt.getTime() + 30 * 60_000),
          endsAt: new Date(existing.endsAt.getTime() + 30 * 60_000),
          blockedUntil: new Date(existing.blockedUntil.getTime() + 30 * 60_000),
          status: "CONFIRMATA",
          name: "Direct",
          email: "direct@example.com",
          phone: "0722000000",
          gdprConsent: true,
          gdprConsentAt: new Date(),
          policyVersion: "test",
          cancelTokenHash: "direct-hash",
        },
      });
    } catch (e) {
      error = e;
    }
    expect(error).not.toBeNull();
    expect(isOverlapError(error)).toBe(true);
  });

  it("frees the slot once a booking is cancelled", async () => {
    const startsAt = zonedInstant(futureWeekday(7), "09:00", TZ);
    const first = await createBooking(input({ startsAt }));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    await db.booking.update({
      where: { id: first.bookingId },
      data: { status: "ANULATA_CLIENT", cancelledAt: new Date() },
    });
    expect((await createBooking(input({ startsAt }))).ok).toBe(true);
  });

  it("rejects times outside opening hours and too many participants", async () => {
    const lateEvening = zonedInstant(futureWeekday(3), "22:30", TZ);
    expect(await createBooking(input({ startsAt: lateEvening }))).toEqual({
      ok: false,
      error: "unavailable",
    });
    expect(await createBooking(input({ participants: 2 }))).toEqual({
      ok: false,
      error: "participants",
    });
  });

  it("asks for the child's first name and age when the lesson is for a child", async () => {
    const result = await createBooking(input({ forMinor: true }));
    expect(result).toEqual({ ok: false, error: "minor" });
    const withChild = await createBooking(
      input({ forMinor: true, childFirstName: "Ana", childAge: 7, parentName: "Test Client" }),
    );
    expect(withChild.ok).toBe(true);
  });
});

describe("durations and lesson types", () => {
  it("stores the chosen duration and blocks it, with the break, for everyone", async () => {
    const day = futureWeekday(9);
    const long = await createBooking(
      input({ durationMin: 120, startsAt: zonedInstant(day, "09:00", TZ) }),
    );
    expect(long.ok).toBe(true);
    if (!long.ok) return;
    const row = await db.booking.findUniqueOrThrow({ where: { id: long.bookingId } });
    expect(row.durationMin).toBe(120);
    expect(row.lessonTypeId).toBe(individualId);
    expect(row.endsAt.getTime() - row.startsAt.getTime()).toBe(120 * 60_000);
    // 10:30 falls inside the two-hour lesson; 11:10 is right after the break.
    expect((await createBooking(input({ startsAt: zonedInstant(day, "10:30", TZ) }))).ok).toBe(
      false,
    );
    expect((await createBooking(input({ startsAt: zonedInstant(day, "11:10", TZ) }))).ok).toBe(
      true,
    );
  });

  it("refuses a duration the lesson type does not offer", async () => {
    expect(await createBooking(input({ durationMin: 75 }))).toEqual({
      ok: false,
      error: "duration",
    });
  });

  it("checks the number of people against the lesson type", async () => {
    expect(await createBooking(input({ lessonTypeId: pairId, participants: 1 }))).toEqual({
      ok: false,
      error: "participants",
    });
    expect(await createBooking(input({ lessonTypeId: groupId, participants: 7 }))).toEqual({
      ok: false,
      error: "participants",
    });
    const group = await createBooking(
      input({
        lessonTypeId: groupId,
        participants: 5,
        startsAt: zonedInstant(futureWeekday(10), "17:00", TZ),
      }),
    );
    expect(group.ok).toBe(true);
  });

  it("refuses unknown programmes and lesson types", async () => {
    expect(await createBooking(input({ programId: "missing-program" }))).toEqual({
      ok: false,
      error: "program",
    });
    expect(await createBooking(input({ lessonTypeId: "missing-lesson" }))).toEqual({
      ok: false,
      error: "lessonType",
    });
  });
});

describe("cancelling through the link", () => {
  it("allows it before the limit and refuses it after", async () => {
    const early = await createBooking(
      input({ startsAt: zonedInstant(futureWeekday(8), "16:00", TZ) }),
    );
    expect(early.ok).toBe(true);
    if (!early.ok) return;
    expect(await cancelByClient(early.manageToken, "Nu mai pot")).toEqual({
      ok: true,
      bookingId: early.bookingId,
    });
    expect((await cancelByClient(early.manageToken, null)).ok).toBe(false);

    // A lesson that starts in a few hours: the free-cancellation window has already closed.
    const soonId = "booking-soon-test";
    const startsAt = new Date(Date.now() + 5 * 3_600_000);
    await db.booking.create({
      data: {
        id: soonId,
        code: "TN-SOON01",
        programId: initiereId,
        lessonTypeId: individualId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 3_600_000),
        blockedUntil: new Date(startsAt.getTime() + 70 * 60_000),
        status: "CONFIRMATA",
        name: "Soon",
        email: "soon@example.com",
        phone: "0722000001",
        gdprConsent: true,
        gdprConsentAt: new Date(),
        policyVersion: "test",
        cancelTokenHash: hashToken(manageToken(soonId)),
        source: "TELEFON",
      },
    });
    expect(await cancelByClient(manageToken(soonId), null)).toEqual({
      ok: false,
      error: "tooLate",
    });
    expect(await cancelByClient("x".repeat(43), null)).toEqual({ ok: false, error: "notFound" });
  });
});
