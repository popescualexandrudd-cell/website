import { Link } from "@/i18n/navigation";
import type { AcademyGroupView, SceneView } from "@/lib/content";
import { TodoText } from "@/components/site/TodoText";
import { StagePath } from "@/components/academy/StagePath";
import { SectionHead } from "./SectionHead";
import { safeHref } from "./links";

/**
 * The development path in one glance: mini tennis with the red, orange and green ball, then
 * juniors and seniors with the yellow one. The stages sit symmetrically in one row, each ball
 * joined to the next by a line that fades at both ends; then the way in.
 */
export function AcademySection({
  scene,
  groups,
}: {
  scene: SceneView;
  groups: AcademyGroupView[];
}) {
  const href = safeHref(scene.ctaHref) ?? { pathname: "/programe" as const, hash: "inscriere" };
  return (
    <section className="academy" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="academy-inner">
        <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title}>
          {scene.body ? (
            <p className="section-lead">
              <TodoText value={scene.body} />
            </p>
          ) : null}
        </SectionHead>
        <StagePath groups={groups} />
        <div className="academy-actions">
          {scene.ctaLabel ? (
            <Link href={href} className="btn btn-primary btn-arrow">
              {scene.ctaLabel}
            </Link>
          ) : null}
          {scene.extra.moreLabel ? (
            <Link href={{ pathname: "/programe", hash: "grupe" }} className="link-quiet">
              <TodoText value={scene.extra.moreLabel} />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
