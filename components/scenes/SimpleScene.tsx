import { Link } from "@/i18n/navigation";
import type { SceneView } from "@/lib/content";
import { Markdown } from "@/components/site/Markdown";
import { SceneFrame } from "./SceneFrame";
import { SceneTitle } from "./SceneTitle";
import { safeHref } from "./links";

/** Scene 2 (together) and any scene the coach adds later: title, text, optional link. */
export function SimpleScene({
  scene,
  index,
  length = 1.8,
}: {
  scene: SceneView;
  index: number;
  length?: number;
}) {
  const href = safeHref(scene.ctaHref);
  return (
    <SceneFrame scene={scene} index={index} length={length}>
      <SceneTitle id={`${scene.key}-title`} text={scene.title} />
      {scene.body ? <Markdown source={scene.body} className="scene-lead prose-ed" /> : null}
      {scene.ctaLabel && href ? (
        <p className="mt-6">
          <Link href={href} className="link-quiet">
            {scene.ctaLabel}
          </Link>
        </p>
      ) : null}
    </SceneFrame>
  );
}
