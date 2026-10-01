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
    // The installable site (§9.4): shown by the service worker with no connection.
    "/offline": { ro: "/offline", en: "/offline" },
    // The full site (Stage 11, §9.3): the pages of the main menu, the bookings and the account.
    "/padel": { ro: "/padel", en: "/padel" },
    "/league": { ro: "/liga", en: "/league" },
    "/league/players/[id]": { ro: "/liga/jucator/[id]", en: "/league/players/[id]" },
    "/tennis": { ro: "/tenis", en: "/tennis" },
    "/pilates": { ro: "/pilates", en: "/pilates" },
    "/packages": { ro: "/pachete", en: "/packages" },
    "/events": { ro: "/evenimente", en: "/events" },
    "/cafe": { ro: "/cafenea", en: "/cafe" },
    "/contact": { ro: "/contact", en: "/contact" },
    "/corporate": { ro: "/corporate", en: "/corporate" },
    "/about": { ro: "/despre", en: "/about" },
    "/blog": { ro: "/blog", en: "/blog" },
    "/blog/[slug]": { ro: "/blog/[slug]", en: "/blog/[slug]" },
    "/bookings": { ro: "/rezervari", en: "/bookings" },
    "/account": { ro: "/cont", en: "/account" },
    "/account/register": { ro: "/cont/inregistrare", en: "/account/register" },
    "/account/verify-email": { ro: "/cont/verificare-email", en: "/account/verify-email" },
    "/account/forgot-password": { ro: "/cont/am-uitat-parola", en: "/account/forgot-password" },
    "/account/new-password": { ro: "/cont/parola-noua", en: "/account/new-password" },
    "/account/card": { ro: "/cont/card", en: "/account/card" },
    "/account/payments": { ro: "/cont/plati", en: "/account/payments" },
    "/account/league": { ro: "/cont/liga", en: "/account/league" },
    "/account/events": { ro: "/cont/evenimente", en: "/account/events" },
    "/account/profile": { ro: "/cont/profil", en: "/account/profile" },
  },
});

export type Locale = (typeof routing.locales)[number];
