"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { FormState } from "@/lib/validation";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ora trebuie să fie de forma 08:30.");
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Alege o dată.");

function done(): FormState {
  revalidatePath("/admin/disponibilitate");
  return { status: "success" };
}

const ruleSchema = z
  .object({
    weekdays: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Alege cel puțin o zi."),
    startTime: time,
    endTime: time,
    validFrom: dateKey.optional().or(z.literal("")),
    validTo: dateKey.optional().or(z.literal("")),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "Ora de sfârșit trebuie să fie după ora de început.",
    path: ["endTime"],
  });

export async function addRuleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const parsed = ruleSchema.safeParse({
    weekdays: formData.getAll("weekday"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    validFrom: formData.get("validFrom") ?? "",
    validTo: formData.get("validTo") ?? "",
  });
  if (!parsed.success)
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Date invalide." };
  const location = await db.location.findFirst({ orderBy: { order: "asc" }, select: { id: true } });
  const { weekdays, startTime, endTime, validFrom, validTo } = parsed.data;
  for (const weekday of weekdays) {
    const rule = await db.availabilityRule.create({
      data: {
        weekday,
        startTime,
        endTime,
        locationId: location?.id ?? null,
        validFrom: validFrom ? new Date(`${validFrom}T00:00:00Z`) : null,
        validTo: validTo ? new Date(`${validTo}T00:00:00Z`) : null,
      },
    });
    await audit(user.id, "disponibilitate.regula.adaugata", "AvailabilityRule", rule.id, {
      weekday,
      startTime,
      endTime,
    });
  }
  return done();
}

export async function deleteRuleAction(formData: FormData): Promise<void> {
  const { user } = await requireAdmin("PROPRIETAR");
  const id = String(formData.get("id") ?? "");
  const rule = await db.availabilityRule.delete({ where: { id } }).catch(() => null);
  if (rule)
    await audit(user.id, "disponibilitate.regula.stearsa", "AvailabilityRule", id, {
      weekday: rule.weekday,
      startTime: rule.startTime,
      endTime: rule.endTime,
    });
  revalidatePath("/admin/disponibilitate");
}

const exceptionSchema = z
  .object({
    date: dateKey,
    dateTo: dateKey.optional().or(z.literal("")),
    allDay: z.boolean(),
    startTime: time.optional().or(z.literal("")),
    endTime: time.optional().or(z.literal("")),
    type: z.enum(["BLOCAT", "DISPONIBIL_EXTRA"]),
    reason: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.allDay || (v.startTime && v.endTime && v.startTime < v.endTime), {
    message:
      "Pentru un interval, completează ora de început și de sfârșit (sfârșitul după început).",
    path: ["endTime"],
  })
  .refine((v) => !v.dateTo || v.dateTo >= v.date, {
    message: "Data de sfârșit trebuie să fie după data de început.",
    path: ["dateTo"],
  });

/** Days off, holidays and extra hours; a range of dates adds one exception per day. */
export async function addExceptionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const parsed = exceptionSchema.safeParse({
    date: formData.get("date"),
    dateTo: formData.get("dateTo") ?? "",
    allDay: formData.get("allDay") === "on",
    startTime: formData.get("startTime") ?? "",
    endTime: formData.get("endTime") ?? "",
    type: formData.get("type"),
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success)
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Date invalide." };
  const v = parsed.data;
  const days: string[] = [];
  const cursor = new Date(`${v.date}T00:00:00Z`);
  const last = new Date(`${v.dateTo || v.date}T00:00:00Z`);
  while (cursor <= last && days.length < 120) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  for (const day of days) {
    const exception = await db.availabilityException.create({
      data: {
        date: new Date(`${day}T00:00:00Z`),
        startTime: v.allDay ? null : v.startTime || null,
        endTime: v.allDay ? null : v.endTime || null,
        type: v.type,
        reason: v.reason || null,
      },
    });
    await audit(
      user.id,
      "disponibilitate.exceptie.adaugata",
      "AvailabilityException",
      exception.id,
      { day, type: v.type },
    );
  }
  return done();
}

export async function deleteExceptionAction(formData: FormData): Promise<void> {
  const { user } = await requireAdmin("PROPRIETAR");
  const id = String(formData.get("id") ?? "");
  const removed = await db.availabilityException.delete({ where: { id } }).catch(() => null);
  if (removed)
    await audit(user.id, "disponibilitate.exceptie.stearsa", "AvailabilityException", id);
  revalidatePath("/admin/disponibilitate");
}
