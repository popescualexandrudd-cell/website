import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getPackages, getPageHeader, getPrograms, getSettings, localizedSettings } from "@/lib/content";
import { formatPrice } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { TodoText } from "@/components/site/TodoText";

export async function generateMetadata({ params }: PageProps<"/[locale]/preturi">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("preturi", locale);
  return pageMetadata({ locale, href: "/preturi", title: header.seoTitle, description: header.seoDescription });
}

export default async function PricingPage({ params }: PageProps<"/[locale]/preturi">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, programs, packages, settingsRow, t] = await Promise.all([
    getPageHeader("preturi", locale),
    getPrograms(locale),
    getPackages(locale),
    getSettings(),
    getTranslations(),
  ]);
  const settings = localizedSettings(settingsRow, locale);

  return (
    <>
      <PageHero title={header.title} intro={header.intro} art={header.art} imageAlt={header.imageAlt} />

      <PageSection id="prima-lectie" title={t("pricing.firstLesson")} className="page-section--narrow">
        <p className="text-lead leading-snug">
          <TodoText value={settings.firstLessonText} />
        </p>
      </PageSection>

      <PageSection id="tarife" title={t("pricing.perProgram")} className="page-section--narrow">
        <div className="overflow-x-auto">
          <table className="price-table">
            <tbody>
              {programs.flatMap((program) =>
                program.prices
                  .filter((price) => !price.isPackage)
                  .map((price, i) => (
                    <tr key={price.id}>
                      <th scope="row" className="font-normal">
                        {i === 0 ? (
                          <Link href={{ pathname: "/programe/[slug]", params: { slug: program.slug } }} className="font-display text-[1.35rem] leading-tight underline-offset-4 hover:underline">
                            {program.name}
                          </Link>
                        ) : null}
                        <span className="block text-note text-cerneala-2">
                          {price.name}
                          {program.durationMin ? ` · ${t("common.minutes", { n: program.durationMin })}` : ""}
                        </span>
                      </th>
                      <td className="whitespace-nowrap">
                        <TodoText value={formatPrice(price.price, price.currency, locale)} />{" "}
                        <span className="text-cerneala-2">{t(`programs.unit.${price.unit}`)}</span>
                      </td>
                    </tr>
                  )),
              )}
            </tbody>
          </table>
        </div>
      </PageSection>

      {packages.length > 0 ? (
        <PageSection id="pachete" title={t("pricing.packages")} className="page-section--narrow">
          <ul>
            {packages.map((pack) => (
              <li key={pack.id} className="ed-row ed-row--no-image">
                <div>
                  <h3 className="ed-row-title">
                    <TodoText value={pack.name} />
                    {pack.highlighted ? <span className="ml-3 align-middle font-sans text-note text-cerneala-2">({t("pricing.recommended")})</span> : null}
                  </h3>
                  <p className="ed-row-meta">
                    {pack.sessions ? `${t("pricing.packageSessions", { count: pack.sessions })} · ` : ""}
                    {pack.validityDays ? t("pricing.validity", { days: pack.validityDays }) : ""}
                  </p>
                  {pack.includes ? <p className="ed-row-text">{pack.includes}</p> : null}
                </div>
                <p className="ed-row-aside numerals">
                  <TodoText value={formatPrice(pack.price, pack.currency, locale)} />
                </p>
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      <PageSection id="anulare" title={t("pricing.cancellation")} className="page-section--narrow">
        <p className="measure">{t("pricing.cancellationText", { hours: settings.freeCancelHours })}</p>
      </PageSection>

      <PageSection id="plata" title={t("pricing.payment")} className="page-section--narrow">
        <p>{t("pricing.paymentText")}</p>
        <ul className="focus-list mt-3">
          {settings.paymentMethods.map((method) => (
            <li key={method}>{method}</li>
          ))}
        </ul>
        <p className="mt-10">
          <Link href="/rezervare" className="btn btn-primary">
            {t("common.bookLesson")}
          </Link>
        </p>
      </PageSection>
    </>
  );
}
