import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";

/** Public pages in both languages (the waitlist confirmation pages are noindex and left out). */
const PUBLIC_PAGES = ["/", "/terms", "/privacy", "/refunds", "/cookies", "/privacy-notice"] as const;

function localized(page: (typeof PUBLIC_PAGES)[number], locale: "ro" | "en"): string {
  const entry = routing.pathnames[page];
  const path = typeof entry === "string" ? entry : entry[locale];
  return `${SITE_URL}/${locale}${path === "/" ? "" : path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.flatMap((page) =>
    (["ro", "en"] as const).map((locale) => ({
      url: localized(page, locale),
      changeFrequency: page === "/" ? ("weekly" as const) : ("monthly" as const),
      priority: page === "/" ? 1 : 0.4,
      alternates: { languages: { ro: localized(page, "ro"), en: localized(page, "en") } },
    })),
  );
}
