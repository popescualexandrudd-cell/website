import "server-only";
import { db } from "../db";
import { t, TODO_MARK } from "../i18n-content";
import { countLabel } from "./format";
import { contrastWithWhite } from "../color";
import {
  AUDIENCES,
  BALL_STAGES,
  BOOKING_MODES,
  FACILITY_TYPES,
  FAQ_CATEGORIES,
  GALLERY_CATEGORIES,
  LEVELS,
  POST_STATUSES,
  PRICE_UNITS,
  RESULT_LEVELS,
  SURFACES,
  TIMEZONES,
  optionLabel,
  type FieldDef,
  type Option,
} from "./fields";

export type Row = Record<string, unknown> & { id: string | number };

/**
 * The subset of a Prisma model delegate the generic editor uses. Data passed in is
 * built only from the field definitions below, after validation.
 */
export type Delegate = {
  findMany(args?: Record<string, unknown>): Promise<Row[]>;
  findUnique(args: { where: Record<string, unknown> }): Promise<Row | null>;
  create(args: { data: Record<string, unknown> }): Promise<Row>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<Row>;
  delete(args: { where: Record<string, unknown> }): Promise<Row>;
  count(args?: Record<string, unknown>): Promise<number>;
};

export type ModelName =
  | "scene"
  | "program"
  | "lessonType"
  | "pricingPlan"
  | "location"
  | "court"
  | "facility"
  | "coach"
  | "certification"
  | "academyGroup"
  | "result"
  | "faq"
  | "testimonial"
  | "galleryItem"
  | "post"
  | "pageHeader"
  | "legalPage"
  | "siteSettings";

type Client = Pick<typeof db, ModelName>;

export function delegate(model: ModelName, client: Client = db): Delegate {
  return client[model] as unknown as Delegate;
}

export type Resource = {
  key: string;
  model: ModelName;
  /** Prisma model name, for the audit log. */
  entity: string;
  label: string;
  singular: string;
  /** Button text and page title for a new row (only for resources that allow creating). */
  addLabel?: string;
  newTitle?: string;
  description: string;
  section: string;
  fields: FieldDef[];
  orderable?: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
  /** Singletons (profile, settings) have one row with a fixed id. */
  singletonId?: number;
  ownerOnly?: boolean;
  listOrderBy: Record<string, unknown> | Record<string, unknown>[];
  title: (row: Row) => string;
  meta?: (row: Row) => string;
  flags?: (row: Row) => string[];
  publicPath?: (row: Row) => string | null;
  /** Hides fields that do not apply to this row (e.g. texts only one scene uses). */
  fieldFilter?: (field: FieldDef, row: Row | null) => boolean;
  /** Cross-field rules and derived values; returns an error message to refuse the save. */
  prepare?: (data: Record<string, unknown>, before: Row | null) => string | null;
  /** Explains why a row cannot be deleted, or null when it can. */
  deleteBlocked?: (row: Row) => Promise<string | null>;
  /** Keeps other rows consistent with the one just saved (e.g. a single head coach). */
  afterSave?: (saved: Row) => Promise<void>;
};

const str = (value: unknown): string =>
  typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
const ro = (value: unknown): string => t(value, "ro");
const yes = (value: unknown): boolean => value === true;

export function rowHasTodo(row: Row): boolean {
  return JSON.stringify(row).includes(TODO_MARK);
}

// ─── Shared field groups ─────────────────────────────────────────────────────

const seoFields = (group = "Motoare de căutare (opțional)"): FieldDef[] => [
  {
    kind: "i18n",
    name: "seoTitle",
    label: "Titlu pentru Google",
    help: "Până la 60 de caractere. Gol = titlul paginii.",
    nullable: true,
    group,
    maxLength: 70,
  },
  {
    kind: "i18nText",
    name: "seoDescription",
    label: "Descriere pentru Google",
    help: "Până la 160 de caractere.",
    nullable: true,
    group,
    rows: 2,
  },
];

// ─── Resources ───────────────────────────────────────────────────────────────

const PAGE_PATHS: Record<string, string> = {
  programe: "/programe",
  facilitati: "/facilitati",
  despre: "/despre",
  academie: "/academie",
  echipa: "/echipa",
  preturi: "/preturi",
  rezervare: "/rezervare",
  galerie: "/galerie",
  sfaturi: "/sfaturi",
  intrebari: "/intrebari",
  contact: "/contact",
  "lista-asteptare": "/lista-asteptare",
};

const LEGAL_PATHS: Record<string, string> = {
  CONFIDENTIALITATE: "/confidentialitate",
  TERMENI: "/termeni",
  COOKIES: "/cookies",
};

/** Extra texts that only one home-page section uses, edited as a small set of fields. */
const SCENE_EXTRAS: Record<string, { label: string; help?: string; keys: Option[] }> = {
  deschiderea: {
    label: "Al doilea buton și textul din cadru",
    help: "Video-ul (sau fotografia) de deschidere se alege din Setări → Identitatea clubului.",
    keys: [
      { value: "secondaryLabel", label: "Al doilea buton (duce la Academia de juniori)" },
      { value: "mediaNote", label: "Textul din cadru, până încarci video-ul" },
    ],
  },
  academia: {
    label: "Linkul către pagina academiei",
    keys: [{ value: "moreLabel", label: "Textul linkului" }],
  },
  echipa: {
    label: "Textul din ramele fără fotografie",
    keys: [{ value: "photoNote", label: "Textul din ramă, până încarci fotografia" }],
  },
  metoda: {
    label: "Laboratorul tehnic 3D",
    help: "Laboratorul apare doar dacă e activ în Setări → Funcții.",
    keys: [
      { value: "labTitle", label: "Titlul laboratorului" },
      { value: "labIntro", label: "Textul de sub titlu" },
    ],
  },
  clubul: {
    label: "Textul din cadru",
    keys: [{ value: "mediaNote", label: "Textul din cadru, până încarci o fotografie" }],
  },
  galerie: {
    label: "Textul pentru galeria goală",
    keys: [{ value: "emptyNote", label: "Textul afișat până publici fotografii" }],
  },
};

const scene: Resource = {
  key: "scene",
  model: "scene",
  entity: "Scene",
  label: "Secțiunile paginii principale",
  singular: "secțiunea",
  description:
    "Secțiunile paginii principale, de sus în jos: textele, butoanele și ordinea lor. Fotografiile, video-urile și cifrele vin din restul conținutului.",
  section: "Pagina principală",
  orderable: true,
  listOrderBy: { order: "asc" },
  title: (r) => `${ro(r.indexName)} · ${ro(r.title)}`,
  flags: (r) => (yes(r.active) ? [] : ["ascunsă"]),
  publicPath: () => "/",
  fieldFilter: (field, row) =>
    field.name !== "extra" || field.label === SCENE_EXTRAS[str(row?.key)]?.label,
  fields: [
    {
      kind: "i18n",
      name: "indexName",
      label: "Eticheta de deasupra titlului",
      help: "Un cuvânt sau două, de exemplu „Metoda”.",
      required: true,
      group: "Texte",
      maxLength: 60,
    },
    { kind: "i18n", name: "title", label: "Titlu", required: true, group: "Texte", maxLength: 160 },
    {
      kind: "i18nText",
      name: "body",
      label: "Text",
      help: "Listele numerotate (1. …, 2. …) devin pași; **text** devine îngroșat.",
      group: "Texte",
      rows: 6,
    },
    {
      kind: "i18n",
      name: "ctaLabel",
      label: "Textul butonului",
      help: "Gol = fără buton.",
      nullable: true,
      group: "Texte",
      maxLength: 60,
    },
    {
      kind: "text",
      name: "ctaHref",
      label: "Linkul butonului",
      help: "O pagină din site (de exemplu /rezervare) sau o adresă completă (https://…).",
      nullable: true,
      group: "Texte",
      maxLength: 300,
    },
    ...Object.values(SCENE_EXTRAS).map((extra): FieldDef => ({
      kind: "i18nRecord",
      name: "extra",
      label: extra.label,
      help: extra.help,
      nullable: true,
      group: "Texte",
      keys: extra.keys,
    })),
    { kind: "bool", name: "active", label: "Afișează secțiunea", group: "Publicare" },
  ],
};

