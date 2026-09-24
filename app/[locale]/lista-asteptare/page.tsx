import type { Metadata } from "next";
import { headers } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getPageHeader, getPrograms } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { WaitlistForm } from "@/components/pages/WaitlistForm";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/lista-asteptare">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("lista-asteptare", locale);
  return pageMetadata({
    locale,
    href: "/lista-asteptare",
    title: header.seoTitle,
    description: header.seoDescription,
  });
}

export default async function WaitlistPage({
  params,
  searchParams,
}: PageProps<"/[locale]/lista-asteptare">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const query = await searchParams;
  const [header, programs, h] = await Promise.all([
    getPageHeader("lista-asteptare", locale),
    getPrograms(locale),
    headers(),
  ]);
  const slug = typeof query.program === "string" ? query.program : null;
  const initial = slug ? (programs.find((p) => p.slug === slug)?.id ?? null) : null;
  return (
    <>
      <PageHero
        title={header.title}
        intro={header.intro}
        image={header.image}
        imageAlt={header.imageAlt}
      />
      <PageSection className="page-section--narrow">
        <WaitlistForm
          programs={programs.map((p) => ({ id: p.id, name: p.name, forMinors: p.forMinors }))}
          initialProgramId={initial}
          turnstileSiteKey={
            process.env.TURNSTILE_SECRET_KEY ? (process.env.TURNSTILE_SITE_KEY ?? null) : null
          }
          nonce={h.get("x-nonce") ?? undefined}
        />
      </PageSection>
    </>
  );
}
