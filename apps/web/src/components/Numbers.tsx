import { getTranslations } from "next-intl/server";

const ITEMS = ["courts", "lounge", "reformers", "room", "parking", "season"] as const;

/**
 * Section 16 of the full site (§9.2): the club in numbers. Only real figures from the docs (§2.2,
 * the owner's plan, R-100, §6.13); the numbers count up as they appear (`data-count`, ADR-0023).
 * The game's own numbers (matches, players) come after the opening, from real data only.
 */
export async function Numbers({ id }: { id: string }) {
  const t = await getTranslations("web.site.numbers");
  return (
    <section id={id} className="section numbers" aria-labelledby="numbers-title">
      <div className="container">
        <p className="kicker" data-reveal="fade">
          {t("kicker")}
        </p>
        <h2 id="numbers-title" className="h2" data-reveal="lines">
          {t("title")}
        </h2>
        <p className="lead" data-reveal="rise">
          {t("lead")}
        </p>
        <ul className="tennis__facts numbers__list">
          {ITEMS.map((key, i) => (
            <li key={key} data-reveal="rise" style={{ "--i": i } as React.CSSProperties}>
              <span className="tennis__fact" data-count="">
                {t(`items.${key}.value`)}
              </span>
              <span className="tennis__fact-label">{t(`items.${key}.label`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
