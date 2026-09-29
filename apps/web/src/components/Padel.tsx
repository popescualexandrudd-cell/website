import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IconCheck } from "./Icons";
import { PadelCourt } from "./PadelCourt";

const EASY = ["racket", "serve", "walls", "social"] as const;
const CARDS = ["courts", "lessons", "booking"] as const;
const FORMATS = ["americano", "mexicano", "king"] as const;

/**
 * Section 5 of the full site (§9.2): padel, the main attraction. What padel is and why it is easy
 * to start, the club's courts, lessons with coaches (R-090, R-003), how to book (R-041, Q3, the hour
 * shared between the players) and the tournament formats the league plays (§6.14), with the
 * action: book. No prices yet (Q21: they are still to be set).
 */
export async function Padel({ id }: { id: string }) {
  const t = await getTranslations("web.site.padel");
  return (
    <section id={id} className="section padel" aria-labelledby="padel-title">
      <div className="container">
        <p className="kicker">{t("kicker")}</p>
        <h2 id="padel-title" className="h2">
          {t("title")}
        </h2>
        <p className="lead">{t("lead")}</p>
        <div className="padel__intro">
          <figure className="padel__court">
            <PadelCourt />
            <figcaption className="muted">{t("court.caption")}</figcaption>
          </figure>
          <div>
            <h3 className="padel__h3">{t("easy.title")}</h3>
            <ul className="padel__points">
              {EASY.map((key) => (
                <li key={key}>
                  <IconCheck size={22} />
                  <span>{t(`easy.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <ul className="padel__cards">
          {CARDS.map((key) => (
            <li key={key} className="padel__card">
              <h3 className="padel__h3">{t(`cards.${key}.title`)}</h3>
              <p>{t(`cards.${key}.text`)}</p>
            </li>
          ))}
        </ul>
        <h3 className="padel__h3 padel__formats-title">{t("formats.title")}</h3>
        <p className="muted">{t("formats.lead")}</p>
        <ul className="padel__cards">
          {FORMATS.map((key) => (
            <li key={key} className="padel__card padel__card--format">
              <h4>{t(`formats.${key}.title`)}</h4>
              <p>{t(`formats.${key}.text`)}</p>
            </li>
          ))}
        </ul>
        <div className="hero-ctas">
          <Link className="btn btn-primary" href="/bookings">
            {t("book")}
          </Link>
        </div>
      </div>
    </section>
  );
}
