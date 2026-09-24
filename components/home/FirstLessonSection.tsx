import { Link } from "@/i18n/navigation";
import type { SceneView } from "@/lib/content";
import { TodoText } from "@/components/site/TodoText";
import { safeHref } from "./links";
import { Words } from "@/components/site/Words";

/** The first lesson is an assessment: the offer itself comes from the settings. */
export function FirstLessonSection({
  scene,
  firstLessonText,
}: {
  scene: SceneView;
  firstLessonText: string;
}) {
  const href = safeHref(scene.ctaHref) ?? "/preturi";
  return (
    <section className="band tone-clay" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="band-inner">
        <div>
          <p className="kicker">
            <TodoText value={scene.indexName} />
          </p>
          <h2 id={`${scene.key}-title`} className="band-title">
            <Words text={scene.title} />
          </h2>
        </div>
        <div className="band-copy">
          {firstLessonText ? (
            <p className="band-offer">
              <TodoText value={firstLessonText} />
            </p>
          ) : null}
          {scene.body ? (
            <p>
              <TodoText value={scene.body} />
            </p>
          ) : null}
          {scene.ctaLabel ? (
            <p className="mt-6">
              <Link href={href} className="btn btn-light btn-arrow">
                {scene.ctaLabel}
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
