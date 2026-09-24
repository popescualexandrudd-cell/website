import type { ProgramView, SceneView } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import { SectionHead } from "./SectionHead";
import { ProgramCard } from "./ProgramCard";
import { safeHref } from "./links";

export function ProgramsSection({
  scene,
  programs,
}: {
  scene: SceneView;
  programs: ProgramView[];
}) {
  const href = safeHref(scene.ctaHref) ?? "/programe";
  return (
    <section className="programs tone-sand" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="programs-inner">
        <div className="programs-head">
          <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title} />
          {scene.ctaLabel ? (
            <Link href={href} className="link-quiet">
              {scene.ctaLabel}
            </Link>
          ) : null}
        </div>
        <ul className="program-grid">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </ul>
      </div>
    </section>
  );
}
