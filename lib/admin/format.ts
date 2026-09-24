import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import { ro } from "date-fns/locale";
import { t } from "../i18n-content";
import { telLink, whatsappLink } from "../format";

export const TZ_FALLBACK = "Europe/Bucharest";

export function when(start: Date, end: Date, tz: string, withDate = true): string {
  const time = `${formatInTimeZone(start, tz, "HH:mm")}–${formatInTimeZone(end, tz, "HH:mm")}`;
  return withDate ? `${formatInTimeZone(start, tz, "EEE d MMM", { locale: ro })}, ${time}` : time;
}

export function dayLabel(date: Date, tz: string): string {
  return formatInTimeZone(date, tz, "EEEE, d MMMM", { locale: ro });
}

type BookingLike = {
  code: string;
  name: string;
  phone: string;
  email: string;
  startsAt: Date;
  endsAt: Date;
  forMinor: boolean;
  childFirstName: string | null;
  childAge: number | null;
  program: { name: unknown };
};

export function bookingContacts(b: BookingLike, tz: string) {
  const text = `Bună, ${b.name}! Vă scriu legat de rezervarea ${b.code} (${when(b.startsAt, b.endsAt, tz)}).`;
  return {
    tel: telLink(b.phone),
    whatsapp: whatsappLink(b.phone, text),
    mail: b.email.endsWith(".invalid") ? null : `mailto:${b.email}`,
  };
}

export function bookingTitle(b: BookingLike): string {
  const child =
    b.forMinor && b.childFirstName
      ? ` · ${b.childFirstName}${b.childAge ? `, ${b.childAge} ani` : ""}`
      : "";
  return `${b.name}${child}`;
}

export function programName(b: { program: { name: unknown } }): string {
  return t(b.program.name, "ro");
}

/** "Lecție individuală, 90 min · Inițiere": what was booked, for lists and the day view. */
export function lessonLine(b: {
  program: { name: unknown };
  lessonType?: { name: unknown } | null;
  durationMin: number;
}): string {
  const lesson = b.lessonType ? `${t(b.lessonType.name, "ro")}, ` : "";
  return `${lesson}${b.durationMin} min · ${t(b.program.name, "ro")}`;
}

/** Monday 00:00 → next Monday 00:00 (local), as UTC instants, for the week containing `date`. */
export function weekKeys(dateKey: string): string[] {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const weekday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - weekday);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() + i);
    return x.toISOString().slice(0, 10);
  });
}

export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Neutralise spreadsheet formulas (=, +, -, @) and quote everything.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Romanian plural with the "de" rule: 1 client, 5 clienți, 20 de clienți, 101 clienți. */
export function countLabel(n: number, one: string, many: string): string {
  if (n === 1) return `1 ${one}`;
  const rest = n % 100;
  return n === 0 || (rest >= 1 && rest <= 19) ? `${n} ${many}` : `${n} de ${many}`;
}
