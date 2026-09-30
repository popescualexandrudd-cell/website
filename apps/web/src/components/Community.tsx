import { getTranslations } from "next-intl/server";
import { hallOfFame } from "@/lib/fame";

const BADGES = ["giantKiller", "streak", "earlyBird", "weeks", "surprise", "firstDiamond", "king"] as const;
const TIERS = ["bronze", "silver", "gold", "platinum", "diamond", "master", "king"] as const;

/**
 * Section 14 of the full site (§9.2): the community. The league's badges (§6.15; each player's
 * own stay private, R-012), the Hall of Fame of the closed seasons (LG-134: name, rank and place
 * only) and "Bring a friend" (R-120). Rendered on the server, with the effects' attributes.
 */
export async function Community({ id }: { id: string }) {
  const t = await getTranslations("web.site.community");
  const ranks = await getTranslations("web.site.league.ranks");
  const fame = await hallOfFame();
  return (
    <section id={id} className="section community" aria-labelledby="community-title">
      <div className="container">
        <p className="kicker" data-reveal="fade">
          {t("kicker")}
        </p>
        <h2 id="community-title" className="h2" data-reveal="lines">
          {t("title")}
        </h2>
        <p className="lead" data-reveal="rise">
          {t("lead")}
        </p>

        <h3 className="pilates__h3" data-reveal="lines">
          {t("badgesTitle")}
        </h3>
        <ul className="community__badges">
          {BADGES.map((key, i) => (
            <li key={key} className="community__badge" data-reveal="pop" data-tilt="" style={{ "--i": i } as React.CSSProperties}>
              <strong>{t(`badges.${key}.title`)}</strong>
              <span>{t(`badges.${key}.text`)}</span>
            </li>
          ))}
        </ul>
        <p className="events__note">{t("badgesNote")}</p>

        <div className="community__fame" role="region" aria-labelledby="fame-title">
          <h3 id="fame-title" className="pilates__h3" data-reveal="lines">
            {t("fame.title")}
          </h3>
          <p className="pilates__text">{t("fame.lead")}</p>
          {fame === null ? (
            <p className="pilates__text">{t("fame.error")}</p>
          ) : fame.length === 0 ? (
            <p className="pilates__text community__empty">{t("fame.empty")}</p>
          ) : (
            <ol className="community__seasons">
              {fame.map((season) => (
                <li key={season.number} data-reveal="rise">
                  <h4>{season.name}</h4>
                  <ol className="community__winners">
                    {season.entries.map((entry, i) => (
                      <li
                        key={`${entry.kind}-${entry.tier}-${entry.position}-${i}`}
                        data-reveal="pop"
                        style={{ "--i": i } as React.CSSProperties}
                      >
                        <span className="community__place">{t("fame.place", { position: entry.position })}</span>
                        <span className="community__name">
                          {entry.first_name} {entry.last_name}
                        </span>
                        {(TIERS as readonly string[]).includes(entry.tier) && <span className="events__flag">{ranks(entry.tier)}</span>}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="community__friend" data-reveal="tilt">
          <h3 className="pilates__h3">{t("friend.title")}</h3>
          <p className="pilates__text">{t("friend.text")}</p>
          <p className="events__note">{t("friend.note")}</p>
        </div>
      </div>
    </section>
  );
}
