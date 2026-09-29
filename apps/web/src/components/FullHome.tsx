import { getTranslations } from "next-intl/server";
import { FullHero } from "./FullHero";
import { League } from "./League";
import { Level } from "./Level";
import { NowInClub } from "./NowInClub";
import { Padel } from "./Padel";
import { Tour } from "./Tour";

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
export const BUILT = 7;

/**
 * The home page of the full site while it is being built: the sections built so far (the header
 * is in the layout), then a map of all of them, the built ones marked, the others to come. Marked
 * as a preview; visitors keep seeing the pre-launch page until the owner publishes the full site
 * (Q57). Each new section takes its place above the map.
 */
export function FullHome() {
  return (
    <>
      <FullHero next="tur" />
      <Tour id="tur" />
      <NowInClub id="acum" />
      <Padel id="padel" />
      <Level id="nivel" />
      <League id="liga" />
      <SectionMap />
    </>
  );
}

/** The map of the 19 sections, the built ones marked (a preview for the owner). */
async function SectionMap() {
  const t = await getTranslations("web.site.home");
  return (
    <section id="sectiuni" className="section site-preview" aria-labelledby="preview-title">
      <div className="container">
        <p className="kicker">{t("kicker")}</p>
        <h2 id="preview-title" className="h2">
          {t("title")}
        </h2>
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