const program: Resource = {
  key: "programe",
  model: "program",
  entity: "Program",
  label: "Programe de pregătire",
  singular: "programul",
  addLabel: "Adaugă un program",
  newTitle: "Program nou",
  description: "Inițiere, Competiție, Amatori: ce lucrăm, pentru cine, pagina fiecărui program.",
  section: "Programe și prețuri",
  orderable: true,
  canCreate: true,
  canDelete: true,
  listOrderBy: { order: "asc" },
  title: (r) => ro(r.name),
  meta: (r) => `${optionLabel(AUDIENCES, str(r.audience))} · ${optionLabel(LEVELS, str(r.level))}`,
  flags: (r) => [
    ...(yes(r.active) ? [] : ["inactiv"]),
    ...(yes(r.bookableOnline) ? [] : ["fără rezervare online"]),
  ],
  publicPath: (r) => `/programe/${str(r.slug)}`,
  prepare: (data) => {
    const min = typeof data.ageMin === "number" ? data.ageMin : null;
    const max = typeof data.ageMax === "number" ? data.ageMax : null;
    if (min !== null && max !== null && min > max)
      return "Vârsta minimă nu poate fi mai mare decât vârsta maximă.";
    return null;
  },
  deleteBlocked: async (r) => {
    const bookings = await db.booking.count({ where: { programId: String(r.id) } });
    return bookings > 0
      ? `Programul are ${countLabel(bookings, "rezervare", "rezervări")} în istoric și nu poate fi șters. Debifează „Activ” ca să nu mai apară pe site.`
      : null;
  },
  fields: [
    { kind: "i18n", name: "name", label: "Nume", required: true, group: "Texte", maxLength: 120 },
    {
      kind: "slug",
      name: "slug",
      label: "Adresa paginii",
      help: "Litere mici, cifre și cratime, de exemplu lectii-individuale.",
      required: true,
      group: "Texte",
    },
    {
      kind: "i18nText",
      name: "summary",
      label: "Rezumat (o frază)",
      required: true,
      group: "Texte",
      rows: 2,
    },
    {
      kind: "i18nMarkdown",
      name: "description",
      label: "Descriere completă",
      required: true,
      group: "Texte",
      rows: 14,
    },
    {
      kind: "i18nList",
      name: "focusPoints",
      label: "Pe ce lucrăm",
      help: "Câte un punct pe rând.",
      group: "Texte",
    },
    { kind: "enum", name: "audience", label: "Pentru cine", options: AUDIENCES, group: "Detalii" },
    { kind: "enum", name: "level", label: "Nivel", options: LEVELS, group: "Detalii" },
    {
      kind: "int",
      name: "ageMin",
      label: "Vârsta minimă",
      nullable: true,
      min: 3,
      max: 99,
      group: "Detalii",
    },
    {
      kind: "int",
      name: "ageMax",
      label: "Vârsta maximă",
      nullable: true,
      min: 3,
      max: 99,
      group: "Detalii",
    },
    {
      kind: "media",
      name: "imageId",
      label: "Fotografie (opțională)",
      help: "Format vertical 4:5, minimum 1200 px lățime. Fără fotografie, cardul folosește grafica programului.",
      nullable: true,
      group: "Imagine",
    },
    {
      kind: "bool",
      name: "bookableOnline",
      label: "Apare la rezervarea online",
      group: "Publicare",
    },
    { kind: "bool", name: "active", label: "Activ (apare pe site)", group: "Publicare" },
  ],
};

const lessonType: Resource = {
  key: "lectii",
  model: "lessonType",
  entity: "LessonType",
  label: "Tipuri de lecții",
  singular: "tipul de lecție",
  addLabel: "Adaugă un tip de lecție",
  newTitle: "Tip de lecție nou",
  description:
    "Individuală, în doi, în trei, de grup, analiză biomecanică: câte persoane, ce durate se pot alege la rezervare, tariful pe oră.",
  section: "Programe și prețuri",
  orderable: true,
  canCreate: true,
  canDelete: true,
  listOrderBy: { order: "asc" },
  title: (r) => ro(r.name),
  meta: (r) => {
    const people =
      r.minParticipants === r.maxParticipants
        ? `${str(r.minParticipants)} pers.`
        : `${str(r.minParticipants)}–${str(r.maxParticipants)} pers.`;
    const durations = Array.isArray(r.durations) ? `${r.durations.join(", ")} min` : "";
    const rate =
      r.hourlyRate === null || r.hourlyRate === undefined
        ? "tarif necompletat"
        : `${str(r.hourlyRate)} lei/oră ${optionLabel(PRICE_UNITS, str(r.priceUnit))}`;
    return `${people} · ${durations} · ${rate}`;
  },
  flags: (r) => [
    ...(yes(r.active) ? [] : ["inactiv"]),
    ...(yes(r.bookableOnline) ? [] : ["fără rezervare online"]),
    ...(r.hourlyRate === null ? ["fără tarif"] : []),
  ],
  publicPath: () => "/programe#tipuri-de-lectii",
  prepare: (data) => {
    const min = typeof data.minParticipants === "number" ? data.minParticipants : 1;
    const max = typeof data.maxParticipants === "number" ? data.maxParticipants : 1;
    if (min > max) return "Numărul minim de persoane nu poate fi mai mare decât cel maxim.";
    return null;
  },
  deleteBlocked: async (r) => {
    const bookings = await db.booking.count({ where: { lessonTypeId: String(r.id) } });
    return bookings > 0
      ? `Tipul de lecție are ${countLabel(bookings, "rezervare", "rezervări")} în istoric și nu poate fi șters. Debifează „Activ” ca să nu mai apară pe site.`
      : null;
  },
  fields: [
    { kind: "i18n", name: "name", label: "Nume", required: true, group: "Texte", maxLength: 120 },
    {
      kind: "slug",
      name: "slug",
      label: "Cod în adresă",
      help: "Litere mici, cifre și cratime, de exemplu lectie-in-doi. Apare în linkurile de rezervare.",
      required: true,
      group: "Texte",
    },
    {
      kind: "i18nText",
      name: "summary",
      label: "Descriere scurtă",
      required: true,
      group: "Texte",
      rows: 3,
    },
    {
      kind: "int",
      name: "minParticipants",
      label: "Minimum de persoane",
      required: true,
      min: 1,
      max: 20,
      group: "Persoane și durate",
    },
    {
      kind: "int",
      name: "maxParticipants",
      label: "Maximum de persoane",
      required: true,
      min: 1,
      max: 20,
      group: "Persoane și durate",
    },
    {
      kind: "intList",
      name: "durations",
      label: "Durate care se pot alege (minute)",
      help: "Despărțite prin virgulă, de exemplu 60, 90, 120, 150, 180. Apar în lista „Durata antrenamentului”.",
      required: true,
      min: 30,
      max: 600,
      group: "Persoane și durate",
    },
    {
      kind: "decimal",
      name: "hourlyRate",
      label: "Tarif pe oră",
      help: "Doar cifre, de exemplu 150. Prețul unei lecții se calculează din durată (90 min = 1,5 × tariful). Gol = „[DE COMPLETAT]” pe site.",
      nullable: true,
      group: "Tarif",
    },
    {
      kind: "enum",
      name: "priceUnit",
      label: "Tariful este",
      options: PRICE_UNITS.filter((o) => o.value === "LECTIE" || o.value === "PERSOANA"),
      group: "Tarif",
    },
    { kind: "bool", name: "bookableOnline", label: "Se poate rezerva online", group: "Publicare" },
    { kind: "bool", name: "active", label: "Activ (apare pe site)", group: "Publicare" },
  ],
};

