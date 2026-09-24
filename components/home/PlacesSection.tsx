import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { SceneView } from "@/lib/content";
import { TodoText } from "@/components/site/TodoText";

/** Places left this month, computed live from the availability. */
export async function PlacesSection({
  scene,
  month,
  count,
}: {
  scene: SceneView;
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
    <section className="places tone-sand" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="places-inner">
        <div>
          <p className="kicker">
            <TodoText value={scene.indexName} />
          </p>
          <h2 id={`${scene.key}-title`} className="band-title">
            <TodoText value={scene.title} />
          </h2>
          {scene.body ? (
            <p className="mt-4 max-w-xl text-cerneala-2">
              <TodoText value={scene.body} />
            </p>
          ) : null}
        </div>
        <div className="places-count">
          {count > 0 ? (
            <p className="places-number numerals">{label}</p>
          ) : (
            <>
              <p className="places-number">{scene.extra.full || t("placesFull")}</p>
              <p className="mt-4">
                <Link href="/lista-asteptare" className="link-quiet">
                  {scene.extra.waitlistLabel || t("waitlist")}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
