import { Link } from "@/i18n/navigation";
import type { SceneView } from "@/lib/content";
import { Markdown } from "@/components/site/Markdown";
import { SectionHead } from "./SectionHead";
import { safeHref } from "./links";

/** Any section without a dedicated layout (for example one added from the admin later). */
export function TextSection({ scene }: { scene: SceneView }) {
  const href = safeHref(scene.ctaHref);
  return (
    <section
      className="text-section tone-sand"
      id={scene.key}
      aria-labelledby={`${scene.key}-title`}
    >
      <div className="text-section-inner">
        <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title} />
        {scene.body ? <Markdown source={scene.body} className="prose-ed mt-6" /> : null}
        {scene.ctaLabel && href ? (
          <p className="mt-8">
            <Link href={href} className="btn btn-primary btn-arrow">
              {scene.ctaLabel}
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
