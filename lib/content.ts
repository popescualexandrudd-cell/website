import "server-only";
import { cache } from "react";
import { draftMode } from "next/headers";
import { db } from "./db";
import { resolveMedia, resolveVideo, type ResolvedImage, type ResolvedVideo } from "./media";
import { t, tItems, tList } from "./i18n-content";
import type { Locale } from "@/i18n/routing";
import type {
  Audience,
  BallStage,
  FacilityType,
  FaqCategory,
  GalleryCategory,
  LegalKind,
  Level,
  PriceUnit,
  ResultLevel,
  Surface,
} from "./generated/prisma/client";

export const isPreview = cache(async (): Promise<boolean> => {
  try {
    return (await draftMode()).isEnabled;
  } catch {
    return false;
  }
});

// ─── Settings ────────────────────────────────────────────────────────────────

export type SettingsView = Awaited<ReturnType<typeof loadSettings>>;

const loadSettings = cache(async () => {
  const s = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    include: { logo: true, heroVideo: true, heroImage: true },
  });
  return s;
});

const HEX = /^#[0-9a-f]{6}$/i;

/** The club's colours, safe to write into a style attribute (anything else falls back). */
export function brandColors(s: { colorBrand: string; colorAccent: string }) {
  return {
    brand: HEX.test(s.colorBrand) ? s.colorBrand : "#0f3b2f",
    accent: HEX.test(s.colorAccent) ? s.colorAccent : "#c24f1d",
  };
}

export const getSettings = loadSettings;

export function localizedSettings(s: SettingsView, locale: Locale) {
  return {
    brandName: s.brandName,
    monogram: s.monogram,
    tagline: t(s.tagline, locale),
    logo: resolveMedia(s.logo),
    heroVideo: resolveVideo(s.heroVideo),
    heroImage: resolveMedia(s.heroImage),
    heroImageAlt: s.heroImage ? t(s.heroImage.alt, locale) : "",
    colors: brandColors(s),
    labEnabled: s.labEnabled,
    phone: s.phone,
    whatsapp: s.whatsapp,
    email: s.email,
    instagramUrl: s.instagramUrl,
    facebookUrl: s.facebookUrl,
    tiktokUrl: s.tiktokUrl,
    seoTitle: t(s.seoTitle, locale),
    seoDescription: t(s.seoDescription, locale),
    bookingMode: s.bookingMode,
    freeCancelHours: s.freeCancelHours,
    firstLessonText: t(s.firstLessonText, locale),
    paymentMethods: tItems(s.paymentMethods, locale),
    workingHours: Array.isArray(s.workingHours)
      ? s.workingHours.map((row) => {
          const r = row as { label?: unknown; hours?: unknown };
          return { label: t(r.label, locale), hours: t(r.hours, locale) };
        })
      : [],
    legalForm: s.legalForm,
    legalName: s.legalName,
    legalCui: s.legalCui,
    legalRegNo: s.legalRegNo,
    legalAddress: s.legalAddress,
    enEnabled: s.enEnabled,
    umamiEnabled: s.umamiEnabled,
    newsletterEnabled: s.newsletterEnabled,
    timezone: s.timezone,
    currency: s.currency,
  };
}
export type LocalizedSettings = ReturnType<typeof localizedSettings>;

// ─── Coaching team ───────────────────────────────────────────────────────────

export type CertificationView = {
  id: string;
  title: string;
  issuer: string;
  year: number | null;
  image: ResolvedImage | null;
  imageAlt: string;
};

export type CoachView = {
  id: string;
  slug: string;
  name: string;
  role: string;
  title: string;
  summary: string;
  story: string;
  philosophy: string;
  results: string;
  specialties: string[];
  yearsExperience: number | null;
  languages: string[];
  photo: ResolvedImage | null;
  photoAlt: string;
  video: ResolvedVideo | null;
  isHead: boolean;
  certifications: CertificationView[];
};

