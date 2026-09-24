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
    select: { timezone: true, minNoticeHours: true, horizonDays: true, bufferMinutes: true, slotStepMinutes: true },
  });
  return settings;
}

/**
 * Loads everything the engine needs for the window [today − 1 day, today + horizon + 1 day].
 * Pass a transaction client to read inside the booking transaction.
 */
export async function loadEngineInput(
  now = new Date(),
  client: Pick<typeof db, "siteSettings" | "availabilityRule" | "availabilityException" | "booking" | "groupSchedule"> = db,
): Promise<EngineInput> {
  const settings = await client.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { timezone: true, minNoticeHours: true, horizonDays: true, bufferMinutes: true, slotStepMinutes: true },
  });
  const todayKey = localDateKey(now, settings.timezone);
  const fromDate = new Date(`${addDaysToKey(todayKey, -1)}T00:00:00Z`);
  const toDate = new Date(`${addDaysToKey(todayKey, settings.horizonDays + 2)}T00:00:00Z`);

  const [rules, exceptions, bookings, groupSchedules] = await Promise.all([
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
      select: { startsAt: true, blockedUntil: true, groupScheduleId: true, participants: true },
    }),
    client.groupSchedule.findMany({
      select: {
        id: true,
        programId: true,
        weekday: true,
        startTime: true,
        durationMin: true,
        capacity: true,
        membersCount: true,
        seasonFrom: true,
        seasonTo: true,
        active: true,
      },
    }),
  ]);

  return {
    settings,
    rules,
    exceptions,
    bookings: bookings.filter((b) => !b.groupScheduleId).map((b) => ({ startsAt: b.startsAt, blockedUntil: b.blockedUntil })),
    groupSchedules,
    groupEnrollments: bookings
      .filter((b): b is typeof b & { groupScheduleId: string } => Boolean(b.groupScheduleId))
      .map((b) => ({ groupScheduleId: b.groupScheduleId, startsAt: b.startsAt, participants: b.participants })),
    now,
  };
}
