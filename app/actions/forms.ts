"use server";

import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/request";
import { allowFormSubmission } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { deriveToken, generateToken, hashToken } from "@/lib/tokens";
import { getPolicyVersion } from "@/lib/content";
import { fields, formDataToObject, zodFieldErrors, type FormState } from "@/lib/validation";
import { deliverEmails } from "@/lib/email/send";
import { queueCoachNotification, queueNewsletterConfirmation } from "@/lib/email/messages";

type Guarded = { ok: true; ip: string } | { ok: false; state: FormState };

/** Honeypot, anti-spam check and rate limit, shared by every public form. */
async function guard(form: string, raw: Record<string, string>, email?: string): Promise<Guarded> {
  if (raw.website && raw.website.length > 0) {
    // A bot filled the hidden field: pretend it worked, store nothing.
    return { ok: false, state: { status: "success" } };
  }
  const ip = await getClientIp();
  if (!(await verifyTurnstile(raw["cf-turnstile-response"], ip))) {
    return { ok: false, state: { status: "error", error: "captcha" } };
  }
  if (!(await allowFormSubmission(form, ip, email))) {
    return { ok: false, state: { status: "error", error: "rateLimit" } };
  }
  return { ok: true, ip };
}

function schedule(ids: string[]): void {
  if (ids.length === 0) return;
  after(async () => {
    await deliverEmails(ids);
  });
}

// ─── Contact ─────────────────────────────────────────────────────────────────

const contactSchema = z.object({
  name: fields.name,
  email: fields.email,
  phone: fields.optionalPhone,
  subject: fields.optionalText(200),
  message: fields.message,
  consent: fields.consent,
  locale: fields.locale,
});

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: zodFieldErrors(parsed.error) };
  const gate = await guard("contact", raw, parsed.data.email);
  if (!gate.ok) return gate.state;
  try {
    const data = parsed.data;
    const message = await db.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message,
        consent: true,
        consentAt: new Date(),
        policyVersion: await getPolicyVersion(),
        locale: data.locale,
      },
    });
    const ids = await queueCoachNotification(
      "contact",
      [
        ["Nume", message.name],
        ["Email", message.email],
        ["Telefon", message.phone ?? "—"],
        ["Subiect", message.subject ?? "—"],
        ["Mesaj", message.message],
      ],
      message.name,
      message.email,
    );
    schedule(ids);
    return { status: "success" };
  } catch (error) {
    console.error("submitContact", error);
    return { status: "error", error: "server" };
  }
}

// ─── Waiting list ────────────────────────────────────────────────────────────

const waitlistSchema = z.object({
  programId: z
    .string()
    .trim()
    .max(40)
    .transform((value) => (value === "" ? null : value)),
  name: fields.name,
  email: fields.email,
  phone: fields.phone,
  preferences: z.string().trim().min(3, "preferences").max(500, "preferences"),
  message: fields.optionalText(2000),
  childAge: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number.parseInt(value, 10)))
    .refine(
      (value) => value === null || (Number.isInteger(value) && value >= 3 && value <= 17),
      "childAge",
    ),
  consent: fields.consent,
  locale: fields.locale,
});

export async function submitWaitlist(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = waitlistSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: zodFieldErrors(parsed.error) };
  const gate = await guard("waitlist", raw, parsed.data.email);
  if (!gate.ok) return gate.state;
  try {
    const data = parsed.data;
    const program = data.programId
      ? await db.program.findUnique({ where: { id: data.programId } })
      : null;
    const entry = await db.waitlistEntry.create({
      data: {
        programId: program?.id ?? null,
        preferences: data.preferences,
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        forMinor: data.childAge !== null,
        childAge: data.childAge,
        consent: true,
        consentAt: new Date(),
        policyVersion: await getPolicyVersion(),
        locale: data.locale,
      },
    });
    const programName = program ? ((program.name as { ro?: string }).ro ?? "") : "oricare";
    const ids = await queueCoachNotification(
      "waitlist",
      [
        ["Nume", entry.name],
        ["Program", programName],
        ["Preferințe", entry.preferences],
        ["Telefon", entry.phone],
        ["Email", entry.email],
        ["Vârsta copilului", entry.childAge ? String(entry.childAge) : "—"],
      ],
      entry.name,
      entry.email,
    );
    schedule(ids);
    return { status: "success" };
  } catch (error) {
    console.error("submitWaitlist", error);
    return { status: "error", error: "server" };
  }
}