/** The team, head coach first; each coach with their certifications. */
export const getCoaches = cache(async (locale: Locale): Promise<CoachView[]> => {
  const preview = await isPreview();
  const coaches = await db.coach.findMany({
    where: preview ? {} : { active: true },
    orderBy: [{ isHead: "desc" }, { order: "asc" }],
    include: {
      photo: true,
      video: true,
      certifications: { orderBy: { order: "asc" }, include: { image: true } },
    },
  });
  return coaches.map((coach) => ({
    id: coach.id,
    slug: coach.slug,
    name: coach.name,
    role: t(coach.role, locale),
    title: t(coach.title, locale),
    summary: t(coach.summary, locale),
    story: t(coach.story, locale),
    philosophy: coach.philosophy ? t(coach.philosophy, locale) : "",
    results: coach.results ? t(coach.results, locale) : "",
    specialties: tList(coach.specialties, locale),
    yearsExperience: coach.yearsExperience,
    languages: tItems(coach.languages, locale),
    photo: resolveMedia(coach.photo),
    photoAlt: coach.photo ? t(coach.photo.alt, locale) : coach.name,
    video: resolveVideo(coach.video),
    isHead: coach.isHead,
    certifications: coach.certifications.map((c) => ({
      id: c.id,
      title: t(c.title, locale),
      issuer: c.issuer,
      year: c.year,
      image: resolveMedia(c.image),
      imageAlt: c.image ? t(c.image.alt, locale) : "",
    })),
  }));
});

export const getCoach = cache(async (slug: string, locale: Locale) => {
  const coaches = await getCoaches(locale);
  return coaches.find((coach) => coach.slug === slug) ?? null;
});

/** The head coach, who speaks for the academy (structured data, the "about" texts). */
export const getHeadCoach = cache(async (locale: Locale) => {
  const coaches = await getCoaches(locale);
  return coaches.find((coach) => coach.isHead) ?? coaches[0] ?? null;
});

// ─── Junior academy ──────────────────────────────────────────────────────────

export type AcademyGroupView = {
  id: string;
  slug: string;
  name: string;
  stage: BallStage | null;
  ageMin: number | null;
  ageMax: number | null;
  level: Level;
  summary: string;
  focusPoints: string[];
  sessionsPerWeek: number | null;
  sessionMinutes: number | null;
  schedule: string;
  monthlyFee: string | null;
  maxPlayers: number | null;
  image: ResolvedImage | null;
  imageAlt: string;
  program: { slug: string; name: string } | null;
};

export const getAcademyGroups = cache(async (locale: Locale): Promise<AcademyGroupView[]> => {
  const preview = await isPreview();
  const groups = await db.academyGroup.findMany({
    where: preview ? {} : { active: true },
    orderBy: { order: "asc" },
    include: { image: true, program: true },
  });
  return groups.map((group) => {
    const name = t(group.name, locale);
    return {
      id: group.id,
      slug: group.slug,
      name,
      stage: group.stage,
      ageMin: group.ageMin,
      ageMax: group.ageMax,
      level: group.level,
      summary: t(group.summary, locale),
      focusPoints: tList(group.focusPoints, locale),
      sessionsPerWeek: group.sessionsPerWeek,
      sessionMinutes: group.sessionMinutes,
      schedule: group.schedule ? t(group.schedule, locale) : "",
      monthlyFee: group.monthlyFee ? group.monthlyFee.toString() : null,
      maxPlayers: group.maxPlayers,
      image: resolveMedia(group.image),
      imageAlt: group.image ? t(group.image.alt, locale) : name,
      program:
        group.program && group.program.active
          ? { slug: group.program.slug, name: t(group.program.name, locale) }
          : null,
    };
  });
});

export type ResultView = {
  id: string;
  athlete: string;
  event: string;
  category: string;
  placement: string;
  date: Date;
  level: ResultLevel;
};

/** Published results; those of minors only with the parents' consent on record. */
export const getResults = cache(async (locale: Locale, limit?: number): Promise<ResultView[]> => {
  const results = await db.result.findMany({
    where: { published: true, OR: [{ isMinor: false }, { parentalConsent: true }] },
    orderBy: [{ date: "desc" }, { order: "asc" }],
    take: limit,
  });
  return results.map((r) => ({
    id: r.id,
    athlete: r.athlete,
    event: r.event,
    category: r.category,
    placement: t(r.placement, locale),
    date: r.date,
    level: r.level,
  }));
});

// ─── Scenes ──────────────────────────────────────────────────────────────────

