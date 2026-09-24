"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit, diffOf } from "@/lib/audit";
import { eraseClient } from "@/lib/gdpr";
import { addDaysToKey, localDateKey } from "@/lib/availability";
import type { FormState } from "@/lib/validation";

const clientSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Scrie numele (cel puțin 2 litere).").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .refine(
      (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Adresa de email nu pare corectă.",
    ),
  phone: z.string().trim().max(40),
  notes: z.string().max(4000),
  sessionsRemaining: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (/^\d+$/.test(v) && Number(v) <= 500),
      "Scrie un număr întreg (sau lasă gol).",
    ),
  packageValidUntil: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Alege o dată din calendar."),
});

export async function saveClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const raw = Object.fromEntries(
    ["id", "name", "email", "phone", "notes", "sessionsRemaining", "packageValidUntil"].map((k) => [
      k,
      String(formData.get(k) ?? ""),
    ]),
  );
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "error", fieldErrors, error: "Unele câmpuri nu sunt completate corect." };
  }
  const d = parsed.data;
  const before = await db.client.findUnique({ where: { id: d.id } });
  if (!before) return { status: "error", error: "Clientul nu mai există." };
  try {
    const after = await db.client.update({
      where: { id: d.id },
      data: {
        name: d.name,
        email: d.email || null,
        phone: d.phone || null,
        notes: d.notes.trim() || null,
        sessionsRemaining: d.sessionsRemaining === "" ? null : Number(d.sessionsRemaining),
        packageValidUntil: d.packageValidUntil
          ? new Date(`${d.packageValidUntil}T00:00:00Z`)
          : null,
      },
    });
    await audit(user.id, "client.modificare", "Client", d.id, diffOf(before, after));
  } catch {
    return {
      status: "error",
      fieldErrors: { email: "Există deja un client cu această adresă de email." },
      error: "Unele câmpuri nu sunt completate corect.",
    };
  }
  revalidatePath(`/admin/clienti/${d.id}`);
  return { status: "success" };
}

/** Sells a package: the client gets its number of lessons and its validity from today. */
export async function activatePackageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const id = String(formData.get("id") ?? "");
  const planId = String(formData.get("planId") ?? "");
  const plan = await db.pricingPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isPackage) return { status: "error", error: "Alege un pachet din listă." };
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { timezone: true },
  });
  const today = localDateKey(new Date(), settings.timezone);
  await db.client.update({
    where: { id },
    data: {
      activePlanId: plan.id,
      sessionsRemaining: plan.sessions,
      packageValidUntil: plan.validityDays
        ? new Date(`${addDaysToKey(today, plan.validityDays)}T00:00:00Z`)
        : null,
    },
  });
  await audit(user.id, "client.pachet", "Client", id, { planId: plan.id, sessions: plan.sessions });
  revalidatePath(`/admin/clienti/${id}`);
  return { status: "success" };
}

export async function eraseClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const id = String(formData.get("id") ?? "");
  const result = await eraseClient(id);
  if (!result.ok) return { status: "error", error: result.error };
  await audit(user.id, "client.stergere-gdpr", "Client", id, result.counts);
  revalidatePath("/admin", "layout");
  redirect("/admin/clienti?sters=1");
}
