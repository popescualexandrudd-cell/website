import { isFilled } from "./i18n-content";
import type {
  AcademyGroupView,
  FaqView,
  LessonTypeView,
  LocalizedSettings,
  LocationView,
  PostView,
  ProgramView,
} from "./content";
import { appUrl } from "./paths";
import type { ResolvedImage } from "./media-shared";

/** schema.org objects (JSON-LD). Missing ([DE COMPLETAT]) values are simply left out. */

const clean = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  ) as T;

const OPENING_DAYS: Record<string, string[]> = {
  "Luni–vineri": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "Monday–Friday": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  Sâmbătă: ["Saturday"],
  Saturday: ["Saturday"],
  Duminică: ["Sunday"],
  Sunday: ["Sunday"],
};

function openingHours(settings: LocalizedSettings) {
  return settings.workingHours.flatMap((row) => {
    const match = row.hours.match(/(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/);
    const days = OPENING_DAYS[row.label];
    if (!match || !days) return [];
    return [
      { "@type": "OpeningHoursSpecification", dayOfWeek: days, opens: match[1], closes: match[2] },
    ];
  });
}

export function businessId(): string {
  return `${appUrl()}/#business`;
}

export function personLd(
  settings: LocalizedSettings,
  coach: { name: string; title: string; languages: string[] },
  url: string,
) {
  return clean({
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${url}#person`,
    name: isFilled(coach.name) ? coach.name : undefined,
    jobTitle: coach.title,
    url,
    knowsLanguage: coach.languages,
    telephone: isFilled(settings.phone) ? settings.phone : undefined,
    email: isFilled(settings.email) ? settings.email : undefined,
    worksFor: { "@id": businessId() },
    sameAs: [settings.instagramUrl, settings.facebookUrl, settings.tiktokUrl].filter(
      (s): s is string => Boolean(s),
    ),
  });
}

/** "Bulevardul Biruinței 19-21, Pantelimon, Ilfov" → "Bulevardul Biruinței 19-21" when the rest is the town and county. */
function streetOf(location: LocationView): string {
  const parts = location.address.split(",").map((part) => part.trim());
  const extra = new Set(
    [location.city, location.region].filter(Boolean).map((v) => v!.toLowerCase()),
  );
  const street = parts.filter((part, i) => i === 0 || !extra.has(part.toLowerCase()));
  return street.join(", ");
}

/** The largest encoding of an uploaded image, as an absolute URL. */
function imageUrl(image: ResolvedImage | null): string | undefined {
  const largest = image?.webp.at(-1)?.src;
  return largest ? `${appUrl()}${largest}` : undefined;
}

type BusinessExtras = {
  lessons?: LessonTypeView[];
  groups?: AcademyGroupView[];
  /** Links to the coaches' pages, as schema.org Person ids. */
  coachUrls?: string[];
};

/**
 * The club: a sports club (organisation) and a place to play (local business) at once, so both
 * the knowledge panel and the local map results can use it.
 */
export function businessLd(
  settings: LocalizedSettings,
  location: LocationView | null,
  description: string,
  extras: BusinessExtras = {},
) {
  const { lessons = [], groups = [], coachUrls = [] } = extras;
  const town = location && isFilled(location.city) ? location.city : undefined;
  const lessonOffers = lessons.map((l) =>
    clean({
      "@type": "Offer",
      name: l.name,
      description: isFilled(l.summary) ? l.summary : undefined,
      price: l.hourlyRate ?? undefined,
      priceCurrency: l.hourlyRate ? settings.currency : undefined,
      unitText: l.hourlyRate ? "oră" : undefined,
      itemOffered: { "@type": "Service", name: l.name, serviceType: "Lecții de tenis" },
    }),
  );
  const groupOffers = groups.map((g) =>
    clean({
      "@type": "Offer",
      name: g.name,
      price: g.monthlyFee ?? undefined,
      priceCurrency: g.monthlyFee ? settings.currency : undefined,
      unitText: g.monthlyFee ? "lună" : undefined,
      itemOffered: clean({
        "@type": "Course",
        name: g.name,
        description: isFilled(g.summary) ? g.summary : undefined,
        provider: { "@id": businessId() },
      }),
    }),
  );
  const courts = location?.courts ?? [];
  const covered = courts.filter((c) => c.coveredInWinter && c.count);
  const floodlit = courts.filter((c) => c.floodlights && c.count);
  return clean({
    "@context": "https://schema.org",
    "@type": ["SportsClub", "SportsActivityLocation"],
    "@id": businessId(),
    name: isFilled(settings.brandName) ? settings.brandName : settings.tagline,
    alternateName: isFilled(settings.tagline)
      ? `${settings.brandName} · ${settings.tagline}`
      : undefined,
    description,
    sport: "Tenis",
    url: appUrl(),
    logo: imageUrl(settings.logo),
    image: imageUrl(settings.heroImage) ?? `${appUrl()}/api/og?path=%2F&lang=ro`,
    telephone: isFilled(settings.phone) ? settings.phone : undefined,
    email: isFilled(settings.email) ? settings.email : undefined,
    currenciesAccepted: settings.currency,
    paymentAccepted: settings.paymentMethods.join(", "),
    openingHoursSpecification: openingHours(settings),
    address:
      location && isFilled(location.address)
        ? clean({
            "@type": "PostalAddress",
            streetAddress: streetOf(location),
            addressLocality: town,
            addressRegion: location.region ?? undefined,
            postalCode: location.postalCode ?? undefined,
            addressCountry: "RO",
          })
        : undefined,
    geo:
      location?.lat && location.lng
        ? { "@type": "GeoCoordinates", latitude: location.lat, longitude: location.lng }
        : undefined,
    hasMap: location?.mapUrl ?? undefined,
    areaServed: town
      ? [town, "București", "Ilfov"].map((name) => ({ "@type": "Place", name }))
      : undefined,
    amenityFeature: [
      ...courts
        .filter((c) => c.count)
        .map((c) => ({
          "@type": "LocationFeatureSpecification",
          name: c.name,
          value: c.count,
        })),
      ...(covered.length > 0
        ? [
            {
              "@type": "LocationFeatureSpecification",
              name: "Terenuri acoperite iarna",
              value: true,
            },
          ]
        : []),
      ...(floodlit.length > 0
        ? [{ "@type": "LocationFeatureSpecification", name: "Nocturnă", value: true }]
        : []),
    ],
    knowsAbout: [
      "Tenis",
      "Tenis pentru copii",
      "Mini tenis",
      "Tenis de competiție",
      "Tenis pe zgură",
    ],
    sameAs: [settings.instagramUrl, settings.facebookUrl, settings.tiktokUrl].filter(
      (s): s is string => Boolean(s),
    ),
    employee:
      coachUrls.length > 0 ? coachUrls.map((url) => ({ "@id": `${url}#person` })) : undefined,
    hasOfferCatalog:
      lessonOffers.length + groupOffers.length > 0
        ? {
            "@type": "OfferCatalog",
            name: "Lecții de tenis și academia de juniori",
            itemListElement: [
              ...(lessonOffers.length > 0
                ? [
                    {
                      "@type": "OfferCatalog",
                      name: "Lecții de tenis",
                      itemListElement: lessonOffers,
                    },
                  ]
                : []),
              ...(groupOffers.length > 0
                ? [
                    {
                      "@type": "OfferCatalog",
                      name: "Academia de juniori",
                      itemListElement: groupOffers,
                    },
                  ]
                : []),
            ],
          }
        : undefined,
  });
}

/** The junior academy's groups as courses, for the academy page. */
export function coursesLd(groups: AcademyGroupView[], url: string, currency: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: groups.map((g, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: clean({
        "@type": "Course",
        name: g.name,
        description: isFilled(g.summary) ? g.summary : g.name,
        url: `${url}#grupe`,
        provider: { "@id": businessId() },
        inLanguage: "ro",
        audience: clean({
          "@type": "PeopleAudience",
          suggestedMinAge: g.ageMin ?? undefined,
          suggestedMaxAge: g.ageMax ?? undefined,
        }),
        offers: g.monthlyFee
          ? { "@type": "Offer", price: g.monthlyFee, priceCurrency: currency, category: "lunar" }
          : undefined,
      }),
    })),
  };
}

export function serviceLd(
  program: ProgramView,
  url: string,
  lessons: LessonTypeView[] = [],
  currency = "RON",
) {
  // One offer per kind of lesson with a published hourly rate (price of one hour).
  const offers = lessons
    .filter((l) => l.hourlyRate !== null)
    .map((l) =>
      clean({
        "@type": "Offer",
        name: `${l.name}, 60 min`,
        price: l.hourlyRate,
        priceCurrency: currency,
        url,
      }),
    );
  return clean({
    "@context": "https://schema.org",
    "@type": "Service",
    name: program.name,
    description: program.summary,
    serviceType: "Tennis coaching",
    url,
    provider: { "@id": businessId() },
    areaServed: undefined,
    offers: offers.length > 0 ? offers : undefined,
  });
}

export function faqLd(faqs: FaqView[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs
      .filter((f) => isFilled(f.question) && isFilled(f.answer))
      .map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
  };
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function articleLd(post: PostView, url: string, authorName: string) {
  return clean({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    url,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: isFilled(authorName) ? { "@type": "Person", name: authorName } : undefined,
    publisher: { "@id": businessId() },
    mainEntityOfPage: url,
  });
}
