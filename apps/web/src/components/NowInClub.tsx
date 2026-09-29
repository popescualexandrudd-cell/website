import { getTranslations } from "next-intl/server";
import { LiveClub } from "./LiveClub";

/** Section 4 of the full site (§9.2): "Acum în club", live. */
export async function NowInClub({ id }: { id: string }) {
  const t = await getTranslations("web.site.live");
  return (
    <section id={id} className="section now" aria-labelledby="now-title">
      <div className="container">
        <p className="kicker">{t("kicker")}</p>
        <h2 id="now-title" className="h2">
          {t("title")}
        </h2>
        <p className="lead">{t("lead")}</p>
        <LiveClub />
      </div>
    </section>
  );
}
