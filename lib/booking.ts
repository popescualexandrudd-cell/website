import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import {
  Prisma,
  type BookingSource,
  type BookingStatus,
  type Level,
} from "./generated/prisma/client";
import { isSlotAvailable } from "./availability";
import { loadEngineInput } from "./availability-data";
import { generateBookingCode, hashToken } from "./tokens";
import { manageToken } from "./email/messages";
import { releaseGiftCard } from "./gift-cards-server";
import type { Attribution } from "./attribution";

const MINUTE = 60_000;
/** Every booking creation takes this lock, so availability checks never race. */
const BOOKING_LOCK_KEY = 4_242_001;
/** Durations accepted from the admin (phone bookings), in minutes. */
export const ADMIN_DURATION = { min: 15, max: 600 };

export type CreateBookingInput = {
  /** The training programme (Inițiere, Competiție, Amatori). */
  programId: string;
  lessonTypeId: string;
  durationMin: number;
  startsAt: Date;
  name: string;
  email: string;
  phone: string;
  participants: number;
  declaredLevel?: Level | null;
  message?: string | null;
  forMinor?: boolean;
  parentName?: string | null;
  childFirstName?: string | null;
  childAge?: number | null;
  locale: string;
  source: BookingSource;
  /** Where a visitor who booked on the site came from (campaign, search, social). */
  attribution?: Attribution | null;
  policyVersion: string;
  status?: BookingStatus;
  internalNotes?: string | null;
  courtId?: string | null;
};

export type CreateBookingError =
  "program" | "lessonType" | "duration" | "participants" | "unavailable" | "conflict" | "minor";
export type CreateBookingResult =
  | { ok: true; bookingId: string; code: string; status: BookingStatus; manageToken: string }
  | { ok: false; error: CreateBookingError };

class BookingRejected extends Error {
  constructor(readonly reason: CreateBookingError) {
    super(reason);
  }
}

/** Postgres raises 23P01 (exclusion_violation) when two active lessons would overlap. */
export function isOverlapError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = JSON.stringify(error.meta ?? {});
    return (
      error.code === "P2004" ||
      meta.includes("23P01") ||
      meta.includes("Booking_no_overlap") ||
      error.message.includes("Booking_no_overlap")
    );
  }
  const text =
    error instanceof Error
      ? `${error.message} ${String((error as { cause?: unknown }).cause ?? "")}`
      : String(error);
  return (
    text.includes("23P01") ||
    text.includes("Booking_no_overlap") ||
    text.includes("exclusion constraint")
  );
}

/**
 * Creates a booking inside one transaction: takes the advisory lock, re-checks the slot against
 * fresh data, then inserts. The exclusion constraint in Postgres is the final guard: even if two
 * processes slipped past the checks, only one exclusive lesson can hold a time range.
 * Public bookings must respect notice, horizon and opening hours; admin bookings (phone
 * bookings) only need to be free of conflicts.
 */
