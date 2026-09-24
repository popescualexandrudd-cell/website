"use server";

import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n-content";
import { exclusiveSlots, groupSlots, localDateKey, addDaysToKey } from "@/lib/availability";
import { loadEngineInput } from "@/lib/availability-data";
import { cancelByClient, createBooking } from "@/lib/booking";
import { formatDate, formatTime } from "@/lib/format";
import { getPolicyVersion } from "@/lib/content";
import { isChildrenProgram } from "@/lib/programs";
import { getClientIp } from "@/lib/request";
import { allowFormSubmission, rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { deliverEmails } from "@/lib/email/send";
import { queueCancellationEmails, queueNewBookingEmails } from "@/lib/email/messages";
import { fields, formDataToObject, zodFieldErrors, type FormState } from "@/lib/validation";
import { urls } from "@/lib/paths";
import { audit } from "@/lib/audit";

export type SlotOption = { start: string; label: string };
export type DayOption = { date: string; label: string; slots: SlotOption[] };
export type SessionOption = {
  groupScheduleId: string;
  start: string;
  dateLabel: string;
  timeLabel: string;
  spotsLeft: number;
};
export type AvailabilityResult =
  | { kind: "exclusive"; days: DayOption[]; horizonDays: number; hasMore: boolean }
  | { kind: "group"; sessions: SessionOption[]; horizonDays: number }
  | { kind: "none" };

const availabilitySchema = z.object({
  programId: z.string().min(1).max(40),
  locale: z.enum(["ro", "en"]).catch("ro"),
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  days: z.number().int().min(1).max(60).optional(),
});

/** Free times for a programme, formatted for the booking flow. */
export async function fetchAvailability(raw: {
  programId: string;
  locale: string;
  fromDate?: string;
  days?: number;
}): Promise<AvailabilityResult> {
  const parsed = availabilitySchema.safeParse(raw);
  if (!parsed.success) return { kind: "none" };
  const ip = await getClientIp();
  if (!(await rateLimit(`availability:${ip}`, 120, 60))) return { kind: "none" };
  const { programId, locale, fromDate, days } = parsed.data;
  const program = await db.program.findUnique({ where: { id: programId } });
  if (!program || !program.active || !program.bookableOnline) return { kind: "none" };

  const engine = await loadEngineInput();
  const tz = engine.settings.timezone;
  const dateLabel = (d: Date) =>
    formatDate(d, tz, locale, locale === "en" ? "EEEE d MMMM" : "EEEE, d MMMM");

  if (program.format === "GRUPA") {
    const sessions = groupSlots(engine, program.id).slice(0, 24);
    return {
      kind: "group",
      horizonDays: engine.settings.horizonDays,
      sessions: sessions.map((s) => ({
        groupScheduleId: s.groupScheduleId,
        start: s.start.toISOString(),
        dateLabel: dateLabel(s.start),
        timeLabel: `${formatTime(s.start, tz)}–${formatTime(s.end, tz)}`,
        spotsLeft: s.spotsLeft,
      })),
    };
  }
  if (program.format !== "INDIVIDUAL" && program.format !== "SEMI_PRIVAT") return { kind: "none" };

  const limitDays = days ?? 7;
  const all = exclusiveSlots(engine, program.durationMin ?? 60, {
    fromKey: fromDate,
    limitDays: limitDays + 1,
  });
  const visible = all.slice(0, limitDays);
  return {
    kind: "exclusive",
    horizonDays: engine.settings.horizonDays,
    hasMore: all.length > limitDays,
    days: visible.map((day) => ({
      date: day.date,
      label: dateLabel(day.slots[0]?.start ?? new Date(`${day.date}T12:00:00Z`)),
      slots: day.slots.map((slot) => ({
        start: slot.start.toISOString(),
        label: formatTime(slot.start, tz),
      })),
    })),
  };
}

/** The next day key after the last one shown, for "More days". */
export async function nextDayKey(date: string): Promise<string> {
  return addDaysToKey(date, 1);
}

const bookingSchema = z
  .object({
    programId: z.string().min(1).max(40),
    startsAt: z.string().datetime({ offset: true }),
    groupScheduleId: z
      .string()
      .max(40)
      .optional()
      .transform((value) => (value ? value : null)),
    name: fields.name,
    email: fields.email,
    phone: fields.phone,
    participants: z.coerce.number().int().min(1).max(10).catch(1),
    declaredLevel: z
      .enum(["INCEPATOR", "INTERMEDIAR", "AVANSAT", "COMPETITIE"])
      .optional()
      .catch(undefined),
    message: fields.optionalText(2000),
    childFirstName: z
      .string()
      .trim()
      .max(60)
      .optional()
      .transform((value) => (value ? value : null)),
    childAge: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? Number.parseInt(value, 10) : null)),
    consent: fields.consent,
    locale: fields.locale,
  })
  .superRefine((data, ctx) => {
    if (
      data.childAge !== null &&
      (!Number.isInteger(data.childAge) || data.childAge < 3 || data.childAge > 17)
    ) {
      ctx.addIssue({ code: "custom", path: ["childAge"], message: "childAge" });
    }
  });

