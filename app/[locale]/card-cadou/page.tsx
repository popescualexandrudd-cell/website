import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getLessonTypes, getPageHeader, getSettings, localizedSettings } from "@/lib/content";
import { telLink } from "@/lib/format";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { breadcrumbLd } from "@/lib/structured-data";
import { GIFT_VALID_MONTHS } from "@/lib/gift-cards";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { JsonLd } from "@/components/pages/JsonLd";
import { GiftCardForm } from "@/components/pages/GiftCardForm";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/card-cadou">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("card-cadou", locale);
  return pageMetadata({
    locale,
    href: "/card-cadou",
    title: header.seoTitle,
    description: header.seoDescription,
  });
}

/**
 * "Give a tennis lesson": how the card works, the choice of lessons or an amount, and the
 * request form. The club calls about payment and emails the card, ready to print.
 */
export default async function GiftCardPage({ params }: PageProps<"/[locale]/card-cadou">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, row, lessons, t, h] = await Promise.all([
    getPageHeader("card-cadou", locale),
    getSettings(),
    getLessonTypes(locale),
    getTranslations(),
    headers(),
  ]);
  const settings = localizedSettings(row, locale);
  if (!settings.giftCardsEnabled) notFound();
  const tel = telLink(settings.phone);
  const url = localizedUrl("/card-cadou", locale);

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: t("common.home"), url: localizedUrl("/", locale) },
          { name: header.title, url },
        ])}
      />
      <PageHero
        title={header.title}
        intro={header.intro}
        image={header.image}
        imageAlt={header.imageAlt}
      >
        <div className="page-hero-actions">
          <a href="#comanda" className="btn btn-primary">
            {t("gift.orderCta")}
          </a>
          {tel ? (
            <a href={tel} className="btn btn-secondary">
              {t("gift.callCta", { phone: settings.phone })}
            </a>
          ) : null}
        </div>
      </PageHero>

      <PageSection id="cum-functioneaza" title={t("gift.howTitle")}>
        <ol className="step-cards">
          {(["one", "two", "three"] as const).map((step, i) => (
            <li key={step} className="step-card">
              <span className="step-card-number numerals" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="step-card-title">{t(`gift.steps.${step}`)}</h3>
              <p>{t(`gift.steps.${step}Text`, { months: GIFT_VALID_MONTHS })}</p>
            </li>
          ))}
        </ol>
      </PageSection>

      <PageSection id="comanda" title={t("gift.formTitle")}>
        <p className="measure mb-8 text-cerneala-2">{t("gift.formIntro")}</p>
        <GiftCardForm
          lessons={lessons.map((l) => ({
            id: l.id,
            name: l.name,
            durations: l.durations,
            hourlyRate: l.hourlyRate,
          }))}
          turnstileSiteKey={
            process.env.TURNSTILE_SECRET_KEY ? (process.env.TURNSTILE_SITE_KEY ?? null) : null
          }
          nonce={h.get("x-nonce") ?? undefined}
        />
      </PageSection>

      <PageSection id="bine-de-stiut" title={t("gift.goodToKnow")} className="page-section--narrow">
        <ul className="gift-facts">
          {(["valid", "book", "cancel", "occasions"] as const).map((fact) => (
            <li key={fact}>{t(`gift.facts.${fact}`, { months: GIFT_VALID_MONTHS })}</li>
          ))}
        </ul>
      </PageSection>
    </>
  );
}
