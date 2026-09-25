import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getCoach, getPageHeader, getScenes, getSettings, localizedSettings } from "@/lib/content";
import { isFilled } from "@/lib/i18n-content";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { breadcrumbLd, personLd } from "@/lib/structured-data";
import { PageSection } from "@/components/pages/PageHero";
import { Breadcrumbs } from "@/components/pages/Breadcrumbs";
import { JsonLd } from "@/components/pages/JsonLd";
import { Markdown } from "@/components/site/Markdown";
import { TodoText } from "@/components/site/TodoText";
import { Picture } from "@/components/ui/Picture";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { AmbientVideo } from "@/components/ui/AmbientVideo";

type Props = PageProps<"/[locale]/echipa/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  const coach = await getCoach(slug, locale);
  if (!coach) return {};
  const summary = isFilled(coach.summary) ? coach.summary : coach.title;
  return pageMetadata({
    locale,
    href: { pathname: "/echipa/[slug]", params: { slug } },
    title: `${coach.name}, ${coach.role.toLowerCase()}`,
    description: summary,
  });
}

export default async function CoachPage({ params }: Props) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const coach = await getCoach(slug, locale);
  if (!coach) notFound();
  const [header, scenes, settingsRow, t] = await Promise.all([
    getPageHeader("echipa", locale),
    getScenes(locale),
    getSettings(),
    getTranslations(),
  ]);
  const settings = localizedSettings(settingsRow, locale);
  const url = localizedUrl({ pathname: "/echipa/[slug]", params: { slug } }, locale);
  const photoNote = scenes.find((s) => s.key === "echipa")?.extra.photoNote ?? "";

  return (
    <>
      <JsonLd
        data={[
          personLd(settings, coach, url),
          breadcrumbLd([
            { name: t("common.home"), url: localizedUrl("/", locale) },
            { name: header.title, url: localizedUrl("/echipa", locale) },
            { name: coach.name, url },
          ]),
        ]}
      />
      <header className="coach-hero tone-dark">
        <div className="coach-hero-inner">
          <div className="coach-hero-copy">
            <Breadcrumbs
              label={t("nav.team")}
              items={[
                { label: t("common.home"), href: "/" },
                { label: header.title, href: "/echipa" },
                { label: coach.name },
              ]}
            />
            <p className="kicker">
              <TodoText value={coach.role} />
            </p>
            <h1 className="page-title">
              <TodoText value={coach.name} />
            </h1>
            <p className="page-intro">
              <TodoText value={coach.title} />
            </p>
            {coach.summary ? (
              <p className="coach-hero-summary">
                <TodoText value={coach.summary} />
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/rezervare" className="btn btn-primary btn-arrow">
                {t("team.bookWith")}
              </Link>
              <Link href="/echipa" className="btn btn-secondary">
                {t("team.backToTeam")}
              </Link>
            </div>
          </div>
          <div className="coach-hero-media">
            {coach.photo ? (
              <Picture
                image={coach.photo}
                alt={t("team.photoAlt", { name: coach.name })}
                priority
                sizes="(min-width: 1024px) 36vw, 92vw"
                className="coach-hero-picture"
                imgClassName="coach-hero-img"
              />
            ) : (
              <MediaFrame note={photoNote} variant="plan" className="coach-hero-frame" />
            )}
          </div>
        </div>
      </header>

      <PageSection id="parcurs" title={t("team.story")} className="page-section--narrow">
        <Markdown source={coach.story} />
        <dl className="fact-list mt-10">
          {coach.yearsExperience !== null ? (
            <div>
              <dt>{t("about.experience")}</dt>
              <dd>{t("team.experienceYears", { count: coach.yearsExperience })}</dd>
            </div>
          ) : null}
          {coach.languages.length > 0 ? (
            <div>
              <dt>{t("team.languages")}</dt>
              <dd>{coach.languages.join(", ")}</dd>
            </div>
          ) : null}
          {coach.specialties.length > 0 ? (
            <div>
              <dt>{t("team.specialties")}</dt>
              <dd>{coach.specialties.join(", ")}</dd>
            </div>
          ) : null}
        </dl>
      </PageSection>

      {coach.video ? (
        <PageSection id="video" title={t("team.video")}>
          <AmbientVideo
            video={coach.video}
            label={t("team.video")}
            pauseLabel={t("home.videoPause")}
            playLabel={t("home.videoPlay")}
            className="coach-video"
          />
        </PageSection>
      ) : null}

      {coach.philosophy ? (
        <PageSection id="filozofie" title={t("team.philosophy")} className="page-section--narrow">
          <Markdown source={coach.philosophy} />
        </PageSection>
      ) : null}

      {coach.certifications.length > 0 ? (
        <PageSection
          id="certificari"
          title={t("team.certifications")}
          className="page-section--narrow"
        >
          <ul>
            {coach.certifications.map((c) => (
              <li key={c.id} className={`ed-row ${c.image ? "" : "ed-row--no-image"}`}>
                {c.image ? (
                  <span className="ed-row-image">
                    <Picture image={c.image} alt={c.imageAlt} sizes="9rem" />
                  </span>
                ) : null}
                <div>
                  <h3 className="ed-row-title">
                    <TodoText value={c.title} />
                  </h3>
                  <p className="ed-row-meta">
                    <TodoText value={c.issuer} />
                  </p>
                </div>
                <span className="ed-row-aside numerals">{c.year ?? ""}</span>
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      {coach.results ? (
        <PageSection id="rezultate" title={t("team.results")} className="page-section--narrow">
          <Markdown source={coach.results} />
        </PageSection>
      ) : null}
    </>
  );
}
