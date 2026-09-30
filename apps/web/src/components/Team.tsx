import { getTranslations } from "next-intl/server";

const ROLES = ["coaches", "instructor", "reception"] as const;

/**
 * Section 15 of the full site (§9.2): the team. The roles as the club works (§4.2: coaches with
 * their lessons and the league's level check, R-003; the Reformer instructor, R-101; the
 * reception); names and photos only once the team is complete (Q65), never invented.
 */
export async function Team({ id }: { id: string }) {
  const t = await getTranslations("web.site.team");
  return (
    <section id={id} className="section section-alt team" aria-labelledby="team-title">
      <div className="container">
        <p className="kicker" data-reveal="fade">
          {t("kicker")}
        </p>
        <h2 id="team-title" className="h2" data-reveal="lines">
          {t("title")}
        </h2>
        <p className="lead" data-reveal="rise">
          {t("lead")}
        </p>
        <ul className="padel__cards">
          {ROLES.map((key, i) => (
            <li key={key} className="padel__card" data-reveal="tilt" data-tilt="" style={{ "--i": i } as React.CSSProperties}>
              <h3 className="padel__h3">{t(`roles.${key}.title`)}</h3>
              <p>{t(`roles.${key}.text`)}</p>
            </li>
          ))}
        </ul>
        <p className="events__note">{t("soon")}</p>
      </div>
    </section>
  );
}
