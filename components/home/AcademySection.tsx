import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AcademyGroupView, SceneView } from "@/lib/content";
import { TodoText } from "@/components/site/TodoText";
import { groupAges } from "@/components/academy/format";
import { SectionHead } from "./SectionHead";
import { safeHref } from "./links";

/**
 * The junior academy in one glance: the stages from the red ball to the yellow one, each with
 * its ages, joined by a line that fills as the page scrolls; then the way in, an assessment.
 */
export async function AcademySection({
  scene,
  groups,
}: {
  scene: SceneView;
  groups: AcademyGroupView[];
}) {
  const t = await getTranslations();
  const href = safeHref(scene.ctaHref) ?? { pathname: "/academie" as const, hash: "evaluare" };
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
        {groups.length > 0 ? (
          <ol className="stages" aria-label={t("home.stagesLabel")} data-progress-line>
            {groups.map((group) => (
              <li key={group.id} className="stage" data-stage={group.stage ?? undefined}>
                <span className="stage-ball" aria-hidden="true" />
                <span className="stage-ages numerals">{groupAges(group, t)}</span>
                <h3 className="stage-name">{group.name}</h3>
                <p className="stage-summary">
                  <TodoText value={group.summary} />
                </p>
              </li>
            ))}
          </ol>
        ) : null}
        <div className="academy-actions">
          {scene.ctaLabel ? (
            <Link href={href} className="btn btn-primary btn-arrow">
              {scene.ctaLabel}
            </Link>
          ) : null}
          {scene.extra.moreLabel ? (
            <Link href="/academie" className="link-quiet">
              <TodoText value={scene.extra.moreLabel} />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
