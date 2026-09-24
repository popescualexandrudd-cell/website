import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getFaqs, getPageHeader } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { faqLd } from "@/lib/structured-data";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { JsonLd } from "@/components/pages/JsonLd";
import { Markdown } from "@/components/site/Markdown";
import { TodoText } from "@/components/site/TodoText";

const CATEGORY_ORDER = ["INCEPUT", "ECHIPAMENT", "COPII", "PROGRAM_PLATA", "TEREN_VREME", "COMPETITIE"] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/intrebari">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("intrebari", locale);
  return pageMetadata({ locale, href: "/intrebari", title: header.seoTitle, description: header.seoDescription });
}

export default async function FaqPage({ params }: PageProps<"/[locale]/intrebari">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, faqs, t] = await Promise.all([getPageHeader("intrebari", locale), getFaqs(locale), getTranslations("faq")]);
  const groups = CATEGORY_ORDER.map((key) => ({ key, items: faqs.filter((f) => f.category === key) })).filter((g) => g.items.length > 0);
  return (
    <>
      <JsonLd data={faqLd(faqs)} />
      <PageHero title={header.title} intro={header.intro} art={header.art} imageAlt={header.imageAlt} />
      {groups.map((group) => (
        <PageSection key={group.key} id={`categorie-${group.key.toLowerCase()}`} title={t(`categories.${group.key}`)} className="page-section--narrow">
          <div className="faq-list">
            {group.items.map((faq) => (
              <details key={faq.id} className="faq-item">
                <summary className="faq-question">
                  <span>
                    <TodoText value={faq.question} />
                  </span>
                  <span className="faq-icon" aria-hidden="true" />
                </summary>
                <div className="faq-answer">
                  <Markdown source={faq.answer} />
                </div>
              </details>
            ))}
          </div>
        </PageSection>
      ))}
      <PageSection className="page-section--narrow">
        <p className="font-display text-h3">{t("notFound")}</p>
        <p className="mt-4">
          <Link href="/contact" className="btn btn-primary">
            {t("writeMe")}
          </Link>
        </p>
      </PageSection>
    </>
  );
}
