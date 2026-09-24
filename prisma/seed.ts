/**
 * Seed: builds the initial content from config/antrenor.yml.
 * Idempotent and non-destructive: every record is created only if it is missing, so running it
 * twice changes nothing and never overwrites what the coach edited in the admin.
 * To rebuild everything from the config file: `npm run db:reset`.
 * `--if-empty` runs it only on a database that has no content yet (used by the Docker image).
 */
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient, type PriceUnit } from "../lib/generated/prisma/client";
import {
  TODO,
  coordinates,
  decimal,
  hoursRange,
  integer,
  isPlaceholder,
  loadConfig,
  localizedText,
  optionalLocalized,
  optionalText,
  phoneDigits,
  text,
  yesNo,
} from "./seed/config";
import { sceneSeeds } from "./seed/content/scenes";
import { programContent } from "./seed/content/programs";
import { faqContent } from "./seed/content/faqs";
import { postContent } from "./seed/content/posts";
import { LEGAL_VERSION, legalContent } from "./seed/content/legal";
import {
  amenityNames,
  coachPhilosophy,
  conditionalServices,
  exampleTestimonials,
  pageHeaderContent,
  serviceDescriptions,
} from "./seed/content/site";

loadEnv({ quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL lipsește din .env");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const todoT = { ro: TODO, en: TODO };
const same = (value: string) => ({ ro: value, en: value });

const PAYMENT_TRANSLATIONS: Record<string, string> = {
  "numerar la teren": "Cash at the court",
  "transfer bancar": "Bank transfer",
  "card la teren": "Card at the court",
};
const LANGUAGE_TRANSLATIONS: Record<string, string> = {
  română: "Romanian",
  engleză: "English",
  franceză: "French",
  germană: "German",
  italiană: "Italian",
  spaniolă: "Spanish",
  maghiară: "Hungarian",
};

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("ro-RO") + value.slice(1);
}

function initials(name: string): string {
  if (name === TODO) return "";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("ro-RO"))
    .join("");
}