// ─── Newsletter (double opt-in) ──────────────────────────────────────────────

const newsletterSchema = z.object({
  email: fields.email,
  consent: fields.consent,
  locale: fields.locale,
});

export async function subscribeNewsletter(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = newsletterSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: zodFieldErrors(parsed.error) };
  const gate = await guard("newsletter", raw, parsed.data.email);
  if (!gate.ok) return gate.state;
  try {
    const { email, locale } = parsed.data;
    const existing = await db.newsletterSubscriber.findUnique({ where: { email } });
    // Same answer whether or not the address is already subscribed: nothing leaks.
    if (existing?.confirmedAt) return { status: "success" };
    const confirmToken = generateToken();
    const policyVersion = await getPolicyVersion();
    const subscriber = existing
      ? await db.newsletterSubscriber.update({
          where: { id: existing.id },
          data: {
            confirmTokenHash: hashToken(confirmToken),
            locale,
            consentAt: new Date(),
            policyVersion,
          },
        })
      : await db.newsletterSubscriber.create({
          data: {
            email,
            locale,
            confirmTokenHash: hashToken(confirmToken),
            unsubscribeTokenHash: hashToken(generateToken()),
            consentAt: new Date(),
            policyVersion,
          },
        });
    const unsubscribeToken = deriveToken("newsletter-unsubscribe", subscriber.id);
    if (!existing) {
      await db.newsletterSubscriber.update({
        where: { id: subscriber.id },
        data: { unsubscribeTokenHash: hashToken(unsubscribeToken) },
      });
    }
    schedule(await queueNewsletterConfirmation(email, locale, confirmToken, unsubscribeToken));
    return { status: "success" };
  } catch (error) {
    console.error("subscribeNewsletter", error);
    return { status: "error", error: "server" };
  }
}

export async function confirmNewsletter(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const [kind, raw] = [token.slice(0, 2), token.slice(2)];
  if (!raw) return { status: "error", error: "invalid" };
  const hash = hashToken(raw);
  if (kind === "c.") {
    const subscriber = await db.newsletterSubscriber.findUnique({
      where: { confirmTokenHash: hash },
    });
    if (!subscriber) return { status: "error", error: "invalid" };
    await db.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { confirmedAt: new Date(), confirmTokenHash: null },
    });
    return { status: "success", data: { kind: "confirmed" } };
  }
  if (kind === "u.") {
    const subscriber = await db.newsletterSubscriber.findUnique({
      where: { unsubscribeTokenHash: hash },
    });
    if (subscriber) await db.newsletterSubscriber.delete({ where: { id: subscriber.id } });
    return { status: "success", data: { kind: "unsubscribed" } };
  }
  return { status: "error", error: "invalid" };
}

// ─── Review (from the invitation email) ──────────────────────────────────────

const reviewSchema = z.object({
  token: z.string().min(20).max(200),
  author: fields.name,
  role: fields.optionalText(80),
  text: z.string().trim().min(20, "message").max(2000, "message"),
  consent: z
    .string()
    .optional()
    .transform((value) => value === "on"),
  locale: fields.locale,
});

export async function submitReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: zodFieldErrors(parsed.error) };
  const gate = await guard("review", raw);
  if (!gate.ok) return gate.state;
  const data = parsed.data;
  const booking = await db.booking.findUnique({
    where: { reviewTokenHash: hashToken(data.token) },
  });
  if (!booking) return { status: "error", error: "invalid" };
  const existing = await db.testimonial.findFirst({ where: { bookingId: booking.id } });
  if (existing) return { status: "error", error: "already" };
  const count = await db.testimonial.count();
  const testimonial = await db.testimonial.create({
    data: {
      author: data.author,
      role: data.role ? { [data.locale]: data.role, ro: data.role } : { ro: "" },
      text: { [data.locale]: data.text, ro: data.text },
      consent: data.consent,
      consentAt: data.consent ? new Date() : null,
      published: false,
      bookingId: booking.id,
      order: count,
    },
  });
  schedule(
    await queueCoachNotification(
      "review",
      [
        ["Autor", testimonial.author],
        ["Acord de publicare", data.consent ? "da" : "nu"],
        ["Text", data.text],
      ],
      testimonial.author,
    ),
  );
  return { status: "success" };
}
