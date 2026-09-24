import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { runRetention, sendDueReminders, sendDueReviewInvites, cleanup } from "@/lib/jobs";

const HOUR = 3_600_000;
let programId = "";

async function booking(overrides: Record<string, unknown> = {}) {
  const id = `job-${Math.random().toString(36).slice(2)}`;
  const startsAt = (overrides.startsAt as Date | undefined) ?? new Date(Date.now() + 20 * HOUR);
  return db.booking.create({
    data: {
      id,
      code: `TN-${id.slice(-6).toUpperCase()}`,
      programId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + HOUR),
      blockedUntil: new Date(startsAt.getTime() + HOUR + 10 * 60_000),
      status: "CONFIRMATA",
      name: "Ion Popescu",
      email: `${id}@example.com`,
      phone: "0722000002",
      message: "Am o accidentare veche la umăr.",
      gdprConsent: true,
      gdprConsentAt: new Date(),
      policyVersion: "test",
      cancelTokenHash: `hash-${id}`,
      ...overrides,
    },
  });
}

beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE "EmailLog", "Booking", "Client", "ContactMessage" RESTART IDENTITY CASCADE');
  programId = (await db.program.findUniqueOrThrow({ where: { slug: "lectie-individuala" } })).id;
});

describe("background jobs", () => {
  it("sends the 24-hour reminder once, only for lessons booked well in advance", async () => {
    const early = await booking({ createdAt: new Date(Date.now() - 72 * HOUR) });
    const late = await booking({ startsAt: new Date(Date.now() + 22 * HOUR), createdAt: new Date(Date.now() - HOUR) });
    expect(await sendDueReminders()).toBe(1);
    expect(await sendDueReminders()).toBe(0);
    expect(await db.emailLog.count({ where: { template: "booking-reminder", bookingId: early.id } })).toBe(1);
    expect(await db.emailLog.count({ where: { bookingId: late.id } })).toBe(0);
    expect((await db.booking.findUniqueOrThrow({ where: { id: late.id } })).reminderSentAt).not.toBeNull();
  });

  it("invites a review only after the client's first completed lesson", async () => {
    const first = await booking({ status: "EFECTUATA", startsAt: new Date(Date.now() - 5 * HOUR), completedAt: new Date(Date.now() - 3 * HOUR) });
    expect(await sendDueReviewInvites()).toBe(1);
    const updated = await db.booking.findUniqueOrThrow({ where: { id: first.id } });
    expect(updated.reviewTokenHash).toHaveLength(64);
    const second = await booking({
      email: first.email,
      status: "EFECTUATA",
      startsAt: new Date(Date.now() - 4 * HOUR),
      completedAt: new Date(Date.now() - 3 * HOUR),
    });
    expect(await sendDueReviewInvites()).toBe(0);
    expect((await db.booking.findUniqueOrThrow({ where: { id: second.id } })).reviewTokenHash).toBeNull();
  });

  it("anonymises personal data past the retention period and keeps the statistics", async () => {
    const old = await booking({ status: "EFECTUATA", startsAt: new Date(Date.now() - 800 * 24 * HOUR) });
    const recent = await booking();
    await db.contactMessage.create({
      data: {
        name: "Maria",
        email: "maria@example.com",
        message: "Aș vrea o lecție.",
        consent: true,
        consentAt: new Date(),
        policyVersion: "test",
        createdAt: new Date(Date.now() - 800 * 24 * HOUR),
      },
    });
    const result = await runRetention();
    expect(result.bookings).toBe(1);
    expect(result.messages).toBe(1);
    const anonymised = await db.booking.findUniqueOrThrow({ where: { id: old.id } });
    expect(anonymised.name).toBe("Anonimizat");
    expect(anonymised.message).toBeNull();
    expect(anonymised.status).toBe("EFECTUATA");
    expect(anonymised.programId).toBe(programId);
    expect((await db.booking.findUniqueOrThrow({ where: { id: recent.id } })).name).toBe("Ion Popescu");
    expect((await runRetention()).bookings).toBe(0);
  });

  it("cleans expired sessions and rate-limit windows", async () => {
    await db.rateLimit.create({ data: { key: "old", count: 1, windowStart: new Date(0), expiresAt: new Date(1000) } });
    expect((await cleanup()).rateLimits).toBeGreaterThanOrEqual(1);
  });
});
