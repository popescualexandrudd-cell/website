import "server-only";
import { db } from "./db";
import { t } from "./i18n-content";
import { generateGiftCode, giftCardState, giftExpiry, normalizeGiftCode } from "./gift-cards";

/**
 * Gift cards in the database: activation (code + expiry), paying for a booking with a card,
 * and giving the card back when that booking is cancelled.
 */

/** A card that can pay for a booking now, from the code the client typed. */
export async function findUsableGiftCard(input: string, now = new Date()) {
  const code = normalizeGiftCode(input);
  if (!code) return null;
  const card = await db.giftCard.findUnique({ where: { code } });
  if (!card || giftCardState(card, now) !== "usable") return null;
  return card;
}

/**
 * Marks the card as used by the booking. Guarded on its status, so two bookings made at the same
 * moment with one code cannot both take it; returns whether this booking got it.
 */
export async function redeemGiftCard(cardId: string, bookingId: string, now = new Date()) {
  const taken = await db.giftCard.updateMany({
    where: { id: cardId, status: "ACTIVA", bookingId: null },
    data: { status: "FOLOSITA", bookingId, redeemedAt: now },
  });
  if (taken.count === 0) return false;
  const card = await db.giftCard.findUniqueOrThrow({ where: { id: cardId } });
  await db.booking.update({
    where: { id: bookingId },
    data: { internalNotes: `Plătită cu cardul cadou ${card.code ?? ""}.` },
  });
  return true;
}

/** A cancelled or declined booking gives its gift card back, usable again. */
export async function releaseGiftCard(bookingId: string): Promise<void> {
  await db.giftCard.updateMany({
    where: { bookingId, status: "FOLOSITA" },
    data: { status: "ACTIVA", bookingId: null, redeemedAt: null },
  });
}

/** A new, unused code (retries on the rare collision). */
export async function uniqueGiftCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateGiftCode();
    if (!(await db.giftCard.findUnique({ where: { code }, select: { id: true } }))) return code;
  }
  throw new Error("Nu am putut genera un cod unic pentru cardul cadou.");
}

/** Values the admin editor sets when a request becomes an active (paid) card. */
export function activationDefaults(
  data: { code?: unknown; activatedAt?: unknown; expiresAt?: unknown },
  now = new Date(),
): { activatedAt: Date; expiresAt: Date } {
  const activatedAt = data.activatedAt instanceof Date ? data.activatedAt : now;
  const expiresAt = data.expiresAt instanceof Date ? data.expiresAt : giftExpiry(activatedAt);
  return { activatedAt, expiresAt };
}

/** The card as shown on its printable page and in the email. */
export async function loadGiftCard(code: string) {
  const normalized = normalizeGiftCode(code);
  if (!normalized) return null;
  return db.giftCard.findUnique({
    where: { code: normalized },
    include: { lessonType: { select: { name: true } } },
  });
}

export function lessonNameOf(
  card: { lessonType: { name: unknown } | null },
  locale: string,
): string | null {
  return card.lessonType ? t(card.lessonType.name, locale) : null;
}
