"use server";

import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/request";
import { allowFormSubmission } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { deriveToken, generateToken, hashToken } from "@/lib/tokens";
import { getPolicyVersion } from "@/lib/content";
import { attributionLabel, parseAttributionField } from "@/lib/attribution";
import { fields, formDataToObject, zodFieldErrors, type FormState } from "@/lib/validation";
import { deliverEmails } from "@/lib/email/send";
import {
  queueCoachNotification,
  queueGiftRequestReceived,
  queueNewsletterConfirmation,
  queuePlayerReceived,
} from "@/lib/email/messages";
import { t } from "@/lib/i18n-content";
import { urls } from "@/lib/paths";
import {
  GIFT_AMOUNT_MAX,
  GIFT_AMOUNT_MIN,
  GIFT_LESSON_COUNTS,
  describeGiftCard,
  giftCardPrice,
} from "@/lib/gift-cards";
import { PLAY_SLOTS, publicPlayerName, slotLabel } from "@/lib/league";

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
        attribution: parseAttributionField(raw.attribution) ?? undefined,
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
        ["Sursa vizitei", attributionLabel(message.attribution) ?? "direct sau necunoscută"],
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

// ─── Court hire request ──────────────────────────────────────────────────────

const COURT_KINDS = ["acoperit", "exterior", "oricare"] as const;
const COURT_LABEL: Record<(typeof COURT_KINDS)[number], string> = {
  acoperit: "acoperit",
  exterior: "în aer liber",
  oricare: "oricare",
};

