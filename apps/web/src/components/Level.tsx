import { getTranslations } from "next-intl/server";
import { LevelSimulator } from "./LevelSimulator";

/**
 * Section 6 of the full site (§9.2): the simulator "Care e nivelul tău?". A few questions give an
 * estimated level (1.0–7.0) and where to start: a lesson, open matches or the league. The estimate
 * is the official questionnaire's (R-003, Q47), validated later by a coach; nothing is stored.
 */
export async function Level({ id }: { id: string }) {
  const t = await getTranslations("web.site.level");
  return (
    <section id={id} className="section section-dark level" aria-labelledby="level-title">
      <div className="container">
        <p className="kicker" data-reveal="fade">{t("kicker")}</p>
        <h2 id="level-title" className="h2" data-reveal="lines">
          {t("title")}
        </h2>
        <p className="lead" data-reveal="rise">{t("lead")}</p>
        <LevelSimulator />
        <noscript>
          <p className="muted">{t("noscript")}</p>
        </noscript>
      </div>
    </section>
  );
}
