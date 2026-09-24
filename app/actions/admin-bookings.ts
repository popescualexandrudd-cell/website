"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import {
  transitionBooking,
  deliverLater,
  type BookingTransition,
} from "@/lib/admin/booking-actions";
import { verifyPayload } from "@/lib/tokens";
import { ADMIN_DURATION, createBooking } from "@/lib/booking";
import { zonedInstant } from "@/lib/availability";
import { getPolicyVersion } from "@/lib/content";
import { queueConfirmationEmail } from "@/lib/email/messages";
import { backWith } from "@/lib/admin/redirect";
import type { FormState } from "@/lib/validation";

function refresh(id?: string) {
  revalidatePath("/admin", "layout");
  if (id) revalidatePath(`/admin/rezervari/${id}`);
}

export async function bookingTransitionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "") as BookingTransition;
  if (!["confirm", "decline", "cancel", "done", "noshow", "reopen"].includes(action))
    return { status: "error", error: "Acțiune necunoscută." };
  const reason = String(formData.get("reason") ?? "").slice(0, 500);
  const result = await transitionBooking(id, action, user.id, reason);
  if (!result.ok) return { status: "error", error: result.error };
  after(() => deliverLater(result.emailIds));
  refresh(id);
  if (formData.get("back")) backWith(formData, "/admin", `rezervare-${action}`);
  return { status: "success", data: { action } };
}

/** The confirm / decline buttons in the coach's email: a signed token, then one POST. */
export async function emailTokenAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const payload = verifyPayload(token);
  if (
    !payload ||
    typeof payload.b !== "string" ||
    (payload.a !== "confirm" && payload.a !== "decline")
  ) {
    return {
      status: "error",
      error: "Linkul a expirat sau nu este valid. Deschide rezervarea din panoul de administrare.",
    };
  }
  const reason = String(formData.get("reason") ?? "").slice(0, 500);
  const result = await transitionBooking(payload.b, payload.a, null, reason);
  if (!result.ok) return { status: "error", error: result.error };
  after(() => deliverLater(result.emailIds));
  return { status: "success", data: { action: payload.a } };
}

export async function saveBookingNotes(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("internalNotes") ?? "").slice(0, 4000);
  await db.booking.update({ where: { id }, data: { internalNotes: notes || null } });
  await audit(user.id, "rezervare.note", "Booking", id);
  refresh(id);
  return { status: "success" };
}

const manualSchema = z.object({
  programId: z.string().min(1),
  lessonTypeId: z.string().min(1),
  durationMin: z.coerce.number().int().min(ADMIN_DURATION.min).max(ADMIN_DURATION.max),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().max(200).optional(),
  phone: z.string().trim().min(6).max(40),
  participants: z.coerce.number().int().min(1).max(10),
  source: z.enum(["TELEFON", "WHATSAPP", "ADMIN"]),
  status: z.enum(["CONFIRMATA", "IN_ASTEPTARE"]),
  internalNotes: z.string().max(4000).optional(),
  childFirstName: z.string().trim().max(60).optional(),
  childAge: z.string().optional(),
  sendEmail: z.string().optional(),
});

/** A booking received by phone or WhatsApp, entered by the coach. */
export async function createManualBooking(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireAdmin("PROPRIETAR");
  const raw = Object.fromEntries(
    Array.from(formData.entries()).filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
  const parsed = manualSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues)
      fieldErrors[String(issue.path[0])] = "Verifică acest câmp.";
    return { status: "error", fieldErrors, error: "Unele câmpuri nu sunt completate corect." };
  }
  const data = parsed.data;
  const email =
    data.email && data.email.includes("@")
      ? data.email
      : `telefon-${Date.now()}@fara-email.invalid`;
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { timezone: true },
  });
  const result = await createBooking({
    programId: data.programId,
    lessonTypeId: data.lessonTypeId,
    durationMin: data.durationMin,
    startsAt: zonedInstant(data.date, data.time, settings.timezone),
    name: data.name,
    email,
    phone: data.phone,
    participants: data.participants,
    forMinor: Boolean(data.childFirstName),
    childFirstName: data.childFirstName || null,
    childAge: data.childAge ? Number.parseInt(data.childAge, 10) : null,
    parentName: data.childFirstName ? data.name : null,
    locale: "ro",
    source: data.source,
    status: data.status,
    internalNotes: data.internalNotes || null,
    policyVersion: await getPolicyVersion(),
  });
  if (!result.ok) {
    const messages: Record<string, string> = {
      conflict:
        "Intervalul se suprapune cu altă lecție (sau cu pauza dintre lecții). Alege altă oră.",
      unavailable: "Ora aleasă nu mai e liberă. Alege altă oră.",
      participants:
        "Numărul de participanți nu se potrivește cu tipul lecției (de exemplu, 2 pentru lecția în doi).",
      program: "Programul nu există.",
      lessonType: "Tipul de lecție nu există.",
      duration: `Durata trebuie să fie între ${ADMIN_DURATION.min} și ${ADMIN_DURATION.max} de minute.`,
      minor: "Pentru copii completează prenumele și vârsta copilului.",
    };
    return {
      status: "error",
      error: messages[result.error] ?? "Rezervarea nu a putut fi salvată.",
    };
  }
  await audit(user.id, "rezervare.manuala", "Booking", result.bookingId, { source: data.source });
  if (data.sendEmail === "on" && data.email && data.status === "CONFIRMATA") {
    const ids = await queueConfirmationEmail(result.bookingId);
    after(() => deliverLater(ids));
  }
  refresh();
  redirect(`/admin/rezervari/${result.bookingId}?salvat=1`);
}
