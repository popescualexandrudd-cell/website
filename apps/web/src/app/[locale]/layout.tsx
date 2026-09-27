import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ColorSurface50 } from "@jungle/design-tokens/tokens";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "../globals.css";
import { CookieConsent } from "@/components/CookieConsent";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { routing } from "@/i18n/routing";
import { INDEXABLE, SITE_URL } from "@/lib/site";

const FONT_FILES = ["inter-latin.woff2", "inter-ro.woff2"];

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: ColorSurface50, colorScheme: "light" };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.meta" });
  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: { ro: "/ro", en: "/en", "x-default": "/ro" },
    },
    openGraph: {
      type: "website",
      siteName: "Jungle Padel",
      title: t("title"),
      description: t("description"),
      locale: locale === "ro" ? "ro_RO" : "en_GB",
      url: `/${locale}`,
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
    robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
    icons: { icon: "/icon.svg" },
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
  return (
    <html lang={locale}>
      <head>
        {FONT_FILES.map((file) => (
          <link key={file} rel="preload" href={`/fonts/${file}`} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
      </head>
      <body>
        <a href="#main" className="skip-link">
          {t("skip")}
        </a>
        <NextIntlClientProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          {/* Statistics (Umami) load only after consent, from the consent manager. */}
          <CookieConsent />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
