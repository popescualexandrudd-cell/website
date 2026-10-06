import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { articles } from "@/lib/blog";
import { siteMode } from "@/lib/flags";
import { SITE_URL } from "@/lib/site";

type Page = Exclude<keyof typeof routing.pathnames, `${string}[${string}`>;

/** The pre-launch site: the home page and the legal texts (the waitlist confirmation pages are noindex). */
const PRELAUNCH: Page[] = ["/", "/terms", "/privacy", "/refunds", "/cookies", "/privacy-notice", "/rules"];
/** The full site (Stage 11, §9.3): its pages too (the account and the offline page are not for search engines). */
const FULL: Page[] = [
  "/padel",
  "/league",
  "/tennis",
  "/pilates",
  "/packages",
  "/events",
  "/cafe",
  "/contact",
  "/corporate",
  "/about",
  "/blog",
  "/bookings",
];
const LEGAL = new Set<Page>(["/terms", "/privacy", "/refunds", "/cookies", "/privacy-notice", "/rules"]);

function localized(path: string, locale: "ro" | "en"): string {
  return `${SITE_URL}/${locale}${path === "/" ? "" : path}`;
}

function pathOf(page: Page, locale: "ro" | "en"): string {
  const entry = routing.pathnames[page];
  return typeof entry === "string" ? entry : entry[locale];
}

function entry(ro: string, en: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly", lastModified?: string) {
  return (["ro", "en"] as const).map((locale) => ({
    url: localized(locale === "ro" ? ro : en, locale),
    changeFrequency,
    priority,
    ...(lastModified ? { lastModified } : {}),
    alternates: { languages: { ro: localized(ro, "ro"), en: localized(en, "en") } },
  }));
}

/** One entry per page and language, each with its other language (hreflang, §15.1). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const full = (await siteMode()) === "full";
  const pages = full ? [...PRELAUNCH, ...FULL] : PRELAUNCH;
  const out = pages.flatMap((page) =>
    entry(
      pathOf(page, "ro"),
      pathOf(page, "en"),
      page === "/" ? 1 : LEGAL.has(page) ? 0.3 : 0.7,
      page === "/" || page === "/league" || page === "/events" ? "daily" : LEGAL.has(page) ? "monthly" : "weekly",
    ),
  );
  if (full) {
    // Demo articles (invariant 12) are not offered to search engines.
    for (const article of ((await articles()) ?? []).filter((a) => !a.demo)) {
      out.push(...entry(`/blog/${article.slug}`, `/blog/${article.slug}`, 0.5, "monthly", article.updated_at));
    }
  }
  return out;
}