const academyGroup: Resource = {
  key: "grupe-juniori",
  model: "academyGroup",
  entity: "AcademyGroup",
  label: "Grupele academiei de juniori",
  singular: "grupa",
  addLabel: "Adaugă o grupă",
  newTitle: "Grupă nouă",
  description: "Grupele pe vârste și etape: ce lucrează, când se antrenează, taxa lunară.",
  section: "Academia de juniori",
  orderable: true,
  canCreate: true,
  canDelete: true,
  listOrderBy: { order: "asc" },
  title: (r) => ro(r.name),
  meta: (r) =>
    r.ageMin || r.ageMax
      ? `${str(r.ageMin)}${r.ageMax && r.ageMax !== r.ageMin ? `–${str(r.ageMax)}` : ""} ani`
      : "",
  flags: (r) => (yes(r.active) ? [] : ["ascunsă"]),
  publicPath: () => "/academie",
  prepare: (data) => {
    if (
      typeof data.ageMin === "number" &&
      typeof data.ageMax === "number" &&
      data.ageMin > data.ageMax
    )
      return "Vârsta minimă nu poate fi mai mare decât vârsta maximă.";
    return null;
  },
  fields: [
    {
      kind: "i18n",
      name: "name",
      label: "Numele grupei",
      required: true,
      maxLength: 80,
      group: "Grupa",
    },
    {
      kind: "slug",
      name: "slug",
      label: "Identificator",
      help: "Doar litere mici, cifre și cratime.",
      required: true,
      group: "Grupa",
    },
    {
      kind: "enum",
      name: "stage",
      label: "Etapa (culoarea mingii)",
      options: BALL_STAGES,
      group: "Grupa",
    },
    {
      kind: "int",
      name: "ageMin",
      label: "De la vârsta",
      nullable: true,
      min: 3,
      max: 25,
      group: "Grupa",
    },
    {
      kind: "int",
      name: "ageMax",
      label: "Până la vârsta",
      nullable: true,
      min: 3,
      max: 25,
      group: "Grupa",
    },
    { kind: "enum", name: "level", label: "Nivelul", options: LEVELS, group: "Grupa" },
    {
      kind: "relation",
      source: "program",
      name: "programId",
      label: "Programul de pregătire (link „Află mai mult”)",
      nullable: true,
      group: "Grupa",
    },
    {
      kind: "i18nText",
      name: "summary",
      label: "Descriere",
      help: "Două-trei propoziții, pentru părinți.",
      required: true,
      rows: 4,
      group: "Texte",
    },
    {
      kind: "i18nList",
      name: "focusPoints",
      label: "Ce lucrăm",
      help: "Câte un punct pe rând.",
      group: "Texte",
    },
    {
      kind: "i18nText",
      name: "schedule",
      label: "Zile și ore",
      help: "Cum le citesc părinții: „Luni și miercuri, 17:00–18:30”. Gol = „la cerere”.",
      nullable: true,
      rows: 2,
      group: "Program și taxă",
    },
    {
      kind: "int",
      name: "sessionsPerWeek",
      label: "Antrenamente pe săptămână",
      nullable: true,
      min: 1,
      max: 14,
      group: "Program și taxă",
    },
    {
      kind: "int",
      name: "sessionMinutes",
      label: "Durata unui antrenament (minute)",
      nullable: true,
      min: 15,
      max: 300,
      group: "Program și taxă",
    },
    {
      kind: "decimal",
      name: "monthlyFee",
      label: "Taxa lunară (RON)",
      help: "Gol = „la cerere”.",
      nullable: true,
      group: "Program și taxă",
    },
    {
      kind: "int",
      name: "maxPlayers",
      label: "Copii în grupă (maximum)",
      nullable: true,
      min: 1,
      max: 40,
      group: "Program și taxă",
    },
    { kind: "media", name: "imageId", label: "Fotografie", nullable: true, group: "Fotografie" },
    { kind: "bool", name: "active", label: "Apare pe site", group: "Publicare" },
  ],
};

const result: Resource = {
  key: "rezultate",
  model: "result",
  entity: "Result",
  label: "Rezultate la turnee",
  singular: "rezultatul",
  addLabel: "Adaugă un rezultat",
  newTitle: "Rezultat nou",
  description:
    "Rezultatele sportivilor academiei. Pentru minori: doar prenumele și inițiala, cu acordul scris al părinților.",
  section: "Academia de juniori",
  orderable: true,
  canCreate: true,
  canDelete: true,
  listOrderBy: [{ date: "desc" }, { order: "asc" }],
  title: (r) => `${str(r.athlete)} · ${ro(r.placement)}`,
  meta: (r) =>
    `${str(r.event)} · ${str(r.category)}${
      r.date instanceof Date ? ` · ${r.date.toLocaleDateString("ro-RO")}` : ""
    }`,
  flags: (r) => [
    ...(yes(r.published) ? [] : ["nepublicat"]),
    ...(yes(r.isMinor) && !yes(r.parentalConsent) ? ["minor fără acord"] : []),
  ],
  publicPath: () => "/academie",
  prepare: (data, before) => {
    if (data.published === true && data.isMinor === true && data.parentalConsent !== true)
      return "Sportivul e minor: rezultatul se poate publica doar după ce bifezi acordul scris al părinților.";
    if (data.parentalConsent === true && !(before && before.parentalConsent === true))
      data.consentAt = new Date();
    if (data.parentalConsent !== true) data.consentAt = null;
    return null;
  },
  fields: [
    {
      kind: "text",
      name: "athlete",
      label: "Sportivul",
      help: "Pentru minori: prenumele și inițiala numelui (de exemplu „Maria P.”).",
      required: true,
      maxLength: 80,
      group: "Rezultat",
    },
    {
      kind: "text",
      name: "event",
      label: "Turneul",
      help: "Numele oficial, de exemplu „Campionatul Național de Juniori”.",
      required: true,
      maxLength: 160,
      group: "Rezultat",
    },
    {
      kind: "text",
      name: "category",
      label: "Categoria",
      help: "De exemplu „U12 fete, simplu”.",
      required: true,
      maxLength: 80,
      group: "Rezultat",
    },
    {
      kind: "i18n",
      name: "placement",
      label: "Rezultatul",
      help: "De exemplu „Campioană națională”, „Finalist”, „Semifinale”.",
      required: true,
      maxLength: 80,
      group: "Rezultat",
    },
    { kind: "date", name: "date", label: "Data", required: true, group: "Rezultat" },
    {
      kind: "enum",
      name: "level",
      label: "Nivelul turneului",
      options: RESULT_LEVELS,
      group: "Rezultat",
    },
    { kind: "bool", name: "isMinor", label: "Sportivul e minor", group: "Acord" },
    {
      kind: "bool",
      name: "parentalConsent",
      label: "Am acordul scris al părinților pentru publicare",
      group: "Acord",
    },
    { kind: "bool", name: "published", label: "Publicat", group: "Publicare" },
  ],
};

