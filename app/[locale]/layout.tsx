import "../globals.css";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Script from "next/script";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { fontVariables } from "../fonts";
import { routing, type Locale } from "@/i18n/routing";
import { getLocations, getPolicyVersion, getSettings, localizedSettings } from "@/lib/content";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBar } from "@/components/site/MobileBar";
import { PreviewBanner } from "@/components/site/PreviewBanner";
import { telLink, whatsappLink } from "@/lib/format";
import { appUrl } from "@/lib/paths";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#2A130B",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
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
    formatDetection: { telephone: false },
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
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
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
