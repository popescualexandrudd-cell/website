import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getAcademyGroups, getFaqs, getPageHeader, getResults, getSettings } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { formatAmount } from "@/lib/pricing";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { breadcrumbLd, faqLd } from "@/lib/structured-data";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { JsonLd } from "@/components/pages/JsonLd";
import { Markdown } from "@/components/site/Markdown";
import { TodoText } from "@/components/site/TodoText";
import { Picture } from "@/components/ui/Picture";
import { EvaluationForm } from "@/components/academy/EvaluationForm";
import { groupAges } from "@/components/academy/format";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/academie">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("academie", locale);
  return pageMetadata({
    locale,
    href: "/academie",
    title: header.seoTitle,
    description: header.seoDescription,
  });
}

export default async function AcademyPage({ params }: PageProps<"/[locale]/academie">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, groups, results, faqs, settings, h, t] = await Promise.all([
    getPageHeader("academie", locale),
    getAcademyGroups(locale),
    getResults(locale, 24),
    getFaqs(locale),
    getSettings(),
    headers(),
    getTranslations(),
  ]);
  const childFaqs = faqs.filter((f) => f.category === "COPII" || f.category === "COMPETITIE");

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: t("common.home"), url: localizedUrl("/", locale) },
            { name: header.title, url: localizedUrl("/academie", locale) },
          ]),
          ...(childFaqs.length > 0 ? [faqLd(childFaqs)] : []),
        ]}
      />
      <PageHero
        title={header.title}
        intro={header.intro}
        image={header.image}
        imageAlt={header.imageAlt}
      >
        <p className="mt-8">
          <Link href={{ pathname: "/academie", hash: "evaluare" }} className="btn btn-primary">
            {t("academy.evaluationTitle")}
          </Link>
        </p>
      </PageHero>

      {groups.length > 0 ? (
        <PageSection id="grupe" title={t("academy.groupsTitle")}>
          <p className="section-lead measure">{t("academy.groupsIntro")}</p>
          <ol className="group-list" data-progress-line>
            {groups.map((group) => {
              const ages = groupAges(group, t);
              return (
                <li key={group.id} className="group-card" data-stage={group.stage ?? undefined}>
                  <div className="group-card-media">
                    {group.image ? (
                      <Picture
                        image={group.image}
                        alt={group.imageAlt}
                        sizes="(min-width: 1024px) 30vw, 100vw"
                        imgClassName="group-card-img"
                      />
                    ) : (
                      <span className="group-card-ball" aria-hidden="true" />
                    )}
                  </div>
                  <div className="group-card-body">
                    <p className="group-card-stage">
                      {group.stage ? t(`academy.stage.${group.stage}`) : null}
                      {group.stage && ages ? " · " : null}
                      {ages}
                    </p>
                    <h3 className="group-card-name">{group.name}</h3>
                    <p>
                      <TodoText value={group.summary} />
                    </p>
                    {group.focusPoints.length > 0 ? (
                      <>
                        <h4 className="group-card-sub">{t("academy.focus")}</h4>
                        <ul className="focus-list">
                          {group.focusPoints.map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    <dl className="fact-list group-card-facts">
                      <div>
                        <dt>{t("academy.schedule")}</dt>
                        <dd>
                          <TodoText value={group.schedule || t("academy.scheduleOnRequest")} />
                          {group.sessionsPerWeek ? (
                            <span className="block text-cerneala-2">
                              {t("academy.sessions", { count: group.sessionsPerWeek })}
                              {group.sessionMinutes
                                ? ` · ${t("academy.sessionLength", { n: group.sessionMinutes })}`
                                : ""}
                            </span>
                          ) : group.sessionMinutes ? (
                            <span className="block text-cerneala-2">
                              {t("academy.sessionLength", { n: group.sessionMinutes })}
                            </span>
                          ) : null}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("academy.fee")}</dt>
                        <dd className="numerals">
                          {group.monthlyFee
                            ? t("academy.feeValue", {
                                amount: formatAmount(
                                  Number(group.monthlyFee),
                                  settings.currency,
                                  locale,
                                ),
                              })
                            : t("academy.feeOnRequest")}
                          {group.maxPlayers ? (
                            <span className="block text-cerneala-2">
                              {t("academy.places", { n: group.maxPlayers })}
                            </span>
                          ) : null}
                        </dd>
                      </div>
                    </dl>
                    {group.program ? (
                      <p className="mt-6">
                        <Link
                          href={{
                            pathname: "/programe/[slug]",
                            params: { slug: group.program.slug },
                          }}
                          className="link-quiet"
                        >
                          {t("academy.program")}: {group.program.name}
                        </Link>
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </PageSection>
      ) : null}

      {results.length > 0 ? (
        <PageSection id="rezultate" title={t("academy.resultsTitle")}>
          <p className="section-lead measure">{t("academy.resultsIntro")}</p>
          <ul className="result-list">
            {results.map((result) => (
              <li key={result.id} className="result-row">
                <span className="result-placement">{result.placement}</span>
                <span className="result-athlete">{result.athlete}</span>
                <span className="result-event">
                  {result.event} · {result.category} · {t(`academy.resultLevel.${result.level}`)}
                </span>
                <span className="result-date numerals">
                  {formatDate(result.date, settings.timezone, locale, "MMMM yyyy")}
                </span>
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      <PageSection id="evaluare" title={t("academy.evaluationTitle")} className="evaluation">
        <p className="section-lead measure">{t("academy.evaluationIntro")}</p>
        <EvaluationForm
          groups={groups.map((g) => ({ id: g.id, name: g.name }))}
          turnstileSiteKey={
            process.env.TURNSTILE_SECRET_KEY ? (process.env.TURNSTILE_SITE_KEY ?? null) : null
          }
          nonce={h.get("x-nonce") ?? undefined}
        />
      </PageSection>

      {childFaqs.length > 0 ? (
        <PageSection id="intrebari" title={t("nav.faq")} className="page-section--narrow">
          <div className="faq-list">
            {childFaqs.map((faq) => (
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
      ) : null}
    </>
  );
}
