import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import en from "@jungle/i18n/messages/en.json";
import ro from "@jungle/i18n/messages/ro.json";
import { routing } from "./routing";

// One source of truth for every text (ADR-0018): packages/i18n.
const catalogs = { ro, en } as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: catalogs[locale], timeZone: "Europe/Bucharest" };
});
