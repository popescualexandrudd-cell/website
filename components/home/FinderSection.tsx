import type { SceneView } from "@/lib/content";
import type { FinderGroup, FinderProgram } from "@/lib/finder";
import { TodoText } from "@/components/site/TodoText";
import { SectionHead } from "./SectionHead";
import { ProgramFinder } from "./ProgramFinder";

export function FinderSection({
  scene,
  programs,
  groups,
  assistant,
}: {
  scene: SceneView;
  programs: FinderProgram[];
  groups: FinderGroup[];
  assistant: boolean;
}) {
  return (
    <section className="finder-section" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="finder-section-inner">
        <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title}>
          {scene.body ? (
            <p className="section-lead">
              <TodoText value={scene.body} />
            </p>
          ) : null}
        </SectionHead>
        <ProgramFinder programs={programs} groups={groups} assistant={assistant} />
      </div>
    </section>
  );
}