const pricing: Resource = {
  key: "preturi",
  model: "pricingPlan",
  entity: "PricingPlan",
  label: "Prețuri și pachete",
  singular: "prețul",
  addLabel: "Adaugă un preț sau pachet",
  newTitle: "Preț nou",
  description:
    "Pachete de lecții și alte tarife fixe. Tariful pe oră al fiecărei lecții se schimbă din „Tipuri de lecții”.",
  section: "Programe și prețuri",
  orderable: true,
  canCreate: true,
  canDelete: true,
  listOrderBy: { order: "asc" },
  title: (r) => ro(r.name),
  meta: (r) =>
    `${r.price === null || r.price === undefined ? "preț necompletat" : `${str(r.price)} ${str(r.currency)}`} ${optionLabel(PRICE_UNITS, str(r.unit))}${yes(r.isPackage) ? " · pachet" : ""}`,
  flags: (r) => [...(yes(r.active) ? [] : ["inactiv"]), ...(r.price === null ? ["fără preț"] : [])],
  publicPath: () => "/preturi",
  deleteBlocked: async (r) => {
    const clients = await db.client.count({ where: { activePlanId: String(r.id) } });
    return clients > 0
      ? `${countLabel(clients, "client are", "clienți au")} acest pachet activ. Debifează „Activ” ca să nu mai apară pe site.`
      : null;
  },
  fields: [
    { kind: "i18n", name: "name", label: "Nume", required: true, group: "Preț", maxLength: 120 },
    {
      kind: "relation",
      name: "lessonTypeId",
      label: "Tipul de lecție (opțional)",
      source: "lessonType",
      nullable: true,
      group: "Preț",
    },
    {
      kind: "decimal",
      name: "price",
      label: "Prețul",
      help: "Doar cifre, de exemplu 250 sau 1200. Gol = „[DE COMPLETAT]” pe site.",
      nullable: true,
      group: "Preț",
    },
    {
      kind: "text",
      name: "currency",
      label: "Moneda",
      required: true,
      maxLength: 3,
      group: "Preț",
    },
    { kind: "enum", name: "unit", label: "Unitatea", options: PRICE_UNITS, group: "Preț" },
    { kind: "bool", name: "isPackage", label: "Este un pachet de lecții", group: "Pachet" },
    {
      kind: "int",
      name: "sessions",
      label: "Câte lecții conține",
      nullable: true,
      min: 1,
      max: 200,
      group: "Pachet",
    },
    {
      kind: "int",
      name: "validityDays",
      label: "Valabil (zile)",
      nullable: true,
      min: 1,
      max: 730,
      group: "Pachet",
    },
    {
      kind: "i18nText",
      name: "includes",
      label: "Ce include / condiții",
      nullable: true,
      rows: 3,
      group: "Pachet",
    },
    { kind: "bool", name: "highlighted", label: "Evidențiat (recomandat)", group: "Publicare" },
    { kind: "bool", name: "active", label: "Activ (apare pe site)", group: "Publicare" },
  ],
};

const location: Resource = {
  key: "locatii",
  model: "location",
  entity: "Location",
  label: "Locații",
  singular: "locația",
  addLabel: "Adaugă o locație",
  newTitle: "Locație nouă",
  description: "Baza sportivă: adresă, coordonate pentru hartă și indicații de acces.",
  section: "Locuri și dotări",
  orderable: true,
  canCreate: true,
  canDelete: true,
  listOrderBy: { order: "asc" },
  title: (r) => str(r.name),
  meta: (r) => `${str(r.address)}, ${str(r.city)}`,
  publicPath: () => "/facilitati",
  deleteBlocked: async (r) => {
    const count = await db.location.count();
    if (count <= 1)
      return "Site-ul are nevoie de cel puțin o locație. Modifică-o în loc să o ștergi.";
    const bookings = await db.booking.count({
      where: { locationId: String(r.id), startsAt: { gte: new Date() } },
    });
    return bookings > 0
      ? `Există ${countLabel(bookings, "rezervare viitoare", "rezervări viitoare")} la această locație. Mută-le sau anulează-le mai întâi.`
      : null;
  },
  fields: [
    {
      kind: "text",
      name: "name",
      label: "Numele bazei",
      required: true,
      maxLength: 160,
      group: "Locație",
    },
    {
      kind: "text",
      name: "address",
      label: "Adresa",
      required: true,
      maxLength: 240,
      group: "Locație",
    },
    {
      kind: "text",
      name: "city",
      label: "Localitatea",
      required: true,
      maxLength: 120,
      group: "Locație",
    },
    {
      kind: "text",
      name: "region",
      label: "Județul",
      help: "Pentru adresa pe care o citește Google, de exemplu Ilfov.",
      nullable: true,
      maxLength: 60,
      group: "Locație",
    },
    {
      kind: "text",
      name: "postalCode",
      label: "Codul poștal",
      nullable: true,
      maxLength: 12,
      group: "Locație",
    },
    {
      kind: "float",
      name: "lat",
      label: "Latitudine",
      help: "Din Google Maps: click dreapta pe locație → primul număr.",
      nullable: true,
      min: -90,
      max: 90,
      step: 0.000001,
      group: "Hartă",
    },
    {
      kind: "float",
      name: "lng",
      label: "Longitudine",
      help: "Al doilea număr.",
      nullable: true,
      min: -180,
      max: 180,
      step: 0.000001,
      group: "Hartă",
    },
    {
      kind: "text",
      name: "mapUrl",
      label: "Link Google Maps",
      inputType: "url",
      nullable: true,
      maxLength: 500,
      group: "Hartă",
    },
    {
      kind: "i18nText",
      name: "directions",
      label: "Cum ajungi",
      help: "Parcare, transport în comun, intrare.",
      nullable: true,
      rows: 3,
      group: "Hartă",
    },
  ],
};

