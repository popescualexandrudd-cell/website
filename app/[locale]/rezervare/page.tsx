import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getPageHeader, getPrograms, getSettings } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { toBookable } from "@/components/booking/toBookable";

export async function generateMetadata({ params }: PageProps<"/[locale]/rezervare">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("rezervare", locale);
  return pageMetadata({ locale, href: "/rezervare", title: header.seoTitle, description: header.seoDescription });
}

export default async function BookingPage({ params, searchParams }: PageProps<"/[locale]/rezervare">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const query = await searchParams;
  const slug = typeof query.program === "string" ? query.program : null;
  const [header, programs, settings, t, h] = await Promise.all([
    getPageHeader("rezervare", locale),
    getPrograms(locale),
    getSettings(),
    getTranslations(),
    headers(),
  ]);
  const bookable = toBookable(programs, t);
  const initial = slug ? (bookable.find((p) => p.slug === slug)?.id ?? null) : null;

  return (
    <>
      <PageHero title={header.title} intro={header.intro} art={header.art} imageAlt={header.imageAlt} />
      <PageSection className="page-section--narrow">
        <BookingFlow
          programs={bookable}
          initialProgramId={initial}
          bookingMode={settings.bookingMode}
          turnstileSiteKey={process.env.TURNSTILE_SECRET_KEY ? (process.env.TURNSTILE_SITE_KEY ?? null) : null}
          nonce={h.get("x-nonce") ?? undefined}
        />
      </PageSection>
    </>
  );
}
