/**
 * schema.org data for search engines (§15.1): the club (SportsActivityLocation), the questions
 * (FAQPage), the calendar (Event) and the path of a page (BreadcrumbList). Pure builders, rendered by
 * `JsonLd`; only facts the site already shows (no prices still DE_STABILIT, no reviews, no demo
 * events presented as real: invariant 12).
 */
import type { Company } from "./company";
import type { CalendarItem } from "./events";
import { wording } from "./events";
import { ADDRESS, SITE_URL } from "./site";

type Thing = Record<string, unknown>;

const PLACE = {
  "@type": "Place",
  name: "Jungle Padel",
  address: {
    "@type": "PostalAddress",
    streetAddress: ADDRESS.street,
    addressLocality: ADDRESS.locality,
    addressRegion: ADDRESS.region,
    addressCountry: ADDRESS.country,
  },
} as const;

export const pageUrl = (locale: string, path = "") => `${SITE_URL}/${locale}${path === "/" ? "" : path}`;

/** The club: name, address, opening hours (Q3, "08:00"–"23:00"), public phone and email if set. */
export function clubData(locale: string, description: string, hours: [string, string], company: Company | null): Thing {
  const phone = company?.phone?.trim();
  return {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: "Jungle Padel",
    url: pageUrl(locale),
    description,
    address: PLACE.address,
    sport: ["Padel", "Pilates", "Tennis"],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: hours[0],
      closes: hours[1],
    },
    ...(phone ? { telephone: phone } : {}),
  };
}

export function faqData(items: { q: string; a: string }[]): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
  };
}

/** The real events of the calendar (the demo ones are left out), cancelled ones marked as such. */
export function eventsData(items: CalendarItem[], locale: string): Thing[] {
  return items
    .filter((item) => !item.demo)
    .map((item) => {
      const { title, text } = wording(item, locale);
      return {
        "@context": "https://schema.org",
        "@type": "Event",
        name: title,
        ...(text ? { description: text } : {}),
        startDate: item.starts_at,
        ...(item.ends_at ? { endDate: item.ends_at } : {}),
        eventStatus: item.cancelled ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: PLACE,
        organizer: { "@type": "Organization", name: "Jungle Padel", url: pageUrl(locale) },
      };
    });
}

export function breadcrumbData(trail: { name: string; url: string }[]): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({ "@type": "ListItem", position: i + 1, name: step.name, item: step.url })),
  };
}

/** The script's text: `<` escaped, so no text from the API can close the tag. */
export function jsonLdText(data: Thing | Thing[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
