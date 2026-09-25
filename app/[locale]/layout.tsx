import "../globals.css";
import "./academy.css";
import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Script from "next/script";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { fontVariables } from "../fonts";
import { routing, type Locale } from "@/i18n/routing";
import { brandColors } from "@/lib/color";
import { getLocations, getPolicyVersion, getSettings, localizedSettings } from "@/lib/content";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBar } from "@/components/site/MobileBar";
import { PreviewBanner } from "@/components/site/PreviewBanner";
import { ScrollEffects } from "@/components/site/ScrollEffects";
import { telLink, whatsappLink } from "@/lib/format";
import { appUrl } from "@/lib/paths";

export const dynamic = "force-dynamic";

export async function generateViewport(): Promise<Viewport> {
  const settings = await getSettings();
  return {
    themeColor: brandColors(settings).brand,
    colorScheme: "light",
    width: "device-width",
    initialScale: 1,
  };
}

/**
 * What people type into Google when they look for lessons at the club. Search engines weigh the
 * titles, descriptions and headings far more (those carry the same words); this list is a hint.
 */
const SEARCH_KEYWORDS = {
  ro: [
    "academie de tenis Pantelimon",
    "lecții de tenis Pantelimon",
    "antrenor tenis Pantelimon",
    "școală de tenis Pantelimon",
    "academie tenis juniori București",
    "tenis copii Pantelimon",
    "lecții tenis București",
    "antrenor tenis Ilfov",
    "Elite Tennis Club",
    "tenis pe zgură",
    "terenuri de tenis acoperite",
    "lecții tenis adulți începători",
    "pregătire tenis competiție",
    "analiză biomecanică tenis",
  ],
  en: [
    "tennis academy Bucharest",
    "tennis lessons Pantelimon",
    "tennis coach Bucharest",
    "tennis lessons for children Bucharest",
    "Elite Tennis Club",
    "clay court tennis",
    "private tennis lessons Ilfov",
  ],
};

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const settings = localizedSettings(await getSettings(), locale);
  return {
    metadataBase: new URL(appUrl()),
    title: { default: settings.seoTitle, template: `%s · ${settings.brandName}` },
    description: settings.seoDescription,
    applicationName: settings.brandName,
    keywords: SEARCH_KEYWORDS[locale === "en" ? "en" : "ro"],
    authors: [{ name: settings.brandName }],
    category: "sports",
    formatDetection: { telephone: false },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.BING_SITE_VERIFICATION
        ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
        : undefined,
    },
    openGraph: {
      siteName: settings.brandName,
      locale: locale === "en" ? "en_GB" : "ro_RO",
      type: "website",
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale: Locale = raw;
  setRequestLocale(locale);

  const [settingsRow, locations, messages, policyVersion, t] = await Promise.all([
    getSettings(),
    getLocations(locale),
    getMessages(),
    getPolicyVersion(),
    getTranslations("common"),
  ]);
  if (locale === "en" && !settingsRow.enEnabled) notFound();
  const settings = localizedSettings(settingsRow, locale);
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const umamiUrl = process.env.UMAMI_SCRIPT_URL;
  const umamiId = process.env.UMAMI_WEBSITE_ID;

  return (
    <html
      lang={locale}
      className={fontVariables}
      style={
        { "--brand": settings.colors.brand, "--accent": settings.colors.accent } as CSSProperties
      }
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <a href="#continut" className="skip-link">
            {t("skipToContent")}
          </a>
          <PreviewBanner />
          <Header settings={settings} />
          <main id="continut" tabIndex={-1}>
            {children}
          </main>
          <Footer
            settings={settings}
            location={locations[0] ?? null}
            policyVersion={policyVersion}
          />
          <ScrollEffects />
          <MobileBar
            bookLabel={t("book")}
            whatsappLabel={t("whatsapp")}
            whatsappUrl={whatsappLink(settings.whatsapp)}
            callLabel={t("call")}
            telUrl={telLink(settings.phone)}
          />
        </NextIntlClientProvider>
        {settings.umamiEnabled && umamiUrl && umamiId ? (
          <Script
            src={umamiUrl}
            data-website-id={umamiId}
            strategy="afterInteractive"
            nonce={nonce}
          />
        ) : null}
      </body>
    </html>
  );
}
