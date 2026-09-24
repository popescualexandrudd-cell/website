import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { SceneView } from "@/lib/content";
import { TodoText } from "@/components/site/TodoText";
import { SceneFrame } from "./SceneFrame";
import { SceneTitle } from "./SceneTitle";

/** Scene 8 · places: the count is computed live from the availability. */
export async function PlacesScene({
  scene,
  index,
  month,
  count,
}: {
  scene: SceneView;
  index: number;
  month: string;
  count: number;
}) {
  const t = await getTranslations("home");
  const label = (scene.extra.available || t("placesLabel", { month: "{luna}", count: "{n}" }))
    .replace("{luna}", month)
    .replace("{month}", month)
    .replace("{n}", String(count))
    .replace("{count}", String(count));
  return (
    <SceneFrame scene={scene} index={index} length={2}>
      <SceneTitle id={`${scene.key}-title`} text={scene.title} />
      <p className="scene-lead">
        <TodoText value={scene.body} />
      </p>
      {count > 0 ? (
        <p className="places-count numerals">{label}</p>
      ) : (
        <>
          <p className="places-count">{scene.extra.full || t("placesFull")}</p>
          <p className="mt-4">
            <Link href="/lista-asteptare" className="link-quiet">
              {scene.extra.waitlistLabel || t("waitlist")}
            </Link>
          </p>
        </>
      )}
    </SceneFrame>
  );
}
