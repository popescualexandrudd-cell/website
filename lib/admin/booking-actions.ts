import "server-only";
import { db } from "../db";
import { audit } from "../audit";
import { deliverEmails } from "../email/send";
import { queueCancellationEmails, queueConfirmationEmail } from "../email/messages";
import { releaseGiftCard } from "../gift-cards-server";
import type { BookingStatus } from "../generated/prisma/client";

export type BookingTransition = "confirm" | "decline" | "cancel" | "done" | "noshow" | "reopen";

const ALLOWED: Record<BookingTransition, BookingStatus[]> = {
  confirm: ["IN_ASTEPTARE"],
  decline: ["IN_ASTEPTARE"],
  cancel: ["CONFIRMATA", "IN_ASTEPTARE"],
  done: ["CONFIRMATA", "NEPREZENTARE"],
  noshow: ["CONFIRMATA", "EFECTUATA"],
  reopen: ["EFECTUATA", "NEPREZENTARE"],
};

export type TransitionResult = { ok: true; emailIds: string[] } | { ok: false; error: string };

/**
 * Moves a booking to its next state, records it in the audit log and queues the client's email.
 * Status guards make repeated clicks harmless (the second one changes nothing).
 */
export async function transitionBooking(
  bookingId: string,
  action: BookingTransition,
  userId: string | null,
  reason?: string,
): Promise<TransitionResult> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false, error: "Rezervarea nu mai există." };
  if (!ALLOWED[action].includes(booking.status)) {
    return {
      ok: false,
      error: `Rezervarea este deja „${statusLabel(booking.status)}"; acțiunea nu mai e posibilă.`,
    };
  }
  const now = new Date();
  const data =
    action === "confirm"
      ? { status: "CONFIRMATA" as const, confirmedAt: now }
      : action === "decline" || action === "cancel"
        ? {
            status: "ANULATA_ANTRENOR" as const,
            cancelledAt: now,
            cancelReason: reason?.trim() || null,
          }
        : action === "done"
          ? { status: "EFECTUATA" as const, completedAt: now }
          : action === "noshow"
            ? { status: "NEPREZENTARE" as const, completedAt: null }
            : { status: "CONFIRMATA" as const, completedAt: null };

  const updated = await db.booking.updateMany({
    where: { id: bookingId, status: booking.status },
    data,
  });
  if (updated.count === 0)
    return { ok: false, error: "Rezervarea tocmai a fost modificată. Reîncarcă pagina." };

  // A declined or cancelled lesson gives back the gift card that paid for it.
  if (action === "decline" || action === "cancel") await releaseGiftCard(bookingId);

  // A completed lesson uses one session from the client's active package.
  if (action === "done" && booking.clientId) {
    const client = await db.client.findUnique({ where: { id: booking.clientId } });
    if (client?.sessionsRemaining && client.sessionsRemaining > 0) {
      await db.client.update({
        where: { id: client.id },
        data: { sessionsRemaining: client.sessionsRemaining - 1 },
      });
    }
  }
  if (action === "reopen" && booking.status === "EFECTUATA" && booking.clientId) {
    const client = await db.client.findUnique({ where: { id: booking.clientId } });
    if (client?.sessionsRemaining !== null && client?.sessionsRemaining !== undefined) {
      await db.client.update({
        where: { id: client.id },
        data: { sessionsRemaining: client.sessionsRemaining + 1 },
      });
    }
  }

  await audit(userId, `rezervare.${action}`, "Booking", bookingId, {
    from: booking.status,
    to: data.status,
    reason: reason ?? null,
  });

  const hasEmail = booking.email.includes("@") && !booking.email.endsWith(".invalid");
  let emailIds: string[] = [];
  if (hasEmail && action === "confirm") emailIds = await queueConfirmationEmail(bookingId);
  if (hasEmail && (action === "decline" || action === "cancel"))
    emailIds = await queueCancellationEmails(bookingId, "coach", reason?.trim() || undefined);
  return { ok: true, emailIds };
}

export async function deliverLater(ids: string[]): Promise<void> {
  if (ids.length > 0) await deliverEmails(ids);
}

export function statusLabel(status: BookingStatus): string {
  return {
    IN_ASTEPTARE: "în așteptare",
    CONFIRMATA: "confirmată",
    ANULATA_CLIENT: "anulată de client",
    ANULATA_ANTRENOR: "anulată de tine",
    EFECTUATA: "efectuată",
    NEPREZENTARE: "neprezentare",
  }[status];
}
