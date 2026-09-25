import { createElement } from "react";
import { db } from "../db";
import { t } from "../i18n-content";
import { formatDate, formatTime, roCount, whatsappLink } from "../format";
import { buildIcs } from "../ics";
import { deriveToken, signPayload } from "../tokens";
import { urls } from "../paths";
import { queueEmail } from "./send";
import {
  ClientBookingEmail,
  CoachBookingEmail,
  SimpleEmail,
  type BookingDetails,
  type ClientBookingKind,
} from "@/emails/templates";
import { coachStrings, strings, type EmailLang } from "@/emails/strings";

const LEVEL_LABELS: Record<string, string> = {
  INCEPATOR: "începător",
  INTERMEDIAR: "a mai jucat",
  AVANSAT: "joacă constant",
  COMPETITIE: "joacă competiții",
  TOATE: "—",
};

export async function loadBookingForEmail(id: string) {
  return db.booking.findUniqueOrThrow({
    where: { id },
    include: { program: true, lessonType: true, location: true },
  });
}
type BookingForEmail = Awaited<ReturnType<typeof loadBookingForEmail>>;

async function context() {
  const settings = await db.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
  const coachEmail =
    process.env.COACH_NOTIFY_EMAIL?.trim() ||
    (settings.email.includes("@") ? settings.email : null);
  return { settings, coachEmail, ornamentUrl: urls.asset("/email/minge.png") };
}

function lang(locale: string): EmailLang {
  return locale === "en" ? "en" : "ro";
}

export function manageToken(bookingId: string): string {
  return deriveToken("booking-manage", bookingId);
}

export function reviewToken(bookingId: string): string {
  return deriveToken("booking-review", bookingId);
}

function describe(booking: BookingForEmail, l: EmailLang, timezone: string): BookingDetails {
  const date = formatDate(
    booking.startsAt,
    timezone,
    l,
    l === "en" ? "EEEE d MMMM yyyy" : "EEEE, d MMMM yyyy",
  );
  const when = `${date}, ${formatTime(booking.startsAt, timezone)}–${formatTime(booking.endsAt, timezone)}`;
  const where = booking.location ? `${booking.location.name}, ${booking.location.address}` : "—";
  const minutes =
    l === "en"
      ? `${booking.durationMin} minutes`
      : roCount(booking.durationMin, "un minut", "minute");
  return {
    code: booking.code,
    program: t(booking.program.name, l),
    lesson: booking.lessonType ? `${t(booking.lessonType.name, l)}, ${minutes}` : minutes,
    when,
    where,
    participants: booking.participants,
    clientName: booking.forMinor && booking.parentName ? booking.parentName : booking.name,
    childLine:
      booking.forMinor && booking.childFirstName
        ? `${booking.childFirstName}${booking.childAge ? `, ${booking.childAge} ${l === "en" ? "years" : "ani"}` : ""}`
        : undefined,
  };
}

function icsFor(
  booking: BookingForEmail,
  brand: string,
  coachEmail: string | null,
  status: "CONFIRMED" | "CANCELLED" = "CONFIRMED",
) {
  const l = lang(booking.locale);
  const ics = buildIcs({
    uid: `${booking.code}@${new URL(urls.home("ro")).host}`,
    start: booking.startsAt,
    end: booking.endsAt,
    summary: `${booking.lessonType ? t(booking.lessonType.name, l) : t(booking.program.name, l)} · ${brand}`,
    description: `${strings[l].details.code}: ${booking.code}\n${urls.manageBooking(manageToken(booking.id), booking.locale)}`,
    location: booking.location
      ? `${booking.location.name}, ${booking.location.address}`
      : undefined,
    url: urls.manageBooking(manageToken(booking.id), booking.locale),
    organizerName: brand,
    organizerEmail: coachEmail ?? undefined,
    status,
    sequence: status === "CANCELLED" ? 1 : 0,
  });
  return {
    filename: `lectie-${booking.code}.ics`,
    content: ics,
    contentType: "text/calendar; charset=utf-8",
  };
}

