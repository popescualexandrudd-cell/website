import type { SceneView } from "@/lib/content";
import { orderedListItems } from "@/lib/markdown";
import { TodoText } from "@/components/site/TodoText";
import { SectionHead } from "./SectionHead";

/** What sets the club apart, as four cards; each is a numbered item of the section's text. */
export function PillarsSection({ scene }: { scene: SceneView }) {
  const pillars = orderedListItems(scene.body);
  if (pillars.length === 0) return null;
  return (
    <section className="pillars" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="pillars-inner">
        <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title} />
        <ul className="pillar-grid">
          {pillars.map((pillar, i) => (
            <li key={i} className="pillar-card">
              <span className="pillar-number numerals" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="pillar-title">
                <TodoText value={pillar.title} />
              </h3>
              <p>
                <TodoText value={pillar.text} />
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
