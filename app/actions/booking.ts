"use server";

import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n-content";
import { exclusiveSlots, localDateKey, addDaysToKey } from "@/lib/availability";
import { loadEngineInput } from "@/lib/availability-data";
import { cancelByClient, createBooking } from "@/lib/booking";
import { formatDate, formatTime } from "@/lib/format";
import { getPolicyVersion } from "@/lib/content";
import { parseAttributionField } from "@/lib/attribution";
import { getClientIp } from "@/lib/request";
import { allowFormSubmission, rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { deliverEmails } from "@/lib/email/send";
import { queueCancellationEmails, queueNewBookingEmails } from "@/lib/email/messages";
import { fields, formDataToObject, zodFieldErrors, type FormState } from "@/lib/validation";
import { urls } from "@/lib/paths";
import { audit } from "@/lib/audit";
import { findUsableGiftCard, redeemGiftCard } from "@/lib/gift-cards-server";

export type SlotOption = { start: string; label: string };
export type DayOption = { date: string; label: string; slots: SlotOption[] };
export type AvailabilityResult =
  { kind: "slots"; days: DayOption[]; horizonDays: number; hasMore: boolean } | { kind: "none" };

const availabilitySchema = z.object({
  lessonTypeId: z.string().min(1).max(40),
  durationMin: z.number().int().min(15).max(600),
  locale: z.enum(["ro", "en"]).catch("ro"),
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  days: z.number().int().min(1).max(60).optional(),
});

/** Free start times for a lesson type and duration, formatted for the booking flow. */
export async function fetchAvailability(raw: {
  lessonTypeId: string;
  durationMin: number;
  locale: string;
  fromDate?: string;
  days?: number;
}): Promise<AvailabilityResult> {
  const parsed = availabilitySchema.safeParse(raw);
  if (!parsed.success) return { kind: "none" };
  const ip = await getClientIp();
  if (!(await rateLimit(`availability:${ip}`, 120, 60))) return { kind: "none" };
  const { lessonTypeId, durationMin, locale, fromDate, days } = parsed.data;
  const lessonType = await db.lessonType.findUnique({ where: { id: lessonTypeId } });
  if (
    !lessonType ||
    !lessonType.active ||
    !lessonType.bookableOnline ||
    !lessonType.durations.includes(durationMin)
  )
    return { kind: "none" };

  const engine = await loadEngineInput();
  const tz = engine.settings.timezone;
  const dateLabel = (d: Date) =>
    formatDate(d, tz, locale, locale === "en" ? "EEEE d MMMM" : "EEEE, d MMMM");
  const limitDays = days ?? 7;
  const all = exclusiveSlots(engine, durationMin, { fromKey: fromDate, limitDays: limitDays + 1 });
  const visible = all.slice(0, limitDays);
  return {
    kind: "slots",
    horizonDays: engine.settings.horizonDays,
    hasMore: all.length > limitDays,
    days: visible.map((day) => ({
      date: day.date,
      label: dateLabel(day.slots[0]?.start ?? new Date(`${day.date}T12:00:00Z`)),
      slots: day.slots.map((slot) => ({
        start: slot.start.toISOString(),
        label: `${formatTime(slot.start, tz)}–${formatTime(slot.end, tz)}`,
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
    lessonTypeId: z.string().min(1).max(40),
    durationMin: z.coerce.number().int().min(15).max(600),
    startsAt: z.string().datetime({ offset: true }),
    forWhom: z.enum(["self", "child"]).catch("self"),
    name: fields.name,
    email: fields.email,
    phone: fields.phone,
    participants: z.coerce.number().int().min(1).max(20).catch(1),
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
    giftCode: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((value) => (value ? value : null)),
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

  const [program, lessonType] = await Promise.all([
    db.program.findUnique({ where: { id: data.programId } }),
    db.lessonType.findUnique({ where: { id: data.lessonTypeId } }),
  ]);
  if (!program) return { status: "error", error: "program" };
  if (!lessonType) return { status: "error", error: "lessonType" };
  const minor = data.forWhom === "child";
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
  // Checked after the rate limit, so codes cannot be guessed by trying many.
  const giftCard = data.giftCode ? await findUsableGiftCard(data.giftCode) : null;
  if (data.giftCode && !giftCard) return { status: "error", fieldErrors: { giftCode: "giftCode" } };

  try {
    const result = await createBooking({
      programId: data.programId,
      lessonTypeId: data.lessonTypeId,
      durationMin: data.durationMin,
      startsAt: new Date(data.startsAt),
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
      attribution: parseAttributionField(raw.attribution),
      policyVersion: await getPolicyVersion(),
    });
    if (!result.ok) {
      const map: Record<string, string> = {
        conflict: "conflict",
        unavailable: "unavailable",
        participants: "participants",
        program: "program",
        lessonType: "lessonType",
        duration: "duration",
        minor: "childFirstName",
      };
      return { status: "error", error: map[result.error] ?? "server" };
    }
    if (giftCard) await redeemGiftCard(giftCard.id, result.bookingId);
    const ids = await queueNewBookingEmails(result.bookingId);
    after(async () => {
      await deliverEmails(ids);
    });
    return {
      status: "success",
      data: {
        code: result.code,
        bookingStatus: result.status,
        email: data.email,
        manageUrl: urls.manageBooking(result.manageToken, data.locale),
        programName: t(program.name, data.locale),
        lessonName: t(lessonType.name, data.locale),
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
