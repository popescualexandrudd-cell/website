import type {
  AcademyGroupView,
  CoachView,
  FacilityView,
  FaqView,
  LessonTypeView,
  LocalizedSettings,
  LocationView,
  PriceView,
  ProgramView,
} from "@/lib/content";
import { TODO_MARK } from "@/lib/i18n-content";
import { durationLabel, formatAmount, lessonPrice } from "@/lib/pricing";
import type { Locale } from "@/i18n/routing";

/** Site pages the assistant may link to, already translated for the page's language. */
export type KnowledgePaths = {
  home: string;
  programs: string;
  academy: string;
  evaluation: string;
  waitlist: string;
  team: string;
  pricing: string;
  booking: string;
  facilities: string;
  gallery: string;
  faq: string;
  contact: string;
  tips: string;
  privacy: string;
};

export type KnowledgeInput = {
  locale: Locale;
  settings: Pick<
    LocalizedSettings,
    | "brandName"
    | "tagline"
    | "seoDescription"
    | "phone"
    | "whatsapp"
    | "email"
    | "instagramUrl"
    | "facebookUrl"
    | "tiktokUrl"
    | "bookingMode"
    | "freeCancelHours"
    | "firstLessonText"
    | "paymentMethods"
    | "workingHours"
    | "currency"
  > & { minNoticeHours: number; horizonDays: number };
  locations: LocationView[];
  facilities: FacilityView[];
  programs: (ProgramView & { path: string })[];
  lessons: LessonTypeView[];
  packages: PriceView[];
  groups: AcademyGroupView[];
  coaches: (CoachView & { path: string })[];
  faqs: FaqView[];
  posts: { title: string; excerpt: string; path: string }[];
  paths: KnowledgePaths;
};

