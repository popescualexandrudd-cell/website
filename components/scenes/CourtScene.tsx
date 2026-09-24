import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { FacilityView, LocationView, SceneView } from "@/lib/content";
import { TodoText } from "@/components/site/TodoText";
import { TODO_MARK } from "@/lib/i18n-content";
import { SceneFrame } from "./SceneFrame";
import { SceneTitle } from "./SceneTitle";
import { safeHref } from "./links";

/** Scene 6 · the court: surfaces, number of courts, floodlights, winter cover, amenities. */
export async function CourtScene({
  scene,
  index,
  location,
  amenities,
}: {
  scene: SceneView;
  index: number;
  location: LocationView | null;
  amenities: FacilityView[];
}) {
  const t = await getTranslations();
  const href = safeHref(scene.ctaHref) ?? "/facilitati";
  const flag = (value: boolean | null, yes: string, no: string) =>
    value === null ? TODO_MARK : value ? yes : no;
  return (
    <SceneFrame scene={scene} index={index} length={2.6}>
      <SceneTitle id={`${scene.key}-title`} text={scene.title} />
      {location ? (
        <p className="scene-lead">
          <TodoText value={location.name} />
          {location.city && location.city !== TODO_MARK ? `, ${location.city}` : null}
        </p>
      ) : null}
      {location && location.courts.length > 0 ? (
        <dl className="court-list">
          {location.courts.map((court) => (
            <div key={court.id} className="court-row">
              <dt className="court-name">{court.name}</dt>
              <dd className="court-facts numerals">
                {court.count === null ? (
                  <TodoText value={TODO_MARK} />
                ) : (
                  t("home.courtCount", { count: court.count })
                )}
                {" · "}
                <TodoText
                  value={flag(court.floodlights, t("home.floodlights"), t("home.noFloodlights"))}
                />
                {" · "}
                <TodoText
                  value={flag(court.coveredInWinter, t("home.covered"), t("home.notCovered"))}
                />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {amenities.length > 0 ? (
        <p className="court-amenities">
          <span className="sr-only">{t("home.amenities")}: </span>
          {amenities.map((a, i) => (
            <span key={a.id}>
              {i > 0 ? " · " : ""}
              <TodoText value={a.name} />
            </span>
          ))}
        </p>
      ) : null}
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
