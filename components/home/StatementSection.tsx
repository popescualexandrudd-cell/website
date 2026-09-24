import type { SceneView } from "@/lib/content";
import { TodoText } from "@/components/site/TodoText";
import { CourtMark } from "@/components/ui/CourtMark";

/** A single statement in large type on clay: the coaching philosophy in two sentences. */
export function StatementSection({ scene }: { scene: SceneView }) {
  return (
    <section className="statement tone-clay" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <CourtMark variant="plan" className="statement-court" />
      <div className="statement-inner">
        <p className="kicker">
          <TodoText value={scene.indexName} />
        </p>
        <h2 id={`${scene.key}-title`} className="statement-title">
          <TodoText value={scene.title} />
        </h2>
        {scene.body ? (
          <p className="statement-body">
            <TodoText value={scene.body} />
          </p>
        ) : null}
      </div>
    </section>
  );
}
