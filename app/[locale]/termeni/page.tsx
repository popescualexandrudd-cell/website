import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getLegalPage } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { LegalPageView } from "@/components/pages/LegalPageView";

export async function generateMetadata({ params }: PageProps<"/[locale]/termeni">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const page = await getLegalPage("TERMENI", locale);
  return pageMetadata({ locale, href: "/termeni", title: page?.title ?? "Terms" });
}

export default async function TermsPage({ params }: PageProps<"/[locale]/termeni">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  return <LegalPageView kind="TERMENI" locale={locale} />;
}
