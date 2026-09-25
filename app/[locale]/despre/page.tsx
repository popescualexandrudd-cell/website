import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getCoaches, getPageHeader, getScenes } from "@/lib/content";
import { orderedListItems } from "@/lib/markdown";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { breadcrumbLd } from "@/lib/structured-data";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { JsonLd } from "@/components/pages/JsonLd";
import { Markdown } from "@/components/site/Markdown";
import { TodoText } from "@/components/site/TodoText";
import { Words } from "@/components/site/Words";
import { CoachCard } from "@/components/academy/CoachCard";
import { StorySection } from "@/components/home/StorySection";
import { PillarsSection } from "@/components/home/PillarsSection";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/despre">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("despre", locale);
  return pageMetadata({
    locale,
    href: "/despre",
    title: header.seoTitle,
    description: header.seoDescription,
  });
}

/** The academy itself: what it believes, how it works, who leads the training. */
export default async function AboutPage({ params }: PageProps<"/[locale]/despre">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, scenes, coaches, t] = await Promise.all([
    getPageHeader("despre", locale),
    getScenes(locale),
    getCoaches(locale),
    getTranslations(),
  ]);
  const manifest = scenes.find((s) => s.key === "manifest");
  const story = scenes.find((s) => s.key === "poveste");
  const pillars = scenes.find((s) => s.key === "piloni");
  const method = scenes.find((s) => s.key === "metoda");
  const team = scenes.find((s) => s.key === "echipa");
  const steps = method ? orderedListItems(method.body) : [];

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: t("common.home"), url: localizedUrl("/", locale) },
          { name: header.title, url: localizedUrl("/despre", locale) },
        ])}
      />
      <PageHero
        title={header.title}
        intro={header.intro}
        image={header.image}
        imageAlt={header.imageAlt}
      />

      {story ? <StorySection scene={{ ...story, ctaLabel: "", ctaHref: null }} /> : null}
      {pillars ? <PillarsSection scene={pillars} /> : null}

      {manifest ? (
        <section className="about-manifest" aria-labelledby="filozofie-title" id="filozofie">
          <p className="kicker">
            <TodoText value={manifest.indexName} />
          </p>
          <h2 id="filozofie-title" className="about-manifest-title">
            <Words text={manifest.title} />
          </h2>
          {manifest.body ? (
            <p className="about-manifest-body">
              <TodoText value={manifest.body} />
            </p>
          ) : null}
        </section>
      ) : null}

      {method ? (
        <PageSection id="metoda" title={method.title}>
          {steps.length > 0 ? (
            <ol className="method-steps">
              {steps.map((step, i) => (
                <li key={i} className="method-step">
                  <span className="method-number numerals" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {step.title ? <h3 className="method-step-title">{step.title}</h3> : null}
                  <p>
                    <TodoText value={step.text} />
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <Markdown source={method.body} />
          )}
        </PageSection>
      ) : null}

      {coaches.length > 0 ? (
        <PageSection id="echipa" title={team?.title ?? t("nav.team")}>
          <div className="team-grid" data-count={Math.min(coaches.length, 4)}>
            {coaches.map((coach) => (
              <CoachCard key={coach.id} coach={coach} photoNote={team?.extra.photoNote ?? ""} />
            ))}
          </div>
          <p className="mt-10 flex flex-wrap gap-6">
            <Link href="/echipa" className="link-quiet">
              {t("team.backToTeam")}
            </Link>
            <Link href="/facilitati" className="link-quiet">
              {t("nav.club")}
            </Link>
            <Link href="/academie" className="link-quiet">
              {t("nav.juniors")}
            </Link>
          </p>
        </PageSection>
      ) : null}
    </>
  );
}