async function main(): Promise<void> {
  // In the Docker image the seed runs at every start with --if-empty: only a brand-new database
  // gets the initial content, so what the coach deleted in the admin never comes back.
  if (
    process.argv.includes("--if-empty") &&
    (await db.siteSettings.findUnique({ where: { id: 1 } }))
  ) {
    console.info("Seed: baza de date are deja conținut, nu adaug nimic.");
    return;
  }
  const config = loadConfig();
  const created: string[] = [];
  const note = (label: string, wasCreated: boolean) => {
    if (wasCreated) created.push(label);
  };

  const coachName = text(config.antrenor.nume);
  const firstLocation = config.locatii[0];
  if (!firstLocation) throw new Error("config/antrenor.yml: lipsește cel puțin o locație.");
  const locationName = text(firstLocation.nume);
  const city = text(firstLocation.localitate);

  // ── Settings ──────────────────────────────────────────────────────────────
  const workingHours = [
    { label: { ro: "Luni–vineri", en: "Monday–Friday" }, value: config.program_lucru.luni_vineri },
    { label: { ro: "Sâmbătă", en: "Saturday" }, value: config.program_lucru.sambata },
    { label: { ro: "Duminică", en: "Sunday" }, value: config.program_lucru.duminica },
  ].map(({ label, value }) => {
    const range = hoursRange(value);
    if (range) return { label, hours: same(`${range.start}–${range.end}`) };
    const raw = text(value);
    return {
      label,
      hours: raw.toLowerCase() === "închis" ? { ro: "închis", en: "closed" } : same(raw),
    };
  });

  const paymentMethods = config.plata.metode
    .filter((method) => !isPlaceholder(method))
    .map((method) => {
      const ro = capitalize(String(method).trim());
      const en = PAYMENT_TRANSLATIONS[String(method).trim().toLowerCase()];
      return en ? { ro, en } : { ro };
    });

  const languages = (config.site.limbi ?? []).map((lang) => String(lang));
  const settingsExisting = await db.siteSettings.findUnique({ where: { id: 1 } });
  await db.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      brandName: coachName,
      monogram: initials(coachName),
      tagline: localizedText(config.antrenor.titulatura, "Tennis coach"),
      phone: text(config.contact.telefon),
      whatsapp: phoneDigits(config.contact.whatsapp) ?? TODO,
      email: text(config.contact.email),
      instagramUrl: optionalText(config.contact.instagram),
      facebookUrl: optionalText(config.contact.facebook),
      tiktokUrl: optionalText(config.contact.tiktok),
      seoTitle: {
        ro: `Antrenor de tenis în ${city}: lecții pentru copii și adulți`,
        en: `Tennis coach in ${city}: lessons for children and adults`,
      },
      seoDescription: {
        ro: `Lecții de tenis individuale și în grupă pentru copii, juniori și adulți la ${locationName}, ${city}. Prima lecție este o evaluare. Rezervare online.`,
        en: `Private and group tennis lessons for children, juniors and adults at ${locationName}, ${city}. The first lesson is an assessment. Book online.`,
      },
      bookingMode: String(config.rezervari.mod).trim() === "instant" ? "INSTANT" : "CERERE",
      freeCancelHours: integer(config.rezervari.anulare_gratuita_ore) ?? 24,
      minNoticeHours: integer(config.rezervari.rezervare_minim_ore_inainte) ?? 12,
      horizonDays: integer(config.rezervari.orizont_zile) ?? 60,
      bufferMinutes: integer(config.rezervari.pauza_intre_lectii_min) ?? 10,
      firstLessonText: isPlaceholder(config.rezervari.prima_lectie)
        ? todoT
        : { ro: text(config.rezervari.prima_lectie) },
      paymentMethods,
      workingHours,
      legalForm: text(config.entitate_legala.forma),
      legalName: text(config.entitate_legala.denumire),
      legalCui: text(config.entitate_legala.cui),
      legalAddress: text(config.entitate_legala.sediu),
      enEnabled: languages.includes("en"),
      timezone: isPlaceholder(config.site.fus_orar)
        ? "Europe/Bucharest"
        : String(config.site.fus_orar),
      currency: isPlaceholder(config.site.moneda) ? "RON" : String(config.site.moneda),
    },
  });
  note("setări", !settingsExisting);

  // ── Coach profile & certifications ────────────────────────────────────────
  const coachExisting = await db.coachProfile.findUnique({ where: { id: 1 } });
  const results = optionalLocalized(config.antrenor.rezultate_elevi);
  await db.coachProfile.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: coachName,
      title: localizedText(config.antrenor.titulatura, "Tennis coach"),
      story: localizedText(config.antrenor.parcurs),
      philosophy: coachPhilosophy,
      results: results ?? Prisma.DbNull,
      yearsExperience: integer(config.antrenor.ani_experienta),
      languages: config.antrenor.limbi_vorbite
        .filter((lang) => !isPlaceholder(lang))
        .map((lang) => {
          const ro = String(lang).trim();
          const en = LANGUAGE_TRANSLATIONS[ro.toLowerCase()];
          return en ? { ro, en } : { ro };
        }),
    },
  });
  note("profil antrenor", !coachExisting);

  for (const [index, certification] of config.antrenor.certificari.entries()) {
    const id = `seed-cert-${String(index + 1).padStart(2, "0")}`;
    const exists = await db.certification.findUnique({ where: { id } });
    let entry: { title: { ro: string; en: string }; issuer: string; year: number | null };
    if (certification !== null && typeof certification === "object") {
      entry = {
        title: localizedText(certification.titlu),
        issuer: text(certification.emitent),
        year: integer(certification.an),
      };
    } else {
      // Short form: "Title, Issuer".
      const raw = text(certification);
      const [title, ...issuerParts] = raw === TODO ? [TODO] : raw.split(",");
      entry = {
        title: same((title ?? TODO).trim()),
        issuer: issuerParts.length > 0 ? issuerParts.join(",").trim() : TODO,
        year: null,
      };
    }
    await db.certification.upsert({
      where: { id },
      update: {},
      create: { id, ...entry, order: index },
    });
    note(`certificare ${index + 1}`, !exists);
  }

  // ── Location, courts, facilities ──────────────────────────────────────────
  const locationId = "seed-location-01";
  const coords = coordinates(firstLocation.coordonate);
  const locationExists = await db.location.findUnique({ where: { id: locationId } });
  await db.location.upsert({
    where: { id: locationId },
    update: {},
    create: {
      id: locationId,
      name: locationName,
      address: text(firstLocation.adresa),
      city,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      mapUrl: coords
        ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
        : null,
      directions: todoT,
    },
  });
  note("locație", !locationExists);

  const SURFACES: Record<
    string,
    { surface: "ZGURA" | "HARD" | "IARBA" | "SINTETIC" | "COVOR"; name: { ro: string; en: string } }
  > = {
    zgură: { surface: "ZGURA", name: { ro: "Terenuri de zgură", en: "Clay courts" } },
    hard: { surface: "HARD", name: { ro: "Terenuri hard", en: "Hard courts" } },
    iarbă: { surface: "IARBA", name: { ro: "Terenuri de iarbă", en: "Grass courts" } },
    sintetic: { surface: "SINTETIC", name: { ro: "Terenuri sintetice", en: "Synthetic courts" } },
    covor: { surface: "COVOR", name: { ro: "Terenuri cu covor", en: "Carpet courts" } },
  };
  for (const [index, court] of firstLocation.terenuri.entries()) {
    const kind =
      SURFACES[
        String(court.suprafata ?? "")
          .trim()
          .toLowerCase()
      ];
    if (!kind) continue;
    const id = `seed-court-${String(index + 1).padStart(2, "0")}`;
    const exists = await db.court.findUnique({ where: { id } });
    await db.court.upsert({
      where: { id },
      update: {},
      create: {
        id,
        locationId,
        name: kind.name,
        surface: kind.surface,
        count: integer(court.numar),
        coveredInWinter: yesNo(court.acoperit_iarna),
        floodlights: yesNo(court.nocturna),
        order: index,
      },
    });
    note(`teren ${kind.name.ro}`, !exists);
  }

  let facilityOrder = 0;
  for (const amenity of firstLocation.dotari) {
    const key = String(amenity ?? "")
      .trim()
      .toLowerCase();
    const id = `seed-amenity-${facilityOrder + 1}`;
    const exists = await db.facility.findUnique({ where: { id } });
    const name = isPlaceholder(amenity) ? todoT : (amenityNames[key] ?? { ro: capitalize(key) });
    await db.facility.upsert({
      where: { id },
      update: {},
      create: {
        id,
        locationId,
        type: "DOTARE_BAZA",
        name,
        illustration: key || "altele",
        order: facilityOrder,
      },
    });
    note(`dotare ${name.ro}`, !exists);
    facilityOrder += 1;
  }

  for (const [index, service] of config.servicii_incluse.entries()) {
    const id = `seed-service-${String(index + 1).padStart(2, "0")}`;
    const exists = await db.facility.findUnique({ where: { id } });
    const raw = String(service ?? "").trim();
    const known = serviceDescriptions[raw];
    let data: Prisma.FacilityUncheckedCreateInput;
    if (known) {
      data = {
        id,
        type: known.type,
        name: known.name,
        description: known.description,
        illustration: known.illustration,
        order: index,
      };
    } else {
      const inner = raw
        .replace(/^\[|\]$/g, "")
        .replace(/,?\s*dacă e cazul/i, "")
        .trim();
      const conditional = conditionalServices[inner.toLowerCase()];
      data = {
        id,
        type: "SERVICIU_ANTRENOR",
        name: conditional ?? (isPlaceholder(service) ? todoT : { ro: inner }),
        description: isPlaceholder(service) ? todoT : Prisma.DbNull,
        illustration: inner.toLowerCase().includes("turnee") ? "turnee" : "racordare",
        order: index,
      };
    }
    await db.facility.upsert({ where: { id }, update: {}, create: data });
    note(`serviciu ${index + 1}`, !exists);
  }

  // ── Programs & pricing ────────────────────────────────────────────────────
  const programIds = new Map<string, string>();
  for (const [index, content] of programContent.entries()) {
    const configEntry = config.programe.find(
      (entry) => String(entry.nume ?? "").trim() === content.configName,
    );
    const exists = await db.program.findUnique({ where: { slug: content.slug } });
    const maxParticipants =
      content.format === "INDIVIDUAL"
        ? 1
        : content.format === "SEMI_PRIVAT"
          ? 2
          : integer(configEntry?.max_elevi);
    const program = await db.program.upsert({
      where: { slug: content.slug },
      update: {},
      create: {
        slug: content.slug,
        name: content.name,
        summary: content.summary,
        description: content.description,
        focusPoints: content.focusPoints,
        audience: content.audience,
        level: content.level,
        format: content.format,
        durationMin: integer(configEntry?.durata_min),
        maxParticipants,
        ageMin: content.ageMin ?? null,
        ageMax: content.ageMax ?? null,
        order: index,
        bookableOnline: content.bookableOnline,
        active: Boolean(configEntry),
      },
    });
    programIds.set(content.slug, program.id);
    note(`program ${content.slug}`, !exists);

    const priceFields: { key: string; unit: PriceUnit; label: { ro: string; en: string } }[] = [
      {
        key: "pret_ron",
        unit: content.format === "EVENIMENT" ? "EVENIMENT" : "LECTIE",
        label:
          content.format === "EVENIMENT"
            ? { ro: "Participare", en: "Participation" }
            : { ro: "Lecție", en: "Lesson" },
      },
      {
        key: "pret_ron_persoana",
        unit: "PERSOANA",
        label: { ro: "Lecție, de persoană", en: "Lesson, per person" },
      },
      {
        key: "pret_ron_luna",
        unit: "LUNA",
        label: { ro: "Abonament lunar", en: "Monthly membership" },
      },
    ];
    for (const field of priceFields) {
      if (!configEntry || !(field.key in configEntry)) continue;
      const id = `seed-price-${content.slug}-${field.unit.toLowerCase()}`;
      const priceExists = await db.pricingPlan.findUnique({ where: { id } });
      await db.pricingPlan.upsert({
        where: { id },
        update: {},
        create: {
          id,
          programId: program.id,
          name: field.label,
          price: decimal(configEntry[field.key]),
          currency: isPlaceholder(config.site.moneda) ? "RON" : String(config.site.moneda),
          unit: field.unit,
          order: index * 10,
        },
      });
      note(`preț ${content.slug}`, !priceExists);
    }
  }

  const individualId = programIds.get("lectie-individuala") ?? null;
  for (const [index, pack] of config.pachete.entries()) {
    const id = `seed-package-${String(index + 1).padStart(2, "0")}`;
    const exists = await db.pricingPlan.findUnique({ where: { id } });
    await db.pricingPlan.upsert({
      where: { id },
      update: {},
      create: {
        id,
        programId: individualId,
        name: isPlaceholder(pack.nume) ? todoT : { ro: text(pack.nume) },
        price: decimal(pack.pret_ron),
        unit: "PACHET",
        isPackage: true,
        sessions: isPlaceholder(pack.nume)
          ? null
          : integer(String(pack.nume).match(/\d+/)?.[0] ?? null),
        validityDays: integer(pack.valabilitate_zile),
        includes: {
          ro: "Lecțiile se pot folosi în perioada de valabilitate, de la prima ședință.",
          en: "The lessons can be used within the validity period, starting from the first session.",
        },
        highlighted: index === config.pachete.length - 1,
        order: 1000 + index,
      },
    });
    note(`pachet ${index + 1}`, !exists);
  }

  // ── Availability & group schedule ─────────────────────────────────────────
  const ruleDays: { days: number[]; value: typeof config.program_lucru.luni_vineri }[] = [
    { days: [1, 2, 3, 4, 5], value: config.program_lucru.luni_vineri },
    { days: [6], value: config.program_lucru.sambata },
    { days: [7], value: config.program_lucru.duminica },
  ];
  for (const { days, value } of ruleDays) {
    const range = hoursRange(value);
    if (!range) continue;
    for (const weekday of days) {
      const id = `seed-rule-${weekday}`;
      const exists = await db.availabilityRule.findUnique({ where: { id } });
      await db.availabilityRule.upsert({
        where: { id },
        update: {},
        create: { id, weekday, startTime: range.start, endTime: range.end, locationId },
      });
      note(`disponibilitate ziua ${weekday}`, !exists);
    }
  }

  // A proposed starting schedule for the groups; the coach adjusts it in the admin.
  const groupPlan: { slug: string; weekday: number; time: string }[] = [
    { slug: "mini-tenis", weekday: 2, time: "17:00" },
    { slug: "mini-tenis", weekday: 4, time: "17:00" },
    { slug: "mini-tenis", weekday: 6, time: "09:00" },
    { slug: "grupe-copii-juniori", weekday: 1, time: "17:30" },
    { slug: "grupe-copii-juniori", weekday: 3, time: "17:30" },
    { slug: "adulti-incepatori", weekday: 2, time: "19:00" },
    { slug: "adulti-incepatori", weekday: 4, time: "19:00" },
  ];
  for (const [index, entry] of groupPlan.entries()) {
    const programId = programIds.get(entry.slug);
    const program = programId ? await db.program.findUnique({ where: { id: programId } }) : null;
    if (!program) continue;
    const id = `seed-group-${String(index + 1).padStart(2, "0")}`;
    const exists = await db.groupSchedule.findUnique({ where: { id } });
    await db.groupSchedule.upsert({
      where: { id },
      update: {},
      create: {
        id,
        programId: program.id,
        weekday: entry.weekday,
        startTime: entry.time,
        durationMin: program.durationMin ?? 60,
        capacity: program.maxParticipants ?? 6,
        membersCount: 0,
        locationId,
      },
    });
    note(`orar grupă ${entry.slug}`, !exists);
  }

  // ── Scenes ────────────────────────────────────────────────────────────────
  for (const scene of sceneSeeds({ nume: coachName, locatie: locationName })) {
    const exists = await db.scene.findUnique({ where: { key: scene.key } });
    await db.scene.upsert({ where: { key: scene.key }, update: {}, create: scene });
    note(`scena ${scene.key}`, !exists);
  }

  // ── FAQ ───────────────────────────────────────────────────────────────────
  const cancelHours = String(integer(config.rezervari.anulare_gratuita_ore) ?? 24);
  for (const [index, faq] of faqContent.entries()) {
    const exists = await db.faq.findUnique({ where: { id: faq.id } });
    await db.faq.upsert({
      where: { id: faq.id },
      update: {},
      create: {
        id: faq.id,
        question: faq.question,
        answer: {
          ro: faq.answer.ro.replaceAll("{ore}", cancelHours),
          en: faq.answer.en.replaceAll("{ore}", cancelHours),
        },
        category: faq.category,
        showOnHome: faq.showOnHome,
        programId: faq.programSlug ? (programIds.get(faq.programSlug) ?? null) : null,
        order: index,
      },
    });
    note(`întrebare ${index + 1}`, !exists);
  }

  // ── Posts (drafts) ────────────────────────────────────────────────────────
  for (const post of postContent) {
    const exists = await db.post.findUnique({ where: { slug: post.slug } });
    await db.post.upsert({
      where: { slug: post.slug },
      update: {},
      create: { ...post, status: "CIORNA" },
    });
    note(`articol ${post.slug}`, !exists);
  }

  // ── Example testimonials (never published) ────────────────────────────────
  for (const [index, testimonial] of exampleTestimonials.entries()) {
    const exists = await db.testimonial.findUnique({ where: { id: testimonial.id } });
    await db.testimonial.upsert({
      where: { id: testimonial.id },
      update: {},
      create: { ...testimonial, isExample: true, published: false, consent: false, order: index },
    });
    note(`recenzie exemplu ${index + 1}`, !exists);
  }

  // ── Legal pages & page headers ────────────────────────────────────────────
  for (const legal of legalContent) {
    const exists = await db.legalPage.findUnique({ where: { kind: legal.kind } });
    await db.legalPage.upsert({
      where: { kind: legal.kind },
      update: {},
      create: { ...legal, version: LEGAL_VERSION, reviewedByLawyer: false },
    });
    note(`pagina legală ${legal.kind}`, !exists);
  }

  for (const header of pageHeaderContent) {
    const exists = await db.pageHeader.findUnique({ where: { key: header.key } });
    await db.pageHeader.upsert({
      where: { key: header.key },
      update: {},
      create: {
        key: header.key,
        title: header.title,
        intro: header.intro,
        seoTitle: header.seoTitle ?? Prisma.DbNull,
        seoDescription: header.seoDescription,
      },
    });
    note(`antet ${header.key}`, !exists);
  }

  if (created.length === 0) {
    console.info("Seed: totul exista deja, nimic de adăugat.");
  } else {
    console.info(
      `Seed: am creat ${created.length} înregistrări (${created.slice(0, 6).join(", ")}${created.length > 6 ? ", …" : ""}).`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