const court: Resource = {
  key: "terenuri",
  model: "court",
  entity: "Court",
  label: "Terenuri",
  singular: "terenul",
  addLabel: "Adaugă un teren",
  newTitle: "Teren nou",
  description: "Suprafața, numărul de terenuri, acoperire iarna și nocturnă.",
  section: "Locuri și dotări",
  orderable: true,
  canCreate: true,
  canDelete: true,
  listOrderBy: { order: "asc" },
  title: (r) => ro(r.name),
  meta: (r) =>
    `${optionLabel(SURFACES, str(r.surface))}${r.count ? ` · ${str(r.count)} terenuri` : ""}`,
  flags: (r) => (yes(r.active) ? [] : ["inactiv"]),
  publicPath: () => "/facilitati",
  fields: [
    {
      kind: "relation",
      name: "locationId",
      label: "Locația",
      source: "location",
      required: true,
      group: "Teren",
    },
    { kind: "i18n", name: "name", label: "Nume", required: true, maxLength: 120, group: "Teren" },
    { kind: "enum", name: "surface", label: "Suprafața", options: SURFACES, group: "Teren" },
    {
      kind: "int",
      name: "count",
      label: "Câte terenuri",
      nullable: true,
      min: 1,
      max: 50,
      group: "Teren",
    },
    { kind: "triBool", name: "coveredInWinter", label: "Acoperit iarna (balon)", group: "Teren" },
    { kind: "triBool", name: "floodlights", label: "Nocturnă", group: "Teren" },
    { kind: "bool", name: "active", label: "Activ (apare pe site)", group: "Publicare" },
  ],
};

const facility: Resource = {
  key: "facilitati",
  model: "facility",
  entity: "Facility",
  label: "Facilități și servicii",
  singular: "facilitatea",
  addLabel: "Adaugă o facilitate",
  newTitle: "Facilitate nouă",
  description: "Vestiare, parcare, închiriere rachete, analiză video și celelalte.",
  section: "Locuri și dotări",
  orderable: true,
  canCreate: true,
  canDelete: true,
  listOrderBy: [{ type: "asc" }, { order: "asc" }],
  title: (r) => ro(r.name),
  meta: (r) => optionLabel(FACILITY_TYPES, str(r.type)),
  publicPath: () => "/facilitati",
  fields: [
    { kind: "enum", name: "type", label: "Tip", options: FACILITY_TYPES, group: "Facilitate" },
    {
      kind: "i18n",
      name: "name",
      label: "Nume",
      required: true,
      maxLength: 120,
      group: "Facilitate",
    },
    {
      kind: "i18nText",
      name: "description",
      label: "Descriere",
      nullable: true,
      rows: 3,
      group: "Facilitate",
    },
    {
      kind: "relation",
      name: "locationId",
      label: "Locația",
      source: "location",
      nullable: true,
      group: "Facilitate",
    },
    { kind: "media", name: "imageId", label: "Fotografie", nullable: true, group: "Facilitate" },
  ],
};

const coach: Resource = {
  key: "antrenori",
  model: "coach",
  entity: "Coach",
  label: "Echipa de antrenori",
  singular: "antrenorul",
  addLabel: "Adaugă un antrenor",
  newTitle: "Antrenor nou",
  description: "Antrenorii academiei: rol, parcurs, specializări, fotografie și video.",
  section: "Echipa",
  orderable: true,
  canCreate: true,
  canDelete: true,
  listOrderBy: [{ isHead: "desc" }, { order: "asc" }],
  title: (r) => str(r.name),
  meta: (r) => ro(r.role),
  flags: (r) => [...(yes(r.isHead) ? ["principal"] : []), ...(yes(r.active) ? [] : ["ascuns"])],
  publicPath: (r) => (r.slug ? `/echipa/${str(r.slug)}` : "/echipa"),
  deleteBlocked: async (row) =>
    yes(row.isHead)
      ? "Antrenorul principal nu se poate șterge. Alege întâi alt antrenor principal."
      : null,
  afterSave: async (saved) => {
    if (yes(saved.isHead))
      await db.coach.updateMany({
        where: { id: { not: String(saved.id) }, isHead: true },
        data: { isHead: false },
      });
  },
  fields: [
    {
      kind: "text",
      name: "name",
      label: "Nume și prenume",
      required: true,
      maxLength: 120,
      group: "Profil",
    },
    {
      kind: "slug",
      name: "slug",
      label: "Adresa paginii",
      help: "Apare în link: /echipa/adresa. Doar litere mici, cifre și cratime.",
      required: true,
      group: "Profil",
    },
    {
      kind: "i18n",
      name: "role",
      label: "Rolul în echipă",
      help: "De exemplu: Antrenor principal, Antrenor academia de juniori, Preparator fizic.",
      required: true,
      maxLength: 80,
      group: "Profil",
    },
    {
      kind: "i18n",
      name: "title",
      label: "Titulatura",
      help: "Exact cum apare pe diplomă.",
      required: true,
      maxLength: 160,
      group: "Profil",
    },
    {
      kind: "int",
      name: "yearsExperience",
      label: "Ani de experiență ca antrenor",
      nullable: true,
      min: 0,
      max: 70,
      group: "Profil",
    },
    {
      kind: "i18nList",
      name: "specialties",
      label: "Specializări",
      help: "Câte una pe rând, scurt: „inițiere pentru copii”, „pregătire pentru competiție”.",
      group: "Profil",
    },
    {
      kind: "i18nItems",
      name: "languages",
      label: "Limbi vorbite",
      help: "Câte o limbă pe rând; traducerea pe același rând în coloana EN.",
      group: "Profil",
    },
    {
      kind: "bool",
      name: "isHead",
      label: "Antrenorul principal (apare primul și vorbește pentru academie)",
      group: "Profil",
    },
    {
      kind: "media",
      name: "photoId",
      label: "Fotografia",
      help: "Pe teren, format vertical 4:5 (minimum 1200 × 1500 px).",
      nullable: true,
      group: "Fotografie și video",
    },
    {
      kind: "media",
      accept: "video",
      name: "videoId",
      label: "Video (opțional)",
      help: "Un clip scurt cu antrenorul la lucru; apare pe pagina lui.",
      nullable: true,
      group: "Fotografie și video",
    },
    {
      kind: "i18nText",
      name: "summary",
      label: "Pe scurt",
      help: "Una-două propoziții, pentru cardul din echipă.",
      required: true,
      rows: 3,
      group: "Texte",
    },
    {
      kind: "i18nMarkdown",
      name: "story",
      label: "Parcursul",
      required: true,
      rows: 10,
      group: "Texte",
    },
    {
      kind: "i18nMarkdown",
      name: "philosophy",
      label: "Cum lucrează (opțional)",
      nullable: true,
      rows: 6,
      group: "Texte",
    },
    {
      kind: "i18nText",
      name: "results",
      label: "Rezultate ale elevilor",
      help: "Doar rezultate reale, verificabile. Gol = secțiunea nu apare.",
      nullable: true,
      rows: 4,
      group: "Texte",
    },
    { kind: "bool", name: "active", label: "Apare pe site", group: "Publicare" },
  ],
};

const certification: Resource = {
  key: "certificari",
  model: "certification",
  entity: "Certification",
  label: "Certificări și diplome",
  singular: "certificarea",
  addLabel: "Adaugă o certificare",
  newTitle: "Certificare nouă",
  description: "Diplome și cursuri ale antrenorilor, cu emitentul și anul.",
  section: "Echipa",
  orderable: true,
  canCreate: true,
  canDelete: true,
  listOrderBy: { order: "asc" },
  title: (r) => ro(r.title),
  meta: (r) => `${str(r.issuer)}${r.year ? ` · ${str(r.year)}` : ""}`,
  publicPath: () => "/echipa",
  fields: [
    {
      kind: "relation",
      source: "coach",
      name: "coachId",
      label: "Antrenorul",
      required: true,
      group: "Certificare",
    },
    {
      kind: "i18n",
      name: "title",
      label: "Denumirea",
      help: "Exact cum apare pe document.",
      required: true,
      maxLength: 200,
      group: "Certificare",
    },
    {
      kind: "text",
      name: "issuer",
      label: "Emitent",
      help: "De exemplu Federația Română de Tenis.",
      required: true,
      maxLength: 200,
      group: "Certificare",
    },
    {
      kind: "int",
      name: "year",
      label: "Anul",
      nullable: true,
      min: 1950,
      max: 2100,
      group: "Certificare",
    },
    {
      kind: "media",
      name: "imageId",
      label: "Imaginea documentului (opțional)",
      nullable: true,
      group: "Certificare",
    },
  ],
};

