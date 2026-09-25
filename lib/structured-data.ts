import { isFilled } from "./i18n-content";
import type {
  FaqView,
  LessonTypeView,
  LocalizedSettings,
  LocationView,
  PostView,
  ProgramView,
} from "./content";
import { appUrl } from "./paths";

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

export function businessLd(
  settings: LocalizedSettings,
  location: LocationView | null,
  description: string,
  lessons: LessonTypeView[] = [],
) {
  const town = location && isFilled(location.city) ? location.city : undefined;
  const offers = lessons
    .filter((l) => l.hourlyRate !== null)
    .map((l) =>
      clean({
        "@type": "Offer",
        name: `${l.name}, 60 min`,
        price: l.hourlyRate,
        priceCurrency: settings.currency,
      }),
    );
  return clean({
    "@context": "https://schema.org",
    "@type": ["SportsActivityLocation", "LocalBusiness"],
    "@id": businessId(),
    name: isFilled(settings.brandName) ? settings.brandName : settings.tagline,
    alternateName:
      location && isFilled(location.name) ? `Lecții de tenis la ${location.name}` : undefined,
    description,
    url: appUrl(),
    image: `${appUrl()}/api/og?path=%2F&lang=ro`,
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
    sameAs: [settings.instagramUrl, settings.facebookUrl, settings.tiktokUrl].filter(
      (s): s is string => Boolean(s),
    ),
    makesOffer: offers.length > 0 ? offers : undefined,
  });
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
