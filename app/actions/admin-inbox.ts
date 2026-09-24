"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { backWith } from "@/lib/admin/redirect";
import type { FormState } from "@/lib/validation";

const MESSAGE_STATUSES = ["NOU", "CITIT", "ARHIVAT"] as const;
const WAITLIST_STATUSES = ["NOU", "CONTACTAT", "INSCRIS", "ARHIVAT"] as const;

function refresh() {
  revalidatePath("/admin", "layout");
}

export async function setMessageStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const valid = MESSAGE_STATUSES.find((s) => s === status);
  if (!valid) return { status: "error", error: "Stare necunoscută." };
  const updated = await db.contactMessage.updateMany({ where: { id }, data: { status: valid } });
  if (updated.count === 0) return { status: "error", error: "Mesajul nu mai există." };
  await audit(user.id, `mesaj.${valid.toLowerCase()}`, "ContactMessage", id);
  refresh();
  backWith(formData, "/admin/mesaje", valid.toLowerCase());
}

export async function deleteMessageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const id = String(formData.get("id") ?? "");
  await db.contactMessage.deleteMany({ where: { id } });
  await audit(user.id, "mesaj.stergere", "ContactMessage", id);
  refresh();
  backWith(formData, "/admin/mesaje", "sters");
}

export async function setWaitlistStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const valid = WAITLIST_STATUSES.find((s) => s === status);
  if (!valid) return { status: "error", error: "Stare necunoscută." };
  const updated = await db.waitlistEntry.updateMany({ where: { id }, data: { status: valid } });
  if (updated.count === 0) return { status: "error", error: "Cererea nu mai există." };
  await audit(user.id, `asteptare.${valid.toLowerCase()}`, "WaitlistEntry", id);
  refresh();
  backWith(formData, "/admin/lista-asteptare", valid.toLowerCase());
}

export async function deleteWaitlistAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const id = String(formData.get("id") ?? "");
  await db.waitlistEntry.deleteMany({ where: { id } });
  await audit(user.id, "asteptare.stergere", "WaitlistEntry", id);
  refresh();
  backWith(formData, "/admin/lista-asteptare", "sters");
}

export async function deleteSubscriberAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const id = String(formData.get("id") ?? "");
  await db.newsletterSubscriber.deleteMany({ where: { id } });
  await audit(user.id, "newsletter.stergere", "NewsletterSubscriber", id);
  refresh();
  backWith(formData, "/admin/newsletter", "sters");
}