const LABELS = {
  ro: {
    unknown: "nepublicat încă",
    yes: "da",
    no: "nu",
    contact: "Contact",
    phone: "Telefon",
    email: "Email",
    hours: "Program de lucru",
    contactPage: "Pagina de contact",
    location: "Baza sportivă",
    directions: "Cum ajungi",
    courts: "Terenuri",
    covered: "acoperite iarna",
    floodlights: "nocturnă",
    amenities: "Dotări și servicii",
    programs: "Programe de pregătire",
    forWhom: "Pentru",
    level: "nivel",
    ages: "vârste",
    years: "ani",
    fromAge: "de la {n} ani",
    upToAge: "până la {n} ani",
    focus: "Ce lucrăm",
    bookableOnline: "Se rezervă online",
    lessons: "Tipuri de lecții și prețuri",
    persons: "Persoane",
    durations: "Durate",
    rate: "Tarif",
    perHour: "pe oră",
    perHourPerson: "pe oră, de persoană",
    examples: "Prețuri pe durată",
    perPerson: "de persoană",
    bookLink: "Rezervare",
    packages: "Pachete",
    sessions: "ședințe",
    validDays: "valabil {n} zile",
    academy: "Academia de juniori",
    evaluation: "Cererea de evaluare",
    waitlist: "Lista de așteptare",
    stage: "Etapa",
    training: "Antrenamente",
    perWeek: "{n} pe săptămână",
    minutes: "{n} minute",
    schedule: "Program",
    scheduleOnRequest: "la cerere",
    monthlyFee: "Taxa lunară",
    places: "Locuri în grupă",
    program: "Programul",
    team: "Antrenori",
    head: "antrenor principal",
    experience: "Experiență",
    specialties: "Specializări",
    languages: "Limbi",
    certifications: "Formare",
    profile: "Profil",
    booking: "Rezervări, anulare și plată",
    modeRequest:
      "Rezervarea online e o cerere: clubul o confirmă prin email sau telefon; ora nu e sigură până la confirmare.",
    modeInstant: "Rezervarea online se confirmă pe loc, prin email.",
    cancel: "Anulare fără cost cu cel puțin {n} ore înainte, din linkul primit pe email.",
    notice: "Rezervările se fac cu cel puțin {n} ore înainte și cel mult {d} zile în avans.",
    firstLesson: "Prima lecție",
    payment: "Plata",
    faqs: "Întrebări frecvente",
    q: "Întrebare",
    a: "Răspuns",
    posts: "Articole de pe site",
    pages: "Paginile site-ului",
    pageNames: {
      home: "Pagina principală",
      programs: "Programe",
      academy: "Academia de juniori",
      evaluation: "Cerere de evaluare pentru copii",
      waitlist: "Lista de așteptare",
      team: "Echipa de antrenori",
      pricing: "Prețuri",
      booking: "Rezervare online",
      facilities: "Baza sportivă",
      gallery: "Galerie foto și video",
      faq: "Întrebări frecvente",
      contact: "Contact",
      tips: "Sfaturi",
      privacy: "Confidențialitate",
    },
    audience: { COPII: "copii", JUNIORI: "juniori", ADULTI: "adulți", TOATE: "orice vârstă" },
    levels: {
      INCEPATOR: "începători",
      INTERMEDIAR: "intermediar",
      AVANSAT: "avansat",
      COMPETITIE: "competiție",
      TOATE: "orice nivel",
    },
    stages: {
      ROSU: "minge roșie",
      PORTOCALIU: "minge portocalie",
      VERDE: "minge verde",
      GALBEN: "minge galbenă",
    },
    surfaces: {
      ZGURA: "zgură",
      HARD: "hard",
      IARBA: "iarbă",
      SINTETIC: "sintetic",
      COVOR: "covor",
    },
    units: {
      LECTIE: "lecția",
      PERSOANA: "de persoană",
      LUNA: "pe lună",
      PACHET: "pachetul",
      EVENIMENT: "de participant",
    },
  },
  en: {
    unknown: "not published yet",
    yes: "yes",
    no: "no",
    contact: "Contact",
    phone: "Phone",
    email: "Email",
    hours: "Opening hours",
    contactPage: "Contact page",
    location: "The venue",
    directions: "Getting there",
    courts: "Courts",
    covered: "covered in winter",
    floodlights: "floodlights",
    amenities: "Amenities and services",
    programs: "Training programmes",
    forWhom: "For",
    level: "level",
    ages: "ages",
    years: "years",
    fromAge: "from {n}",
    upToAge: "up to {n}",
    focus: "What we work on",
    bookableOnline: "Bookable online",
    lessons: "Kinds of lesson and prices",
    persons: "People",
    durations: "Lengths",
    rate: "Rate",
    perHour: "per hour",
    perHourPerson: "per hour, per person",
    examples: "Price by length",
    perPerson: "per person",
    bookLink: "Booking",
    packages: "Packages",
    sessions: "sessions",
    validDays: "valid for {n} days",
    academy: "Junior academy",
    evaluation: "Assessment request",
    waitlist: "Waiting list",
    stage: "Stage",
    training: "Training",
    perWeek: "{n} a week",
    minutes: "{n} minutes",
    schedule: "Schedule",
    scheduleOnRequest: "on request",
    monthlyFee: "Monthly fee",
    places: "Places in the group",
    program: "Programme",
    team: "Coaches",
    head: "head coach",
    experience: "Experience",
    specialties: "Specialities",
    languages: "Languages",
    certifications: "Training",
    profile: "Profile",
    booking: "Booking, cancelling and payment",
    modeRequest:
      "An online booking is a request: the club confirms it by email or phone; the time is not certain until then.",
    modeInstant: "An online booking is confirmed straight away, by email.",
    cancel: "Free cancellation at least {n} hours before, from the link in the email.",
    notice: "Bookings are made at least {n} hours ahead and at most {d} days in advance.",
    firstLesson: "The first lesson",
    payment: "Payment",
    faqs: "Frequently asked questions",
    q: "Question",
    a: "Answer",
    posts: "Articles on the site",
    pages: "Pages of the site",
    pageNames: {
      home: "Home page",
      programs: "Programmes",
      academy: "Junior academy",
      evaluation: "Assessment request for children",
      waitlist: "Waiting list",
      team: "The coaching team",
      pricing: "Prices",
      booking: "Online booking",
      facilities: "The venue",
      gallery: "Photo and video gallery",
      faq: "Frequently asked questions",
      contact: "Contact",
      tips: "Tips",
      privacy: "Privacy",
    },
    audience: { COPII: "children", JUNIORI: "juniors", ADULTI: "adults", TOATE: "all ages" },
    levels: {
      INCEPATOR: "beginners",
      INTERMEDIAR: "intermediate",
      AVANSAT: "advanced",
      COMPETITIE: "competition",
      TOATE: "any level",
    },
    stages: {
      ROSU: "red ball",
      PORTOCALIU: "orange ball",
      VERDE: "green ball",
      GALBEN: "yellow ball",
    },
    surfaces: {
      ZGURA: "clay",
      HARD: "hard",
      IARBA: "grass",
      SINTETIC: "synthetic",
      COVOR: "carpet",
    },
    units: {
      LECTIE: "per lesson",
      PERSOANA: "per person",
      LUNA: "per month",
      PACHET: "per package",
      EVENIMENT: "per participant",
    },
  },
} as const;

