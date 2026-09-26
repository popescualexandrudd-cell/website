/**
 * Seed: builds the initial content from config/club.yml.
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
  ageRange,
  coordinates,
  decimal,
  hexColor,
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
import { stageContent } from "./seed/content/academy";
import { faqContent } from "./seed/content/faqs";
import { postContent } from "./seed/content/posts";
import { LEGAL_VERSION, legalContent } from "./seed/content/legal";
import { tournamentContent } from "./seed/content/tournaments";
import { syncClubAssets } from "./seed/assets";
import { roCount } from "../lib/format";
import {
  amenityDescriptions,
  amenityNames,
  locationDirections,
  conditionalServices,
  clubTestimonials,
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
    .slice(0, 3)
    .map((part) => part.charAt(0).toLocaleUpperCase("ro-RO"))
    .join("");
}

/** "Popescu Alexandru Daniel" → "popescu-alexandru-daniel". */
function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "antrenor"
  );
}

/**
 * Creates the legal pages, and brings a draft up to the current template version while nobody
 * has edited it or had it reviewed: a page the club changed (or a lawyer approved) stays as is.
 */
async function syncLegalDrafts(): Promise<Map<string, "created" | "updated" | "kept">> {
  const result = new Map<string, "created" | "updated" | "kept">();
  for (const legal of legalContent) {
    const exists = await db.legalPage.findUnique({ where: { kind: legal.kind } });
    const untouchedDraft =
      exists !== null &&
      !exists.reviewedByLawyer &&
      exists.version < LEGAL_VERSION &&
      exists.updatedAt.getTime() - exists.createdAt.getTime() < 60_000;
    await db.legalPage.upsert({
      where: { kind: legal.kind },
      // createdAt moves with it, so the page still reads as untouched for the next version.
      update: untouchedDraft ? { ...legal, version: LEGAL_VERSION, createdAt: new Date() } : {},
      create: { ...legal, version: LEGAL_VERSION, reviewedByLawyer: false },
    });
    result.set(legal.kind, exists ? (untouchedDraft ? "updated" : "kept") : "created");
  }
  return result;
}

/** The template variables of the home page texts, from config/club.yml. */
function sceneVars(config: ReturnType<typeof loadConfig>) {
  const location = config.locatii[0];
  const courts = (location?.terenuri ?? []).map((court) => ({
    count: integer(court.numar) ?? 0,
    covered: yesNo(court.acoperit_iarna) === true,
  }));
  const total = courts.reduce((sum, court) => sum + court.count, 0);
  const covered = courts.reduce((sum, court) => sum + (court.covered ? court.count : 0), 0);
  const founded = integer(config.club.infiintat);
  return {
    club: text(config.club.nume),
    locatie: text(location?.nume),
    oras: text(location?.localitate),
    terenuri: total > 0 ? String(total) : TODO,
    acoperite: covered > 0 ? String(covered) : TODO,
    exterior: total - covered > 0 ? String(total - covered) : TODO,
    an: founded ? String(founded) : TODO,
  };
}

/**
 * The home page sections and the page headers: the site's structure, which the admin edits but
 * cannot delete. Missing ones are created at every start, so a new version's sections appear on
 * an existing site; texts the club edited are never touched.
 */
async function syncStructure(
  config: ReturnType<typeof loadConfig>,
): Promise<Map<string, "created" | "kept">> {
  const result = new Map<string, "created" | "kept">();
  for (const scene of sceneSeeds(sceneVars(config))) {
    const exists = await db.scene.findUnique({ where: { key: scene.key } });
    await db.scene.upsert({ where: { key: scene.key }, update: {}, create: scene });
    result.set(`scena ${scene.key}`, exists ? "kept" : "created");
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
    result.set(`antet ${header.key}`, exists ? "kept" : "created");
  }
  return result;
}

