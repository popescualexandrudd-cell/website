import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { tennisClubUrl } from "@/lib/links";

const CARDS = ["lessons", "packages", "reformer"] as const;

/**
 * Section 8 of the full site (§9.2): tennis. It is played at the owners' club, Clubul Tenis Elite,
 * whose site stays separate, with links both ways (Q20); its address comes from the panel (Q58).
 * Here: the club in facts from docs/01 (§2.3), tennis lessons (R-090), tennis in the combinable
 * subscriptions (R-080) and the Reformer classes for tennis and padel players (R-101). No prices
 * or court times here: those are the tennis club's.
 */
export async function Tennis({ id }: { id: string }) {
  const t = await getTranslations("web.site.tennis");
  const url = await tennisClubUrl();
  return (
    <section id={id} className="section section-alt tennis" aria-labelledby="tennis-title">
      <div className="container">
        <p className="kicker">{t("kicker")}</p>
        <h2 id="tennis-title" className="h2">
          {t("title")}
        </h2>
        <p className="lead">{t("lead")}</p>
        <ul className="tennis__facts" aria-label={t("factsLabel")}>
          {(["since", "courts", "winter", "programs"] as const).map((key) => (
            <li key={key}>
              <span className="tennis__fact">{t(`facts.${key}.value`)}</span>
              <span className="tennis__fact-label">{t(`facts.${key}.label`)}</span>
            </li>
          ))}
        </ul>
        <ul className="padel__cards">
          {CARDS.map((key) => (
            <li key={key} className="padel__card">
              <h3 className="padel__h3">{t(`cards.${key}.title`)}</h3>
              <p>{t(`cards.${key}.text`)}</p>
            </li>
          ))}
        </ul>
        <p className="tennis__booking">{t("booking")}</p>
        <div className="hero-ctas">
          {/* The owner has no address for the tennis club's site (Q58, 30.09.2026): no link and no
              promise of one; it appears on its own if an address is ever set in the panel. */}
          {url && (
            <a className="btn btn-primary" href={url} target="_blank" rel="noopener">
              {t("club")}
              <span className="sr-only"> {t("newWindow")}</span>
            </a>
          )}
          <Link className="btn btn-secondary" href="/packages">
            {t("packages")}
          </Link>
        </div>
      </div>
    </section>
  );
}
