import { getTranslations } from "next-intl/server";
import type { SceneView } from "@/lib/content";
import { orderedListItems } from "@/lib/markdown";
import { Markdown } from "@/components/site/Markdown";
import { TodoText } from "@/components/site/TodoText";
import { TechniqueLab, type LabStroke } from "@/components/court3d/TechniqueLab";
import type { StrokeName } from "@/components/court3d/engine/strokes";
import { SectionHead } from "./SectionHead";

const STROKE_KEYS: StrokeName[] = ["forehand", "backhand", "serve"];

/** The method as numbered steps, then the 3D technique lab. */
export async function MethodSection({ scene }: { scene: SceneView }) {
  const t = await getTranslations("lab");
  const steps = orderedListItems(scene.body);
  const strokes: LabStroke[] = STROKE_KEYS.map((key) => ({
    key,
    name: t(`strokes.${key}.name`),
    full: t(`strokes.${key}.full`),
    phases: t.raw(`strokes.${key}.phases`) as { title: string; text: string }[],
  }));
  const views = {
    lateral: t("views.lateral"),
    frontal: t("views.frontal"),
    spate: t("views.spate"),
    sus: t("views.sus"),
  };
  return (
    <section
      className="method tone-sand-deep"
      id={scene.key}
      aria-labelledby={`${scene.key}-title`}
    >
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

        <div className="lab-intro">
          <h3 className="lab-title">
            <TodoText value={scene.extra.labTitle ?? ""} />
          </h3>
          {scene.extra.labIntro ? (
            <p className="lab-lead">
              <TodoText value={scene.extra.labIntro} />
            </p>
          ) : null}
        </div>
        <TechniqueLab
          strokes={strokes}
          labels={{
            strokeLabel: t("strokeLabel"),
            play: t("play"),
            pause: t("pause"),
            scrub: t("scrub"),
            viewLabel: t("viewLabel"),
            views,
            phaseCount: t.raw("phaseCount") as string,
            phasesLabel: t("phasesLabel"),
            loading: t("loading"),
            fallback: t("fallback"),
            drag: t("drag"),
            modelNote: t("modelNote"),
            sceneLabel: scene.extra.labTitle ?? t("phasesLabel"),
          }}
        />
      </div>
    </section>
  );
}
