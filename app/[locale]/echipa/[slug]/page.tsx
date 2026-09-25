import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getCoach, getPageHeader, getSettings, localizedSettings } from "@/lib/content";
import { isFilled } from "@/lib/i18n-content";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { breadcrumbLd, personLd } from "@/lib/structured-data";
import { PageSection } from "@/components/pages/PageHero";
import { HeroBackdrop } from "@/components/pages/HeroBackdrop";
import { Breadcrumbs } from "@/components/pages/Breadcrumbs";
import { JsonLd } from "@/components/pages/JsonLd";
import { Markdown } from "@/components/site/Markdown";
import { TodoText } from "@/components/site/TodoText";
import { Picture } from "@/components/ui/Picture";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { initialsOf } from "@/components/academy/CoachCard";
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
  const [header, settingsRow, t] = await Promise.all([
    getPageHeader("echipa", locale),
    getSettings(),
    getTranslations(),
  ]);
  const settings = localizedSettings(settingsRow, locale);
  const url = localizedUrl({ pathname: "/echipa/[slug]", params: { slug } }, locale);

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
      <header className="coach-hero tone-dark has-backdrop">
        <HeroBackdrop />
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
            {coach.title && coach.title !== coach.role ? (
              <p className="page-intro">
                <TodoText value={coach.title} />
              </p>
            ) : null}
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
              <MediaFrame variant="plan" className="coach-hero-frame">
                <span className="coach-card-initials" aria-hidden="true">
                  {initialsOf(coach.name)}
                </span>
              </MediaFrame>
            )}
          </div>
        </div>
      </header>

      <PageSection id="parcurs" title={t("team.story")} className="page-section--narrow">
        <Markdown source={coach.story} />
        {coach.yearsExperience !== null ||
        coach.languages.length > 0 ||
        coach.specialties.length > 0 ? (
          <dl className="fact-list coach-facts mt-10">
            {coach.yearsExperience !== null ? (
              <div>
                <dt>{t("about.experience")}</dt>
                <dd>{t("team.experienceYears", { count: coach.yearsExperience })}</dd>
              </div>
            ) : null}
            {coach.specialties.length > 0 ? (
              <div>
                <dt>{t("team.specialties")}</dt>
                <dd>{coach.specialties.join(", ")}</dd>
              </div>
            ) : null}
            {coach.languages.length > 0 ? (
              <div>
                <dt>{t("team.languages")}</dt>
                <dd>{coach.languages.join(", ")}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        {coach.certifications.length > 0 ? (
          <>
            <h3 className="section-subtitle mt-10">{t("team.certifications")}</h3>
            <ul className="coach-certs">
              {coach.certifications.map((c) => (
                <li key={c.id}>
                  <strong>{c.title}</strong>
                  <span className="text-cerneala-2">
                    {" · "}
                    {c.issuer}
                    {c.year ? `, ${c.year}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
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
    </>
  );
}
