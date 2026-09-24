import { formatInTimeZone } from "date-fns-tz";
import { enGB, ro } from "date-fns/locale";
import type { Locale } from "@/i18n/routing";
import { TODO_MARK } from "./i18n-content";

export function dateLocale(locale: Locale | string) {
  return locale === "en" ? enGB : ro;
}

/** "250 lei" / "RON 250"; the missing-price marker when the coach has not set it. */
export function formatPrice(value: string | number | null | undefined, currency: string, locale: Locale | string): string {
  if (value === null || value === undefined || value === "") return TODO_MARK;
  const amount = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(amount)) return TODO_MARK;
  const formatted = new Intl.NumberFormat(locale === "en" ? "en-GB" : "ro-RO", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  if (currency === "RON") return locale === "en" ? `RON ${formatted}` : `${formatted} lei`;
  return `${formatted} ${currency}`;
}

export function formatDate(instant: Date | string, timezone: string, locale: Locale | string, pattern = "EEEE, d MMMM"): string {
  return formatInTimeZone(new Date(instant), timezone, pattern, { locale: dateLocale(locale) });
}

export function formatTime(instant: Date | string, timezone: string): string {
  return formatInTimeZone(new Date(instant), timezone, "HH:mm");
}

export function formatMonth(instant: Date, timezone: string, locale: Locale | string): string {
  return formatInTimeZone(instant, timezone, "LLLL", { locale: dateLocale(locale) });
}

/** "+40 7xx…" → "40712345678" for wa.me links; null when not a usable number. */
export function whatsappDigits(value: string | null | undefined): string | null {
  if (!value || value.includes(TODO_MARK)) return null;
  const digits = value.replace(/[^\d]/g, "");
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
