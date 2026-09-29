import { getTranslations } from "next-intl/server";

/** The 19 sections of the home page (§9.2), delivered and approved one by one (Stage 11). */
export const SECTIONS = [
  "header",
  "hero",
  "tour",
  "live",
  "padel",
  "level",
  "league",
  "tennis",
  "pilates",
  "packages",
  "split",
  "events",
  "cafe",
  "community",
  "team",
  "numbers",
  "location",
  "faq",
  "footer",
] as const;

/** How many sections are built (delivered for approval or approved), in the order above. */
export const BUILT = 1;

/**
 * The home page of the full site while it is being built: a map of the sections, the built ones
 * marked, the others to come. Marked as a preview; visitors keep seeing the pre-launch page until
 * the owner turns on the full site (Q57). Each approved section replaces its line with itself.
 */
export async function FullHome() {
  const t = await getTranslations("web.site.home");
  return (
    <section className="page site-preview" aria-labelledby="preview-title">
      <div className="container">
        <p className="kicker">{t("kicker")}</p>
        <h1 id="preview-title" className="h2">
          {t("title")}
        </h1>
        <p className="lead">{t("lead", { built: BUILT, total: SECTIONS.length })}</p>
        <ol className="section-map">
          {SECTIONS.map((key, i) => (
            <li key={key} data-built={i < BUILT}>
              <span className="section-map__number" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="section-map__name">{t(`sections.${key}`)}</span>
              <span className="section-map__state">{i < BUILT ? t("built") : i === BUILT ? t("next") : t("later")}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