export type SceneView = {
  id: string;
  key: string;
  order: number;
  indexName: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string | null;
  extra: Record<string, string>;
};

export const getScenes = cache(async (locale: Locale): Promise<SceneView[]> => {
  const preview = await isPreview();
  const scenes = await db.scene.findMany({
    where: preview ? {} : { active: true },
    orderBy: { order: "asc" },
  });
  return scenes.map((scene) => {
    const extra: Record<string, string> = {};
    if (scene.extra && typeof scene.extra === "object" && !Array.isArray(scene.extra)) {
      for (const [key, value] of Object.entries(scene.extra)) extra[key] = t(value, locale);
    }
    return {
      id: scene.id,
      key: scene.key,
      order: scene.order,
      indexName: t(scene.indexName, locale),
      title: t(scene.title, locale),
      body: t(scene.body, locale),
      ctaLabel: scene.ctaLabel ? t(scene.ctaLabel, locale) : "",
      ctaHref: scene.ctaHref,
      extra,
    };
  });
});

// ─── Programs & pricing ──────────────────────────────────────────────────────

export type PriceView = {
  id: string;
  name: string;
  price: string | null;
  currency: string;
  unit: PriceUnit;
  sessions: number | null;
  validityDays: number | null;
  includes: string;
  highlighted: boolean;
  isPackage: boolean;
  lessonTypeId: string | null;
};

function toPriceView(
  plan: {
    id: string;
    name: unknown;
    price: { toString(): string } | null;
    currency: string;
    unit: PriceUnit;
    sessions: number | null;
    validityDays: number | null;
    includes: unknown;
    highlighted: boolean;
    isPackage: boolean;
    lessonTypeId: string | null;
  },
  locale: Locale,
): PriceView {
  return {
    id: plan.id,
    name: t(plan.name, locale),
    price: plan.price ? plan.price.toString() : null,
    currency: plan.currency,
    unit: plan.unit,
    sessions: plan.sessions,
    validityDays: plan.validityDays,
    includes: plan.includes ? t(plan.includes, locale) : "",
    highlighted: plan.highlighted,
    isPackage: plan.isPackage,
    lessonTypeId: plan.lessonTypeId,
  };
}

/** A training programme: Inițiere, Competiție, Amatori. */
export type ProgramView = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  focusPoints: string[];
  audience: Audience;
  level: Level;
  ageMin: number | null;
  ageMax: number | null;
  image: ResolvedImage | null;
  imageAlt: string;
  bookableOnline: boolean;
  active: boolean;
};

export const getPrograms = cache(async (locale: Locale): Promise<ProgramView[]> => {
  const preview = await isPreview();
  const programs = await db.program.findMany({
    where: preview ? {} : { active: true },
    orderBy: { order: "asc" },
    include: { image: true },
  });
  return programs.map((p) => {
    const name = t(p.name, locale);
    return {
      id: p.id,
      slug: p.slug,
      name,
      summary: t(p.summary, locale),
      description: t(p.description, locale),
      focusPoints: tList(p.focusPoints, locale),
      audience: p.audience,
      level: p.level,
      ageMin: p.ageMin,
      ageMax: p.ageMax,
      image: resolveMedia(p.image),
      imageAlt: p.image ? t(p.image.alt, locale) : name,
      bookableOnline: p.bookableOnline,
      active: p.active,
    };
  });
});

export const getProgram = cache(async (slug: string, locale: Locale) => {
  const programs = await getPrograms(locale);
  return programs.find((p) => p.slug === slug) ?? null;
});

/** A kind of lesson that is booked, with its durations and hourly rate. */
export type LessonTypeView = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  minParticipants: number;
  maxParticipants: number;
  durations: number[];
  hourlyRate: string | null;
  priceUnit: PriceUnit;
  bookableOnline: boolean;
};

export const getLessonTypes = cache(async (locale: Locale): Promise<LessonTypeView[]> => {
  const types = await db.lessonType.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
  return types.map((l) => ({
    id: l.id,
    slug: l.slug,
    name: t(l.name, locale),
    summary: t(l.summary, locale),
    minParticipants: l.minParticipants,
    maxParticipants: l.maxParticipants,
    durations: [...l.durations].sort((a, b) => a - b),
    hourlyRate: l.hourlyRate ? l.hourlyRate.toString() : null,
    priceUnit: l.priceUnit,
    bookableOnline: l.bookableOnline,
  }));
});

