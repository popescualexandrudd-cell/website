import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  getAcademyGroups,
  getFaqs,
  getLessonTypes,
  getPageHeader,
  getPrograms,
  getSettings,
  type AcademyGroupView,
} from "@/lib/content";
import { formatAmount } from "@/lib/pricing";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { breadcrumbLd, coursesLd, faqLd } from "@/lib/structured-data";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { JsonLd } from "@/components/pages/JsonLd";
import { LessonTypeList } from "@/components/pages/LessonTypeList";
import { Markdown } from "@/components/site/Markdown";
import { Picture } from "@/components/ui/Picture";
import { CourtMark } from "@/components/ui/CourtMark";
import { EvaluationForm } from "@/components/academy/EvaluationForm";
import { StagePath } from "@/components/academy/StagePath";
import { groupAges } from "@/components/academy/format";
import { programMeta } from "@/components/home/programMeta";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/programe">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("programe", locale);
  return pageMetadata({
    locale,
    href: "/programe",
    title: header.seoTitle,
    description: header.seoDescription,
  });
}

/**
 * Everything the club teaches, on one page: the training programmes, the welcome offer for
 * children, the groups on the development path (mini tennis, then juniors and seniors), the
 * sign-up for the free sessions, the kinds of session and the parents' questions.
 */
export default async function ProgramsPage({ params }: PageProps<"/[locale]/programe">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, programs, lessons, groups, faqs, settings, t, h] = await Promise.all([
    getPageHeader("programe", locale),
    getPrograms(locale),
    getLessonTypes(locale),
    getAcademyGroups(locale),
    getFaqs(locale),
    getSettings(),
    getTranslations(),
    headers(),
  ]);
  const url = localizedUrl("/programe", locale);
  const childFaqs = faqs.filter((f) => f.category === "COPII" || f.category === "COMPETITIE");
  const mini = groups.filter((g) => g.stage !== "GALBEN");
  const seniors = groups.filter((g) => g.stage === "GALBEN");

  const groupCard = (group: AcademyGroupView) => {
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
          <h4 className="group-card-name">{group.name}</h4>
          <p>{group.summary}</p>
          {group.focusPoints.length > 0 ? (
            <ul className="focus-list">
              {group.focusPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          ) : null}
          <dl className="fact-list group-card-facts">
            <div>
              <dt>{t("academy.schedule")}</dt>
              <dd>
                {group.schedule || t("academy.scheduleOnRequest")}
                {group.sessionMinutes ? (
                  <span className="block text-cerneala-2">
                    {group.sessionsPerWeek
                      ? `${t("academy.sessions", { count: group.sessionsPerWeek })} · `
                      : ""}
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
                      amount: formatAmount(Number(group.monthlyFee), settings.currency, locale),
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
        </div>
      </li>
    );
  };

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: t("common.home"), url: localizedUrl("/", locale) },
            { name: header.title, url },
          ]),
          ...(childFaqs.length > 0 ? [faqLd(childFaqs)] : []),
          ...(groups.length > 0 ? [coursesLd(groups, url, settings.currency)] : []),
        ]}
      />
      <PageHero title={header.title} intro={header.intro}>
        <div className="page-hero-actions">
          <Link href={{ pathname: "/programe", hash: "inscriere" }} className="btn btn-primary">
            {t("programs.offerCta")}
          </Link>
          <Link href="/rezervare" className="btn btn-secondary">
            {t("common.bookLesson")}
          </Link>
        </div>
      </PageHero>

      <PageSection id="programe-de-pregatire" title={t("programs.trainingTitle")}>
        <p className="measure mb-6 text-cerneala-2">{t("programs.trainingIntro")}</p>
        <ul>
          {programs.map((program) => (
            <li key={program.id} className="ed-row">
              <Link
                href={{ pathname: "/programe/[slug]", params: { slug: program.slug } }}
                className="ed-row-image"
                tabIndex={-1}
                aria-hidden="true"
              >
                {program.image ? (
                  <Picture image={program.image} alt="" sizes="10rem" />
                ) : (
                  <CourtMark variant="plan" />
                )}
              </Link>
              <div>
                <h3 className="ed-row-title">
                  <Link href={{ pathname: "/programe/[slug]", params: { slug: program.slug } }}>
                    {program.name}
                  </Link>
                </h3>
                <p className="ed-row-meta">{programMeta(program, t).join(" · ")}</p>
                <p className="ed-row-text">{program.summary}</p>
              </div>
              <p className="ed-row-aside">
                <Link
                  href={{ pathname: "/programe/[slug]", params: { slug: program.slug } }}
                  className="link-quiet"
                >
                  {t("common.seeProgram")}
                </Link>
              </p>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection id="oferta">
        <aside className="offer-panel" aria-labelledby="oferta-title">
          <p className="kicker">{t("programs.offerKicker")}</p>
          <h2 id="oferta-title" className="offer-title">
            {t("programs.offerTitle")}
          </h2>
          <p className="offer-text">{t("programs.offerText")}</p>
          <ul className="offer-points">
            <li>{t("programs.offerPoint1")}</li>
            <li>{t("programs.offerPoint2")}</li>
          </ul>
          <Link
            href={{ pathname: "/programe", hash: "inscriere" }}
            className="btn btn-primary btn-arrow"
          >
            {t("programs.offerCta")}
          </Link>
        </aside>
      </PageSection>

      {groups.length > 0 ? (
        <PageSection id="grupe" title={t("academy.groupsTitle")} className="groups-section">
          <p className="section-lead measure">{t("academy.groupsIntro")}</p>
          <StagePath groups={groups} />
          {mini.length > 0 ? (
            <>
              <h3 className="groups-heading">
                {t("programs.minitenis")}
                <span className="groups-heading-note">{t("programs.minitenisText")}</span>
              </h3>
              <ol className="group-list">{mini.map(groupCard)}</ol>
            </>
          ) : null}
          {seniors.length > 0 ? (
            <>
              <h3 className="groups-heading">
                {t("programs.seniors")}
                <span className="groups-heading-note">{t("programs.seniorsText")}</span>
              </h3>
              <ol className="group-list">{seniors.map(groupCard)}</ol>
            </>
          ) : null}
        </PageSection>
      ) : null}

      <PageSection id="inscriere" title={t("academy.evaluationTitle")} className="evaluation">
        <p className="section-lead measure">{t("academy.evaluationIntro")}</p>
        <EvaluationForm
          groups={groups.map((g) => ({ id: g.id, name: g.name }))}
          turnstileSiteKey={
            process.env.TURNSTILE_SECRET_KEY ? (process.env.TURNSTILE_SITE_KEY ?? null) : null
          }
          nonce={h.get("x-nonce") ?? undefined}
        />
      </PageSection>

      {lessons.length > 0 ? (
        <PageSection id="tipuri-de-antrenament" title={t("programs.lessonsTitle")}>
          <p className="measure mb-6 text-cerneala-2">{t("programs.lessonsIntro")}</p>
          <LessonTypeList lessons={lessons} locale={locale} currency={settings.currency} />
        </PageSection>
      ) : null}

      {childFaqs.length > 0 ? (
        <PageSection id="intrebari" title={t("nav.faq")} className="page-section--narrow">
          <div className="faq-list">
            {childFaqs.map((faq) => (
              <details key={faq.id} className="faq-item">
                <summary className="faq-question">
                  <span>{faq.question}</span>
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
