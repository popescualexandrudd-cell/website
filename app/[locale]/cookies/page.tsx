import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getLegalPage } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { LegalPageView } from "@/components/pages/LegalPageView";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/cookies">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const page = await getLegalPage("COOKIES", locale);
  return pageMetadata({ locale, href: "/cookies", title: page?.title ?? "Cookies" });
}

export default async function CookiesPage({ params }: PageProps<"/[locale]/cookies">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  return <LegalPageView kind="COOKIES" locale={locale} />;
}