const faq: Resource = {
  key: "intrebari",
  model: "faq",
  entity: "Faq",
  label: "Întrebări frecvente",
  singular: "întrebarea",
  addLabel: "Adaugă o întrebare",
  newTitle: "Întrebare nouă",
  description: "Întrebări și răspunsuri, pe categorii; alegi care apar pe prima pagină.",
  section: "Întrebări și recenzii",
  orderable: true,
  canCreate: true,
  canDelete: true,
  listOrderBy: [{ order: "asc" }],
  title: (r) => ro(r.question),
  meta: (r) =>
    `${optionLabel(FAQ_CATEGORIES, str(r.category))}${yes(r.showOnHome) ? " · pe prima pagină" : ""}`,
  publicPath: () => "/intrebari",
  fields: [
    {
      kind: "i18n",
      name: "question",
      label: "Întrebarea",
      required: true,
      maxLength: 240,
      group: "Întrebare",
    },
    {
      kind: "i18nMarkdown",
      name: "answer",
      label: "Răspunsul",
      required: true,
      rows: 6,
      group: "Întrebare",
    },
    {
      kind: "enum",
      name: "category",
      label: "Categoria",
      options: FAQ_CATEGORIES,
      group: "Afișare",
    },
    { kind: "bool", name: "showOnHome", label: "Apare pe prima pagină", group: "Afișare" },
    {
      kind: "relation",
      name: "programId",
      label: "Legată de programul",
      help: "Apare și pe pagina programului.",
      source: "program",
      nullable: true,
      group: "Afișare",
    },
  ],
};

const testimonial: Resource = {
  key: "recenzii",
  model: "testimonial",
  entity: "Testimonial",
  label: "Recenzii",
  singular: "recenzia",
  addLabel: "Adaugă o recenzie",
  newTitle: "Recenzie nouă",
  description: "Recenziile elevilor și ale părinților. Se publică doar cu acordul autorului.",
  section: "Întrebări și recenzii",
  orderable: true,
  canCreate: true,
  canDelete: true,
  listOrderBy: { order: "asc" },
  title: (r) => str(r.author),
  meta: (r) => ro(r.text).slice(0, 90),
  flags: (r) => [
    ...(yes(r.isExample) ? ["exemplu, nu apare pe site"] : []),
    ...(yes(r.published) ? [] : ["nepublicată"]),
    ...(yes(r.consent) ? [] : ["fără acord"]),
  ],
  publicPath: () => "/",
  prepare: (data, before) => {
    if (data.published === true && data.consent !== true)
      return "O recenzie se poate publica doar cu acordul autorului. Bifează acordul sau debifează „Publicată”.";
    if (data.published === true && data.isExample === true)
      return "Recenziile de exemplu nu se publică. Înlocuiește textul cu o recenzie reală și debifează „Exemplu”.";
    if (data.consent === true && !(before && before.consent === true)) data.consentAt = new Date();
    if (data.consent !== true) data.consentAt = null;
    return null;
  },
  fields: [
    {
      kind: "text",
      name: "author",
      label: "Autorul",
      help: "Cum vrea să apară (de exemplu „Ana, mama lui Luca”).",
      required: true,
      maxLength: 120,
      group: "Recenzie",
    },
    {
      kind: "i18n",
      name: "role",
      label: "Descriere scurtă",
      help: "De exemplu „elevă, 2 ani la lecții individuale”.",
      maxLength: 120,
      group: "Recenzie",
    },
    {
      kind: "i18nText",
      name: "text",
      label: "Textul recenziei",
      required: true,
      rows: 5,
      group: "Recenzie",
    },
    {
      kind: "media",
      name: "photoId",
      label: "Fotografie (doar cu acord)",
      nullable: true,
      group: "Recenzie",
    },
    {
      kind: "bool",
      name: "consent",
      label: "Autorul a fost de acord cu publicarea",
      group: "Publicare",
    },
    { kind: "bool", name: "published", label: "Publicată", group: "Publicare" },
    {
      kind: "bool",
      name: "isExample",
      label: "Exemplu (text de probă, nu apare pe site)",
      group: "Publicare",
    },
  ],
};

const gallery: Resource = {
  key: "galerie",
  model: "galleryItem",
  entity: "GalleryItem",
  label: "Galerie foto și video",
  singular: "elementul",
  addLabel: "Adaugă o fotografie sau un video",
  newTitle: "Element nou în galerie",
  description:
    "Fotografii și video-uri pe categorii. Cele cu minori se publică doar cu acordul părinților.",
  section: "Galerie și articole",
  orderable: true,
  canCreate: true,
  canDelete: true,
  listOrderBy: { order: "asc" },
  title: (r) => ro(r.alt),
  meta: (r) => optionLabel(GALLERY_CATEGORIES, str(r.category)),
  flags: (r) => [
    ...(yes(r.published) ? [] : ["nepublicată"]),
    ...(yes(r.hasMinors) && !yes(r.parentalConsent) ? ["minori fără acord"] : []),
  ],
  publicPath: () => "/galerie",
  prepare: (data, before) => {
    if (data.published === true && data.hasMinors === true && data.parentalConsent !== true) {
      return "În fotografie sau video apar minori: se poate publica doar după ce bifezi acordul scris al părinților.";
    }
    if (data.parentalConsent === true && !(before && before.parentalConsent === true))
      data.consentAt = new Date();
    if (data.parentalConsent !== true) data.consentAt = null;
    return null;
  },
  fields: [
    {
      kind: "media",
      accept: "any",
      name: "mediaId",
      label: "Fotografia sau video-ul",
      required: true,
      group: "Fotografie sau video",
    },
    {
      kind: "i18nText",
      name: "alt",
      label: "Ce se vede (text alternativ)",
      required: true,
      rows: 2,
      group: "Fotografie sau video",
    },
    {
      kind: "i18n",
      name: "caption",
      label: "Legendă (opțional)",
      nullable: true,
      maxLength: 200,
      group: "Fotografie sau video",
    },
    {
      kind: "enum",
      name: "category",
      label: "Categoria",
      options: GALLERY_CATEGORIES,
      group: "Fotografie sau video",
    },
    { kind: "bool", name: "hasMinors", label: "Apar minori", group: "Acord" },
    {
      kind: "bool",
      name: "parentalConsent",
      label: "Am acordul scris al părinților pentru publicare",
      group: "Acord",
    },
    { kind: "bool", name: "published", label: "Publicată", group: "Publicare" },
  ],
};

