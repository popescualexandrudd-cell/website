import { roCount } from "./format";

/**
 * Gift cards ("Give a tennis lesson"): codes, what a card is worth, and its price. Pure
 * functions; the database side is in lib/gift-cards-server.ts.
 */

/** Letters and digits that cannot be mistaken for one another when read aloud or typed. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PREFIX = "CADOU";
/** A card can be used for a year after it is activated (editable per card in the admin). */
export const GIFT_VALID_MONTHS = 12;
export const GIFT_LESSON_COUNTS = [1, 5, 10] as const;
export const GIFT_AMOUNT_MIN = 50;
export const GIFT_AMOUNT_MAX = 5000;

/** A uniform random index (32 divides 2^32, so there is no modulo bias). */
function randomIndex(max: number): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]! % max;
}

/** CADOU-XXXX-XXXX, 32^8 ≈ 10^12 combinations. */
export function generateGiftCode(pick: (max: number) => number = randomIndex): string {
  const chars = Array.from({ length: 8 }, () => ALPHABET[pick(ALPHABET.length)]).join("");
  return `${PREFIX}-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

/**
 * The code as typed by the client ("cadou 7kq2 m9xp", "7KQ2M9XP") in its canonical form, or null
 * when it cannot be a gift card code.
 */
export function normalizeGiftCode(input: string): string | null {
  let chars = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (chars.startsWith(PREFIX)) chars = chars.slice(PREFIX.length);
  if (chars.length !== 8 || [...chars].some((c) => !ALPHABET.includes(c))) return null;
  return `${PREFIX}-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export type GiftCardValue = {
  lessonName: string | null;
  lessons: number | null;
  durationMin: number | null;
  amountRon: number | null;
};

/** "5 lecții · Lecție individuală, 60 de minute" or "Card valoric: 200 de lei". */
export function describeGiftCard(card: GiftCardValue, locale: string): string {
  if (card.amountRon !== null) {
    return locale === "en"
      ? `Gift card worth ${card.amountRon} lei`
      : `Card valoric: ${roCount(card.amountRon, "un leu", "lei")}`;
  }
  const lessons = card.lessons ?? 1;
  const name = card.lessonName ?? (locale === "en" ? "Tennis lesson" : "Lecție de tenis");
  const duration = card.durationMin
    ? locale === "en"
      ? `, ${card.durationMin} minutes`
      : `, ${roCount(card.durationMin, "un minut", "minute")}`
    : "";
  const count =
    locale === "en"
      ? `${lessons} ${lessons === 1 ? "lesson" : "lessons"}`
      : roCount(lessons, "o lecție", "lecții");
  return `${count} · ${name}${duration}`;
}

/**
 * The price of a lesson card from the lesson's hourly rate (proportional to the duration), or
 * null when the club has not set a rate yet; the price of a value card is its value.
 */
export function giftCardPrice(options: {
  amountRon: number | null;
  hourlyRate: string | number | null;
  durationMin: number | null;
  lessons: number | null;
}): number | null {
  if (options.amountRon !== null) return options.amountRon;
  const rate = options.hourlyRate === null ? Number.NaN : Number(options.hourlyRate);
  if (!Number.isFinite(rate) || rate <= 0 || !options.durationMin) return null;
  return Math.round(((rate * options.durationMin) / 60) * (options.lessons ?? 1));
}

/** Activation date + the validity, as a calendar date. */
export function giftExpiry(activatedAt: Date, months = GIFT_VALID_MONTHS): Date {
  const date = new Date(
    Date.UTC(activatedAt.getUTCFullYear(), activatedAt.getUTCMonth(), activatedAt.getUTCDate()),
  );
  date.setUTCMonth(date.getUTCMonth() + months);
  return date;
}

export type GiftCardState = "usable" | "used" | "expired" | "inactive";

/** Whether a card can pay for a booking now. */
export function giftCardState(
  card: { status: string; expiresAt: Date | null; bookingId: string | null },
  now = new Date(),
): GiftCardState {
  if (card.status === "FOLOSITA" || card.bookingId) return "used";
  if (card.status !== "ACTIVA") return "inactive";
  if (card.expiresAt && card.expiresAt.getTime() + 24 * 3_600_000 <= now.getTime())
    return "expired";
  return "usable";
}
