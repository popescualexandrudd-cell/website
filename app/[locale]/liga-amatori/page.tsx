import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getPageHeader, getSettings, localizedSettings } from "@/lib/content";
import { getCurrentSeason, type LeagueMatchView } from "@/lib/league-content";
import { formatDate } from "@/lib/format";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { breadcrumbLd } from "@/lib/structured-data";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { JsonLd } from "@/components/pages/JsonLd";
import { PlayerForm } from "@/components/pages/PlayerForm";
import { Markdown } from "@/components/site/Markdown";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/liga-amatori">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("liga", locale);
  return pageMetadata({
    locale,
    href: "/liga-amatori",
    title: header.seoTitle,
    description: header.seoDescription,
  });
}

/**
 * The amateur league: the current season's table (computed from the results), the results and
 * the matches still to play, the rules, and the sign-up. Players appear by first name and
 * initial only.
 */
export default async function LeaguePage({ params }: PageProps<"/[locale]/liga-amatori">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, row, season, t, h] = await Promise.all([
    getPageHeader("liga", locale),
    getSettings(),
    getCurrentSeason(locale),
    getTranslations(),
    headers(),
  ]);
  const settings = localizedSettings(row, locale);
  if (!settings.leagueEnabled) notFound();
  const url = localizedUrl("/liga-amatori", locale);
  const day = (date: Date | null) =>
    date ? formatDate(date, "UTC", locale, locale === "en" ? "d MMM" : "d MMM") : "";
  const signupOpen = !season || season.registrationOpen;

  const matchRow = (m: LeagueMatchView) => (
    <li key={m.id} className="league-match">
      <span className="league-match-date numerals">{day(m.playedOn)}</span>
      <span className={m.winner === "A" ? "league-match-winner" : undefined}>{m.playerA}</span>
      <span className="league-match-score numerals">
        {m.score ?? (m.walkover ? t("league.walkover") : t("league.vs"))}
      </span>
      <span className={m.winner === "B" ? "league-match-winner" : undefined}>{m.playerB}</span>
      {m.division ? <span className="league-match-division">{m.division}</span> : null}
    </li>
  );

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
      >
        <div className="page-hero-actions">
          {signupOpen ? (
            <a href="#inscriere" className="btn btn-primary">
              {t("league.signupCta")}
            </a>
          ) : null}
          <Link href="/partener-de-joc" className="btn btn-secondary">
            {t("league.partnerCta")}
          </Link>
        </div>
      </PageHero>

      {season ? (
        <PageSection id="clasament" title={season.name}>
          {season.startsOn || season.endsOn ? (
            <p className="kicker mb-6">
              {[season.startsOn, season.endsOn]
                .filter((d): d is Date => d !== null)
                .map((d) => formatDate(d, "UTC", locale, "d MMMM yyyy"))
                .join(" – ")}
            </p>
          ) : null}
          {season.tables.length > 0 ? (
            <div className="league-tables">
              {season.tables.map((table) => (
                <div
                  key={table.division ?? "all"}
                  className="league-table-wrap"
                  role="region"
                  tabIndex={0}
                  aria-label={table.division ?? t("league.table")}
                >
                  <table className="league-table">
                    <caption>{table.division ?? t("league.table")}</caption>
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">{t("league.player")}</th>
                        <th scope="col" className="numerals">
                          <abbr title={t("league.playedLong")}>{t("league.played")}</abbr>
                        </th>
                        <th scope="col" className="numerals">
                          <abbr title={t("league.wonLong")}>{t("league.won")}</abbr>
                        </th>
                        <th scope="col" className="numerals">
                          <abbr title={t("league.lostLong")}>{t("league.lost")}</abbr>
                        </th>
                        <th scope="col" className="numerals">
                          {t("league.sets")}
                        </th>
                        <th scope="col" className="numerals">
                          {t("league.points")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((r, i) => (
                        <tr key={r.playerId}>
                          <td className="numerals">{i + 1}</td>
                          <th scope="row">{r.name}</th>
                          <td className="numerals">{r.played}</td>
                          <td className="numerals">{r.won}</td>
                          <td className="numerals">{r.lost}</td>
                          <td className="numerals">
                            {r.setsWon}–{r.setsLost}
                          </td>
                          <td className="numerals">
                            <strong>{r.points}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            <p className="measure text-cerneala-2">{t("league.noResults")}</p>
          )}
          <div className="league-lists">
            {season.results.length > 0 ? (
              <div>
                <h3 className="section-subtitle">{t("league.results")}</h3>
                <ul className="league-matches">{season.results.map(matchRow)}</ul>
              </div>
            ) : null}
            {season.upcoming.length > 0 ? (
              <div>
                <h3 className="section-subtitle">{t("league.upcoming")}</h3>
                <ul className="league-matches">{season.upcoming.map(matchRow)}</ul>
              </div>
            ) : null}
          </div>
          {season.rules ? (
            <div className="league-rules">
              <h3 className="section-subtitle">{t("league.rules")}</h3>
              <Markdown source={season.rules} />
            </div>
          ) : null}
        </PageSection>
      ) : (
        <PageSection id="despre-liga" title={t("league.aboutTitle")}>
          <ol className="step-cards">
            {(["one", "two", "three"] as const).map((step, i) => (
              <li key={step} className="step-card">
                <span className="step-card-number numerals" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="step-card-title">{t(`league.steps.${step}`)}</h3>
                <p>{t(`league.steps.${step}Text`)}</p>
              </li>
            ))}
          </ol>
        </PageSection>
      )}

      {signupOpen ? (
        <PageSection
          id="inscriere"
          title={t("league.signupTitle")}
          className="page-section--narrow"
        >
          <p className="measure mb-6 text-cerneala-2">{t("league.signupIntro")}</p>
          <PlayerForm
            mode="league"
            turnstileSiteKey={
              process.env.TURNSTILE_SECRET_KEY ? (process.env.TURNSTILE_SITE_KEY ?? null) : null
            }
            nonce={h.get("x-nonce") ?? undefined}
          />
        </PageSection>
      ) : null}
    </>
  );
}
