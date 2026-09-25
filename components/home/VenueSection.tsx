import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { FacilityView, LocationView, SceneView } from "@/lib/content";
import { TodoText } from "@/components/site/TodoText";
import { TODO_MARK } from "@/lib/i18n-content";
import type { ResolvedImage } from "@/lib/media-shared";
import { Picture } from "@/components/ui/Picture";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { SectionHead } from "./SectionHead";
import { safeHref } from "./links";

/**
 * The club: a photograph of the courts beside the facts (surfaces, number of courts,
 * floodlights, winter cover, amenities).
 */
export async function VenueSection({
  scene,
  location,
  amenities,
  image,
  imageAlt,
}: {
  scene: SceneView;
  location: LocationView | null;
  amenities: FacilityView[];
  image: ResolvedImage | null;
  imageAlt: string;
}) {
  const t = await getTranslations();
  const href = safeHref(scene.ctaHref) ?? "/facilitati";
  const flag = (value: boolean | null, yes: string, no: string) =>
    value === null ? TODO_MARK : value ? yes : no;
  return (
    <section className="venue" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="venue-inner">
        <div className="venue-copy">
          <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title} />
          {location ? (
            <p className="venue-club">
              <TodoText value={location.name} />
              {location.city && location.city !== TODO_MARK ? (
                <span className="venue-city">, {location.city}</span>
              ) : null}
            </p>
          ) : null}
          {scene.body ? (
            <p className="mt-4 max-w-xl">
              <TodoText value={scene.body} />
            </p>
          ) : null}
          {location && location.courts.length > 0 ? (
            <dl className="venue-courts">
              {location.courts.map((court) => (
                <div key={court.id} className="venue-court">
                  <dt>{court.name}</dt>
                  <dd className="numerals">
                    <span className="venue-court-count">
                      {court.count === null ? (
                        <TodoText value={TODO_MARK} />
                      ) : (
                        t("home.courtCount", { count: court.count })
                      )}
                    </span>
                    <span>
                      <TodoText
                        value={flag(
                          court.floodlights,
                          t("home.floodlights"),
                          t("home.noFloodlights"),
                        )}
                      />
                      {" · "}
                      <TodoText
                        value={flag(court.coveredInWinter, t("home.covered"), t("home.notCovered"))}
                      />
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          {amenities.length > 0 ? (
            <ul className="venue-amenities" aria-label={t("home.amenities")}>
              {amenities.map((a) => (
                <li key={a.id}>
                  <TodoText value={a.name} />
                </li>
              ))}
            </ul>
          ) : null}
          <p className="venue-actions mt-8">
            <Link href="/inchiriere-teren" className="btn btn-primary btn-arrow">
              {t("home.rentalCta")}
            </Link>
            {scene.ctaLabel ? (
              <Link href={href} className="link-quiet">
                {scene.ctaLabel}
              </Link>
            ) : null}
          </p>
        </div>
        <div className="venue-media">
          {image ? (
            <Picture
              image={image}
              alt={imageAlt}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="venue-picture"
              imgClassName="venue-img"
            />
          ) : (
            <MediaFrame note={scene.extra.mediaNote ?? ""} className="venue-frame" />
          )}
          <p className="venue-plan-caption numerals">
            <span className="sr-only">{t("home.courtPlan")}. </span>
            {t("home.courtDimensions")}
          </p>
        </div>
      </div>
    </section>
  );
}
