import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import en from "@jungle/i18n/messages/en.json";
import ro from "@jungle/i18n/messages/ro.json";
import { mergeTexts, publishedTexts } from "@/lib/content";
import { routing } from "./routing";

// One source of truth for every text (ADR-0018): packages/i18n, with the website's texts changed
// from the panel on top where they fit (`lib/content.ts`).
const catalogs = { ro, en } as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const messages = mergeTexts(catalogs[locale], await publishedTexts(locale)) as typeof ro;
  return { locale, messages, timeZone: "Europe/Bucharest" };
});
