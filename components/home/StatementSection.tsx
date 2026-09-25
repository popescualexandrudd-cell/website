import type { SceneView } from "@/lib/content";
import { TodoText } from "@/components/site/TodoText";
import { CourtMark } from "@/components/ui/CourtMark";
import { Words } from "@/components/site/Words";

/**
 * A single statement in very large type on the club's dark colour: the philosophy in two
 * sentences, its words lighting up as it rises through the screen.
 */
export function StatementSection({ scene }: { scene: SceneView }) {
  return (
    <section className="statement tone-dark" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <CourtMark variant="plan" className="statement-court" />
      <div className="statement-inner">
        <p className="kicker">
          <TodoText value={scene.indexName} />
        </p>
        <h2 id={`${scene.key}-title`} className="statement-title">
          <Words text={scene.title} />
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
