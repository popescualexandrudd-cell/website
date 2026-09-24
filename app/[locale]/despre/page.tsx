import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import {
  getCoach,
  getGallery,
  getPageHeader,
  getScenes,
  getSettings,
  localizedSettings,
} from "@/lib/content";
import { TODO_MARK } from "@/lib/i18n-content";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { personLd } from "@/lib/structured-data";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { JsonLd } from "@/components/pages/JsonLd";
import { Markdown } from "@/components/site/Markdown";
import { TodoText } from "@/components/site/TodoText";
import { Picture } from "@/components/ui/Picture";
import { CoachPortrait } from "@/components/home/CoachPortrait";

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

export default async function AboutPage({ params }: PageProps<"/[locale]/despre">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, coach, gallery, settingsRow, scenes, t] = await Promise.all([
    getPageHeader("despre", locale),
    getCoach(locale),
    getGallery(locale),
    getSettings(),
    getScenes(locale),
    getTranslations(),
  ]);
  const settings = localizedSettings(settingsRow, locale);
  const photos = gallery.slice(0, 6);
  // The same note as the home page's portrait frame, until the photo is uploaded.
  const photoNote = scenes.find((s) => s.key === "antrenorul")?.extra.photoNote ?? "";

  return (
    <>
      <JsonLd data={personLd(settings, coach, localizedUrl("/despre", locale))} />
      <PageHero
        title={header.title}
        intro={header.intro}
        image={header.image}
        imageAlt={header.imageAlt}
      >
        <p className="about-name">
          <TodoText value={coach.name} />
          <span className="about-role">{coach.title}</span>
        </p>
      </PageHero>

      <section className="about-story" aria-labelledby="parcurs-title" id="parcurs">
        <CoachPortrait
          photo={coach.photo}
          alt={coach.photoAlt || t("home.coachPhotoAlt", { name: coach.name })}
          note={photoNote}
          priority
        />
        <div className="about-story-copy">
          <h2 id="parcurs-title" className="section-title">
            {t("about.story")}
          </h2>
          <Markdown source={coach.story} />
          <dl className="fact-list mt-10">
            <div>
              <dt>{t("about.experience")}</dt>
              <dd>
                <TodoText
                  value={
                    coach.yearsExperience === null
                      ? TODO_MARK
                      : t("about.experienceYears", { count: coach.yearsExperience })
                  }
                />
              </dd>
            </div>
            <div>
              <dt>{t("about.languages")}</dt>
              <dd>{coach.languages.join(", ")}</dd>
            </div>
          </dl>
        </div>
      </section>

      <PageSection id="filozofie" title={t("about.philosophy")} className="page-section--narrow">
        <Markdown source={coach.philosophy} />
      </PageSection>

      {coach.certifications.length > 0 ? (
        <PageSection
          id="certificari"
          title={t("about.certifications")}
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
        <PageSection id="rezultate" title={t("about.results")} className="page-section--narrow">
          <Markdown source={coach.results} />
        </PageSection>
      ) : null}

      {photos.length > 0 ? (
        <PageSection id="fotografii" title={t("about.photos")}>
          <ul className="gallery-grid">
            {photos.map((photo) => (
              <li key={photo.id} className="gallery-item">
                <Picture
                  image={photo.image}
                  alt={photo.alt}
                  sizes="(min-width: 1024px) 30vw, 50vw"
                />
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}
    </>
  );
}
