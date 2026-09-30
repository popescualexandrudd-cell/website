import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LADDERS, type Profile, TIER_FILTERS } from "@/lib/league-page";
import { ResultItem } from "./LeaguePage";

/**
 * A player's public page (Q49, 28.09.2026; R-012): the name, the place, rank, level and LP on each
 * ladder of the running season, and the league matches with date, time, court, score and LP. Badges,
 * statistics and contact details stay private. Rendered on the server.
 */
export async function PlayerPage({ profile, locale }: { profile: Profile; locale: string }) {
  const t = await getTranslations("web.site.leaguePage");
  const ranks = await getTranslations("web.site.league.ranks");
  const level = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const name = `${profile.player.first_name} ${profile.player.last_name}`;
  const ladders = profile.ladders.filter((l) => (LADDERS as readonly string[]).includes(l.ladder));
  return (
    <div className="page league-page">
      <section className="section" aria-labelledby="player-title">
        <div className="container">
          <p className="kicker" data-reveal="fade">
            {t("player.kicker")}
          </p>
          <h1 id="player-title" className="h2" data-reveal="lines">
            {name}
          </h1>
          {ladders.length === 0 ? (
            <p className="lead">{t("player.noLadder")}</p>
          ) : (
            <ul className="tennis__facts" aria-label={t("player.ladders")}>
              {ladders.map((l, i) => (
                <li key={l.ladder} data-reveal="rise" style={{ "--i": i } as React.CSSProperties}>
                  <span className="tennis__fact">{l.position === null ? t("player.placement") : t("player.place", { position: l.position })}</span>
                  <span className="tennis__fact-label">
                    {t(`ladders.${l.ladder}`)}
                    {" · "}
                    {l.tier === "master" ? ranks("master") : `${(TIER_FILTERS as readonly string[]).includes(l.tier) ? ranks(l.tier) : l.tier} ${l.division}`}
                    {" · "}
                    {t("player.level", { level: level.format(l.level) })}
                    {" · "}
                    {l.lp} LP
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <section className="section section-alt" aria-labelledby="player-matches">
        <div className="container">
          <h2 id="player-matches" className="h2" data-reveal="lines">
            {t("player.matches")}
          </h2>
          {profile.matches.length === 0 ? (
            <p className="league__text">{t("player.noMatches")}</p>
          ) : (
            <ol className="league-page__results">
              {profile.matches.map((result, i) => (
                <ResultItem key={result.id} result={result} locale={locale} index={i} />
              ))}
            </ol>
          )}
          <p className="events__note">{t("player.private")}</p>
          <p className="pilates__more">
            <Link className="btn btn-secondary" href="/league">
              {t("player.back")}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
