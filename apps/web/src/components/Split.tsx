import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SplitHour } from "./SplitHour";

const NOTES = ["kiosk", "noCredits", "debt"] as const;

/**
 * Section 11 of the full site (§9.2): "Împarte ora". Padel has no credits: the court is paid by the
 * hour and shared between the players (R-060, invariant 14); at the Payments Kiosk each player scans
 * their card and pays their part, or the organiser pays it all (R-060, R-062, Q9); a booking made
 * online is paid at the club (R-063).
 */
export async function Split({ id }: { id: string }) {
  const t = await getTranslations("web.site.split");
  return (
    <section id={id} className="section split-section" aria-labelledby="split-section-title">
      <div className="container">
        <p className="kicker" data-reveal="fade">{t("kicker")}</p>
        <h2 id="split-section-title" className="h2" data-reveal="lines">
          {t("title")}
        </h2>
        <p className="lead" data-reveal="rise">{t("lead")}</p>
        <SplitHour />
        <ul className="packages__notes">
          {NOTES.map((key, i) => (
            <li key={key} data-reveal="rise" style={{ "--i": i } as React.CSSProperties}>
              <strong>{t(`notes.${key}.title`)}</strong>
              <span>{t(`notes.${key}.text`)}</span>
            </li>
          ))}
        </ul>
        <p className="pilates__more">
          <Link className="btn btn-primary" href="/bookings">
            {t("book")}
          </Link>
        </p>
      </div>
    </section>
  );
}
