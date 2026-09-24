/** Absolute URLs used outside React (emails, calendar files). Mirrors i18n/routing.ts. */
export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

const LOCALIZED = {
  manage: { ro: "/rezervare", en: "/en/booking" },
  review: { ro: "/recenzie", en: "/en/review" },
  newsletter: { ro: "/newsletter", en: "/en/newsletter" },
  booking: { ro: "/rezervare", en: "/en/booking" },
  privacy: { ro: "/confidentialitate", en: "/en/privacy" },
  waitlist: { ro: "/lista-asteptare", en: "/en/waitlist" },
} as const;

type Lang = "ro" | "en";
const lang = (locale: string): Lang => (locale === "en" ? "en" : "ro");

export const urls = {
  home: (locale: string) => `${appUrl()}${lang(locale) === "en" ? "/en" : "/"}`,
  manageBooking: (token: string, locale: string) =>
    `${appUrl()}${LOCALIZED.manage[lang(locale)]}/${token}`,
  review: (token: string, locale: string) =>
    `${appUrl()}${LOCALIZED.review[lang(locale)]}/${token}`,
  newsletter: (token: string, locale: string) =>
    `${appUrl()}${LOCALIZED.newsletter[lang(locale)]}/${token}`,
  booking: (locale: string) => `${appUrl()}${LOCALIZED.booking[lang(locale)]}`,
  privacy: (locale: string) => `${appUrl()}${LOCALIZED.privacy[lang(locale)]}`,
  waitlist: (locale: string) => `${appUrl()}${LOCALIZED.waitlist[lang(locale)]}`,
  ics: (token: string) => `${appUrl()}/api/ics/${token}`,
  adminBooking: (id: string) => `${appUrl()}/admin/rezervari/${id}`,
  adminAction: (token: string) => `${appUrl()}/admin/actiune/${token}`,
  adminMessages: () => `${appUrl()}/admin/mesaje`,
  adminWaitlist: () => `${appUrl()}/admin/lista-asteptare`,
  adminReviews: () => `${appUrl()}/admin/continut/recenzii`,
  asset: (path: string) => `${appUrl()}${path}`,
};
