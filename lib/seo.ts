import "server-only";
import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { appUrl } from "./paths";
import { getSettings } from "./content";

type Href = Parameters<typeof getPathname>[0]["href"];

/** Absolute URL of a page in a given language, e.g. /preturi (ro) or /en/pricing (en). */
export function localizedUrl(href: Href, locale: Locale): string {
  const path = getPathname({ href, locale });
  return `${appUrl()}${path === "/" && locale === "ro" ? "" : path}` || appUrl();
}

/**
 * Metadata shared by every public page: title, description, canonical URL, hreflang
 * alternates (only when English is switched on) and Open Graph.
 */
export async function pageMetadata(options: {
  locale: Locale;
  href: Href;
  title: string;
  description?: string;
  absoluteTitle?: boolean;
  noindex?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
}): Promise<Metadata> {
  const settings = await getSettings();
  const canonical = localizedUrl(options.href, options.locale);
  const image = {
    url: `${appUrl()}/api/og?path=${encodeURIComponent(getPathname({ href: options.href, locale: "ro" }))}&lang=${options.locale}`,
    width: 1200,
    height: 630,
    alt: options.title,
  };
  const languages = settings.enEnabled
    ? {
        ro: localizedUrl(options.href, "ro"),
        en: localizedUrl(options.href, "en"),
        "x-default": localizedUrl(options.href, "ro"),
      }
    : undefined;
  return {
    title: options.absoluteTitle ? { absolute: options.title } : options.title,
    description: options.description || undefined,
    alternates: { canonical, languages },
    robots: options.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: options.title,
      description: options.description || undefined,
      url: canonical,
      type: options.type ?? "website",
      locale: options.locale === "en" ? "en_GB" : "ro_RO",
      images: [image],
      ...(options.publishedTime ? { publishedTime: options.publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description: options.description || undefined,
      images: [image.url],
    },
  };
}