async function clientEmail(
  booking: BookingForEmail,
  kind: ClientBookingKind,
  reason?: string,
): Promise<string> {
  const { settings, coachEmail, ornamentUrl } = await context();
  const l = lang(booking.locale);
  const s = strings[l];
  const details = describe(booking, l, settings.timezone);
  const subject =
    kind === "request"
      ? s.requestReceived.subject(booking.code)
      : kind === "confirmed"
        ? s.confirmed.subject(booking.code)
        : kind === "reminder"
          ? s.reminder.subject(booking.code)
          : s.cancelledClient.subject(booking.code);
  const withCalendar = kind === "confirmed" || kind === "reminder";
  const cancelled = kind === "cancelledByClient" || kind === "cancelledByCoach";
  return queueEmail({
    to: booking.email,
    template: `booking-${kind}`,
    subject,
    bookingId: booking.id,
    replyTo: coachEmail ?? undefined,
    attachments: withCalendar
      ? [icsFor(booking, settings.brandName, coachEmail)]
      : cancelled
        ? [icsFor(booking, settings.brandName, coachEmail, "CANCELLED")]
        : undefined,
    element: createElement(ClientBookingEmail, {
      lang: l,
      brand: settings.brandName,
      ornamentUrl,
      kind,
      details,
      manageUrl: urls.manageBooking(manageToken(booking.id), booking.locale),
      bookAgainUrl: urls.booking(booking.locale),
      reason,
      freeCancelHours: settings.freeCancelHours,
    }),
  });
}

/** After a booking is created: the client's email and the coach's notification. */
export async function queueNewBookingEmails(bookingId: string): Promise<string[]> {
  const booking = await loadBookingForEmail(bookingId);
  const { settings, coachEmail, ornamentUrl } = await context();
  const ids: string[] = [];
  const instant = booking.status === "CONFIRMATA";
  ids.push(await clientEmail(booking, instant ? "confirmed" : "request"));

  if (coachEmail) {
    const details = describe(booking, "ro", settings.timezone);
    const contactName =
      booking.forMinor && booking.parentName ? `${booking.parentName} (părinte)` : booking.name;
    const whatsappText = `Bună, ${booking.forMinor && booking.parentName ? booking.parentName : booking.name}! Vă scriu legat de rezervarea ${booking.code} (${details.when}).`;
    ids.push(
      await queueEmail({
        to: coachEmail,
        template: "coach-new-booking",
        subject: coachStrings.newBooking.subject(booking.code, details.when),
        bookingId: booking.id,
        replyTo: booking.email,
        element: createElement(CoachBookingEmail, {
          lang: "ro",
          brand: settings.brandName,
          ornamentUrl,
          mode: instant ? "instant" : "request",
          details,
          contactLine: `${contactName} · ${booking.phone} · ${booking.email}`,
          message: booking.message ?? undefined,
          level: booking.declaredLevel ? LEVEL_LABELS[booking.declaredLevel] : undefined,
          confirmUrl: instant
            ? undefined
            : urls.adminAction(signPayload({ b: booking.id, a: "confirm" }, 7 * 24 * 3600)),
          declineUrl: instant
            ? undefined
            : urls.adminAction(signPayload({ b: booking.id, a: "decline" }, 7 * 24 * 3600)),
          whatsappUrl: whatsappLink(booking.phone, whatsappText),
          adminUrl: urls.adminBooking(booking.id),
        }),
      }),
    );
  }
  return ids;
}

export async function queueConfirmationEmail(bookingId: string): Promise<string[]> {
  return [await clientEmail(await loadBookingForEmail(bookingId), "confirmed")];
}

export async function queueReminderEmail(bookingId: string): Promise<string[]> {
  return [await clientEmail(await loadBookingForEmail(bookingId), "reminder")];
}

