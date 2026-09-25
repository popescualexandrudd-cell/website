import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import {
  getLocations,
  getPageHeader,
  getSettings,
  getTournaments,
  localizedSettings,
  type TournamentView,
} from "@/lib/content";
import { formatDate } from "@/lib/format";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { breadcrumbLd, tournamentLd } from "@/lib/structured-data";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { JsonLd } from "@/components/pages/JsonLd";
import { TodoText } from "@/components/site/TodoText";
import { Marquee } from "@/components/ui/Marquee";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/turnee">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("turnee", locale);
  return pageMetadata({
    locale,
    href: "/turnee",
    title: header.seoTitle,
    description: header.seoDescription,
  });
}

/** Tournaments at the club: the coming editions with registration, and the ones it hosts. */
export default async function TournamentsPage({ params }: PageProps<"/[locale]/turnee">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, { upcoming, hosted }, locations, row, t] = await Promise.all([
    getPageHeader("turnee", locale),
    getTournaments(locale),
    getLocations(locale),
    getSettings(),
    getTranslations(),
  ]);
  const settings = localizedSettings(row, locale);
  const url = localizedUrl("/turnee", locale);
  const organizers = [...new Set([...upcoming, ...hosted].map((x) => x.organizer))];
  const date = (value: Date) => formatDate(value, "UTC", locale, "d MMMM yyyy");
  const dates = (x: TournamentView) =>
    x.startsOn
      ? x.endsOn && x.endsOn.getTime() !== x.startsOn.getTime()
        ? `${date(x.startsOn)} – ${date(x.endsOn)}`
        : date(x.startsOn)
      : "";
  const organizerName = (x: TournamentView) =>
    x.organizer === "CLUB" ? settings.brandName : t(`tournaments.organizer.${x.organizer}`);
  const events = upcoming
    .map((x) => tournamentLd(x, url, locations[0] ?? null, organizerName(x)))
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: t("common.home"), url: localizedUrl("/", locale) },
            { name: header.title, url },
          ]),
          ...events,
        ]}
      />
      <PageHero
        title={header.title}
        intro={header.intro}
        image={header.image}
        imageAlt={header.imageAlt}
      />
      {organizers.length > 0 ? (
        <Marquee
          label={t("tournaments.hostedTitle")}
          items={organizers.map((o) =>
            o === "CLUB" ? settings.brandName : t(`tournaments.organizer.${o}`),
          )}
        />
      ) : null}

      <PageSection id="urmeaza" title={t("tournaments.upcomingTitle")}>
        {upcoming.length === 0 ? (
          <p className="measure text-cerneala-2">{t("tournaments.upcomingEmpty")}</p>
        ) : (
          <ul className="tournament-list">
            {upcoming.map((x) => (
              <li key={x.id} className="tournament-row" data-upcoming="true">
                <p className="tournament-date numerals">{dates(x)}</p>
                <div>
                  <p className="kicker">{organizerName(x)}</p>
                  <h3 className="tournament-name">{x.name}</h3>
                  {x.category ? <p className="tournament-meta">{x.category}</p> : null}
                  {x.summary ? (
                    <p className="tournament-summary">
                      <TodoText value={x.summary} />
                    </p>
                  ) : null}
                </div>
                {x.registrationUrl ? (
                  <a
                    href={x.registrationUrl}
                    className="btn btn-primary btn-arrow"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("tournaments.register")}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </PageSection>

      {hosted.length > 0 ? (
        <PageSection id="gazduite" title={t("tournaments.hostedTitle")}>
          <ul className="tournament-grid">
            {hosted.map((x) => (
              <li key={x.id} className="tournament-card" data-organizer={x.organizer}>
                <p className="tournament-badge">{organizerName(x)}</p>
                <h3 className="tournament-name">{x.name}</h3>
                {x.startsOn ? (
                  <p className="tournament-meta">{t("tournaments.past", { date: dates(x) })}</p>
                ) : x.category ? (
                  <p className="tournament-meta">{x.category}</p>
                ) : null}
                {x.summary ? (
                  <p className="tournament-summary">
                    <TodoText value={x.summary} />
                  </p>
                ) : null}
                {x.resultsUrl ? (
                  <a href={x.resultsUrl} className="link" target="_blank" rel="noopener noreferrer">
                    {t("tournaments.results")}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      <PageSection id="joaca" className="page-section--narrow">
        <div className="cta-panel">
          <h2 className="section-title">{t("tournaments.playTitle")}</h2>
          <p className="measure">{t("tournaments.playText")}</p>
          <div className="cta-panel-actions">
            <Link
              href={{ pathname: "/programe", hash: "inscriere" }}
              className="btn btn-primary btn-arrow"
            >
              {t("tournaments.evaluationCta")}
            </Link>
            <Link href="/contact" className="btn btn-secondary">
              {t("tournaments.contactCta")}
            </Link>
          </div>
        </div>
      </PageSection>
    </>
  );
}
