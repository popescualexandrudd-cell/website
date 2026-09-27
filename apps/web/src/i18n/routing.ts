import { defineRouting } from "next-intl/routing";

// Localised URLs (§9.3, §15.1): /ro/lista/confirmare vs /en/waitlist/confirm.
export const routing = defineRouting({
  locales: ["ro", "en"],
  defaultLocale: "ro",
  localePrefix: "always",
  // The language lives in the URL; no locale cookie (fewer cookies, §12.2).
  localeCookie: false,
  pathnames: {
    "/": "/",
    "/waitlist/confirm": { ro: "/lista/confirmare", en: "/waitlist/confirm" },
    "/waitlist/unsubscribe": { ro: "/lista/dezabonare", en: "/waitlist/unsubscribe" },
    "/privacy-notice": { ro: "/nota-informare", en: "/privacy-notice" },
    "/terms": { ro: "/termeni-si-conditii", en: "/terms" },
    "/privacy": { ro: "/confidentialitate", en: "/privacy" },
    "/refunds": { ro: "/anulare-si-rambursare", en: "/refunds" },
    "/cookies": { ro: "/cookies", en: "/cookies" },
  },
});

export type Locale = (typeof routing.locales)[number];
