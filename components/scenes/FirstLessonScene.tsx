import { Link } from "@/i18n/navigation";
import type { SceneView } from "@/lib/content";
import { TodoText } from "@/components/site/TodoText";
import { SceneFrame } from "./SceneFrame";
import { SceneTitle } from "./SceneTitle";
import { safeHref } from "./links";

/** Scene 7 · first lesson: the text about the first lesson comes from the settings. */
export function FirstLessonScene({
  scene,
  index,
  firstLessonText,
}: {
  scene: SceneView;
  index: number;
  firstLessonText: string;
}) {
  const href = safeHref(scene.ctaHref) ?? "/preturi";
  return (
    <SceneFrame scene={scene} index={index} length={2}>
      <SceneTitle id={`${scene.key}-title`} text={scene.title} />
      <p className="scene-lead">
        <TodoText value={firstLessonText} />
      </p>
      <p className="scene-lead mt-3">
        <TodoText value={scene.body} />
      </p>
      {scene.ctaLabel ? (
        <p className="mt-6">
          <Link href={href} className="link-quiet">
            {scene.ctaLabel}
          </Link>
        </p>
      ) : null}
    </SceneFrame>
  );
}