export async function submitBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  if (raw.website) return { status: "success", data: { code: "—" } };
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: zodFieldErrors(parsed.error) };
  const data = parsed.data;

  const program = await db.program.findUnique({ where: { id: data.programId } });
  if (!program) return { status: "error", error: "program" };
  const minor = isChildrenProgram(program);
  if (minor) {
    const errors: Record<string, string> = {};
    if (!data.childFirstName) errors.childFirstName = "childFirstName";
    if (data.childAge === null) errors.childAge = "childAge";
    if (Object.keys(errors).length > 0) return { status: "error", fieldErrors: errors };
  }

  const ip = await getClientIp();
  if (!(await verifyTurnstile(raw["cf-turnstile-response"], ip)))
    return { status: "error", error: "captcha" };
  if (!(await allowFormSubmission("booking", ip, data.email)))
    return { status: "error", error: "rateLimit" };

  try {
    const result = await createBooking({
      programId: data.programId,
      startsAt: new Date(data.startsAt),
      groupScheduleId: data.groupScheduleId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      participants: data.participants,
      declaredLevel: data.declaredLevel ?? null,
      message: data.message,
      forMinor: minor,
      parentName: minor ? data.name : null,
      childFirstName: data.childFirstName,
      childAge: data.childAge,
      locale: data.locale,
      source: "SITE",
      policyVersion: await getPolicyVersion(),
    });
    if (!result.ok) {
      const map: Record<string, string> = {
        conflict: "conflict",
        unavailable: "unavailable",
        sessionFull: "sessionFull",
        participants: "participants",
        program: "program",
        minor: "childFirstName",
      };
      return { status: "error", error: map[result.error] ?? "server" };
    }
    const ids = await queueNewBookingEmails(result.bookingId);
    after(async () => {
      await deliverEmails(ids);
    });
    return {
      status: "success",
      data: {
        code: result.code,
        bookingStatus: result.status,
        kind: program.format === "GRUPA" ? "group" : "lesson",
        manageUrl: urls.manageBooking(result.manageToken, data.locale),
        programName: t(program.name, data.locale),
      },
    };
  } catch (error) {
    console.error("submitBooking", error);
    return { status: "error", error: "server" };
  }
}

const cancelSchema = z.object({
  token: z.string().min(20).max(200),
  reason: fields.optionalText(500),
});

export async function cancelBookingByToken(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = cancelSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { status: "error", error: "notFound" };
  const ip = await getClientIp();
  if (!(await rateLimit(`cancel:${ip}`, 20, 15 * 60)))
    return { status: "error", error: "rateLimit" };
  const result = await cancelByClient(parsed.data.token, parsed.data.reason);
  if (!result.ok) return { status: "error", error: result.error };
  await audit(null, "rezervare.anulata-client", "Booking", result.bookingId);
  const ids = await queueCancellationEmails(
    result.bookingId,
    "client",
    parsed.data.reason ?? undefined,
  );
  after(async () => {
    await deliverEmails(ids);
  });
  return { status: "success" };
}

/** Today's key in the business time zone (used to show "today"/"tomorrow"). */
export async function todayKey(): Promise<string> {
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { timezone: true },
  });
  return localDateKey(new Date(), settings.timezone);
}
