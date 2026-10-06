import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ColorNight900 } from "@jungle/design-tokens/tokens";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import "../globals.css";
import { EffectsRuntime } from "@/components/EffectsRuntime";
import { Assistant } from "@/components/Assistant";
import { ClientTexts } from "@/components/ClientTexts";
import { CookieConsent } from "@/components/CookieConsent";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ServiceWorker } from "@/components/ServiceWorker";
import { SiteHeader } from "@/components/SiteHeader";
import { ASSISTANT_NAMESPACES, SHELL_NAMESPACES, pickMessages } from "@/lib/client-messages";
import { siteFlags, siteMode } from "@/lib/flags";
import { routing } from "@/i18n/routing";
import { INDEXABLE, SITE_URL } from "@/lib/site";

// Only the faces every page draws at once. The italic serif (`.h1 em`) is no longer preloaded: no
// text uses it today, and 22 KB fetched before the first paint slowed it on phones (Lighthouse,
// §9.4); the browser still fetches it on its own the day a title needs it.
const FONT_FILES = ["instrument-sans-latin.woff2", "fraunces-latin.woff2"];
// The Romanian letters (ă, ș, ț) have their own small subsets, found by the browser only once the text
// is laid out: on the Romanian pages they are asked for at once, so the text is drawn sooner (LCP).
const FONT_FILES_RO = ["instrument-sans-ro.woff2", "fraunces-ro.woff2"];

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: ColorNight900, colorScheme: "dark" };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.meta" });
  // The full site describes the club; the pre-launch page invites to the waitlist (§15.1).
  const full = (await siteMode()) === "full";
  const title = full ? t("siteTitle") : t("title");
  const description = full ? t("siteDescription") : t("description");
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: { ro: "/ro", en: "/en", "x-default": "/ro" },
    },
    openGraph: {
      type: "website",
      siteName: "Jungle Padel",
      title,
      description,
      locale: locale === "ro" ? "ro_RO" : "en_GB",
      url: `/${locale}`,
    },
    twitter: { card: "summary_large_image", title, description },
    robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
    icons: { icon: "/icon.svg", apple: "/icons/apple-touch-icon.png" },
    appleWebApp: { capable: true, title: "Jungle Padel", statusBarStyle: "black-translucent" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.nav" });
  const { mode, effects, assistant } = await siteFlags();
  // Only the texts every page's client components share travel from here; each page adds its own
  // (`ClientTexts`, src/lib/client-messages.ts).
  const messages = pickMessages(await getMessages(), SHELL_NAMESPACES);
  return (
    <html lang={locale}>
      <head>
        {[...FONT_FILES, ...(locale === "ro" ? FONT_FILES_RO : [])].map((file) => (
          <link key={file} rel="preload" href={`/fonts/${file}`} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
      </head>
      <body>
        <a href="#main" className="skip-link">
          {t("skip")}
        </a>
        <NextIntlClientProvider messages={messages}>
          {mode === "full" ? <SiteHeader /> : <Header />}
          <main id="main">{children}</main>
          <Footer full={mode === "full"} />
          {/* Statistics (Umami) load only after consent, from the consent manager. */}
          <CookieConsent />
        </NextIntlClientProvider>
        {/* The club's assistant (ADR-0019), only when the owner turned the AI on (`ai`). */}
        {assistant && (
          <ClientTexts namespaces={ASSISTANT_NAMESPACES}>
            <Assistant />
          </ClientTexts>
        )}
        {/* The site's effects (ADR-0023), only when the owner turned them on (`web_effects`). */}
        {effects && <EffectsRuntime />}
        <ServiceWorker />
      </body>
    </html>
  );
}
