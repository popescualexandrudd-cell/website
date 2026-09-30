import { setRequestLocale } from "next-intl/server";
import { Cafe } from "@/components/Cafe";
import { SitePage, sitePageMetadata } from "@/components/SitePage";

// §9.3: a page of the full site, from the approved home sections (Q57: only when the site is on).
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return sitePageMetadata(locale, "cafe");
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SitePage page="cafe">
      <Cafe id="cafenea" />
    </SitePage>
  );
}
