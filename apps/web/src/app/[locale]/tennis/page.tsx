import { setRequestLocale } from "next-intl/server";
import { Tennis } from "@/components/Tennis";
import { SitePage, sitePageMetadata } from "@/components/SitePage";

// §9.3: a page of the full site, from the approved home sections (Q57: only when the site is on).
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return sitePageMetadata(locale, "tennis");
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SitePage page="tennis">
      <Tennis id="tenis" />
    </SitePage>
  );
}
