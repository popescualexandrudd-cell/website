import type { SceneView } from "@/lib/content";
import { TodoText } from "@/components/site/TodoText";
import { SceneFrame } from "./SceneFrame";
import { SceneTitle } from "./SceneTitle";

/**
 * Scene 3 · philosophy. The ball is composed from halftone dots on scroll (WebGL, with a CSS
 * fallback). In the stacked and static layouts a CSS halftone ball sits over the painting.
 */
export function PhilosophyScene({ scene, index }: { scene: SceneView; index: number }) {
  const ballStyle = {
    ["--bx" as string]: `${scene.ball.x * 100}%`,
    ["--by" as string]: `${scene.ball.y * 100}%`,
    ["--bs" as string]: `${scene.ball.size * 100}%`,
  };
  return (
    <SceneFrame
      scene={scene}
      index={index}
      length={2.4}
      staticExtra={<span className="halftone-static" style={ballStyle} aria-hidden="true" />}
    >
      <SceneTitle id={`${scene.key}-title`} text={scene.title} />
      <p className="scene-lead" data-split="words">
        <TodoText value={scene.body} />
      </p>
    </SceneFrame>
  );
}
