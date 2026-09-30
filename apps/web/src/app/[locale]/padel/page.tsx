import { setRequestLocale } from "next-intl/server";
import { Padel } from "@/components/Padel";
import { Level } from "@/components/Level";
import { Split } from "@/components/Split";
import { SitePage, sitePageMetadata } from "@/components/SitePage";

// §9.3: a page of the full site, from the approved home sections (Q57: only when the site is on).
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return sitePageMetadata(locale, "padel");
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SitePage page="padel">
      <Padel id="padel" />
      <Level id="nivel" />
      <Split id="imparte-ora" />
    </SitePage>
  );
}
