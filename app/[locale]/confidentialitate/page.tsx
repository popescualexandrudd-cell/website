import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getLegalPage } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { LegalPageView } from "@/components/pages/LegalPageView";

export async function generateMetadata({ params }: PageProps<"/[locale]/confidentialitate">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const page = await getLegalPage("CONFIDENTIALITATE", locale);
  return pageMetadata({ locale, href: "/confidentialitate", title: page?.title ?? "Privacy" });
}

export default async function PrivacyPage({ params }: PageProps<"/[locale]/confidentialitate">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  return <LegalPageView kind="CONFIDENTIALITATE" locale={locale} />;
}
