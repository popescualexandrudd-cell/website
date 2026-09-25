import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { GalleryView, SceneView } from "@/lib/content";
import { Picture } from "@/components/ui/Picture";
import { AmbientVideo } from "@/components/ui/AmbientVideo";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { TodoText } from "@/components/site/TodoText";
import { SectionHead } from "./SectionHead";
import { safeHref } from "./links";

/**
 * A mosaic of the latest photos and videos from the gallery; videos play silently while they
 * are on screen. Until something is published, the frame says what belongs here.
 */
export async function GallerySection({ scene, items }: { scene: SceneView; items: GalleryView[] }) {
  const t = await getTranslations("home");
  const href = safeHref(scene.ctaHref) ?? "/galerie";
  return (
    <section className="mosaic" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="mosaic-inner">
        <div className="mosaic-head">
          <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title}>
            {scene.body ? (
              <p className="section-lead">
                <TodoText value={scene.body} />
              </p>
            ) : null}
          </SectionHead>
          {scene.ctaLabel && items.length > 0 ? (
            <Link href={href} className="link-quiet">
              {scene.ctaLabel}
            </Link>
          ) : null}
        </div>
        {items.length === 0 ? (
          <MediaFrame note={scene.extra.emptyNote ?? ""} className="mosaic-empty" />
        ) : (
          <ul className="mosaic-grid" data-count={items.length}>
            {items.map((item) => (
              <li key={item.id} className="mosaic-item" data-kind={item.kind}>
                {item.video ? (
                  <AmbientVideo
                    video={item.video}
                    label={item.alt}
                    pauseLabel={t("videoPause")}
                    playLabel={t("videoPlay")}
                    className="mosaic-video"
                  />
                ) : (
                  <Picture
                    image={item.image}
                    alt={item.alt}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    imgClassName="mosaic-img"
                  />
                )}
                {item.caption ? <p className="mosaic-caption">{item.caption}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
