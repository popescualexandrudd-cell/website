import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * `/corporate` (§9.3, Q35): the one company package the owner confirmed on 27.09.2026 (employees get
 * 20% off the configurator's subscriptions; billing on the company, a monthly usage report) and the
 * event room for team events (Q34: requested online or by phone, confirmed by the manager).
 * Rendered on the server; the offer itself is set up by the club in the panel.
 */
export async function Corporate({ id }: { id: string }) {
  const t = await getTranslations("web.site.corporate");
  const points = ["discount", "billing", "report", "room"] as const;
  return (
    <section id={id} className="section" aria-labelledby={`${id}-title`}>
      <div className="container">
        <h2 id={`${id}-title`} className="h2" data-reveal="lines">
          {t("title")}
        </h2>
        <ul className="tennis__facts">
          {points.map((point, index) => (
            <li key={point} data-reveal="rise" style={{ "--i": index } as React.CSSProperties}>
              <span className="tennis__fact">{t(`points.${point}.title`)}</span>
              <span className="tennis__fact-label">{t(`points.${point}.text`)}</span>
            </li>
          ))}
        </ul>
        <p className="events__note">{t("how")}</p>
        <p className="pilates__more">
          <Link className="btn btn-primary" href="/contact">
            {t("contact")}
          </Link>
          <Link className="btn btn-secondary" href="/account/events">
            {t("room")}
          </Link>
        </p>
      </div>
    </section>
  );
}
