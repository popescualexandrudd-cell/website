import { formatInTimeZone } from "date-fns-tz";
import { enGB, ro } from "date-fns/locale";
import type { Locale } from "@/i18n/routing";
import { TODO_MARK } from "./i18n-content";
import { formatAmount } from "./pricing";

export function dateLocale(locale: Locale | string) {
  return locale === "en" ? enGB : ro;
}

/** "250 lei" / "RON 250"; the missing-price marker when the coach has not set it. */
export function formatPrice(
  value: string | number | null | undefined,
  currency: string,
  locale: Locale | string,
): string {
  if (value === null || value === undefined || value === "") return TODO_MARK;
  const amount = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(amount)) return TODO_MARK;
  return formatAmount(amount, currency, locale);
}

export function formatDate(
  instant: Date | string,
  timezone: string,
  locale: Locale | string,
  pattern = "EEEE, d MMMM",
): string {
  return formatInTimeZone(new Date(instant), timezone, pattern, { locale: dateLocale(locale) });
}

export function formatTime(instant: Date | string, timezone: string): string {
  return formatInTimeZone(new Date(instant), timezone, "HH:mm");
}

export function formatMonth(instant: Date, timezone: string, locale: Locale | string): string {
  return formatInTimeZone(instant, timezone, "LLLL", { locale: dateLocale(locale) });
}

/**
 * "+40 7xx…", "0040 7xx…" or the local "07xx…" → "40712345678" for wa.me links, which need the
 * country code without a plus; null when not a usable number.
 */
export function whatsappDigits(value: string | null | undefined): string | null {
  if (!value || value.includes(TODO_MARK)) return null;
  let digits = value.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Romanian numbers written locally: 0722 123 456 → 40722123456.
  else if (digits.length === 10 && digits.startsWith("0")) digits = `40${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
}

export function whatsappLink(value: string | null | undefined, text?: string): string | null {
  const digits = whatsappDigits(value);
  if (!digits) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telLink(value: string | null | undefined): string | null {
  if (!value || value.includes(TODO_MARK)) return null;
  const cleaned = value.replace(/[^\d+]/g, "");
  return cleaned.length >= 8 ? `tel:${cleaned}` : null;
}

export function mailLink(value: string | null | undefined): string | null {
  if (!value || value.includes(TODO_MARK) || !value.includes("@")) return null;
  return `mailto:${value}`;
}

/**
 * A Romanian count with its noun: "o oră", "12 ore", "24 de ore". From 20 up (and at round
 * hundreds) Romanian puts "de" between the number and the noun.
 */
export function roCount(n: number, one: string, many: string): string {
  if (n === 1) return one;
  const rest = n % 100;
  return (rest === 0 && n !== 0) || rest >= 20 ? `${n} de ${many}` : `${n} ${many}`;
}