const courtSchema = z.object({
  name: fields.name,
  email: fields.email,
  phone: fields.phone,
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date")
    .refine((value) => {
      const day = new Date(`${value}T00:00:00Z`).getTime();
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      return day >= today.getTime() - 24 * 60 * 60 * 1000 && day <= today.getTime() + 120 * 864e5;
    }, "date"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time"),
  duration: z.enum(["60", "90", "120"], { error: "duration" }),
  court: z.enum(COURT_KINDS).catch("oricare"),
  message: fields.optionalText(1000),
  consent: fields.consent,
  locale: fields.locale,
});

/**
 * A request to hire a court: it lands in the admin's inbox (Messages) and in the club's email;
 * the club confirms by phone, as it does today.
 */
export async function submitCourtRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = courtSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: zodFieldErrors(parsed.error) };
  const gate = await guard("court", raw, parsed.data.email);
  if (!gate.ok) return gate.state;
  try {
    const data = parsed.data;
    const [year, month, day] = data.date.split("-");
    const when = `${day}.${month}.${year}, ${data.time}, ${data.duration} de minute`;
    const message = await db.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: `Închiriere teren: ${when}`,
        message: [
          `Data și ora: ${when}`,
          `Teren: ${COURT_LABEL[data.court]}`,
          data.message ? `Mesaj: ${data.message}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        consent: true,
        consentAt: new Date(),
        policyVersion: await getPolicyVersion(),
        locale: data.locale,
        attribution: parseAttributionField(raw.attribution) ?? undefined,
      },
    });
    const ids = await queueCoachNotification(
      "court",
      [
        ["Nume", message.name],
        ["Telefon", message.phone ?? "—"],
        ["Email", message.email],
        ["Data și ora", when],
        ["Teren", COURT_LABEL[data.court]],
        ["Mesaj", data.message ?? "—"],
        ["Sursa vizitei", attributionLabel(message.attribution) ?? "direct sau necunoscută"],
      ],
      message.name,
      message.email,
    );
    schedule(ids);
    return { status: "success" };
  } catch (error) {
    console.error("submitCourtRequest", error);
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
        attribution: parseAttributionField(raw.attribution) ?? undefined,
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
        ["Sursa vizitei", attributionLabel(entry.attribution) ?? "direct sau necunoscută"],
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

// ─── Junior academy: assessment request ──────────────────────────────────────

const EXPERIENCE = ["niciodata", "putin", "regulat", "turnee"] as const;
const EXPERIENCE_RO: Record<(typeof EXPERIENCE)[number], string> = {
  niciodata: "nu a mai jucat tenis",
  putin: "câteva lecții sau tenis de plăcere",
  regulat: "se antrenează regulat",
  turnee: "joacă turnee",
};

const evaluationSchema = z.object({
  groupId: z
    .string()
    .trim()
    .max(40)
    .transform((value) => (value === "" ? null : value)),
  childFirstName: z.string().trim().min(2, "childFirstName").max(60, "childFirstName"),
  childAge: z
    .string()
    .trim()
    .transform((value) => Number.parseInt(value, 10))
    .refine((value) => Number.isInteger(value) && value >= 3 && value <= 18, "childAge"),
  experience: z.enum(EXPERIENCE, { error: "experience" }),
  name: fields.name,
  email: fields.email,
  phone: fields.phone,
  preferences: z.string().trim().min(3, "preferences").max(500, "preferences"),
  message: fields.optionalText(2000),
  consent: fields.consent,
  locale: fields.locale,
});

/** A parent asks for their child's assessment before joining a group of the junior academy. */
export async function submitEvaluation(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = evaluationSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: zodFieldErrors(parsed.error) };
  const gate = await guard("evaluation", raw, parsed.data.email);
  if (!gate.ok) return gate.state;
  try {
    const data = parsed.data;
    const group = data.groupId
      ? await db.academyGroup.findFirst({ where: { id: data.groupId, active: true } })
      : null;
    const entry = await db.waitlistEntry.create({
      data: {
        kind: "EVALUARE",
        groupId: group?.id ?? null,
        programId: group?.programId ?? null,
        childFirstName: data.childFirstName,
        childAge: data.childAge,
        forMinor: data.childAge < 18,
        experience: EXPERIENCE_RO[data.experience],
        preferences: data.preferences,
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        consent: true,
        consentAt: new Date(),
        policyVersion: await getPolicyVersion(),
        locale: data.locale,
        attribution: parseAttributionField(raw.attribution) ?? undefined,
      },
    });
    const ids = await queueCoachNotification(
      "evaluation",
      [
        ["Copilul", `${entry.childFirstName ?? ""}, ${entry.childAge ?? "?"} ani`],
        ["Experiență", entry.experience ?? "—"],
        ["Grupa", group ? ((group.name as { ro?: string }).ro ?? "") : "se stabilește la evaluare"],
        ["Preferințe", entry.preferences],
        ["Părinte", entry.name],
        ["Telefon", entry.phone],
        ["Email", entry.email],
        ["Mesaj", entry.message ?? "—"],
        ["Sursa vizitei", attributionLabel(entry.attribution) ?? "direct sau necunoscută"],
      ],
      entry.name,
      entry.email,
    );
    schedule(ids);
    return { status: "success" };
  } catch (error) {
    console.error("submitEvaluation", error);
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

// ─── Gift cards ──────────────────────────────────────────────────────────────

const giftSchema = z
  .object({
    kind: z.enum(["lectie", "valoare"]).catch("lectie"),
    lessonTypeId: z.string().trim().max(40).optional(),
    durationMin: z.coerce.number().int().optional().catch(undefined),
    lessons: z.coerce.number().int().optional().catch(undefined),
    amount: z.coerce.number().int().optional().catch(undefined),
    name: fields.name,
    email: fields.email,
    phone: fields.phone,
    recipientName: z.string().trim().min(2, "recipientName").max(120, "recipientName"),
    message: fields.optionalText(300),
    consent: fields.consent,
    locale: fields.locale,
  })
  .superRefine((data, ctx) => {
    if (data.kind === "valoare") {
      if (!data.amount || data.amount < GIFT_AMOUNT_MIN || data.amount > GIFT_AMOUNT_MAX)
        ctx.addIssue({ code: "custom", path: ["amount"], message: "amount" });
      return;
    }
    if (!data.lessonTypeId)
      ctx.addIssue({ code: "custom", path: ["lessonTypeId"], message: "lessonType" });
    if (!data.lessons || !(GIFT_LESSON_COUNTS as readonly number[]).includes(data.lessons))
      ctx.addIssue({ code: "custom", path: ["lessons"], message: "lessons" });
  });

/**
 * "Give a tennis lesson": the request is stored and the club calls the buyer about payment; the
 * card (with its code) is activated and emailed from the admin once paid.
 */
export async function submitGiftCard(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = giftSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: zodFieldErrors(parsed.error) };
  const gate = await guard("gift", raw, parsed.data.email);
  if (!gate.ok) return gate.state;
  try {
    const data = parsed.data;
    const settings = await db.siteSettings.findUniqueOrThrow({
      where: { id: 1 },
      select: { giftCardsEnabled: true },
    });
    if (!settings.giftCardsEnabled) return { status: "error", error: "server" };
    const lessonType =
      data.kind === "lectie" && data.lessonTypeId
        ? await db.lessonType.findFirst({ where: { id: data.lessonTypeId, active: true } })
        : null;
    if (data.kind === "lectie" && !lessonType)
      return { status: "error", fieldErrors: { lessonTypeId: "lessonType" } };
    const durationMin =
      lessonType && data.durationMin && lessonType.durations.includes(data.durationMin)
        ? data.durationMin
        : (lessonType?.durations[0] ?? null);
    const card = await db.giftCard.create({
      data: {
        lessonTypeId: lessonType?.id ?? null,
        durationMin: lessonType ? durationMin : null,
        lessons: lessonType ? (data.lessons ?? 1) : null,
        amountRon: data.kind === "valoare" ? (data.amount ?? null) : null,
        buyerName: data.name,
        buyerEmail: data.email,
        buyerPhone: data.phone,
        recipientName: data.recipientName,
        message: data.message,
        gdprConsent: true,
        gdprConsentAt: new Date(),
        policyVersion: await getPolicyVersion(),
        locale: data.locale,
        attribution: parseAttributionField(raw.attribution) ?? undefined,
      },
    });
    const value = describeGiftCard(
      {
        lessonName: lessonType ? t(lessonType.name, "ro") : null,
        lessons: card.lessons,
        durationMin: card.durationMin,
        amountRon: card.amountRon,
      },
      "ro",
    );
    const price = giftCardPrice({
      amountRon: card.amountRon,
      hourlyRate: lessonType?.hourlyRate?.toString() ?? null,
      durationMin: card.durationMin,
      lessons: card.lessons,
    });
    const ids = [
      ...(await queueCoachNotification(
        "gift",
        [
          ["Cumpărător", card.buyerName],
          ["Telefon", card.buyerPhone],
          ["Email", card.buyerEmail],
          ["Pentru", card.recipientName],
          ["Cardul", value],
          ["Preț estimat", price === null ? "de stabilit" : `${price} lei`],
          ["Mesaj pe card", card.message ?? "—"],
          ["Sursa vizitei", attributionLabel(card.attribution) ?? "direct sau necunoscută"],
        ],
        card.buyerName,
        card.buyerEmail,
        urls.adminGiftCard(card.id),
      )),
      ...(await queueGiftRequestReceived(card.id)),
    ];
    schedule(ids);
    return { status: "success" };
  } catch (error) {
    console.error("submitGiftCard", error);
    return { status: "error", error: "server" };
  }
}

// ─── Amateur league & hitting partners ───────────────────────────────────────

const playerSchema = z
  .object({
    name: fields.name,
    email: fields.email,
    phone: fields.phone,
    level: z.enum(["INCEPATOR", "INTERMEDIAR", "AVANSAT", "COMPETITIE"], { error: "level" }),
    singles: z.literal("on").optional(),
    doubles: z.literal("on").optional(),
    inLeague: z.literal("on").optional(),
    lookingForPartner: z.literal("on").optional(),
    listed: z.literal("on").optional(),
    about: fields.optionalText(300),
    consent: fields.consent,
    locale: fields.locale,
  })
  .superRefine((data, ctx) => {
    if (!data.inLeague && !data.lookingForPartner)
      ctx.addIssue({ code: "custom", path: ["inLeague"], message: "wants" });
  });

/** Sign-up for the amateur league, for a hitting partner, or both. The club approves it. */
export async function submitPlayer(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = playerSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: zodFieldErrors(parsed.error) };
  const gate = await guard("player", raw, parsed.data.email);
  if (!gate.ok) return gate.state;
  try {
    const data = parsed.data;
    const slots = PLAY_SLOTS.filter((slot) => raw[`slot_${slot}`] === "on");
    const player = await db.amateurPlayer.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        level: data.level,
        slots,
        singles: data.singles === "on" || data.doubles !== "on",
        doubles: data.doubles === "on",
        inLeague: data.inLeague === "on",
        lookingForPartner: data.lookingForPartner === "on",
        listed: data.lookingForPartner === "on" && data.listed === "on",
        about: data.about,
        gdprConsent: true,
        gdprConsentAt: new Date(),
        policyVersion: await getPolicyVersion(),
        locale: data.locale,
        attribution: parseAttributionField(raw.attribution) ?? undefined,
      },
    });
    const wants = [
      player.inLeague ? "liga amatorilor" : null,
      player.lookingForPartner ? "partener de joc" : null,
    ]
      .filter(Boolean)
      .join(", ");
    const ids = [
      ...(await queueCoachNotification(
        "player",
        [
          ["Nume", player.name],
          ["Telefon", player.phone],
          ["Email", player.email],
          ["Vrea", wants],
          ["Nivel", LEVEL_LABEL[player.level] ?? player.level],
          ["Când joacă", slots.map((slot) => slotLabel(slot, "ro")).join(", ") || "—"],
          ["Pe lista publică", player.listed ? "da" : "nu"],
          ["Despre", player.about ?? "—"],
        ],
        player.name,
        player.email,
        urls.adminPlayer(player.id),
      )),
      ...(await queuePlayerReceived(player.id)),
    ];
    schedule(ids);
    return { status: "success" };
  } catch (error) {
    console.error("submitPlayer", error);
    return { status: "error", error: "server" };
  }
}

const LEVEL_LABEL: Record<string, string> = {
  INCEPATOR: "începător",
  INTERMEDIAR: "intermediar",
  AVANSAT: "avansat",
  COMPETITIE: "competiție",
};

const partnerSchema = z.object({
  playerId: z.string().trim().min(1).max(40),
  name: fields.name,
  email: fields.email,
  phone: fields.phone,
  message: fields.optionalText(500),
  consent: fields.consent,
  locale: fields.locale,
});

/**
 * "I want to play with …": the club gets the request and puts the two players in touch, so no
 * contact details are ever shown on the site.
 */
export async function submitPartnerRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = partnerSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: zodFieldErrors(parsed.error) };
  const gate = await guard("partner", raw, parsed.data.email);
  if (!gate.ok) return gate.state;
  try {
    const data = parsed.data;
    const player = await db.amateurPlayer.findFirst({
      where: { id: data.playerId, approved: true, listed: true, lookingForPartner: true },
    });
    if (!player) return { status: "error", error: "server" };
    const wanted = publicPlayerName(player.name);
    const message = await db.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: `Partener de joc: vrea să joace cu ${player.name}`,
        message: [
          `Vrea să joace cu: ${player.name} (${player.phone}, ${player.email}), afișat pe site ca ${wanted}.`,
          data.message ? `Mesaj: ${data.message}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        consent: true,
        consentAt: new Date(),
        policyVersion: await getPolicyVersion(),
        locale: data.locale,
        attribution: parseAttributionField(raw.attribution) ?? undefined,
      },
    });
    const ids = await queueCoachNotification(
      "partner",
      [
        ["Cine", `${message.name}, ${message.phone ?? "—"}, ${message.email}`],
        ["Vrea să joace cu", `${player.name}, ${player.phone}, ${player.email}`],
        ["Mesaj", data.message ?? "—"],
      ],
      message.name,
      message.email,
    );
    schedule(ids);
    return { status: "success" };
  } catch (error) {
    console.error("submitPartnerRequest", error);
    return { status: "error", error: "server" };
  }
}
