import { getTranslations } from "next-intl/server";
import { IconCar, IconPin, IconRoute } from "./Icons";
import { SitePlan } from "./SitePlan";
import { MAP_URL } from "@/lib/site";

// Links only (no embedded map, no third-party script): the visitor's own navigation app.
const WAZE_URL = "https://waze.com/ul?q=Selgros%20Pantelimon";
const GOOGLE_URL = "https://www.google.com/maps/search/?api=1&query=Selgros%20Pantelimon";

/**
 * Section 17 of the full site (§9.2): location and access. Șoseaua Biruinței, by Selgros
 * Pantelimon, reached from two streets, 18 + 10 parking spaces (§2.2); the club's plan as a
 * scheme without scale (the owner's sketch), OpenStreetMap and, optionally, a navigation app.
 */
export async function Location({ id }: { id: string }) {
  const t = await getTranslations("web.location");
  const extra = await getTranslations("web.site.location");
  return (
    <section id={id} className="section section-alt" aria-labelledby="location-title">
      <div className="container split">
        <div>
          <p className="kicker" data-reveal="fade">
            {extra("kicker")}
          </p>
          <h2 id="location-title" className="h2" data-reveal="lines">
            {t("title")}
          </h2>
          <ul className="location-list">
            {[
              [<IconPin key="pin" />, t("address")],
              [<IconRoute key="route" />, t("access")],
              [<IconCar key="car" />, t("parking")],
            ].map(([icon, text], i) => (
              <li key={i} data-reveal="rise" style={{ "--i": i } as React.CSSProperties}>
                {icon} {text}
              </li>
            ))}
          </ul>
          <p className="hero-ctas" data-reveal="fade">
            <a className="btn btn-secondary" href={MAP_URL} target="_blank" rel="noopener noreferrer">
              {t("map")}
            </a>
          </p>
          <p className="events__note">
            {extra("maps")}:{" "}
            <a href={WAZE_URL} target="_blank" rel="noopener noreferrer">
              {extra("waze")}
              <span className="sr-only"> {extra("newWindow")}</span>
            </a>
            {" · "}
            <a href={GOOGLE_URL} target="_blank" rel="noopener noreferrer">
              {extra("google")}
              <span className="sr-only"> {extra("newWindow")}</span>
            </a>
          </p>
        </div>
        <figure className="plan-figure" data-reveal="mask">
          <SitePlan />
          <figcaption className="muted">{t("mapNote")}</figcaption>
        </figure>
      </div>
    </section>
  );
}
