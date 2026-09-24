import { Link } from "@/i18n/navigation";
import type { SceneView } from "@/lib/content";
import { TodoText } from "@/components/site/TodoText";
import { SceneFrame } from "./SceneFrame";
import { SceneTitle } from "./SceneTitle";

/** Scene 1 · the opening: the page's only h1. */
export function OpeningScene({ scene, index }: { scene: SceneView; index: number }) {
  return (
    <SceneFrame scene={scene} index={index} length={2} priority>
      <SceneTitle id={`${scene.key}-title`} as="h1" text={scene.title} className="scene-title--hero" />
      <p className="scene-lead">
        <TodoText value={scene.body} />
      </p>
      {scene.ctaLabel ? (
        <p className="mt-8">
          <Link href="/rezervare" className="btn btn-primary">
            {scene.ctaLabel}
          </Link>
        </p>
      ) : null}
    </SceneFrame>
  );
}
