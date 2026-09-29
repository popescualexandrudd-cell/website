import { getTranslations } from "next-intl/server";
import { SitePlan } from "./SitePlan";
import { type StopKey, TourStops } from "./TourStops";

/** The visitor's way through the club (§9.2.3): parking → alley → reception → courts → mezzanine →
 * café → Pilates → event room. */
const ORDER: StopKey[] = ["parking", "alley", "reception", "courts", "gallery", "cafe", "pilates", "events"];

/**
 * Section 3 of the full site (§9.2): the tour of the club on scroll. It walks the plan redrawn
 * from the owner's sketch (the one of the pre-launch page), not renders of spaces that are not
 * designed yet (Q44); each stop says only what the club documents confirm.
 */
export async function Tour({ id }: { id: string }) {
  const t = await getTranslations("web.site.tour");
  return (
    <section id={id} className="section tour" aria-labelledby="tour-title">
      <div className="container">
        <p className="kicker">{t("kicker")}</p>
        <h2 id="tour-title" className="h2">
          {t("title")}
        </h2>
        <p className="lead">{t("lead")}</p>
        <TourStops
          plan={<SitePlan />}
          note={t("note")}
          stops={ORDER.map((key) => ({ key, title: t(`stops.${key}.title`), text: t(`stops.${key}.text`) }))}
        />
      </div>
    </section>
  );
}
