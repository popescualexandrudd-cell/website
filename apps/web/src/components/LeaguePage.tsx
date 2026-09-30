import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CLUB_TZ } from "@/lib/live";
import { lei } from "@/lib/packages";
import {
  filterRows,
  type Filters,
  LADDERS,
  type PublicPlayer,
  queryFor,
  results,
  type Result,
  scoreText,
  seasons,
  standings,
  TIER_FILTERS,
  tournaments,
} from "@/lib/league-page";

/**
 * The league page (§9.3 `/liga`): the standings of the three ladders (LG-001) for the running
 * season or any past one, filtered by rank and searched by name, then the latest results and the
 * tournaments, and the rules in short. Rendered on the server; the choices are a plain form and
 * links (no script). Only public fields (R-012, Q49); from the website the league is only watched
 * (invariant 2).
 */
export async function LeaguePage({ filters }: { filters: Filters }) {
  const t = await getTranslations("web.site.leaguePage");
  const ranks = await getTranslations("web.site.league.ranks");
  const locale = await getLocale();
  const [allSeasons, latest, cups] = await Promise.all([seasons(), results(12), tournaments()]);
  const running = allSeasons?.find((season) => season.status === "active") ?? null;
  const shown =
    filters.season === null ? running : (allSeasons?.find((season) => season.number === filters.season) ?? null);
  const table = shown ? await standings(filters.ladder, filters.season) : null;
  const rows = table ? filterRows(table, filters.tier, filters.q) : null;
  const level = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const rankName = (tier: string, division: string) =>
    tier === "master" ? ranks("master") : `${(TIER_FILTERS as readonly string[]).includes(tier) ? ranks(tier) : tier} ${division}`;

  return (
    <div className="page league-page">
      <section className="section" aria-labelledby="league-page-title">
        <div className="container">
          <p className="kicker" data-reveal="fade">
            {t("kicker")}
          </p>
          <h1 id="league-page-title" className="h2" data-reveal="lines">
            {t("title")}
          </h1>
          <p className="lead" data-reveal="rise">
            {t("lead")}
          </p>

          <nav className="league-page__ladders" aria-label={t("ladders.label")}>
            {LADDERS.map((ladder) => (
              <Link
                key={ladder}
                href={{ pathname: "/league", query: queryFor(filters, { ladder }) }}
                className="league-page__ladder"
                aria-current={ladder === filters.ladder ? "page" : undefined}
              >
                {t(`ladders.${ladder}`)}
              </Link>
            ))}
          </nav>

          <form className="league-page__filters" method="get" role="search" aria-label={t("filters.label")}>
            {filters.ladder !== "doubles" && <input type="hidden" name="ladder" value={filters.ladder} />}
            <label>
              <span>{t("filters.season")}</span>
              <select className="select" name="season" defaultValue={filters.season === null ? "" : String(filters.season)}>
                <option value="">{t("filters.current")}</option>
                {(allSeasons ?? []).map((season) => (
                  <option key={season.number} value={String(season.number)}>
                    {season.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("filters.rank")}</span>
              <select className="select" name="rank" defaultValue={filters.tier ?? ""}>
                <option value="">{t("filters.allRanks")}</option>
                {TIER_FILTERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {ranks(tier)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("filters.search")}</span>
              <input className="input" type="search" name="q" defaultValue={filters.q} maxLength={60} autoComplete="off" />
            </label>
            <button type="submit" className="btn btn-secondary">
              {t("filters.apply")}
            </button>
          </form>

          <div className="standings league-page__standings" role="region" aria-labelledby="league-page-standings">
            <h2 id="league-page-standings" className="league__h3">
              {shown ? t("standings.title", { ladder: t(`ladders.${filters.ladder}`), season: shown.name }) : t(`ladders.${filters.ladder}`)}
            </h2>
            {allSeasons === null ? (
              <p className="league__text">{t("standings.error")}</p>
            ) : shown === null ? (
              <p className="league__text">{filters.season === null ? t("standings.noSeason") : t("standings.unknownSeason")}</p>
            ) : table === null ? (
              <p className="league__text">{t("standings.error")}</p>
            ) : table.length === 0 ? (
              <p className="league__text">{t("standings.empty")}</p>
            ) : rows !== null && rows.length === 0 ? (
              <p className="league__text">{t("standings.noMatch")}</p>
            ) : (
              <div className="standings__scroll" tabIndex={0} role="group" aria-label={t("standings.scroll")}>
                <table className="standings__table">
                  <thead>
                    <tr>
                      <th scope="col">{t("standings.position")}</th>
                      <th scope="col">{t(filters.ladder === "pairs" ? "standings.pair" : "standings.player")}</th>
                      <th scope="col">{t("standings.rank")}</th>
                      <th scope="col">{t("standings.level")}</th>
                      <th scope="col">{t("standings.lp")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rows ?? []).map((row) => (
                      <tr key={row.position}>
                        <td>{row.position}</td>
                        <td>
                          <Players players={row.players} retired={t("retired")} />
                          {!row.eligible && <span className="events__flag league-page__minimum">{t("standings.belowMinimum")}</span>}
                        </td>
                        <td>{rankName(row.tier, row.division)}</td>
                        <td>{level.format(row.level)}</td>
                        <td>{row.lp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="events__note">{t("standings.note")}</p>
          </div>
        </div>
      </section>

      <section className="section section-alt" aria-labelledby="league-page-results">
        <div className="container">
          <h2 id="league-page-results" className="h2" data-reveal="lines">
            {t("results.title")}
          </h2>
          {latest === null ? (
            <p className="league__text">{t("results.error")}</p>
          ) : latest.length === 0 ? (
            <p className="league__text">{t("results.empty")}</p>
          ) : (
            <ol className="league-page__results">
              {latest.map((result, i) => (
                <ResultItem key={result.id} result={result} locale={locale} index={i} />
              ))}
            </ol>
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="league-page-tournaments">
        <div className="container">
          <h2 id="league-page-tournaments" className="h2" data-reveal="lines">
            {t("tournaments.title")}
          </h2>
          {cups === null ? (
            <p className="league__text">{t("tournaments.error")}</p>
          ) : cups.length === 0 ? (
            <p className="league__text">{t("tournaments.empty")}</p>
          ) : (
            <ul className="padel__cards">
              {cups.map((cup, i) => (
                <li key={cup.id} className="padel__card" data-reveal="rise" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
                  <h3 className="padel__h3">{cup.name}</h3>
                  <p>
                    {t(`tournaments.status.${(TOURNAMENT_STATUSES as readonly string[]).includes(cup.status) ? cup.status : "other"}`)}
                    {" · "}
                    {when(cup.starts_at, locale)}
                  </p>
                  <p>{t("tournaments.entries", { entries: cup.entries, max: cup.max_entries })}</p>
                  {cup.entry_fee > 0 && (
                    <p>
                      {t(cup.fee_provisional ? "tournaments.feeProvisional" : "tournaments.fee", { amount: lei(cup.entry_fee, locale) })}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="events__note">{t("tournaments.how")}</p>
        </div>
      </section>

      <section className="section section-alt" aria-labelledby="league-page-rules">
        <div className="container">
          <h2 id="league-page-rules" className="h2" data-reveal="lines">
            {t("rules.title")}
          </h2>
          <ul className="packages__notes">
            {RULES.map((key, i) => (
              <li key={key} data-reveal="rise" style={{ "--i": i } as React.CSSProperties}>
                <strong>{t(`rules.${key}.title`)}</strong>
                <span>{t(`rules.${key}.text`)}</span>
              </li>
            ))}
          </ul>
          <p className="pilates__more">
            <Link className="btn btn-secondary" href="/terms">
              {t("rules.terms")}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

const RULES = ["join", "scores", "ladders", "seasons", "public"] as const;
const TOURNAMENT_STATUSES = ["registration", "in_progress", "finished"] as const;
const KINDS = ["official", "challenge", "tournament"] as const;

const when = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { timeZone: CLUB_TZ, weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );

/** The players, each linked to their public page (a retired player has no page and no name). */
function Players({ players, retired }: { players: PublicPlayer[]; retired: string }) {
  return (
    <span className="league-page__players">
      {players.map((p, i) => (
        <span key={p.id ?? `retired-${i}`}>
          {i > 0 && " & "}
          {p.id ? (
            <Link href={{ pathname: "/league/players/[id]", params: { id: p.id } }}>
              {p.first_name} {p.last_name}
            </Link>
          ) : (
            retired
          )}
        </span>
      ))}
    </span>
  );
}

async function ResultItem({ result, locale, index }: { result: Result; locale: string; index: number }) {
  const t = await getTranslations("web.site.leaguePage");
  const retired = t("retired");
  const signed = new Intl.NumberFormat(locale, { signDisplay: "always" });
  const delta = (p: PublicPlayer) => (p.id && p.id in result.lp_delta ? result.lp_delta[p.id] : undefined);
  const team = (players: PublicPlayer[], won: boolean) => (
    <p className={won ? "league-page__team is-winner" : "league-page__team"}>
      <Players players={players} retired={retired} />
      {players.map((p) => {
        const d = delta(p);
        return d === undefined ? null : (
          <span key={p.id} className="league-page__lp">
            {t("results.lp", { lp: signed.format(d) })}
          </span>
        );
      })}
    </p>
  );
  return (
    <li className="events__item" data-reveal="rise" style={{ "--i": Math.min(index, 8) } as React.CSSProperties}>
      <p className="events__date">
        <time dateTime={result.finished_at}>{when(result.finished_at, locale)}</time>
        {result.court && <span className="events__time">{result.court}</span>}
      </p>
      <div className="events__body">
        <p className="events__tags">
          <span className="events__kind">{t(`results.${(KINDS as readonly string[]).includes(result.kind) ? result.kind : "official"}`)}</span>
        </p>
        {team(result.team_a, result.winner === "a")}
        {team(result.team_b, result.winner === "b")}
        <p className="events__text">{t("results.score", { score: scoreText(result.score) || "–" })}</p>
      </div>
    </li>
  );
}

export { Players, ResultItem };
