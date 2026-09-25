import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  getFaqs,
  getLessonTypes,
  getLocations,
  getPageHeader,
  getProgram,
  getSettings,
} from "@/lib/content";
import { isFilled } from "@/lib/i18n-content";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { breadcrumbLd, serviceLd } from "@/lib/structured-data";
import { PageSection } from "@/components/pages/PageHero";
import { Breadcrumbs } from "@/components/pages/Breadcrumbs";
import { JsonLd } from "@/components/pages/JsonLd";
import { Picture } from "@/components/ui/Picture";
import { CourtMark } from "@/components/ui/CourtMark";
import { Markdown } from "@/components/site/Markdown";
import { LessonTypeList } from "@/components/pages/LessonTypeList";
import { programMeta } from "@/components/home/programMeta";
import { Words } from "@/components/site/Words";

type Props = PageProps<"/[locale]/programe/[slug]">;

async function load(params: Props["params"]) {
  const { locale, slug } = await params;
  const program = await getProgram(slug, locale as Locale);
  return { locale: locale as Locale, slug, program };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug, program } = await load(params);
  if (!program) return {};
  const city = (await getLocations(locale))[0]?.city;
  const where = city && isFilled(city) ? (locale === "en" ? ` in ${city}` : ` în ${city}`) : "";
  // Lessons for the training programmes; camps and corporate events are named as they are.
  const title = !program.bookableOnline
    ? `${program.name}${where}`
    : locale === "en"
      ? `${program.name}: tennis lessons${where}`
      : `${program.name}: cursuri de tenis${where}`;
  return pageMetadata({
    locale,
    href: { pathname: "/programe/[slug]", params: { slug } },
    title,
    description: program.summary,
  });
}

export default async function ProgramPage({ params }: Props) {
  const { locale, slug, program } = await load(params);
  if (!program) notFound();
  setRequestLocale(locale);
  const [t, faqs, lessons, settings, programsHeader] = await Promise.all([
    getTranslations(),
    getFaqs(locale),
    getLessonTypes(locale),
    getSettings(),
    getPageHeader("programe", locale),
  ]);
  const programFaqs = faqs.filter((f) => f.programId === program.id);
  // The description may already have its own "what we work on" section; do not repeat it.
  const workHeading = t("programs.whatWeWorkOn").toLocaleLowerCase(locale);
  const descriptionCoversFocus = program.description.split("\n").some(
    (line) =>
      line.startsWith("#") &&
      line
        .replace(/^#+\s*/, "")
        .trim()
        .toLocaleLowerCase(locale) === workHeading,
  );
  const url = localizedUrl({ pathname: "/programe/[slug]", params: { slug } }, locale);
  const facts: [string, string][] = [];
  if (program.ageMin !== null)
    facts.push([
      t("programs.age"),
      program.ageMax !== null
        ? t("common.years", { min: program.ageMin, max: program.ageMax })
        : t("common.yearsFrom", { min: program.ageMin }),
    ]);
  else facts.push([t("programs.age"), t(`programs.groups.${program.audience}`)]);
  facts.push([t("programs.level2"), t(`programs.level.${program.level}`)]);

  return (
    <>
      <JsonLd
        data={[
          serviceLd(program, url, lessons, settings.currency),
          breadcrumbLd([
            { name: t("common.home"), url: localizedUrl("/", locale) },
            { name: programsHeader.title, url: localizedUrl("/programe", locale) },
            { name: program.name, url },
          ]),
        ]}
      />
      <header className="grid-page program-hero tone-dark">
        <div className="program-hero-copy">
          <Breadcrumbs
            label={t("nav.programs")}
            items={[
              { label: t("common.home"), href: "/" },
              { label: programsHeader.title, href: "/programe" },
              { label: program.name },
            ]}
          />
          <h1 className="page-title">
            <Words text={program.name} />
          </h1>
          <p className="hero-meta mt-4">{programMeta(program, t).join(" · ")}</p>
          <p className="page-intro">{program.summary}</p>
          <p className="mt-8 flex flex-wrap gap-3">
            {program.bookableOnline ? (
              <Link
                href={{ pathname: "/rezervare", query: { program: program.slug } }}
                className="btn btn-primary"
              >
                {t("programs.bookThis")}
              </Link>
            ) : (
              <Link
                href={{ pathname: "/lista-asteptare", query: { program: program.slug } }}
                className="btn btn-primary"
              >
                {t("programs.joinWaitlist")}
              </Link>
            )}
          </p>
        </div>
        <figure className="program-hero-figure">
          {program.image ? (
            <Picture
              image={program.image}
              alt={program.imageAlt}
              priority
              sizes="(min-width: 1024px) 34vw, 90vw"
            />
          ) : (
            <div className="program-hero-court">
              <CourtMark variant="plan" />
            </div>
          )}
        </figure>
      </header>

      <PageSection className="page-section--narrow">
        <Markdown source={program.description} />
      </PageSection>

      {program.focusPoints.length > 0 && !descriptionCoversFocus ? (
        <PageSection
          id="ce-lucram"
          title={t("programs.whatWeWorkOn")}
          className="page-section--narrow"
        >
          <ul className="focus-list">
            {program.focusPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      <PageSection id="pentru-cine" title={t("programs.forWhom")} className="page-section--narrow">
        <dl className="fact-list">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </PageSection>

      {lessons.length > 0 ? (
        <PageSection id="lectii" title={t("programs.howToTrain")} className="page-section--narrow">
          <p className="measure mb-6 text-cerneala-2">{t("programs.howToTrainIntro")}</p>
          <LessonTypeList
            lessons={lessons}
            locale={locale}
            currency={settings.currency}
            programSlug={program.slug}
          />
        </PageSection>
      ) : null}

      {programFaqs.length > 0 ? (
        <PageSection
          id="intrebari"
          title={t("programs.questions")}
          className="page-section--narrow"
        >
          <div className="faq-list">
            {programFaqs.map((faq) => (
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

      <PageSection className="page-section--narrow">
        <p className="flex flex-wrap gap-3">
          {program.bookableOnline ? (
            <Link
              href={{ pathname: "/rezervare", query: { program: program.slug } }}
              className="btn btn-primary"
            >
              {t("programs.bookThis")}
            </Link>
          ) : (
            <Link
              href={{ pathname: "/lista-asteptare", query: { program: program.slug } }}
              className="btn btn-primary"
            >
              {t("programs.joinWaitlist")}
            </Link>
          )}
          <Link href="/programe" className="btn btn-secondary">
            {programsHeader.title}
          </Link>
        </p>
      </PageSection>
    </>
  );
}