async function main(): Promise<void> {
  // In the Docker image the seed runs at every start with --if-empty: only a brand-new database
  // gets the initial content, so what the coach deleted in the admin never comes back.
  if (
    process.argv.includes("--if-empty") &&
    (await db.siteSettings.findUnique({ where: { id: 1 } }))
  ) {
    const updated = [...(await syncLegalDrafts())].filter(([, state]) => state === "updated");
    const added = [...(await syncStructure(loadConfig()))].filter(
      ([, state]) => state === "created",
    );
    const changes = [
      ...updated.map(([kind]) => `ciorna legală ${kind} actualizată`),
      ...added.map(([label]) => label),
      ...(await syncClubAssets(db)),
    ];
    console.info(
      changes.length > 0
        ? `Seed: baza de date are deja conținut; am adăugat sau actualizat: ${changes.join(", ")}.`
        : "Seed: baza de date are deja conținut, nu adaug nimic.",
    );
    return;
  }
  const config = loadConfig();
  const created: string[] = [];
  const note = (label: string, wasCreated: boolean) => {
    if (wasCreated) created.push(label);
  };

  const clubName = text(config.club.nume);
  const firstLocation = config.locatii[0];
  if (!firstLocation) throw new Error("config/club.yml: lipsește cel puțin o locație.");
  const locationName = text(firstLocation.nume);
  const city = text(firstLocation.localitate);

  const courtRows = firstLocation.terenuri.map((court) => ({
    count: integer(court.numar) ?? 0,
    covered: yesNo(court.acoperit_iarna) === true,
  }));
  const coveredTotal = courtRows.reduce((sum, court) => sum + (court.covered ? court.count : 0), 0);

  // ── Settings ──────────────────────────────────────────────────────────────
  // The club's opening hours (court hire) when given; otherwise the lesson hours.
  const clubHours = hoursRange(config.program_club?.zilnic);
  const lessonHours = [
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
  const workingHours = clubHours
    ? [
        {
          label: { ro: "Zilnic", en: "Every day" },
          hours: same(`${clubHours.start}–${clubHours.end}`),
        },
      ]
    : lessonHours;
  const foundedYear = integer(config.club.infiintat);
  const rentalRates = isPlaceholder(config.inchiriere?.tarife)
    ? todoT
    : isPlaceholder(config.inchiriere?.tarife_en)
      ? { ro: text(config.inchiriere?.tarife) }
      : { ro: text(config.inchiriere?.tarife), en: text(config.inchiriere?.tarife_en) };
  const google = config.recenzii_google;
  const googleRating = decimal(google?.nota);
  const googleReviewCount = integer(google?.numar);
  const googleReviewUrl = optionalText(google?.link);

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
      brandName: clubName,
      monogram: isPlaceholder(config.club.monograma)
        ? initials(clubName)
        : String(config.club.monograma).trim().slice(0, 4),
      tagline: localizedText(config.club.descriere, "Tennis academy"),
      colorBrand: hexColor(config.club.culori?.principala) ?? "#0f3b2f",
      colorAccent: hexColor(config.club.culori?.accent) ?? "#c24f1d",
      phone: text(config.contact.telefon),
      // Optional: without a WhatsApp number the WhatsApp buttons simply do not appear.
      whatsapp: phoneDigits(config.contact.whatsapp) ?? "",
      email: text(config.contact.email),
      instagramUrl: optionalText(config.contact.instagram),
      facebookUrl: optionalText(config.contact.facebook),
      tiktokUrl: optionalText(config.contact.tiktok),
      // What people type into Google first ("tenis Pantelimon", "cursuri tenis copii", "închiriere
      // teren tenis"), then the club's name; the description leads with the offers.
      seoTitle: {
        ro: `Tenis ${city}: cursuri copii și adulți, închiriere teren · ${clubName}`,
        en: `Tennis in ${city}: courses for children and adults, court hire · ${clubName}`,
      },
      seoDescription: {
        // Under 160 characters, so Google shows it whole.
        ro: `8 terenuri de zgură în ${city}, ${coveredTotal} acoperite, 07:00–22:00. Tenis de la 4 ani, juniori și adulți. Iarna 60 lei/oră; copiii au 2 ședințe gratuite.`,
        en: `8 clay courts in ${city}, ${coveredTotal} covered, open 07:00–22:00. Tennis from age 4, juniors and adults. Winter courts 60 lei/hour; 2 free sessions for kids.`,
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
      foundedYear,
      rentalRates,
      googleRating: googleRating === null ? null : Number(googleRating),
      googleReviewCount,
      googleReviewUrl,
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
  // Fields added in later versions are filled in on an existing site, never overwritten.
  if (settingsExisting) {
    const fill: Prisma.SiteSettingsUpdateInput = {};
    if (settingsExisting.foundedYear === null && foundedYear !== null)
      fill.foundedYear = foundedYear;
    if (settingsExisting.rentalRates === null) fill.rentalRates = rentalRates;
    if (settingsExisting.googleRating === null && googleRating !== null)
      fill.googleRating = Number(googleRating);
    if (settingsExisting.googleReviewCount === null && googleReviewCount !== null)
      fill.googleReviewCount = googleReviewCount;
    if (settingsExisting.googleReviewUrl === null && googleReviewUrl)
      fill.googleReviewUrl = googleReviewUrl;
    if (Object.keys(fill).length > 0) {
      await db.siteSettings.update({ where: { id: 1 }, data: fill });
      note("setări noi", true);
    }
  }

  // ── Coaching team & certifications ─────────────────────────────────────────
  for (const [coachIndex, entry] of config.antrenori.entries()) {
    const name = text(entry.nume);
    const slug = slugify(name === TODO ? `antrenor-${coachIndex + 1}` : name);
    const exists = await db.coach.findUnique({ where: { slug } });
    const results = optionalLocalized(entry.rezultate_elevi);
    const coach = await db.coach.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name,
        role: localizedText(entry.rol, coachIndex === 0 ? "Head coach" : "Coach"),
        title: localizedText(entry.titulatura, "Tennis coach"),
        summary: localizedText(entry.rezumat),
        story: localizedText(entry.parcurs),
        // The team's shared philosophy is on the home page; a coach's own text is optional.
        philosophy: Prisma.DbNull,
        results: results ?? Prisma.DbNull,
        specialties: {
          ro: entry.specializari.map((item) => localizedText(item).ro),
          en: entry.specializari.map((item) => localizedText(item).en),
        },
        yearsExperience: integer(entry.ani_experienta),
        languages: entry.limbi_vorbite
          .filter((lang) => !isPlaceholder(lang))
          .map((lang) => {
            const ro = String(lang).trim();
            const en = LANGUAGE_TRANSLATIONS[ro.toLowerCase()];
            return en ? { ro, en } : { ro };
          }),
        isHead: coachIndex === 0,
        order: coachIndex,
        // Coaches listed publicly but not yet confirmed by the club wait in the admin.
        active: yesNo(entry.publicat) !== false,
      },
    });
    note(`antrenor ${name}`, !exists);

    for (const [index, certification] of entry.certificari.entries()) {
      // The head coach keeps the ids of the first version, so an upgraded database is not
      // given a second copy of the certifications it already has.
      const number = String(index + 1).padStart(2, "0");
      const id = coachIndex === 0 ? `seed-cert-${number}` : `seed-cert-${coachIndex + 1}-${number}`;
      const certExists = await db.certification.findUnique({ where: { id } });
      let data: { title: { ro: string; en: string }; issuer: string; year: number | null };
      if (certification !== null && typeof certification === "object") {
        data = {
          title: localizedText(certification.titlu),
          issuer: text(certification.emitent),
          year: integer(certification.an),
        };
      } else {
        // Short form: "Title, Issuer".
        const raw = text(certification);
        const [title, ...issuerParts] = raw === TODO ? [TODO] : raw.split(",");
        data = {
          title: same((title ?? TODO).trim()),
          issuer: issuerParts.length > 0 ? issuerParts.join(",").trim() : TODO,
          year: null,
        };
      }
      await db.certification.upsert({
        where: { id },
        update: {},
        create: { id, coachId: coach.id, ...data, order: index },
      });
      note(`certificare ${coachIndex + 1}.${index + 1}`, !certExists);
    }
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
      directions: locationDirections,
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
    const description = amenityDescriptions[key];
    await db.facility.upsert({
      where: { id },
      // A description added in a later version fills an empty one; an edited one stays.
      update: description && exists && exists.description === null ? { description } : {},
      create: {
        id,
        locationId,
        type: "DOTARE_BAZA",
        name,
        description: description ?? Prisma.DbNull,
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
        bookableOnline: content.bookableOnline ?? true,
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

  const individualId = lessonIds.get("antrenament-individual") ?? null;
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

  // ── Junior academy groups ──────────────────────────────────────────────────
  for (const [index, group] of config.academie_juniori.grupe.entries()) {
    const stageName = String(group.etapa ?? "")
      .trim()
      .toLowerCase();
    const content = stageContent.find((stage) => stage.configName === stageName);
    if (!content) continue;
    const exists = await db.academyGroup.findUnique({ where: { slug: content.slug } });
    const ages = ageRange(group.varsta);
    const programSlug = programContent.find(
      (program) => program.configName === String(group.program ?? "").trim(),
    )?.slug;
    const schedule = optionalLocalized(group.zile_ore);
    await db.academyGroup.upsert({
      where: { slug: content.slug },
      update: {},
      create: {
        slug: content.slug,
        name: content.name,
        stage: content.stage,
        ageMin: ages.min,
        ageMax: ages.max,
        level: content.level,
        summary: content.summary,
        focusPoints: content.focusPoints,
        sessionsPerWeek: integer(group.sedinte_pe_saptamana),
        sessionMinutes: integer(group.durata_min),
        // Days and hours stay visibly missing until the club fills them in.
        schedule: schedule ?? Prisma.DbNull,
        monthlyFee: decimal(group.taxa_lunara_ron),
        maxPlayers: integer(group.locuri),
        programId: programSlug ? (programIds.get(programSlug) ?? null) : null,
        order: index,
      },
    });
    note(`grupă ${content.slug}`, !exists);
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

  for (const [key, state] of await syncStructure(config)) note(key, state === "created");

  // ── Tournaments hosted at the club ──────────────────────────────────────────
  for (const [index, tournament] of tournamentContent.entries()) {
    const exists = await db.tournament.findUnique({ where: { slug: tournament.slug } });
    await db.tournament.upsert({
      where: { slug: tournament.slug },
      update: {},
      create: { ...tournament, order: index },
    });
    note(`turneu ${tournament.slug}`, !exists);
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
          ro: faq.answer.ro
            .replaceAll("{ore} de ore", roCount(Number(cancelHours), "o oră", "ore"))
            .replaceAll("{ore}", cancelHours),
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

  // ── Posts: the club's tennis tips, published ───────────────────────────────
  for (const [index, post] of postContent.entries()) {
    const exists = await db.post.findUnique({ where: { slug: post.slug } });
    await db.post.upsert({
      where: { slug: post.slug },
      update: {},
      // One day apart, so the list keeps the order they are written in.
      create: {
        ...post,
        status: "PUBLICAT",
        publishedAt: new Date(Date.now() - (index + 1) * 86_400_000),
      },
    });
    note(`articol ${post.slug}`, !exists);
  }

  // ── The reviews already public on the club's own site ─────────────────────
  for (const [index, testimonial] of clubTestimonials.entries()) {
    const exists = await db.testimonial.findUnique({ where: { id: testimonial.id } });
    await db.testimonial.upsert({
      where: { id: testimonial.id },
      update: {},
      create: {
        ...testimonial,
        isExample: false,
        consent: testimonial.published,
        consentAt: testimonial.published ? new Date() : null,
        order: index,
      },
    });
    note(`recenzie ${index + 1}`, !exists);
  }

  // ── Legal pages & page headers ────────────────────────────────────────────
  for (const [kind, state] of await syncLegalDrafts()) {
    note(
      `pagina legală ${kind}${state === "updated" ? " (actualizată)" : ""}`,
      state === "created",
    );
  }

  for (const label of await syncClubAssets(db)) note(label, true);

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
