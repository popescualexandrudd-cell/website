import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getCoach, getGallery, getPageHeader, getSettings, localizedSettings } from "@/lib/content";
import { TODO_MARK } from "@/lib/i18n-content";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { personLd } from "@/lib/structured-data";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { JsonLd } from "@/components/pages/JsonLd";
import { Markdown } from "@/components/site/Markdown";
import { TodoText } from "@/components/site/TodoText";
import { ArtPicture } from "@/components/ui/ArtPicture";

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
  const [header, coach, gallery, settingsRow, t] = await Promise.all([
    getPageHeader("despre", locale),
    getCoach(locale),
    getGallery(locale),
    getSettings(),
    getTranslations(),
  ]);
  const settings = localizedSettings(settingsRow, locale);
  const photos = gallery.slice(0, 6);

  return (
    <>
      <JsonLd data={personLd(settings, coach, localizedUrl("/despre", locale))} />
      <PageHero
        title={header.title}
        intro={header.intro}
        art={header.art}
        imageAlt={header.imageAlt}
      >
        <p className="mt-6 font-display text-h3 leading-tight">
          <TodoText value={coach.name} />
          <span className="block font-sans text-body text-cerneala-2">{coach.title}</span>
        </p>
      </PageHero>

      <PageSection id="parcurs" title={t("about.story")} className="page-section--narrow">
        <div className="about-story">
          {coach.photo ? (
            <figure className="about-photo">
              <ArtPicture
                art={coach.photo}
                alt={coach.photoAlt}
                sizes="(min-width: 1024px) 18rem, 60vw"
              />
            </figure>
          ) : null}
          <Markdown source={coach.story} />
        </div>
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
      </PageSection>

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
                    <ArtPicture art={c.image} alt={c.imageAlt} sizes="9rem" />
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
                <ArtPicture
                  art={photo.image}
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