/** Cancellation: the client always hears about it; the coach too when the client cancelled. */
export async function queueCancellationEmails(
  bookingId: string,
  by: "client" | "coach",
  reason?: string,
): Promise<string[]> {
  const booking = await loadBookingForEmail(bookingId);
  const ids = [
    await clientEmail(booking, by === "client" ? "cancelledByClient" : "cancelledByCoach", reason),
  ];
  const { settings, coachEmail, ornamentUrl } = await context();
  if (by === "client" && coachEmail) {
    const details = describe(booking, "ro", settings.timezone);
    ids.push(
      await queueEmail({
        to: coachEmail,
        template: "coach-cancelled",
        subject: coachStrings.cancelled.subject(booking.code),
        bookingId: booking.id,
        element: createElement(CoachBookingEmail, {
          lang: "ro",
          brand: settings.brandName,
          ornamentUrl,
          mode: "cancelled",
          details,
          contactLine: `${booking.name} · ${booking.phone} · ${booking.email}`,
          reason,
          whatsappUrl: whatsappLink(booking.phone),
          adminUrl: urls.adminBooking(booking.id),
        }),
      }),
    );
  }
  return ids;
}

export async function queueReviewInvite(bookingId: string): Promise<string[]> {
  const booking = await loadBookingForEmail(bookingId);
  const { settings, coachEmail, ornamentUrl } = await context();
  const l = lang(booking.locale);
  const s = strings[l];
  const name = booking.forMinor && booking.parentName ? booking.parentName : booking.name;
  return [
    await queueEmail({
      to: booking.email,
      template: "review-invite",
      subject: s.review.subject,
      bookingId: booking.id,
      replyTo: coachEmail ?? undefined,
      element: createElement(SimpleEmail, {
        lang: l,
        brand: settings.brandName,
        ornamentUrl,
        preview: s.review.preview,
        title: s.review.title,
        paragraphs: [s.greeting(name), s.review.body],
        button: {
          href: urls.review(reviewToken(booking.id), booking.locale),
          label: s.review.button,
        },
      }),
    }),
  ];
}

export async function queueCoachNotification(
  kind: "contact" | "court" | "waitlist" | "evaluation" | "review",
  rows: [string, string][],
  name: string,
  replyTo?: string,
): Promise<string[]> {
  const { settings, coachEmail, ornamentUrl } = await context();
  if (!coachEmail) return [];
  const c = coachStrings[kind];
  const link =
    kind === "contact" || kind === "court"
      ? urls.adminMessages()
      : kind === "waitlist" || kind === "evaluation"
        ? urls.adminWaitlist()
        : urls.adminReviews();
  return [
    await queueEmail({
      to: coachEmail,
      template: `coach-${kind}`,
      subject: c.subject(name),
      replyTo,
      element: createElement(SimpleEmail, {
        lang: "ro",
        brand: settings.brandName,
        ornamentUrl,
        preview: c.title,
        title: c.title,
        paragraphs: [],
        rows,
        button: { href: link, label: c.open },
        footer: "Notificare automată de pe site.",
      }),
    }),
  ];
}

export async function queueNewsletterConfirmation(
  email: string,
  locale: string,
  confirmToken: string,
  unsubscribeToken: string,
): Promise<string[]> {
  const { settings, ornamentUrl } = await context();
  const l = lang(locale);
  const s = strings[l].newsletter;
  return [
    await queueEmail({
      to: email,
      template: "newsletter-confirm",
      subject: s.subject,
      element: createElement(SimpleEmail, {
        lang: l,
        brand: settings.brandName,
        ornamentUrl,
        preview: s.preview,
        title: s.title,
        paragraphs: [s.body],
        button: { href: urls.newsletter(`c.${confirmToken}`, locale), label: s.button },
        secondary: { href: urls.newsletter(`u.${unsubscribeToken}`, locale), label: s.unsubscribe },
      }),
    }),
  ];
}

export async function queueTestEmail(to: string): Promise<string[]> {
  const { settings, ornamentUrl } = await context();
  const s = strings.ro.test;
  return [
    await queueEmail({
      to,
      template: "test",
      subject: s.subject,
      element: createElement(SimpleEmail, {
        lang: "ro",
        brand: settings.brandName,
        ornamentUrl,
        preview: s.title,
        title: s.title,
        paragraphs: [s.body],
        footer: "Trimis din panoul de administrare.",
      }),
    }),
  ];
}
