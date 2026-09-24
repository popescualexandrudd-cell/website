import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addDaysToKey, isoWeekday, localDateKey, zonedInstant } from "@/lib/availability";
import { cancelByClient, createBooking, isOverlapError, type CreateBookingInput } from "@/lib/booking";
import { manageToken } from "@/lib/email/messages";
import { hashToken } from "@/lib/tokens";

const TZ = "Europe/Bucharest";
let individualId = "";
let semiId = "";
let miniId = "";

/** A weekday at least three days ahead, so notice and opening hours never interfere. */
function futureWeekday(offsetDays = 3): string {
  let key = addDaysToKey(localDateKey(new Date(), TZ), offsetDays);
  while (isoWeekday(key) > 5) key = addDaysToKey(key, 1);
  return key;
}

function input(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return {
    programId: individualId,
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
  individualId = (await db.program.findUniqueOrThrow({ where: { slug: "lectie-individuala" } })).id;
  semiId = (await db.program.findUniqueOrThrow({ where: { slug: "lectie-in-doi" } })).id;
  miniId = (await db.program.findUniqueOrThrow({ where: { slug: "mini-tenis" } })).id;
});

beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE "EmailLog", "Booking", "Client" RESTART IDENTITY CASCADE');
  await db.groupSchedule.updateMany({ data: { membersCount: 0 } });
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
    const results = await Promise.all(Array.from({ length: 6 }, () => createBooking(input({ startsAt }))));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    for (const r of results.filter((r) => !r.ok)) expect(["conflict", "unavailable"]).toContain(r.ok ? "" : r.error);
    expect(await db.booking.count({ where: { startsAt } })).toBe(1);
  });

  it("keeps the break between lessons, also for different programmes", async () => {
    const day = futureWeekday(5);
    expect((await createBooking(input({ startsAt: zonedInstant(day, "10:00", TZ) }))).ok).toBe(true);
    const tooClose = await createBooking(input({ programId: semiId, participants: 2, startsAt: zonedInstant(day, "11:05", TZ) }));
    expect(tooClose.ok).toBe(false);
    const afterBreak = await createBooking(input({ programId: semiId, participants: 2, startsAt: zonedInstant(day, "11:10", TZ) }));
    expect(afterBreak.ok).toBe(true);
  });

  it("is protected by the database even when the application checks are bypassed", async () => {
    const first = await createBooking(input({ startsAt: zonedInstant(futureWeekday(6), "15:00", TZ) }));
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
    await db.booking.update({ where: { id: first.bookingId }, data: { status: "ANULATA_CLIENT", cancelledAt: new Date() } });
    expect((await createBooking(input({ startsAt }))).ok).toBe(true);
  });

  it("rejects times outside opening hours and too many participants", async () => {
    const lateEvening = zonedInstant(futureWeekday(3), "22:30", TZ);
    expect(await createBooking(input({ startsAt: lateEvening }))).toEqual({ ok: false, error: "unavailable" });
    expect(await createBooking(input({ participants: 2 }))).toEqual({ ok: false, error: "participants" });
  });

  it("asks for the child's first name and age for children's programmes", async () => {
    const schedule = await db.groupSchedule.findFirstOrThrow({ where: { programId: miniId } });
    let key = futureWeekday(3);
    while (isoWeekday(key) !== schedule.weekday) key = addDaysToKey(key, 1);
    const result = await createBooking(input({ programId: miniId, groupScheduleId: schedule.id, startsAt: zonedInstant(key, schedule.startTime, TZ) }));
    expect(result).toEqual({ ok: false, error: "minor" });
  });
});

describe("group sessions", () => {
  it("never overfills a session, even with simultaneous requests", async () => {
    const schedule = await db.groupSchedule.findFirstOrThrow({ where: { programId: miniId } });
    await db.groupSchedule.update({ where: { id: schedule.id }, data: { membersCount: schedule.capacity - 1 } });
    let key = futureWeekday(3);
    while (isoWeekday(key) !== schedule.weekday) key = addDaysToKey(key, 1);
    const startsAt = zonedInstant(key, schedule.startTime, TZ);
    const results = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        createBooking(
          input({ programId: miniId, groupScheduleId: schedule.id, startsAt, forMinor: true, childFirstName: `Copil${i}`, childAge: 6, parentName: "Părinte" }),
        ),
      ),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.error === "sessionFull")).toHaveLength(3);
  });
});

describe("cancelling through the link", () => {
  it("allows it before the limit and refuses it after", async () => {
    const early = await createBooking(input({ startsAt: zonedInstant(futureWeekday(8), "16:00", TZ) }));
    expect(early.ok).toBe(true);
    if (!early.ok) return;
    expect(await cancelByClient(early.manageToken, "Nu mai pot")).toEqual({ ok: true, bookingId: early.bookingId });
    expect((await cancelByClient(early.manageToken, null)).ok).toBe(false);

    // A lesson that starts in a few hours: the free-cancellation window has already closed.
    const soonId = "booking-soon-test";
    const startsAt = new Date(Date.now() + 5 * 3_600_000);
    await db.booking.create({
      data: {
        id: soonId,
        code: "TN-SOON01",
        programId: individualId,
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
    expect(await cancelByClient(manageToken(soonId), null)).toEqual({ ok: false, error: "tooLate" });
    expect(await cancelByClient("x".repeat(43), null)).toEqual({ ok: false, error: "notFound" });
  });
});