export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const id = randomUUID();
  const token = manageToken(id);
  try {
    const booking = await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOKING_LOCK_KEY}::bigint)`;
        const settings = await tx.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
        const isAdmin = input.source !== "SITE";
        const program = await tx.program.findUnique({ where: { id: input.programId } });
        if (!program || (!isAdmin && (!program.active || !program.bookableOnline)))
          throw new BookingRejected("program");
        const lessonType = await tx.lessonType.findUnique({ where: { id: input.lessonTypeId } });
        if (!lessonType || (!isAdmin && (!lessonType.active || !lessonType.bookableOnline)))
          throw new BookingRejected("lessonType");

        const durationMin = input.durationMin;
        const durationOk = isAdmin
          ? Number.isInteger(durationMin) &&
            durationMin >= ADMIN_DURATION.min &&
            durationMin <= ADMIN_DURATION.max
          : lessonType.durations.includes(durationMin);
        if (!durationOk) throw new BookingRejected("duration");

        if (
          !Number.isInteger(input.participants) ||
          input.participants < lessonType.minParticipants ||
          input.participants > lessonType.maxParticipants
        ) {
          throw new BookingRejected("participants");
        }
        const forMinor = Boolean(input.forMinor);
        if (forMinor && (!input.childFirstName || !input.childAge) && !isAdmin)
          throw new BookingRejected("minor");

        const engine = await loadEngineInput(new Date(), tx);
        if (isAdmin) {
          // Phone bookings may fall outside the published hours; they only must not overlap.
          const conflictEngine = {
            ...engine,
            settings: { ...engine.settings, minNoticeHours: -24 * 365, horizonDays: 3650 },
            rules: allDayRules(),
            exceptions: [],
          };
          if (!isSlotAvailable(conflictEngine, input.startsAt, durationMin))
            throw new BookingRejected("conflict");
        } else if (!isSlotAvailable(engine, input.startsAt, durationMin)) {
          throw new BookingRejected("unavailable");
        }

        const endsAt = new Date(input.startsAt.getTime() + durationMin * MINUTE);
        const blockedUntil = new Date(endsAt.getTime() + settings.bufferMinutes * MINUTE);
        const status: BookingStatus =
          input.status ??
          (settings.bookingMode === "INSTANT" || isAdmin ? "CONFIRMATA" : "IN_ASTEPTARE");

        const email = input.email.trim().toLowerCase();
        const clientName = forMinor && input.parentName ? input.parentName : input.name;
        // Phone bookings may have no email: then the client is matched by phone number.
        const noEmail = email.endsWith(".invalid");
        const byPhone = noEmail
          ? await tx.client.findFirst({ where: { phone: input.phone, anonymizedAt: null } })
          : null;
        const client = byPhone
          ? await tx.client.update({ where: { id: byPhone.id }, data: { name: clientName } })
          : noEmail
            ? await tx.client.create({
                data: { email: null, phone: input.phone, name: clientName },
              })
            : await tx.client.upsert({
                where: { email },
                update: { phone: input.phone, name: clientName },
                create: { email, phone: input.phone, name: clientName },
              });

        const location = await tx.location.findFirst({
          orderBy: { order: "asc" },
          select: { id: true },
        });
        let code = generateBookingCode();
        for (
          let attempt = 0;
          attempt < 5 && (await tx.booking.findUnique({ where: { code }, select: { id: true } }));
          attempt += 1
        ) {
          code = generateBookingCode();
        }

        return tx.booking.create({
          data: {
            id,
            code,
            programId: program.id,
            lessonTypeId: lessonType.id,
            durationMin,
            locationId: location?.id ?? null,
            courtId: input.courtId ?? null,
            clientId: client.id,
            startsAt: input.startsAt,
            endsAt,
            blockedUntil,
            status,
            name: forMinor && input.parentName ? input.parentName : input.name,
            email,
            phone: input.phone,
            participants: input.participants,
            declaredLevel: input.declaredLevel ?? null,
            message: input.message ?? null,
            forMinor,
            parentName: forMinor ? (input.parentName ?? input.name) : null,
            childFirstName: forMinor ? (input.childFirstName ?? null) : null,
            childAge: forMinor ? (input.childAge ?? null) : null,
            gdprConsent: true,
            gdprConsentAt: new Date(),
            policyVersion: input.policyVersion,
            cancelTokenHash: hashToken(token),
            source: input.source,
            attribution: input.attribution ?? undefined,
            internalNotes: input.internalNotes ?? null,
            locale: input.locale === "en" ? "en" : "ro",
            confirmedAt: status === "CONFIRMATA" ? new Date() : null,
          },
        });
      },
      { timeout: 15_000, maxWait: 10_000 },
    );
    return {
      ok: true,
      bookingId: booking.id,
      code: booking.code,
      status: booking.status,
      manageToken: token,
    };
  } catch (error) {
    if (error instanceof BookingRejected) return { ok: false, error: error.reason };
    if (isOverlapError(error)) return { ok: false, error: "conflict" };
    throw error;
  }
}

function allDayRules() {
  return [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
    weekday,
    startTime: "00:00",
    endTime: "23:59",
  }));
}

export async function findBookingByToken(token: string) {
  if (!token || token.length < 20 || token.length > 200) return null;
  return db.booking.findUnique({
    where: { cancelTokenHash: hashToken(token) },
    include: { program: true, lessonType: true, location: true },
  });
}

export type CancelResult =
  { ok: true; bookingId: string } | { ok: false; error: "notFound" | "tooLate" | "notActive" };

/** Client cancellation through the link: allowed until the free-cancellation limit. */
export async function cancelByClient(
  token: string,
  reason: string | null,
  now = new Date(),
): Promise<CancelResult> {
  const booking = await findBookingByToken(token);
  if (!booking) return { ok: false, error: "notFound" };
  if (booking.status !== "IN_ASTEPTARE" && booking.status !== "CONFIRMATA")
    return { ok: false, error: "notActive" };
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { freeCancelHours: true },
  });
  if (!canCancelFree(booking.startsAt, settings.freeCancelHours, now))
    return { ok: false, error: "tooLate" };
  const updated = await db.booking.updateMany({
    where: { id: booking.id, status: { in: ["IN_ASTEPTARE", "CONFIRMATA"] } },
    data: { status: "ANULATA_CLIENT", cancelledAt: now, cancelReason: reason },
  });
  if (updated.count === 0) return { ok: false, error: "notActive" };
  await releaseGiftCard(booking.id);
  return { ok: true, bookingId: booking.id };
}

export function cancelDeadline(startsAt: Date, freeCancelHours: number): Date {
  return new Date(startsAt.getTime() - freeCancelHours * 60 * MINUTE);
}

export function canCancelFree(startsAt: Date, freeCancelHours: number, now = new Date()): boolean {
  return now.getTime() <= cancelDeadline(startsAt, freeCancelHours).getTime();
}

export function hasStarted(startsAt: Date, now = new Date()): boolean {
  return startsAt.getTime() <= now.getTime();
}
