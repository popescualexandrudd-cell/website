/**
 * Lesson prices. Pure functions without dependencies, so the booking flow can use them in the
 * browser: a lesson type has an hourly rate, and the price of a booking follows from the chosen
 * duration (and, for per-person rates, the number of participants).
 */

/** Price of a lesson of `durationMin` at an hourly rate, rounded to whole units. */
export function lessonPrice(
  hourlyRate: string | number | null,
  durationMin: number,
  persons = 1,
): number | null {
  if (hourlyRate === null || hourlyRate === "") return null;
  const rate = typeof hourlyRate === "number" ? hourlyRate : Number(hourlyRate);
  const value = ((rate * durationMin) / 60) * Math.max(1, persons);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

/** "250 lei" in Romanian, "RON 250" in English; other currencies keep their code after the amount. */
export function formatAmount(amount: number, currency: string, locale: string): string {
  const formatted = new Intl.NumberFormat(locale === "en" ? "en-GB" : "ro-RO", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  if (currency === "RON") return locale === "en" ? `RON ${formatted}` : `${formatted} lei`;
  return `${formatted} ${currency}`;
}

/** "60 min", "1 h 30 min", "2 h": short labels for tables and summaries. */
export function durationLabel(minutes: number): string {
  if (minutes <= 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
