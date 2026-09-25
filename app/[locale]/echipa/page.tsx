import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getCoaches, getPageHeader, getSettings, localizedSettings } from "@/lib/content";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { breadcrumbLd, personLd } from "@/lib/structured-data";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { JsonLd } from "@/components/pages/JsonLd";
import { CoachCard } from "@/components/academy/CoachCard";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/echipa">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("echipa", locale);
  return pageMetadata({
    locale,
    href: "/echipa",
    title: header.seoTitle,
    description: header.seoDescription,
  });
}

export default async function TeamPage({ params }: PageProps<"/[locale]/echipa">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, coaches, settingsRow, t] = await Promise.all([
    getPageHeader("echipa", locale),
    getCoaches(locale),
    getSettings(),
    getTranslations(),
  ]);
  const settings = localizedSettings(settingsRow, locale);
  return (
    <>
      <JsonLd
        data={[
          ...coaches.map((coach) =>
            personLd(
              settings,
              coach,
              localizedUrl({ pathname: "/echipa/[slug]", params: { slug: coach.slug } }, locale),
            ),
          ),
          breadcrumbLd([
            { name: t("common.home"), url: localizedUrl("/", locale) },
            { name: header.title, url: localizedUrl("/echipa", locale) },
          ]),
        ]}
      />
      <PageHero
        title={header.title}
        intro={header.intro}
        image={header.image}
        imageAlt={header.imageAlt}
      />
      <PageSection>
        <div className="team-grid" data-count={Math.min(coaches.length, 4)}>
          {coaches.map((coach) => (
            <CoachCard key={coach.id} coach={coach} headingLevel="h2" />
          ))}
        </div>
      </PageSection>
      <PageSection id="filozofie" className="page-section--narrow">
        <aside className="team-philosophy" aria-labelledby="filozofie-title">
          <h2 id="filozofie-title" className="section-subtitle">
            {t("team.philosophyTitle")}
          </h2>
          <p>{t("team.philosophyText")}</p>
        </aside>
      </PageSection>
    </>
  );
}
