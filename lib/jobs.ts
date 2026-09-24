/**
 * Background jobs run by the worker process (worker/index.ts). Each job is idempotent: running it
 * twice in a row does nothing the second time, so an overlapping or repeated run is harmless.
 */
import { db } from "./db";
import { deliverEmails, retryDueEmails } from "./email/send";
import { queueReminderEmail, queueReviewInvite, reviewToken } from "./email/messages";
import { hashToken } from "./tokens";
import { ANON, anonymizedBookingData } from "./gdpr";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** 24-hour reminder for confirmed lessons booked more than a day in advance. */
export async function sendDueReminders(now = new Date()): Promise<number> {
  const due = await db.booking.findMany({
    where: {
      status: "CONFIRMATA",
      reminderSentAt: null,
      startsAt: { gt: new Date(now.getTime() + 2 * HOUR), lte: new Date(now.getTime() + DAY) },
    },
    select: { id: true, startsAt: true, createdAt: true },
  });
  let sent = 0;
  for (const booking of due) {
    // Booked less than a day before the lesson: the confirmation email already serves as reminder.
    if (booking.startsAt.getTime() - booking.createdAt.getTime() < DAY) {
      await db.booking.update({ where: { id: booking.id }, data: { reminderSentAt: now } });
      continue;
    }
    const claimed = await db.booking.updateMany({
      where: { id: booking.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (claimed.count === 0) continue;
    await deliverEmails(await queueReminderEmail(booking.id));
    sent += 1;
  }
  return sent;
}

/** After a client's first completed lesson, an optional invitation to leave a review. */
export async function sendDueReviewInvites(now = new Date()): Promise<number> {
  const settings = await db.siteSettings.findUnique({
    where: { id: 1 },
    select: { reviewInvitesEnabled: true },
  });
  if (!settings?.reviewInvitesEnabled) return 0;
  const candidates = await db.booking.findMany({
    where: {
      status: "EFECTUATA",
      reviewInviteAt: null,
      anonymizedAt: null,
      completedAt: {
        lte: new Date(now.getTime() - 2 * HOUR),
        gte: new Date(now.getTime() - 14 * DAY),
      },
    },
    select: { id: true, email: true, startsAt: true },
  });
  let sent = 0;
  for (const booking of candidates) {
    const earlier = await db.booking.count({
      where: { email: booking.email, status: "EFECTUATA", startsAt: { lt: booking.startsAt } },
    });
    const invited = await db.booking.count({
      where: { email: booking.email, reviewInviteAt: { not: null } },
    });
    const claimed = await db.booking.updateMany({
      where: { id: booking.id, reviewInviteAt: null },
      data: {
        reviewInviteAt: now,
        reviewTokenHash: earlier === 0 && invited === 0 ? hashToken(reviewToken(booking.id)) : null,
      },
    });
    if (claimed.count === 0 || earlier > 0 || invited > 0) continue;
    await deliverEmails(await queueReviewInvite(booking.id));
    sent += 1;
  }
  return sent;
}

/**
 * GDPR retention: personal data older than the configured period is anonymised. Booking times,
 * programmes and statuses stay, so the statistics remain correct.
 */
export async function runRetention(now = new Date()): Promise<Record<string, number>> {
  const settings = await db.siteSettings.findUnique({
    where: { id: 1 },
    select: { retentionMonths: true },
  });
  const months = Math.max(1, settings?.retentionMonths ?? 24);
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);

  const bookings = await db.booking.findMany({
    where: { endsAt: { lt: cutoff }, anonymizedAt: null },
    select: { id: true },
  });
  for (const { id } of bookings) {
    await db.booking.update({ where: { id }, data: anonymizedBookingData(id, now) });
  }

  const messages = await db.contactMessage.updateMany({
    where: { createdAt: { lt: cutoff }, anonymizedAt: null },
    data: {
      name: ANON,
      email: "anonim@anonim.invalid",
      phone: null,
      subject: null,
      message: "[anonimizat]",
      anonymizedAt: now,
    },
  });
  const waitlist = await db.waitlistEntry.updateMany({
    where: { createdAt: { lt: cutoff }, anonymizedAt: null },
    data: {
      name: ANON,
      email: "anonim@anonim.invalid",
      phone: "",
      message: null,
      preferences: "[anonimizat]",
      childAge: null,
      anonymizedAt: now,
      status: "ARHIVAT",
    },
  });

  // Clients with no booking inside the retention period and no active package.
  const staleClients = await db.client.findMany({
    where: {
      anonymizedAt: null,
      updatedAt: { lt: cutoff },
      bookings: { none: { endsAt: { gte: cutoff } } },
      OR: [{ packageValidUntil: null }, { packageValidUntil: { lt: cutoff } }],
    },
    select: { id: true },
  });
  for (const { id } of staleClients) {
    await db.client.update({
      where: { id },
      data: {
        name: ANON,
        email: null,
        phone: null,
        notes: null,
        activePlanId: null,
        sessionsRemaining: null,
        anonymizedAt: now,
      },
    });
  }

  // Email copies contain personal data too; the audit trail is kept for the same period.
  const emails = await db.emailLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  const audits = await db.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });

  return {
    bookings: bookings.length,
    messages: messages.count,
    waitlist: waitlist.count,
    clients: staleClients.length,
    emails: emails.count,
    audits: audits.count,
  };
}

/** Expired sessions, rate-limit windows and never-confirmed newsletter sign-ups. */
export async function cleanup(now = new Date()): Promise<Record<string, number>> {
  const sessions = await db.session.deleteMany({ where: { expiresAt: { lt: now } } });
  const limits = await db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } });
  const newsletter = await db.newsletterSubscriber.deleteMany({
    where: { confirmedAt: null, createdAt: { lt: new Date(now.getTime() - 7 * DAY) } },
  });
  return { sessions: sessions.count, rateLimits: limits.count, newsletter: newsletter.count };
}

export { retryDueEmails };
