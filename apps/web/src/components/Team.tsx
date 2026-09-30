import { getTranslations } from "next-intl/server";
import { coachesOf, SPORTS } from "@/lib/team";

const ROLES = ["coaches", "instructor", "reception"] as const;

/**
 * Section 15 of the full site (§9.2): the team. The roles as the club works (§4.2: coaches with
 * their lessons and the league's level check, R-003; the Reformer instructor, R-101; the
 * reception), then the coaches by sport: two per sport, FICTIONAL names for now, each labelled
 * (Q65, owner, 30.09.2026; invariant 12). No photos until the team is complete.
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
        <h3 className="pilates__h3" data-reveal="lines">
          {t("people.title")}
        </h3>
        <ul className="team__sports" aria-label={t("people.label")}>
          {SPORTS.map((sport, i) => (
            <li key={sport} className="team__sport" data-reveal="rise" style={{ "--i": i } as React.CSSProperties}>
              <h4>{t(`people.sports.${sport}`)}</h4>
              <ul className="team__people">
                {coachesOf(sport).map((coach) => (
                  <li key={coach.name}>
                    <strong>{coach.name}</strong>
                    <span>{t(`people.roles.${sport}`)}</span>
                    {coach.fictional && <span className="events__flag">{t("people.fictional")}</span>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <p className="events__note">{t("soon")}</p>
      </div>
    </section>
  );
}
