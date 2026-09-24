import "server-only";
import { db } from "./db";
import {
  addDaysToKey,
  localDateKey,
  type AvailabilitySettings,
  type EngineInput,
} from "./availability";

export const ACTIVE_STATUSES = ["IN_ASTEPTARE", "CONFIRMATA"] as const;

export async function loadAvailabilitySettings(): Promise<AvailabilitySettings> {
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: {
      timezone: true,
      minNoticeHours: true,
      horizonDays: true,
      bufferMinutes: true,
      slotStepMinutes: true,
    },
  });
  return settings;
}

/**
 * Loads everything the engine needs for the window [today − 1 day, today + horizon + 1 day].
 * Pass a transaction client to read inside the booking transaction.
 */
export async function loadEngineInput(
  now = new Date(),
  client: Pick<
    typeof db,
    "siteSettings" | "availabilityRule" | "availabilityException" | "booking"
  > = db,
): Promise<EngineInput> {
  const settings = await client.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: {
      timezone: true,
      minNoticeHours: true,
      horizonDays: true,
      bufferMinutes: true,
      slotStepMinutes: true,
    },
  });
  const todayKey = localDateKey(now, settings.timezone);
  const fromDate = new Date(`${addDaysToKey(todayKey, -1)}T00:00:00Z`);
  const toDate = new Date(`${addDaysToKey(todayKey, settings.horizonDays + 2)}T00:00:00Z`);

  const [rules, exceptions, bookings] = await Promise.all([
    client.availabilityRule.findMany({
      select: { weekday: true, startTime: true, endTime: true, validFrom: true, validTo: true },
    }),
    client.availabilityException.findMany({
      where: { date: { gte: fromDate, lte: toDate } },
      select: { date: true, startTime: true, endTime: true, type: true },
    }),
    client.booking.findMany({
      where: {
        status: { in: [...ACTIVE_STATUSES] },
        startsAt: { lt: toDate },
        blockedUntil: { gt: fromDate },
      },
      select: { startsAt: true, blockedUntil: true },
    }),
  ]);

  return {
    settings,
    rules,
    exceptions,
    bookings,
    now,
  };
}
