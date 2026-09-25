import type { CoachView, SceneView } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import { TodoText } from "@/components/site/TodoText";
import { CoachCard } from "@/components/academy/CoachCard";
import { SectionHead } from "./SectionHead";
import { safeHref } from "./links";

/** The coaching team: every coach as a portrait card, the head coach first. */
export function TeamSection({ scene, coaches }: { scene: SceneView; coaches: CoachView[] }) {
  if (coaches.length === 0) return null;
  const href = safeHref(scene.ctaHref) ?? "/echipa";
  return (
    <section className="team" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="team-inner">
        <div className="team-head">
          <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title}>
            {scene.body ? (
              <p className="section-lead">
                <TodoText value={scene.body} />
              </p>
            ) : null}
          </SectionHead>
          {scene.ctaLabel ? (
            <Link href={href} className="link-quiet">
              {scene.ctaLabel}
            </Link>
          ) : null}
        </div>
        <div className="team-grid" data-count={Math.min(coaches.length, 4)}>
          {coaches.map((coach) => (
            <CoachCard key={coach.id} coach={coach} />
          ))}
        </div>
      </div>
    </section>
  );
}
