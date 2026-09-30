import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { siteFlags } from "@/lib/flags";
import { heroVideo } from "@/lib/hero-video";
import { HeroVideo } from "./HeroVideo";
import { HeroVisual } from "./HeroVisual";
import { IconArrowDown } from "./Icons";

/**
 * Section 2 of the full site (§9.2): the cinematic hero "Intră în junglă". The hall seen from the
 * lounge walkway, 3 m above the courts: the render made from the owner's sketch (Stage 1B; the
 * static image first, the live 3D scene over it on capable devices), marked as illustrative (Q44:
 * no invented renders of spaces not designed yet). Two actions (book a court, see the league live)
 * and a cue down to the next section (`next`, the id of its element).
 */
export async function FullHero({ next }: { next: string }) {
  const t = await getTranslations("web.site.hero");
  // The presentation video (ADR-0023): only with `web_hero_video` on and its files in place.
  const video = (await siteFlags()).heroVideo ? heroVideo() : null;
  return (
    <section className="hero hero--full" aria-labelledby="hero-title">
      <HeroVisual alt={t("renderAlt")} waitForVideo={video !== null} />
      {video && (
        <HeroVideo manifest={video} labels={{ play: t("video.play"), pause: t("video.pause"), illustrative: t("video.illustrative") }} />
      )}
      <div className="container">
        <div className="hero-content hero-rise">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 id="hero-title" className="h1">
            {t("title")}
          </h1>
          <p className="lead">{t("lead")}</p>
          <div className="hero-ctas">
            <Link className="btn btn-primary" href="/bookings">
              {t("book")}
            </Link>
            <Link className="btn btn-secondary" href="/league">
              {t("league")}
            </Link>
          </div>
          <p className="render-note">{t("renderNote")}</p>
        </div>
      </div>
      <a className="scroll-cue" href={`#${next}`}>
        <span>{t("scroll")}</span>
        <IconArrowDown />
      </a>
    </section>
  );
}
