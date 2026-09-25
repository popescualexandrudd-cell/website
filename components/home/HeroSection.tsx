import { Fragment, type CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { LocalizedSettings, SceneView } from "@/lib/content";
import { TODO_MARK } from "@/lib/i18n-content";
import { Picture } from "@/components/ui/Picture";
import { AmbientVideo } from "@/components/ui/AmbientVideo";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { TodoText } from "@/components/site/TodoText";
import { safeHref } from "./links";

/** "Învață. Joacă. Concurează." → one line per sentence. */
function lines(title: string): string[] {
  if (title.includes(TODO_MARK)) return [title];
  return title.split(/(?<=[.!?])\s+/).filter(Boolean);
}

/**
 * The opening: the club's own video (or photograph) across the whole screen, the title line by
 * line over it. While the page scrolls, the picture draws back into a frame and the words lift
 * away (ScrollEffects sets --hero-p), before the next section rises over it.
 */
export async function HeroSection({
  scene,
  settings,
}: {
  scene: SceneView;
  settings: LocalizedSettings;
}) {
  const t = await getTranslations("home");
  const href = safeHref(scene.ctaHref) ?? "/rezervare";
  const video = settings.heroVideo;
  const image = settings.heroImage;
  return (
    <section
      className="hero"
      id={scene.key}
      data-scene
      data-hero
      aria-labelledby={`${scene.key}-title`}
    >
      <div className="hero-sticky">
        <div className="hero-media">
          {video ? (
            <AmbientVideo
              video={video}
              label={settings.heroImageAlt || scene.title}
              pauseLabel={t("videoPause")}
              playLabel={t("videoPlay")}
              className="hero-video"
              priority
            />
          ) : image ? (
            <Picture
              image={image}
              alt={settings.heroImageAlt}
              priority
              sizes="100vw"
              className="hero-picture"
              imgClassName="hero-img"
            />
          ) : (
            <MediaFrame note={scene.extra.mediaNote ?? ""} className="hero-frame" />
          )}
          <div className="hero-shade" aria-hidden="true" />
        </div>
        <div className="hero-content">
          {/* The label is part of the heading: "Club de tenis · Pantelimon" is what people
              search for, the slogan is what they remember. */}
          <h1 id={`${scene.key}-title`} className="hero-heading">
            <span className="hero-kicker">
              <TodoText value={scene.indexName} />
            </span>
            <span className="sr-only">: </span>
            <span className="hero-title">
              {lines(scene.title).map((line, i) => (
                <Fragment key={i}>
                  {/* Lines are blocks on screen; the space keeps the words apart when read. */}
                  {i > 0 ? " " : null}
                  <span className="hero-line">
                    <span style={{ "--i": i } as CSSProperties}>
                      <TodoText value={line} />
                    </span>
                  </span>
                </Fragment>
              ))}
            </span>
          </h1>
          {scene.body ? (
            <p className="hero-body">
              <TodoText value={scene.body} />
            </p>
          ) : null}
          <div className="hero-actions">
            {scene.ctaLabel ? (
              <Link href={href} className="btn btn-primary btn-arrow">
                {scene.ctaLabel}
              </Link>
            ) : null}
            {scene.extra.secondaryLabel ? (
              <Link href="/inchiriere-teren" className="btn btn-secondary">
                <TodoText value={scene.extra.secondaryLabel} />
              </Link>
            ) : null}
          </div>
        </div>
        <span className="hero-cue" aria-hidden="true">
          {t("scrollCue")}
        </span>
      </div>
    </section>
  );
}