export const getPackages = cache(async (locale: Locale): Promise<PriceView[]> => {
  const plans = await db.pricingPlan.findMany({
    where: { active: true, isPackage: true },
    orderBy: { order: "asc" },
  });
  return plans.map((plan) => toPriceView(plan, locale));
});

// ─── Location, courts, facilities ────────────────────────────────────────────

export type CourtView = {
  id: string;
  name: string;
  surface: Surface;
  count: number | null;
  coveredInWinter: boolean | null;
  floodlights: boolean | null;
};
export type FacilityView = {
  id: string;
  type: FacilityType;
  name: string;
  description: string;
  illustration: string | null;
  image: ResolvedImage | null;
  imageAlt: string;
};
export type LocationView = {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  mapUrl: string | null;
  directions: string;
  courts: CourtView[];
};

export const getLocations = cache(async (locale: Locale): Promise<LocationView[]> => {
  const locations = await db.location.findMany({
    orderBy: { order: "asc" },
    include: { courts: { where: { active: true }, orderBy: { order: "asc" } } },
  });
  return locations.map((l) => ({
    id: l.id,
    name: l.name,
    address: l.address,
    city: l.city,
    region: l.region,
    postalCode: l.postalCode,
    lat: l.lat,
    lng: l.lng,
    mapUrl: l.mapUrl,
    directions: l.directions ? t(l.directions, locale) : "",
    courts: l.courts.map((c) => ({
      id: c.id,
      name: t(c.name, locale),
      surface: c.surface,
      count: c.count,
      coveredInWinter: c.coveredInWinter,
      floodlights: c.floodlights,
    })),
  }));
});

export const getFacilities = cache(async (locale: Locale): Promise<FacilityView[]> => {
  const facilities = await db.facility.findMany({
    orderBy: [{ type: "asc" }, { order: "asc" }],
    include: { image: true },
  });
  return facilities.map((f) => ({
    id: f.id,
    type: f.type,
    name: t(f.name, locale),
    description: f.description ? t(f.description, locale) : "",
    illustration: f.illustration,
    image: resolveMedia(f.image),
    imageAlt: f.image ? t(f.image.alt, locale) : "",
  }));
});

// ─── FAQ, testimonials ───────────────────────────────────────────────────────

export type FaqView = {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
  programId: string | null;
};

export const getFaqs = cache(
  async (locale: Locale, filter: "home" | "all" = "all"): Promise<FaqView[]> => {
    const faqs = await db.faq.findMany({
      where: filter === "home" ? { showOnHome: true } : {},
      orderBy: [{ order: "asc" }],
      take: filter === "home" ? 6 : undefined,
    });
    return faqs.map((f) => ({
      id: f.id,
      question: t(f.question, locale),
      answer: t(f.answer, locale),
      category: f.category,
      programId: f.programId,
    }));
  },
);

export type TestimonialView = {
  id: string;
  author: string;
  role: string;
  text: string;
  photo: ResolvedImage | null;
};

/** Only real, consented, published reviews ever reach the public site. */
export const getTestimonials = cache(
  async (locale: Locale, limit?: number): Promise<TestimonialView[]> => {
    const items = await db.testimonial.findMany({
      where: { published: true, consent: true, isExample: false },
      orderBy: { order: "asc" },
      take: limit,
      include: { photo: true },
    });
    return items.map((i) => ({
      id: i.id,
      author: i.author,
      role: t(i.role, locale),
      text: t(i.text, locale),
      photo: resolveMedia(i.photo),
    }));
  },
);

// ─── Pages ───────────────────────────────────────────────────────────────────

export type PageHeaderView = {
  title: string;
  intro: string;
  image: ResolvedImage | null;
  imageAlt: string;
  seoTitle: string;
  seoDescription: string;
};

export const getPageHeader = cache(async (key: string, locale: Locale): Promise<PageHeaderView> => {
  const header = await db.pageHeader.findUnique({ where: { key }, include: { image: true } });
  if (!header)
    return { title: "", intro: "", image: null, imageAlt: "", seoTitle: "", seoDescription: "" };
  const title = t(header.title, locale);
  return {
    title,
    intro: t(header.intro, locale),
    image: resolveMedia(header.image),
    imageAlt: header.imageAlt ? t(header.imageAlt, locale) : "",
    seoTitle: header.seoTitle ? t(header.seoTitle, locale) : title,
    seoDescription: header.seoDescription ? t(header.seoDescription, locale) : "",
  };
});

