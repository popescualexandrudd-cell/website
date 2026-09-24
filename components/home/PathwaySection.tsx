import { getTranslations } from "next-intl/server";
import type { SceneView } from "@/lib/content";
import { orderedListItems } from "@/lib/markdown";
import { Markdown } from "@/components/site/Markdown";
import { TodoText } from "@/components/site/TodoText";
import { SectionHead } from "./SectionHead";

/** The stages of development as a path: numbered steps along a baseline. */
export async function PathwaySection({ scene }: { scene: SceneView }) {
  const t = await getTranslations("home");
  const steps = orderedListItems(scene.body);
  return (
    <section className="pathway tone-dark" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="pathway-inner">
        <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title} />
        {steps.length > 0 ? (
          <ol className="pathway-steps" aria-label={t("pathwayLabel")}>
            {steps.map((step, i) => (
              <li key={i} className="pathway-step">
                <span className="pathway-marker" aria-hidden="true">
                  {i + 1}
                </span>
                {step.title ? <h3 className="pathway-title">{step.title}</h3> : null}
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
