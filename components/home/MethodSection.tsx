import type { SceneView } from "@/lib/content";
import { orderedListItems } from "@/lib/markdown";
import { Markdown } from "@/components/site/Markdown";
import { TodoText } from "@/components/site/TodoText";
import { SectionHead } from "./SectionHead";

/** The method as numbered steps: assessment, plan, training, check-ins. */
export function MethodSection({ scene }: { scene: SceneView }) {
  const steps = orderedListItems(scene.body);
  return (
    <section className="method" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="method-inner">
        <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title} />
        {steps.length > 0 ? (
          <ol className="method-steps">
            {steps.map((step, i) => (
              <li key={i} className="method-step">
                <span className="method-number numerals" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {step.title ? <h3 className="method-step-title">{step.title}</h3> : null}
                <p>
                  <TodoText value={step.text} />
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <Markdown source={scene.body} className="prose-ed" />
        )}
      </div>
    </section>
  );
}
