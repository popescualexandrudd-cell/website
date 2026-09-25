import type { CSSProperties } from "react";
import type { SceneView } from "@/lib/content";
import { textAndList } from "@/lib/markdown";
import { TodoText } from "@/components/site/TodoText";
import { SectionHead } from "./SectionHead";
import { SceneLink } from "./SceneLink";

/**
 * The club's story: where it started and how it grew, as a line of milestones across the page
 * (down the page on a phone). The milestones are the numbered list of the section's text.
 */
export function StorySection({ scene }: { scene: SceneView }) {
  const { intro, items } = textAndList(scene.body);
  return (
    <section className="story" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="story-inner">
        <div className="story-head">
          <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title} />
          {intro ? (
            <p className="story-intro">
              <TodoText value={intro} />
            </p>
          ) : null}
          <SceneLink scene={scene} className="link-quiet" />
        </div>
        {items.length > 0 ? (
          <ol className="story-line">
            {items.map((item, i) => (
              <li key={i} className="story-step" style={{ "--i": i } as CSSProperties}>
                <span className="story-dot" aria-hidden="true" />
                <h3 className="story-step-title">
                  <TodoText value={item.title} />
                </h3>
                <p>
                  <TodoText value={item.text} />
                </p>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}
