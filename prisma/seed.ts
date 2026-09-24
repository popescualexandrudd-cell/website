/**
 * Seed: builds the initial content from config/antrenor.yml.
 * Idempotent and non-destructive: every record is created only if it is missing, so running it
 * twice changes nothing and never overwrites what the coach edited in the admin.
 * To rebuild everything from the config file: `npm run db:reset`.
 * `--if-empty` runs it only on a database that has no content yet (used by the Docker image).
 */
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../lib/generated/prisma/client";
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
import { lessonContent, programContent } from "./seed/content/programs";
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
      // Optional: without a WhatsApp number the WhatsApp buttons simply do not appear.
      whatsapp: phoneDigits(config.contact.whatsapp) ?? "",
      email: text(config.contact.email),
      instagramUrl: optionalText(config.contact.instagram),
      facebookUrl: optionalText(config.contact.facebook),
      tiktokUrl: optionalText(config.contact.tiktok),
      seoTitle: {
        ro: `Lecții de tenis ${city}: antrenor pentru copii și adulți`,
        en: `Tennis lessons in ${city}: a coach for children and adults`,
      },
      seoDescription: {
        ro: `Lecții de tenis la ${locationName}, ${city}, lângă București: inițiere, competiție și amatori, pentru copii și adulți, pe zgură. Rezervi online.`,
        en: `Tennis lessons at ${locationName}, ${city}, next to Bucharest: beginners, competition and recreational, for children and adults, on clay. Book online.`,
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
  const address = text(firstLocation.adresa);
  const locationExists = await db.location.findUnique({ where: { id: locationId } });
  await db.location.upsert({
    where: { id: locationId },
    update: {},
    create: {
      id: locationId,
      name: locationName,
      address,
      city,
      region: optionalText(firstLocation.judet),
      postalCode: optionalText(firstLocation.cod_postal),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      // Without coordinates the map link searches for the club by name and address.
      mapUrl: coords
        ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
        : address === TODO
          ? null
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${locationName}, ${address}`)}`,
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
    // Two rows of the same surface are told apart by whether they are covered.
    const covered = yesNo(court.acoperit_iarna);
    const sameSurface = firstLocation.terenuri.filter(
      (other) =>
        String(other.suprafata ?? "")
          .trim()
          .toLowerCase() ===
        String(court.suprafata ?? "")
          .trim()
          .toLowerCase(),
    ).length;
    const name =
      sameSurface > 1 && covered !== null
        ? covered
          ? { ro: `${kind.name.ro} acoperite`, en: `Covered ${kind.name.en.toLowerCase()}` }
          : { ro: `${kind.name.ro} în aer liber`, en: `Outdoor ${kind.name.en.toLowerCase()}` }
        : kind.name;
    await db.court.upsert({
      where: { id },
      update: {},
      create: {
        id,
        locationId,
        name,
        surface: kind.surface,
        count: integer(court.numar),
        coveredInWinter: covered,
        floodlights: yesNo(court.nocturna),
        order: index,
      },
    });
    note(`teren ${name.ro}`, !exists);
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

  // ── Training programmes, lesson types & packages ─────────────────────────
  const programIds = new Map<string, string>();
  for (const [index, content] of programContent.entries()) {
    const inConfig = config.programe.some(
      (entry) => String(entry.nume ?? "").trim() === content.configName,
    );
    const exists = await db.program.findUnique({ where: { slug: content.slug } });
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
        ageMin: content.ageMin ?? null,
        ageMax: content.ageMax ?? null,
        order: index,
        bookableOnline: true,
        active: inConfig,
      },
    });
    programIds.set(content.slug, program.id);
    note(`program ${content.slug}`, !exists);
  }

  const lessonIds = new Map<string, string>();
  for (const [index, content] of lessonContent.entries()) {
    const entry = config.lectii.find((l) => String(l.nume ?? "").trim() === content.configName);
    const people = String(entry?.persoane ?? "").match(/(\d+)(?:\s*[-–]\s*(\d+))?/);
    const minParticipants = people ? Number(people[1]) : content.minParticipants;
    const maxParticipants = people?.[2] ? Number(people[2]) : minParticipants;
    const durations = (entry?.durate_min ?? [])
      .map((value) => integer(value))
      .filter((value): value is number => value !== null && value >= 15 && value <= 600);
    const exists = await db.lessonType.findUnique({ where: { slug: content.slug } });
    const lesson = await db.lessonType.upsert({
      where: { slug: content.slug },
      update: {},
      create: {
        slug: content.slug,
        name: content.name,
        summary: content.summary,
        minParticipants,
        maxParticipants: Math.max(minParticipants, maxParticipants),
        durations:
          durations.length > 0 ? [...new Set(durations)].sort((a, b) => a - b) : [60, 90, 120],
        hourlyRate: entry ? decimal(entry.tarif_ora_ron) : null,
        priceUnit:
          String(entry?.tarif_pe ?? "")
            .trim()
            .toLowerCase() === "persoană"
            ? "PERSOANA"
            : content.priceUnit,
        order: index,
        bookableOnline: true,
        active: Boolean(entry),
      },
    });
    lessonIds.set(content.slug, lesson.id);
    note(`tip de lecție ${content.slug}`, !exists);
  }

  const individualId = lessonIds.get("lectie-individuala") ?? null;
  for (const [index, pack] of config.pachete.entries()) {
    const id = `seed-package-${String(index + 1).padStart(2, "0")}`;
    const exists = await db.pricingPlan.findUnique({ where: { id } });
    await db.pricingPlan.upsert({
      where: { id },
      update: {},
      create: {
        id,
        lessonTypeId: individualId,
        name: isPlaceholder(pack.nume) ? todoT : { ro: text(pack.nume) },
        price: decimal(pack.pret_ron),
        currency: isPlaceholder(config.site.moneda) ? "RON" : String(config.site.moneda),
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

  // ── Availability ──────────────────────────────────────────────────────────
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
