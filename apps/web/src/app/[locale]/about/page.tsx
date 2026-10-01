import { setRequestLocale } from "next-intl/server";
import { Numbers } from "@/components/Numbers";
import { SitePage, sitePageMetadata } from "@/components/SitePage";
import { Team } from "@/components/Team";
import { Tour } from "@/components/Tour";

// §9.3 `/despre`: the club, from the approved home sections (Q57: only when the site is on).
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return sitePageMetadata(locale, "about");
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SitePage page="about">
      <Tour id="tur" />
      <Numbers id="cifre" />
      <Team id="echipa" />
    </SitePage>
  );
}