/** A value the club has not filled in yet ("[DE COMPLETAT]" or empty) is not knowledge. */
export function known(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes(TODO_MARK)) return null;
  return trimmed;
}

/** "24 de ore", "60 de zile": Romanian puts "de" after 20 and above; English does not. */
function count(n: number, locale: Locale): string {
  const rest = n % 100;
  return locale === "ro" && ((rest === 0 && n !== 0) || rest >= 20) ? `${n} de` : String(n);
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

/** One "Label: value" line, or the "not published" note when the club left it empty. */
function line(label: string, value: string | null | undefined, unknown: string): string {
  return `- ${label}: ${known(value) ?? `(${unknown})`}`;
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Longer Markdown texts keep their lines and lists; headings become "Heading:" lines. */
function plain(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/^#{1,6}\s+(.+?)\s*$/, "$1:").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Everything the assistant may say about the club, as plain text in the page's language: contact,
 * venue, programmes, lessons and prices, the junior academy, the coaches, the booking rules, the
 * FAQ and the site's pages. Values the club has not filled in are marked as not published, so
 * the assistant says it does not know instead of guessing.
 */
export function formatKnowledge(input: KnowledgeInput): string {
  const { locale, settings: s, paths } = input;
  const L = LABELS[locale === "en" ? "en" : "ro"];
  const money = (value: string | number | null) => {
    if (value === null || value === "") return null;
    const amount = typeof value === "number" ? value : Number(value);
    return Number.isFinite(amount) && amount > 0 ? formatAmount(amount, s.currency, locale) : null;
  };
  const ageRange = (min: number | null, max: number | null) => {
    if (min !== null && max !== null) return `${min}–${max} ${L.years}`;
    if (min !== null) return fill(L.fromAge, { n: min });
    if (max !== null) return fill(L.upToAge, { n: max });
    return null;
  };
  const out: string[] = [];

  out.push(`# ${s.brandName}`);
  const intro = [known(s.tagline), known(s.seoDescription)].filter(Boolean).join(". ");
  if (intro) out.push(intro);

  out.push("", `## ${L.contact}`);
  out.push(line(L.phone, s.phone, L.unknown));
  if (known(s.whatsapp)) out.push(`- WhatsApp: ${known(s.whatsapp)}`);
  out.push(line(L.email, s.email, L.unknown));
  for (const [name, url] of [
    ["Instagram", s.instagramUrl],
    ["Facebook", s.facebookUrl],
    ["TikTok", s.tiktokUrl],
  ] as const) {
    if (known(url)) out.push(`- ${name}: ${known(url)}`);
  }
  const hours = s.workingHours
    .map((row) => (known(row.hours) ? `${row.label} ${known(row.hours)}` : null))
    .filter(Boolean);
  out.push(`- ${L.hours}: ${hours.length > 0 ? hours.join("; ") : `(${L.unknown})`}`);
  out.push(`- ${L.contactPage}: ${paths.contact}`);

  for (const location of input.locations) {
    out.push("", `## ${L.location}: ${location.name}`);
    // The address often already names the town and county: each part appears once.
    const address = [location.address, location.city, location.region, location.postalCode]
      .map((part) => known(part))
      .filter((part, i, parts): part is string => {
        if (!part) return false;
        const before = parts.slice(0, i).join(", ").toLocaleLowerCase(locale);
        return !before.includes(part.toLocaleLowerCase(locale));
      })
      .join(", ");
    out.push(`- ${address || `(${L.unknown})`}`);
    if (known(location.directions)) out.push(`- ${L.directions}: ${oneLine(location.directions)}`);
    if (known(location.mapUrl)) out.push(`- Google Maps: ${known(location.mapUrl)}`);
    for (const court of location.courts) {
      const details = [
        court.count !== null
          ? `${court.count} × ${L.surfaces[court.surface]}`
          : L.surfaces[court.surface],
        court.coveredInWinter !== null
          ? `${L.covered}: ${court.coveredInWinter ? L.yes : L.no}`
          : null,
        court.floodlights !== null ? `${L.floodlights}: ${court.floodlights ? L.yes : L.no}` : null,
      ].filter(Boolean);
      out.push(`- ${L.courts} (${court.name}): ${details.join(", ")}`);
    }
  }
  const amenities = input.facilities
    .map((f) => {
      const name = known(f.name);
      if (!name) return null;
      const description = known(f.description);
      return description ? `${name}: ${oneLine(description)}` : name;
    })
    .filter(Boolean);
  if (amenities.length > 0) {
    out.push("", `## ${L.amenities} (${paths.facilities})`);
    for (const item of amenities) out.push(`- ${item}`);
  }

  if (input.programs.length > 0) {
    out.push("", `## ${L.programs} (${paths.programs})`);
    for (const p of input.programs) {
      out.push("", `### ${p.name} (${p.path})`);
      const meta = [
        `${L.forWhom}: ${L.audience[p.audience]}`,
        `${L.level}: ${L.levels[p.level]}`,
        ageRange(p.ageMin, p.ageMax) ? `${L.ages}: ${ageRange(p.ageMin, p.ageMax)}` : null,
        `${L.bookableOnline}: ${p.bookableOnline ? L.yes : L.no}`,
      ].filter(Boolean);
      out.push(meta.join("; "));
      if (known(p.summary)) out.push(oneLine(p.summary));
      if (known(p.description) && p.description !== p.summary) out.push(plain(p.description));
      const focus = p.focusPoints.map(known).filter(Boolean);
      if (focus.length > 0) out.push(`${L.focus}: ${focus.join("; ")}`);
    }
  }

  if (input.lessons.length > 0) {
    out.push("", `## ${L.lessons} (${paths.pricing})`);
    for (const lesson of input.lessons) {
      const perPerson = lesson.priceUnit === "PERSOANA";
      out.push("", `### ${lesson.name}`);
      const persons =
        lesson.minParticipants === lesson.maxParticipants
          ? String(lesson.minParticipants)
          : `${lesson.minParticipants}–${lesson.maxParticipants}`;
      const rate = money(lesson.hourlyRate);
      out.push(
        [
          `${L.persons}: ${persons}`,
          `${L.durations}: ${lesson.durations.map(durationLabel).join(", ")}`,
          `${L.rate}: ${rate ? `${rate} ${perPerson ? L.perHourPerson : L.perHour}` : `(${L.unknown})`}`,
        ].join("; "),
      );
      if (rate) {
        const examples = lesson.durations
          .map((minutes) => {
            const amount = lessonPrice(lesson.hourlyRate, minutes);
            return amount === null
              ? null
              : `${durationLabel(minutes)}: ${formatAmount(amount, s.currency, locale)}`;
          })
          .filter(Boolean);
        if (examples.length > 0)
          out.push(`${L.examples}: ${examples.join(" · ")}${perPerson ? ` (${L.perPerson})` : ""}`);
      }
      if (known(lesson.summary)) out.push(oneLine(lesson.summary));
      out.push(
        lesson.bookableOnline
          ? `${L.bookLink}: ${paths.booking}?tip=${lesson.slug}`
          : `${L.bookableOnline}: ${L.no}`,
      );
    }
  }

  const packages = input.packages.filter((p) => known(p.name));
  if (packages.length > 0) {
    out.push("", `## ${L.packages}`);
    for (const p of packages) {
      const parts = [
        money(p.price) ? `${money(p.price)} ${L.units[p.unit]}` : `(${L.unknown})`,
        p.sessions ? `${p.sessions} ${L.sessions}` : null,
        p.validityDays ? fill(L.validDays, { n: count(p.validityDays, locale) }) : null,
      ].filter(Boolean);
      const includes = known(p.includes);
      out.push(`- ${p.name}: ${parts.join(", ")}${includes ? `. ${oneLine(includes)}` : ""}`);
    }
  }

  if (input.groups.length > 0) {
    out.push("", `## ${L.academy} (${paths.academy})`);
    out.push(`${L.evaluation}: ${paths.evaluation}`);
    out.push(`${L.waitlist}: ${paths.waitlist}`);
    for (const g of input.groups) {
      out.push("", `### ${g.name}`);
      const training =
        g.sessionsPerWeek !== null || g.sessionMinutes !== null
          ? [
              g.sessionsPerWeek !== null ? fill(L.perWeek, { n: g.sessionsPerWeek }) : null,
              g.sessionMinutes !== null
                ? fill(L.minutes, { n: count(g.sessionMinutes, locale) })
                : null,
            ]
              .filter(Boolean)
              .join(" × ")
          : null;
      const meta = [
        g.stage ? `${L.stage}: ${L.stages[g.stage]}` : null,
        ageRange(g.ageMin, g.ageMax) ? `${L.ages}: ${ageRange(g.ageMin, g.ageMax)}` : null,
        `${L.level}: ${L.levels[g.level]}`,
        `${L.training}: ${training ?? `(${L.unknown})`}`,
        `${L.schedule}: ${known(g.schedule) ?? L.scheduleOnRequest}`,
        `${L.monthlyFee}: ${money(g.monthlyFee) ?? `(${L.unknown})`}`,
        g.maxPlayers !== null ? `${L.places}: ${g.maxPlayers}` : null,
        g.program ? `${L.program}: ${g.program.name}` : null,
      ].filter(Boolean);
      out.push(meta.join("; "));
      if (known(g.summary)) out.push(oneLine(g.summary));
      const focus = g.focusPoints.map(known).filter(Boolean);
      if (focus.length > 0) out.push(`${L.focus}: ${focus.join("; ")}`);
    }
  }

  const coaches = input.coaches.filter((c) => known(c.name));
  if (coaches.length > 0) {
    out.push("", `## ${L.team} (${paths.team})`);
    for (const c of coaches) {
      const headNoted = known(c.role)?.toLocaleLowerCase(locale).includes(L.head) ?? false;
      const role = [known(c.role), c.isHead && !headNoted ? L.head : null]
        .filter(Boolean)
        .join(", ");
      out.push("", `### ${c.name}${role ? `: ${role}` : ""} (${c.path})`);
      const meta = [
        known(c.title),
        c.yearsExperience !== null
          ? `${L.experience}: ${count(c.yearsExperience, locale)} ${L.years}`
          : null,
        c.specialties.map(known).filter(Boolean).length > 0
          ? `${L.specialties}: ${c.specialties.map(known).filter(Boolean).join(", ")}`
          : null,
        c.languages.length > 0 ? `${L.languages}: ${c.languages.join(", ")}` : null,
      ].filter(Boolean);
      if (meta.length > 0) out.push(meta.join("; "));
      if (known(c.summary)) out.push(oneLine(c.summary));
      const certifications = c.certifications
        .map((cert) => {
          const title = known(cert.title);
          if (!title) return null;
          return [title, known(cert.issuer), cert.year ? String(cert.year) : null]
            .filter(Boolean)
            .join(", ");
        })
        .filter(Boolean);
      if (certifications.length > 0) out.push(`${L.certifications}: ${certifications.join("; ")}`);
    }
  }

  out.push("", `## ${L.booking} (${paths.booking})`);
  out.push(`- ${s.bookingMode === "INSTANT" ? L.modeInstant : L.modeRequest}`);
  out.push(`- ${fill(L.cancel, { n: count(s.freeCancelHours, locale) })}`);
  out.push(
    `- ${fill(L.notice, {
      n: count(s.minNoticeHours, locale),
      d: count(s.horizonDays, locale),
    })}`,
  );
  if (known(s.firstLessonText)) out.push(`- ${L.firstLesson}: ${oneLine(s.firstLessonText)}`);
  const payment = s.paymentMethods.map(known).filter(Boolean);
  out.push(`- ${L.payment}: ${payment.length > 0 ? payment.join(", ") : `(${L.unknown})`}`);

  const faqs = input.faqs.filter((f) => known(f.question) && known(f.answer));
  if (faqs.length > 0) {
    out.push("", `## ${L.faqs} (${paths.faq})`);
    for (const f of faqs) {
      out.push("", `${L.q}: ${oneLine(f.question)}`, `${L.a}: ${oneLine(f.answer)}`);
    }
  }

  if (input.posts.length > 0) {
    out.push("", `## ${L.posts} (${paths.tips})`);
    for (const post of input.posts) {
      const excerpt = known(post.excerpt);
      out.push(`- ${post.title} (${post.path})${excerpt ? `: ${oneLine(excerpt)}` : ""}`);
    }
  }

  out.push("", `## ${L.pages}`);
  for (const [key, name] of Object.entries(L.pageNames)) {
    out.push(`- ${name}: ${paths[key as keyof KnowledgePaths]}`);
  }

  return out.join("\n");
}
