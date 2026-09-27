import { defineRouting } from "next-intl/routing";

// Localised URLs (§9.3, §15.1): /ro/lista/confirmare vs /en/waitlist/confirm.
export const routing = defineRouting({
  locales: ["ro", "en"],
  defaultLocale: "ro",
  localePrefix: "always",
  pathnames: {
    "/": "/",
    "/waitlist/confirm": { ro: "/lista/confirmare", en: "/waitlist/confirm" },
    "/waitlist/unsubscribe": { ro: "/lista/dezabonare", en: "/waitlist/unsubscribe" },
    "/privacy-notice": { ro: "/nota-informare", en: "/privacy-notice" },
  },
});

export type Locale = (typeof routing.locales)[number];
