/**
 * GDPR helpers shared by the retention job and the admin: anonymisation keeps the statistics
 * (dates, programs, statuses) and removes everything that identifies a person.
 */
import { db } from "./db";

export const ANON = "Anonimizat";

export function anonymizedBookingData(id: string, now: Date) {
  return {
    name: ANON,
    email: `anonim-${id}@anonim.invalid`,
    phone: "",
    message: null,
    parentName: null,
    childFirstName: null,
    childAge: null,
    internalNotes: null,
    cancelReason: null,
    clientId: null,
    anonymizedAt: now,
  };
}

const OMIT = new Set([
  "cancelTokenHash",
  "reviewTokenHash",
  "confirmTokenHash",
  "unsubscribeTokenHash",
]);

function clean<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !OMIT.has(key)));
}

/** Everything stored about a client (right of access, art. 15 GDPR), as plain data. */
export async function exportClientData(clientId: string) {
  const client = await db.client.findUnique({
    where: { id: clientId },
    include: { activePlan: true },
  });
  if (!client) return null;
  const email = client.email ?? undefined;
  const [bookings, messages, waitlist, newsletter] = await Promise.all([
    db.booking.findMany({
      where: { OR: [{ clientId }, ...(email ? [{ email }] : [])] },
      include: { program: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    }),
    email ? db.contactMessage.findMany({ where: { email } }) : [],
    email ? db.waitlistEntry.findMany({ where: { email } }) : [],
    email ? db.newsletterSubscriber.findMany({ where: { email } }) : [],
  ]);
  const testimonials = await db.testimonial.findMany({
    where: { bookingId: { in: bookings.map((b) => b.id) } },
  });
  return {
    generatedAt: new Date().toISOString(),
    client: clean(client),
    bookings: bookings.map(clean),
    contactMessages: messages.map(clean),
    waitlist: waitlist.map(clean),
    newsletter: newsletter.map(clean),
    testimonials: testimonials.map(clean),
  };
}

export type EraseResult =
  { ok: true; counts: Record<string, number> } | { ok: false; error: string };

/**
 * Right to erasure (art. 17 GDPR): anonymises the client's bookings (kept for accounting and
 * statistics), deletes messages, waiting-list requests, newsletter subscription, reviews and
 * email copies, then deletes the client. Refused while future lessons are still active.
 */
export async function eraseClient(clientId: string, now = new Date()): Promise<EraseResult> {
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, error: "Clientul nu mai există." };
  const email = client.email ?? undefined;
  const bookingWhere = { OR: [{ clientId }, ...(email ? [{ email }] : [])] };
  const upcoming = await db.booking.count({
    where: { ...bookingWhere, status: { in: ["IN_ASTEPTARE", "CONFIRMATA"] }, endsAt: { gt: now } },
  });
  if (upcoming > 0) {
    return {
      ok: false,
      error: `Clientul are ${upcoming === 1 ? "un antrenament viitor activ" : `${upcoming} antrenamente viitoare active`}. Anulează-le mai întâi, apoi șterge datele.`,
    };
  }
  return db.$transaction(async (tx) => {
    const bookings = await tx.booking.findMany({ where: bookingWhere, select: { id: true } });
    const ids = bookings.map((b) => b.id);
    const testimonials = await tx.testimonial.deleteMany({ where: { bookingId: { in: ids } } });
    const emails = await tx.emailLog.deleteMany({
      where: { OR: [{ bookingId: { in: ids } }, ...(email ? [{ to: email }] : [])] },
    });
    for (const id of ids)
      await tx.booking.update({ where: { id }, data: anonymizedBookingData(id, now) });
    const messages = email
      ? await tx.contactMessage.deleteMany({ where: { email } })
      : { count: 0 };
    const waitlist = email ? await tx.waitlistEntry.deleteMany({ where: { email } }) : { count: 0 };
    const newsletter = email
      ? await tx.newsletterSubscriber.deleteMany({ where: { email } })
      : { count: 0 };
    await tx.client.delete({ where: { id: clientId } });
    return {
      ok: true as const,
      counts: {
        bookings: ids.length,
        testimonials: testimonials.count,
        emails: emails.count,
        messages: messages.count,
        waitlist: waitlist.count,
        newsletter: newsletter.count,
      },
    };
  });
}
