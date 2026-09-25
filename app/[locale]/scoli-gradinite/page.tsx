import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getPageHeader } from "@/lib/content";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { breadcrumbLd } from "@/lib/structured-data";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { JsonLd } from "@/components/pages/JsonLd";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/scoli-gradinite">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("scoli", locale);
  return pageMetadata({
    locale,
    href: "/scoli-gradinite",
    title: header.seoTitle,
    description: header.seoDescription,
  });
}

const FACTS = ["years", "weather", "gear", "play"] as const;
const LEARN = ["one", "two", "three", "four", "five", "six"] as const;

/** Tennis for schools and kindergartens: what the club offers and how to start a partnership. */
export default async function SchoolsPage({ params }: PageProps<"/[locale]/scoli-gradinite">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, t] = await Promise.all([getPageHeader("scoli", locale), getTranslations()]);
  const contactHref = { pathname: "/contact" as const, query: { subiect: t("schools.subject") } };

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: t("common.home"), url: localizedUrl("/", locale) },
          { name: header.title, url: localizedUrl("/scoli-gradinite", locale) },
        ])}
      />
      <PageHero
        title={header.title}
        intro={header.intro}
        image={header.image}
        imageAlt={header.imageAlt}
      >
        <div className="page-hero-actions">
          <Link href={contactHref} className="btn btn-primary btn-arrow">
            {t("schools.contactCta")}
          </Link>
        </div>
      </PageHero>

      <PageSection id="de-ce" title={t("schools.factsTitle")}>
        <ul className="pillar-grid">
          {FACTS.map((key, i) => (
            <li key={key} className="pillar-card">
              <span className="pillar-number numerals" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="pillar-title">{t(`schools.facts.${key}`)}</h3>
              <p>{t(`schools.facts.${key}Text`)}</p>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection id="ce-invata" title={t("schools.learnTitle")}>
        <ul className="learn-list">
          {LEARN.map((key) => (
            <li key={key}>{t(`schools.learn.${key}`)}</li>
          ))}
        </ul>
        <div className="schools-path">
          <h3 className="section-subtitle">{t("schools.pathTitle")}</h3>
          <p className="measure">{t("schools.pathText")}</p>
          <Link href={{ pathname: "/programe", hash: "grupe" }} className="link">
            {t("schools.pathCta")}
          </Link>
        </div>
      </PageSection>

      <PageSection id="parteneriat" className="page-section--narrow">
        <div className="cta-panel">
          <h2 className="section-title">{t("schools.contactTitle")}</h2>
          <p className="measure">{t("schools.contactText")}</p>
          <div className="cta-panel-actions">
            <Link href={contactHref} className="btn btn-primary btn-arrow">
              {t("schools.contactCta")}
            </Link>
          </div>
        </div>
      </PageSection>
    </>
  );
}
