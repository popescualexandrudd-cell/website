import "server-only";
import { cache } from "react";
import { draftMode } from "next/headers";
import { db } from "./db";
import { pickArt, resolveMedia, type ArtSet, type ResolvedImage } from "./art";
import { t, tItems, tList } from "./i18n-content";
import type { Locale } from "@/i18n/routing";
import type {
  Audience,
  FacilityType,
  FaqCategory,
  GalleryCategory,
  LegalKind,
  Level,
  PriceUnit,
  ProgramFormat,
  SceneTransition,
  Surface,
  TextPosition,
  TextTone,
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
  const s = await db.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
  return s;
});

export const getSettings = loadSettings;

export function localizedSettings(s: SettingsView, locale: Locale) {
  return {
    brandName: s.brandName,
    monogram: s.monogram,
    tagline: t(s.tagline, locale),
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

// ─── Coach ───────────────────────────────────────────────────────────────────

export const getCoach = cache(async (locale: Locale) => {
  const coach = await db.coachProfile.findUniqueOrThrow({ where: { id: 1 }, include: { photo: true } });
  const certifications = await db.certification.findMany({ orderBy: { order: "asc" }, include: { image: true } });
  return {
    name: coach.name,
    title: t(coach.title, locale),
    story: t(coach.story, locale),
    philosophy: t(coach.philosophy, locale),
    results: coach.results ? t(coach.results, locale) : "",
    yearsExperience: coach.yearsExperience,
    languages: tItems(coach.languages, locale),
    photo: resolveMedia(coach.photo),
    photoAlt: coach.photo ? t(coach.photo.alt, locale) : "",
    certifications: certifications.map((c) => ({
      id: c.id,
      title: t(c.title, locale),
      issuer: c.issuer,
      year: c.year,
      image: resolveMedia(c.image),
      imageAlt: c.image ? t(c.image.alt, locale) : "",
    })),
  };
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
  imageAlt: string;
  art: ArtSet | null;
  artSecondary: ArtSet | null;
  textPosDesktop: TextPosition;
  textPosMobile: TextPosition;
  tone: TextTone;
  veil: boolean;
  ball: { x: number; y: number; size: number };
  transition: SceneTransition;
};

export const getScenes = cache(async (locale: Locale): Promise<SceneView[]> => {
  const preview = await isPreview();
  const scenes = await db.scene.findMany({
    where: preview ? {} : { active: true },
    orderBy: { order: "asc" },
    include: { image: true, imageMobile: true, imageSecondary: true, imageSecondaryMobile: true },
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
      imageAlt: t(scene.imageAlt, locale),
      art: pickArt({ media: scene.image, mobileMedia: scene.imageMobile, artKey: scene.artKey }),
      artSecondary:
        scene.artKeySecondary || scene.imageSecondary
          ? pickArt({ media: scene.imageSecondary, mobileMedia: scene.imageSecondaryMobile, artKey: scene.artKeySecondary })
          : null,
      textPosDesktop: scene.textPosDesktop,
      textPosMobile: scene.textPosMobile,
      tone: scene.tone,
      veil: scene.veil,
      ball: { x: scene.ballX, y: scene.ballY, size: scene.ballSize },
      transition: scene.transition,
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
  programId: string | null;
};

function toPriceView(plan: {
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
  programId: string | null;
}, locale: Locale): PriceView {
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
    programId: plan.programId,
  };
}

export type ProgramView = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  focusPoints: string[];
  audience: Audience;
  level: Level;
  format: ProgramFormat;
  durationMin: number | null;
  maxParticipants: number | null;
  ageMin: number | null;
  ageMax: number | null;
  art: ArtSet | null;
  imageAlt: string;
  bookableOnline: boolean;
  active: boolean;
  prices: PriceView[];
  priceFrom: PriceView | null;
  isGroup: boolean;
  isExclusive: boolean;
  forMinors: boolean;
};

function lowestPrice(prices: PriceView[]): PriceView | null {
  const regular = prices.filter((p) => !p.isPackage);
  const priced = regular.filter((p) => p.price !== null);
  if (priced.length > 0) return [...priced].sort((a, b) => Number(a.price) - Number(b.price))[0] ?? null;
  return regular[0] ?? null;
}

export function isChildrenProgram(p: { audience: Audience; ageMax: number | null }): boolean {
  return p.audience === "COPII" || p.audience === "JUNIORI" || (p.ageMax !== null && p.ageMax < 18);
}

export const getPrograms = cache(async (locale: Locale): Promise<ProgramView[]> => {
  const preview = await isPreview();
  const programs = await db.program.findMany({
    where: preview ? {} : { active: true },
    orderBy: { order: "asc" },
    include: { image: true, pricingPlans: { where: { active: true }, orderBy: { order: "asc" } } },
  });
  return programs.map((p) => {
    const prices = p.pricingPlans.map((plan) => toPriceView(plan, locale));
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
      format: p.format,
      durationMin: p.durationMin,
      maxParticipants: p.maxParticipants,
      ageMin: p.ageMin,
      ageMax: p.ageMax,
      art: pickArt({ media: p.image, artKey: p.artKey }),
      imageAlt: p.image ? t(p.image.alt, locale) : name,
      bookableOnline: p.bookableOnline,
      active: p.active,
      prices,
      priceFrom: lowestPrice(prices),
      isGroup: p.format === "GRUPA",
      isExclusive: p.format === "INDIVIDUAL" || p.format === "SEMI_PRIVAT",
      forMinors: isChildrenProgram(p),
    };
  });
});

export const getProgram = cache(async (slug: string, locale: Locale) => {
  const programs = await getPrograms(locale);
  return programs.find((p) => p.slug === slug) ?? null;
});

export const getPackages = cache(async (locale: Locale): Promise<PriceView[]> => {
  const plans = await db.pricingPlan.findMany({ where: { active: true, isPackage: true }, orderBy: { order: "asc" } });
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
  const facilities = await db.facility.findMany({ orderBy: [{ type: "asc" }, { order: "asc" }], include: { image: true } });
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

export type FaqView = { id: string; question: string; answer: string; category: FaqCategory; programId: string | null };

export const getFaqs = cache(async (locale: Locale, filter: "home" | "all" = "all"): Promise<FaqView[]> => {
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
});

export type TestimonialView = { id: string; author: string; role: string; text: string; photo: ResolvedImage | null };

/** Only real, consented, published reviews ever reach the public site. */
export const getTestimonials = cache(async (locale: Locale, limit?: number): Promise<TestimonialView[]> => {
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
});

// ─── Pages ───────────────────────────────────────────────────────────────────

export type PageHeaderView = {
  title: string;
  intro: string;
  art: ArtSet | null;
  imageAlt: string;
  seoTitle: string;
  seoDescription: string;
};

export const getPageHeader = cache(async (key: string, locale: Locale): Promise<PageHeaderView> => {
  const header = await db.pageHeader.findUnique({ where: { key }, include: { image: true } });
  if (!header) return { title: "", intro: "", art: null, imageAlt: "", seoTitle: "", seoDescription: "" };
  const title = t(header.title, locale);
  return {
    title,
    intro: t(header.intro, locale),
    art: pickArt({ media: header.image, artKey: header.artKey }),
    imageAlt: header.imageAlt ? t(header.imageAlt, locale) : "",
    seoTitle: header.seoTitle ? t(header.seoTitle, locale) : title,
    seoDescription: header.seoDescription ? t(header.seoDescription, locale) : "",
  };
});

export const getLegalPage = cache(async (kind: LegalKind, locale: Locale) => {
  const page = await db.legalPage.findUnique({ where: { kind } });
  if (!page) return null;
  return { title: t(page.title, locale), body: t(page.body, locale), version: page.version, updatedAt: page.updatedAt };
});

export const getPolicyVersion = cache(async (): Promise<string> => {
  const page = await db.legalPage.findUnique({ where: { kind: "CONFIDENTIALITATE" }, select: { version: true } });
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
    cover: { width: number; height: number; blurDataURL: string; variants: unknown; alt: unknown } | null;
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
  if (!preview && (post.status !== "PUBLICAT" || !post.publishedAt || post.publishedAt > new Date())) return null;
  return toPostView(post, locale);
});

export type GalleryView = {
  id: string;
  image: ResolvedImage;
  alt: string;
  caption: string;
  category: GalleryCategory;
};

/** Photos with minors are shown only when the parent's consent is recorded. */
export const getGallery = cache(async (locale: Locale): Promise<GalleryView[]> => {
  const items = await db.galleryItem.findMany({
    where: { published: true, OR: [{ hasMinors: false }, { parentalConsent: true }] },
    orderBy: { order: "asc" },
    include: { media: true },
  });
  return items.flatMap((item) => {
    const image = resolveMedia(item.media);
    if (!image) return [];
    return [{ id: item.id, image, alt: t(item.alt, locale), caption: item.caption ? t(item.caption, locale) : "", category: item.category }];
  });
});