export const getLegalPage = cache(async (kind: LegalKind, locale: Locale) => {
  const page = await db.legalPage.findUnique({ where: { kind } });
  if (!page) return null;
  return {
    title: t(page.title, locale),
    body: t(page.body, locale),
    version: page.version,
    updatedAt: page.updatedAt,
  };
});

export const getPolicyVersion = cache(async (): Promise<string> => {
  const page = await db.legalPage.findUnique({
    where: { kind: "CONFIDENTIALITATE" },
    select: { version: true },
  });
  return page?.version ?? "necunoscută";
});

// ─── Posts & gallery ─────────────────────────────────────────────────────────

export type PostView = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover: ResolvedImage | null;
  coverAlt: string;
  status: "CIORNA" | "PUBLICAT";
  publishedAt: Date | null;
  updatedAt: Date;
  seoTitle: string;
  seoDescription: string;
};

function toPostView(
  p: {
    id: string;
    slug: string;
    title: unknown;
    excerpt: unknown;
    body: unknown;
    status: "CIORNA" | "PUBLICAT";
    publishedAt: Date | null;
    updatedAt: Date;
    seoTitle: unknown;
    seoDescription: unknown;
    cover: {
      width: number;
      height: number;
      blurDataURL: string;
      variants: unknown;
      alt: unknown;
    } | null;
  },
  locale: Locale,
): PostView {
  const title = t(p.title, locale);
  return {
    id: p.id,
    slug: p.slug,
    title,
    excerpt: t(p.excerpt, locale),
    body: t(p.body, locale),
    cover: resolveMedia(p.cover),
    coverAlt: p.cover ? t(p.cover.alt, locale) : "",
    status: p.status,
    publishedAt: p.publishedAt,
    updatedAt: p.updatedAt,
    seoTitle: p.seoTitle ? t(p.seoTitle, locale) || title : title,
    seoDescription: p.seoDescription ? t(p.seoDescription, locale) : t(p.excerpt, locale),
  };
}

export const getPosts = cache(async (locale: Locale): Promise<PostView[]> => {
  const preview = await isPreview();
  const posts = await db.post.findMany({
    where: preview ? {} : { status: "PUBLICAT", publishedAt: { lte: new Date() } },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    include: { cover: true },
  });
  return posts.map((p) => toPostView(p, locale));
});

export const getPost = cache(async (slug: string, locale: Locale): Promise<PostView | null> => {
  const preview = await isPreview();
  const post = await db.post.findUnique({ where: { slug }, include: { cover: true } });
  if (!post) return null;
  if (
    !preview &&
    (post.status !== "PUBLICAT" || !post.publishedAt || post.publishedAt > new Date())
  )
    return null;
  return toPostView(post, locale);
});

export type GalleryView = {
  id: string;
  kind: "image" | "video";
  image: ResolvedImage;
  video: ResolvedVideo | null;
  alt: string;
  caption: string;
  category: GalleryCategory;
};

/**
 * Published photos and videos. Those with minors are shown only when the parent's consent is
 * recorded; a video appears once it has been converted.
 */
export const getGallery = cache(async (locale: Locale, limit?: number): Promise<GalleryView[]> => {
  const items = await db.galleryItem.findMany({
    where: { published: true, OR: [{ hasMinors: false }, { parentalConsent: true }] },
    orderBy: { order: "asc" },
    include: { media: true },
  });
  const views = items.flatMap((item): GalleryView[] => {
    const video = resolveVideo(item.media);
    const image = video ? video.poster : resolveMedia(item.media);
    if (!image || (item.media.kind === "VIDEO" && !video)) return [];
    return [
      {
        id: item.id,
        kind: video ? "video" : "image",
        image,
        video,
        alt: t(item.alt, locale),
        caption: item.caption ? t(item.caption, locale) : "",
        category: item.category,
      },
    ];
  });
  return limit === undefined ? views : views.slice(0, limit);
});