const post: Resource = {
  key: "articole",
  model: "post",
  entity: "Post",
  label: "Articole (Sfaturi)",
  singular: "articolul",
  addLabel: "Scrie un articol nou",
  newTitle: "Articol nou",
  description: "Sfaturi pentru elevi și părinți. Ciornele nu apar pe site.",
  section: "Galerie și articole",
  canCreate: true,
  canDelete: true,
  listOrderBy: [{ status: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
  title: (r) => ro(r.title),
  meta: (r) =>
    r.publishedAt instanceof Date
      ? `publicat ${r.publishedAt.toLocaleDateString("ro-RO")}`
      : "nepublicat",
  flags: (r) => (r.status === "PUBLICAT" ? [] : ["ciornă"]),
  publicPath: (r) => `/sfaturi/${str(r.slug)}`,
  prepare: (data, before) => {
    if (data.status === "PUBLICAT" && !(data.publishedAt instanceof Date))
      data.publishedAt = before?.publishedAt instanceof Date ? before.publishedAt : new Date();
    return null;
  },
  fields: [
    {
      kind: "i18n",
      name: "title",
      label: "Titlu",
      required: true,
      maxLength: 160,
      group: "Articol",
    },
    {
      kind: "slug",
      name: "slug",
      label: "Adresa paginii",
      help: "Litere mici, cifre și cratime.",
      required: true,
      group: "Articol",
    },
    {
      kind: "i18nText",
      name: "excerpt",
      label: "Rezumat",
      required: true,
      rows: 3,
      group: "Articol",
    },
    {
      kind: "i18nMarkdown",
      name: "body",
      label: "Textul articolului",
      required: true,
      rows: 18,
      group: "Articol",
    },
    {
      kind: "media",
      name: "coverId",
      label: "Imaginea de copertă",
      nullable: true,
      group: "Articol",
    },
    { kind: "enum", name: "status", label: "Stare", options: POST_STATUSES, group: "Publicare" },
    {
      kind: "datetime",
      name: "publishedAt",
      label: "Data publicării",
      help: "Gol = data de azi, la publicare.",
      nullable: true,
      group: "Publicare",
    },
    ...seoFields(),
  ],
};

const pageHeader: Resource = {
  key: "antete",
  model: "pageHeader",
  entity: "PageHeader",
  label: "Antetele paginilor",
  singular: "antetul",
  description:
    "Titlul, textul introductiv și fotografia opțională din capul fiecărei pagini interioare.",
  section: "Pagina principală",
  listOrderBy: { key: "asc" },
  title: (r) => `${PAGE_PATHS[str(r.key)] ?? str(r.key)} · ${ro(r.title)}`,
  publicPath: (r) => PAGE_PATHS[str(r.key)] ?? "/",
  fields: [
    { kind: "i18n", name: "title", label: "Titlu", required: true, maxLength: 160, group: "Antet" },
    {
      kind: "i18nText",
      name: "intro",
      label: "Text introductiv",
      required: true,
      rows: 3,
      group: "Antet",
    },
    {
      kind: "media",
      name: "imageId",
      label: "Fotografie (opțională)",
      help: "Apare în dreapta titlului pe ecran mare. Format orizontal 3:2, minimum 1600 px lățime.",
      nullable: true,
      group: "Imagine",
    },
    {
      kind: "i18nText",
      name: "imageAlt",
      label: "Descrierea imaginii",
      nullable: true,
      rows: 2,
      group: "Imagine",
    },
    ...seoFields(),
  ],
};

const legal: Resource = {
  key: "legal",
  model: "legalPage",
  entity: "LegalPage",
  label: "Pagini legale",
  singular: "pagina",
  description: "Confidențialitate, termeni, cookies. Ciorne de verificat de un jurist.",
  section: "Pagini legale",
  listOrderBy: { kind: "asc" },
  title: (r) => ro(r.title),
  meta: (r) => `Versiunea ${str(r.version)}`,
  flags: (r) => (yes(r.reviewedByLawyer) ? [] : ["de verificat de un jurist"]),
  publicPath: (r) => LEGAL_PATHS[str(r.kind)] ?? "/",
  prepare: (data, before) => {
    // Consents record the policy version: a changed text gets a new version (today's date) unless one was typed.
    if (
      before &&
      JSON.stringify(before.body) !== JSON.stringify(data.body) &&
      data.version === before.version
    ) {
      data.version = new Date().toISOString().slice(0, 10);
    }
    return null;
  },
  fields: [
    {
      kind: "i18n",
      name: "title",
      label: "Titlu",
      required: true,
      maxLength: 160,
      group: "Pagină",
    },
    {
      kind: "i18nMarkdown",
      name: "body",
      label: "Text",
      required: true,
      rows: 24,
      group: "Pagină",
    },
    {
      kind: "text",
      name: "version",
      label: "Versiunea",
      help: "Se schimbă automat cu data de azi când modifici textul.",
      required: true,
      maxLength: 40,
      group: "Verificare",
    },
    {
      kind: "bool",
      name: "reviewedByLawyer",
      label: "Textul a fost verificat de un jurist",
      group: "Verificare",
    },
  ],
};

const settings: Resource = {
  key: "setari",
  model: "siteSettings",
  entity: "SiteSettings",
  label: "Setări",
  singular: "setările",
  description: "Date de contact, regulile rezervărilor, date legale, limbi, funcții opționale.",
  section: "Setări",
  singletonId: 1,
  ownerOnly: true,
  listOrderBy: { id: "asc" },
  title: () => "Setări",
  publicPath: () => "/",
  prepare: (data) => {
    for (const [key, label, minContrast] of [
      ["colorBrand", "principală", 7],
      ["colorAccent", "de accent", 4.5],
    ] as const) {
      const value = typeof data[key] === "string" ? data[key].trim().toLowerCase() : "";
      if (!/^#[0-9a-f]{6}$/.test(value))
        return `Culoarea ${label} se scrie ca #rrggbb, de exemplu #0f3b2f.`;
      data[key] = value;
      const ratio = contrastWithWhite(value);
      if (ratio < minContrast)
        return `Culoarea ${label} e prea deschisă: textul alb are pe ea un contrast de ${ratio.toFixed(1).replace(".", ",")}:1, iar minimul e ${String(minContrast).replace(".", ",")}:1. Alege un ton mai închis.`;
    }
    if (
      typeof data.whatsapp === "string" &&
      data.whatsapp &&
      !data.whatsapp.includes(TODO_MARK) &&
      !/^\d{8,15}$/.test(data.whatsapp)
    ) {
      return "Numărul de WhatsApp se scrie doar cu cifre, cu prefixul țării, fără + (de exemplu 40722123456).";
    }
    return null;
  },
  fields: [
    {
      kind: "text",
      name: "brandName",
      label: "Numele clubului",
      required: true,
      maxLength: 120,
      group: "Identitatea clubului",
    },
    {
      kind: "i18n",
      name: "tagline",
      label: "Descrierea de sub nume",
      help: "De exemplu „Academie de tenis”.",
      required: true,
      maxLength: 120,
      group: "Identitatea clubului",
    },
    {
      kind: "media",
      name: "logoId",
      label: "Logoul",
      help: "PNG cu fundal transparent, cel puțin 400 px lățime. Gol = monograma de mai jos.",
      nullable: true,
      group: "Identitatea clubului",
    },
    {
      kind: "text",
      name: "monogram",
      label: "Monograma (inițiale)",
      help: "Două sau trei litere, afișate cât timp nu există logo.",
      maxLength: 4,
      group: "Identitatea clubului",
    },
    {
      kind: "text",
      name: "colorBrand",
      inputType: "color",
      label: "Culoarea principală",
      help: "Baza închisă a designului: antet, secțiuni întunecate, subsol. Alege un ton închis.",
      required: true,
      maxLength: 7,
      group: "Identitatea clubului",
    },
    {
      kind: "text",
      name: "colorAccent",
      inputType: "color",
      label: "Culoarea de accent",
      help: "Butoane și linkuri; trebuie să rămână lizibilă cu text alb (site-ul verifică la salvare).",
      required: true,
      maxLength: 7,
      group: "Identitatea clubului",
    },
    {
      kind: "media",
      accept: "video",
      name: "heroVideoId",
      label: "Video-ul de deschidere",
      help: "Pagina principală se deschide cu el: orizontal, 10–20 de secunde, fără sunet (sunetul nu se aude). Filmat la club, cu antrenamente reale.",
      nullable: true,
      group: "Deschiderea paginii principale",
    },
    {
      kind: "media",
      name: "heroImageId",
      label: "Fotografia de deschidere",
      help: "Folosită până încarci un video și pe telefoanele cu economisire de date activă.",
      nullable: true,
      group: "Deschiderea paginii principale",
    },
    {
      kind: "text",
      name: "phone",
      label: "Telefon",
      inputType: "tel",
      required: true,
      maxLength: 40,
      group: "Contact",
    },
    {
      kind: "text",
      name: "whatsapp",
      label: "WhatsApp",
      help: "Doar cifre, cu prefixul țării: 40722123456.",
      maxLength: 20,
      group: "Contact",
    },
    {
      kind: "text",
      name: "email",
      label: "Email",
      help: "Aici primești notificările despre rezervări.",
      inputType: "email",
      required: true,
      maxLength: 200,
      group: "Contact",
    },
    {
      kind: "text",
      name: "instagramUrl",
      label: "Instagram",
      inputType: "url",
      nullable: true,
      maxLength: 300,
      group: "Contact",
    },
    {
      kind: "text",
      name: "facebookUrl",
      label: "Facebook",
      inputType: "url",
      nullable: true,
      maxLength: 300,
      group: "Contact",
    },
    {
      kind: "text",
      name: "tiktokUrl",
      label: "TikTok",
      inputType: "url",
      nullable: true,
      maxLength: 300,
      group: "Contact",
    },
    { kind: "hours", name: "workingHours", label: "Programul afișat", group: "Program de lucru" },
    {
      kind: "enum",
      name: "bookingMode",
      label: "Mod de rezervare",
      options: BOOKING_MODES,
      group: "Rezervări",
    },
    {
      kind: "int",
      name: "freeCancelHours",
      label: "Anulare gratuită cu cel puțin (ore înainte)",
      min: 0,
      max: 168,
      required: true,
      group: "Rezervări",
    },
    {
      kind: "int",
      name: "minNoticeHours",
      label: "Rezervare cu cel puțin (ore înainte)",
      min: 0,
      max: 168,
      required: true,
      group: "Rezervări",
    },
    {
      kind: "int",
      name: "horizonDays",
      label: "Rezervări cu cel mult (zile înainte)",
      min: 1,
      max: 365,
      required: true,
      group: "Rezervări",
    },
    {
      kind: "int",
      name: "bufferMinutes",
      label: "Pauză între lecții (minute)",
      min: 0,
      max: 120,
      required: true,
      group: "Rezervări",
    },
    {
      kind: "int",
      name: "slotStepMinutes",
      label: "Orele de start din (minute) în (minute)",
      help: "30 = 10:00, 10:30, 11:00…",
      min: 5,
      max: 120,
      required: true,
      group: "Rezervări",
    },
    {
      kind: "i18nText",
      name: "firstLessonText",
      label: "Oferta pentru prima lecție",
      rows: 3,
      required: true,
      group: "Rezervări",
    },
    {
      kind: "i18nItems",
      name: "paymentMethods",
      label: "Metode de plată",
      help: "Câte una pe rând.",
      group: "Rezervări",
    },
    {
      kind: "text",
      name: "legalForm",
      label: "Forma de organizare",
      help: "PFA, SRL, club sportiv…",
      required: true,
      maxLength: 80,
      group: "Date legale (apar în subsol și în paginile legale)",
    },
    {
      kind: "text",
      name: "legalName",
      label: "Denumirea legală",
      required: true,
      maxLength: 200,
      group: "Date legale (apar în subsol și în paginile legale)",
    },
    {
      kind: "text",
      name: "legalCui",
      label: "CUI / CIF",
      required: true,
      maxLength: 40,
      group: "Date legale (apar în subsol și în paginile legale)",
    },
    {
      kind: "text",
      name: "legalRegNo",
      label: "Nr. Registrul Comerțului",
      nullable: true,
      maxLength: 60,
      group: "Date legale (apar în subsol și în paginile legale)",
    },
    {
      kind: "text",
      name: "legalAddress",
      label: "Sediul",
      required: true,
      maxLength: 300,
      group: "Date legale (apar în subsol și în paginile legale)",
    },
    ...seoFields("Motoare de căutare").map((f) => ({ ...f, nullable: false, required: true })),
    {
      kind: "bool",
      name: "enEnabled",
      label: "Versiunea în engleză este activă",
      group: "Funcții",
    },
    {
      kind: "bool",
      name: "newsletterEnabled",
      label: "Formular de newsletter în subsol",
      group: "Funcții",
    },
    {
      kind: "bool",
      name: "labEnabled",
      label: "Laboratorul tehnic 3D pe pagina principală",
      help: "Jucătorul 3D care arată fazele loviturilor, în secțiunea Metoda.",
      group: "Funcții",
    },
    {
      kind: "bool",
      name: "reviewInvitesEnabled",
      label: "Invitație la recenzie după lecții",
      group: "Funcții",
    },
    {
      kind: "bool",
      name: "umamiEnabled",
      label: "Statistici de vizitare (Umami, fără cookies)",
      help: "Necesită și adresa Umami în configurarea serverului.",
      group: "Funcții",
    },
    {
      kind: "int",
      name: "retentionMonths",
      label: "Păstrez datele clienților (luni)",
      help: "După aceea sunt anonimizate automat.",
      min: 6,
      max: 120,
      required: true,
      group: "Funcții",
    },
    { kind: "enum", name: "timezone", label: "Fusul orar", options: TIMEZONES, group: "Funcții" },
    {
      kind: "text",
      name: "currency",
      label: "Moneda implicită",
      required: true,
      maxLength: 3,
      group: "Funcții",
    },
  ],
};

export const RESOURCES: Resource[] = [
  scene,
  pageHeader,
  coach,
  certification,
  academyGroup,
  result,
  program,
  lessonType,
  pricing,
  location,
  court,
  facility,
  faq,
  testimonial,
  gallery,
  post,
  legal,
  settings,
];

export function getResource(key: string): Resource | null {
  return RESOURCES.find((r) => r.key === key) ?? null;
}

export function visibleFields(resource: Resource, row: Row | null): FieldDef[] {
  return resource.fields.filter((field) =>
    resource.fieldFilter ? resource.fieldFilter(field, row) : true,
  );
}
