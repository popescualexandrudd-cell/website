import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getLessonTypes, getPageHeader, getPrograms, getSettings } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { LessonTypeList } from "@/components/pages/LessonTypeList";
import { Picture } from "@/components/ui/Picture";
import { CourtMark } from "@/components/ui/CourtMark";
import { TodoText } from "@/components/site/TodoText";
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
 * Two separate things: the training programmes (what we work on: Inițiere, Competiție,
 * Amatori) and the kinds of lesson (how: alone, for two, for three, in a group, biomechanics).
 */
export default async function ProgramsPage({ params }: PageProps<"/[locale]/programe">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, programs, lessons, settings, t] = await Promise.all([
    getPageHeader("programe", locale),
    getPrograms(locale),
    getLessonTypes(locale),
    getSettings(),
    getTranslations(),
  ]);

  return (
    <>
      <PageHero
        title={header.title}
        intro={header.intro}
        image={header.image}
        imageAlt={header.imageAlt}
      />
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
                <p className="ed-row-text">
                  <TodoText value={program.summary} />
                </p>
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

      {lessons.length > 0 ? (
        <PageSection id="tipuri-de-lectii" title={t("programs.lessonsTitle")}>
          <p className="measure mb-6 text-cerneala-2">{t("programs.lessonsIntro")}</p>
          <LessonTypeList lessons={lessons} locale={locale} currency={settings.currency} />
        </PageSection>
      ) : null}
    </>
  );
}
