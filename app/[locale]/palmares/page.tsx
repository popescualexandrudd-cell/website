import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import {
  getGallery,
  getPageHeader,
  getResults,
  getSettings,
  getTournaments,
  localizedSettings,
  type ResultView,
} from "@/lib/content";
import { getLeagueChampions } from "@/lib/league-content";
import { formatDate } from "@/lib/format";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { breadcrumbLd } from "@/lib/structured-data";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { JsonLd } from "@/components/pages/JsonLd";
import { Picture } from "@/components/ui/Picture";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/palmares">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("palmares", locale);
  return pageMetadata({
    locale,
    href: "/palmares",
    title: header.seoTitle,
    description: header.seoDescription,
  });
}

/**
 * The club's honours: the players' results (minors only with their parents' consent), the
 * tournaments played on the club's courts, the amateur league champions and the photos from the
 * prize-givings. Everything comes from the admin; nothing is shown that was not entered there.
 */
export default async function HonoursPage({ params }: PageProps<"/[locale]/palmares">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, row, results, tournaments, champions, gallery, t] = await Promise.all([
    getPageHeader("palmares", locale),
    getSettings(),
    getResults(locale),
    getTournaments(locale),
    getLeagueChampions(locale),
    getGallery(locale),
    getTranslations(),
  ]);
  const settings = localizedSettings(row, locale);
  const url = localizedUrl("/palmares", locale);
  const photos = gallery.filter((item) => item.category === "TURNEE" && item.kind === "image");
  const hosted = [...tournaments.hosted, ...tournaments.upcoming];

  const byYear = new Map<number, ResultView[]>();
  for (const result of results) {
    const year = result.date.getUTCFullYear();
    byYear.set(year, [...(byYear.get(year) ?? []), result]);
  }
  const thisYear = new Date().getUTCFullYear();
  const figures = [
    ...(settings.foundedYear
      ? [{ value: thisYear - settings.foundedYear, label: t("honours.figYears") }]
      : []),
    ...(hosted.length > 0
      ? [{ value: hosted.length, label: t("honours.figTournaments", { count: hosted.length }) }]
      : []),
    ...(results.length > 0
      ? [{ value: results.length, label: t("honours.figResults", { count: results.length }) }]
      : []),
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: t("common.home"), url: localizedUrl("/", locale) },
          { name: header.title, url },
        ])}
      />
      <PageHero
        title={header.title}
        intro={header.intro}
        image={header.image}
        imageAlt={header.imageAlt}
      />

      {figures.length > 0 ? (
        <PageSection className="honours-figures-section">
          <dl className="honours-figures">
            {figures.map((figure) => (
              <div key={figure.label}>
                <dt>{figure.label}</dt>
                <dd className="numerals">{figure.value}</dd>
              </div>
            ))}
          </dl>
        </PageSection>
      ) : null}

      <PageSection id="rezultate" title={t("honours.resultsTitle")}>
        {results.length > 0 ? (
          <div className="honours-years">
            {[...byYear.entries()].map(([year, items]) => (
              <section key={year} className="honours-year" aria-labelledby={`an-${year}`}>
                <h3 id={`an-${year}`} className="honours-year-title numerals">
                  {year}
                </h3>
                <ul className="honours-list">
                  {items.map((r) => (
                    <li key={r.id} className="honours-item" data-level={r.level}>
                      <p className="honours-placement">{r.placement}</p>
                      <p className="honours-athlete">{r.athlete}</p>
                      <p className="honours-event">
                        {r.event} · {r.category} ·{" "}
                        {formatDate(r.date, "UTC", locale, "d MMMM yyyy")}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <p className="measure text-cerneala-2">{t("honours.resultsEmpty")}</p>
        )}
      </PageSection>

      {photos.length > 0 ? (
        <PageSection id="podium" title={t("honours.photosTitle")}>
          <ul className="honours-photos">
            {photos.map((photo) => (
              <li key={photo.id}>
                <figure>
                  <Picture
                    image={photo.image}
                    alt={photo.alt}
                    sizes="(min-width: 900px) 45vw, 100vw"
                    imgClassName="honours-photo"
                  />
                  {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
                </figure>
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      {hosted.length > 0 ? (
        <PageSection id="turnee" title={t("honours.tournamentsTitle")}>
          <ul className="honours-tournaments">
            {hosted.map((tournament) => (
              <li key={tournament.id}>
                <span className="honours-tournament-name">{tournament.name}</span>
                {tournament.category ? (
                  <span className="text-cerneala-2"> · {tournament.category}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-6">
            <Link href="/turnee" className="link">
              {t("honours.tournamentsLink")}
            </Link>
          </p>
        </PageSection>
      ) : null}

      {champions.length > 0 ? (
        <PageSection id="liga" title={t("honours.leagueTitle")}>
          <ul className="honours-list">
            {champions.map((c) => (
              <li key={`${c.season}-${c.division ?? ""}`} className="honours-item">
                <p className="honours-placement">{t("honours.champion")}</p>
                <p className="honours-athlete">{c.champion}</p>
                <p className="honours-event">
                  {c.season}
                  {c.division ? ` · ${c.division}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      <PageSection className="page-section--narrow">
        <div className="honours-cta">
          <h2 className="section-subtitle">{t("honours.ctaTitle")}</h2>
          <p>{t("honours.ctaText")}</p>
          <Link
            href={{ pathname: "/programe", hash: "inscriere" }}
            className="btn btn-primary btn-arrow"
          >
            {t("honours.ctaButton")}
          </Link>
        </div>
      </PageSection>
    </>
  );
}
