import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalDocument, legalMetadata } from "@/components/LegalDocument";

export const dynamic = "force-dynamic"; // always the currently published version

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return legalMetadata((await params).locale, "terms");
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalDocument locale={locale} kind="terms" />;
}
