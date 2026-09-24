import type { SceneView } from "@/lib/content";
import { orderedListItems } from "@/lib/markdown";
import { Markdown } from "@/components/site/Markdown";
import { SceneFrame } from "./SceneFrame";
import { SceneTitle } from "./SceneTitle";

/** Scene 4 · method: a real sequence, so the steps are numbered; they appear one by one on scroll. */
export function MethodScene({ scene, index }: { scene: SceneView; index: number }) {
  const steps = orderedListItems(scene.body);
  return (
    <SceneFrame scene={scene} index={index} length={2.8}>
      <SceneTitle id={`${scene.key}-title`} text={scene.title} />
      {steps.length > 0 ? (
        <ol className="method-steps">
          {steps.map((step, i) => (
            <li key={i} className="method-step" data-step={i}>
              <span className="method-number" aria-hidden="true">
                {i + 1}
              </span>
              <p>
                {step.title ? <strong className="method-step-title">{step.title}.</strong> : null} {step.text}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <Markdown source={scene.body} className="scene-lead prose-ed" />
      )}
    </SceneFrame>
  );
}
