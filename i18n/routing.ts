import { defineRouting } from "next-intl/routing";

export const locales = ["ro", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ro";

/**
 * Romanian is served without a prefix; English lives under /en with translated
 * path segments. The file system uses the Romanian segments as internal names.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
  alternateLinks: false,
  pathnames: {
    "/": "/",
    "/programe": { ro: "/programe", en: "/programs" },
    "/programe/[slug]": { ro: "/programe/[slug]", en: "/programs/[slug]" },
    "/facilitati": { ro: "/facilitati", en: "/facilities" },
    "/despre": { ro: "/despre", en: "/about" },
    "/academie": { ro: "/academie", en: "/junior-academy" },
    "/echipa": { ro: "/echipa", en: "/team" },
    "/echipa/[slug]": { ro: "/echipa/[slug]", en: "/team/[slug]" },
    "/preturi": { ro: "/preturi", en: "/pricing" },
    "/rezervare": { ro: "/rezervare", en: "/booking" },
    "/rezervare/[token]": { ro: "/rezervare/[token]", en: "/booking/[token]" },
    "/galerie": { ro: "/galerie", en: "/gallery" },
    "/sfaturi": { ro: "/sfaturi", en: "/tips" },
    "/sfaturi/[slug]": { ro: "/sfaturi/[slug]", en: "/tips/[slug]" },
    "/intrebari": { ro: "/intrebari", en: "/faq" },
    "/contact": "/contact",
    "/lista-asteptare": { ro: "/lista-asteptare", en: "/waitlist" },
    "/recenzie/[token]": { ro: "/recenzie/[token]", en: "/review/[token]" },
    "/newsletter/[token]": "/newsletter/[token]",
    "/confidentialitate": { ro: "/confidentialitate", en: "/privacy" },
    "/termeni": { ro: "/termeni", en: "/terms" },
    "/cookies": "/cookies",
    "/inchiriere-teren": { ro: "/inchiriere-teren", en: "/court-hire" },
    "/turnee": { ro: "/turnee", en: "/tournaments" },
    "/scoli-gradinite": { ro: "/scoli-gradinite", en: "/schools" },
  },
});

export type AppPathname = keyof typeof routing.pathnames;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
