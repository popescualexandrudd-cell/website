import { getTranslations } from "next-intl/server";
import { KINDS } from "@/lib/classes";
import { ClassSchedule } from "./ClassSchedule";

/** R-100: 4 Reformers at the start (Q46), the studio can grow to 6 from the panel. */
const ACTIVE = 4;
const ROOM = 6;

/**
 * Section 9 of the full site (§9.2): Pilates Reformer, in the building next door, across the lane
 * (the owner's sketch). The studio in facts (R-100, R-103, Q46), the class types (R-101), the waiting
 * list and the cancellation rules (R-102), and the week's schedule, live from the API.
 */
export async function Pilates({ id }: { id: string }) {
  const t = await getTranslations("web.site.pilates");
  return (
    <section id={id} className="section pilates" aria-labelledby="pilates-title">
      <div className="container">
        <p className="kicker" data-reveal="fade">{t("kicker")}</p>
        <h2 id="pilates-title" className="h2" data-reveal="lines">
          {t("title")}
        </h2>
        <p className="lead" data-reveal="rise">{t("lead")}</p>
        <div className="pilates__intro">
          <figure className="pilates__studio" data-reveal="mask">
            <ReformerRow />
            <figcaption className="muted">{t("studio.caption")}</figcaption>
          </figure>
          <ul className="pilates__facts">
            {(["machines", "groups", "instructor", "where"] as const).map((key, i) => (
              <li key={key} data-reveal="rise" style={{ "--i": i } as React.CSSProperties}>
                <strong>{t(`facts.${key}.title`)}</strong>
                <span>{t(`facts.${key}.text`)}</span>
              </li>
            ))}
          </ul>
        </div>

        <h3 className="pilates__h3">{t("kindsTitle")}</h3>
        <ul className="pilates__kinds">
          {KINDS.map((kind, i) => (
            <li key={kind} className="pilates__kind" data-reveal="pop" data-tilt="" style={{ "--i": i } as React.CSSProperties}>
              <h4>{t(`kinds.${kind}.name`)}</h4>
              <p>{t(`kinds.${kind}.text`)}</p>
            </li>
          ))}
        </ul>

        <div className="pilates__waitlist" data-reveal="rise">
          <h3 className="pilates__h3">{t("waitlist.title")}</h3>
          <p className="pilates__text">{t("waitlist.text")}</p>
        </div>

        <ClassSchedule />
      </div>
    </section>
  );
}

/**
 * Six Reformer places seen from above, the four in use drawn in brass, the two the studio can add
 * dashed. A generic drawing of the machine (frame, carriage, shoulder rests, footbar, springs), not
 * a plan of the studio, which has no interior design yet (Q44).
 */
async function ReformerRow() {
  const t = await getTranslations("web.site.pilates.studio");
  return (
    <svg viewBox="0 0 520 250" role="img" aria-label={t("label", { active: ACTIVE, room: ROOM })}>
      <title>{t("label", { active: ACTIVE, room: ROOM })}</title>
      {Array.from({ length: ROOM }, (_, i) => {
        const x = 20 + (i % 3) * 170;
        const y = 20 + Math.floor(i / 3) * 120;
        const active = i < ACTIVE;
        return (
          <g key={i} className={active ? "reformer" : "reformer reformer--room"} transform={`translate(${x} ${y})`}>
            <rect x="0" y="0" width="140" height="90" rx="10" className="reformer__frame" />
            <rect x="46" y="14" width="46" height="62" rx="6" className="reformer__carriage" />
            <rect x="52" y="20" width="12" height="16" rx="3" className="reformer__rest" />
            <rect x="52" y="54" width="12" height="16" rx="3" className="reformer__rest" />
            <path d="M120 10 V80" className="reformer__bar" />
            <path d="M92 30 H112 M92 45 H112 M92 60 H112" className="reformer__springs" />
          </g>
        );
      })}
    </svg>
  );
}
