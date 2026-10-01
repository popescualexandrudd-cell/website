import { setRequestLocale } from "next-intl/server";
import { Corporate } from "@/components/Corporate";
import { Packages } from "@/components/Packages";
import { SitePage, sitePageMetadata } from "@/components/SitePage";

// §9.3: the company package (Q35) and the subscriptions it applies to (Q57: only when the site is on).
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return sitePageMetadata(locale, "corporate");
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SitePage page="corporate">
      <Corporate id="firme" />
      <Packages id="pachete" />
    </SitePage>
  );
}
