import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const ITEMS = ["hours", "durations", "cancel", "noShow", "pay", "credits", "league", "scores"] as const;

/**
 * Section 18 of the full site (§9.2): questions and the rules in short (R-053): the hours and the
 * peak (Q3), durations (R-041, R-042), cancelling (R-070, R-071), no-shows (R-072, R-073), paying
 * (R-060, R-063, Q9), no credits for padel (invariant 14), the league (R-006, invariants 1, 2, 8).
 * Plain <details>: they open without any script; the full text is in the Terms.
 */
export async function Faq({ id }: { id: string }) {
  const t = await getTranslations("web.site.faq");
  return (
    <section id={id} className="section faq" aria-labelledby="faq-title">
      <div className="container">
        <p className="kicker" data-reveal="fade">
          {t("kicker")}
        </p>
        <h2 id="faq-title" className="h2" data-reveal="lines">
          {t("title")}
        </h2>
        <p className="lead" data-reveal="rise">
          {t("lead")}
        </p>
        <div className="faq__list">
          {ITEMS.map((key, i) => (
            <details key={key} className="faq__item" data-reveal="rise" style={{ "--i": i } as React.CSSProperties}>
              <summary>{t(`items.${key}.q`)}</summary>
              <p>{t(`items.${key}.a`)}</p>
            </details>
          ))}
        </div>
        <p className="pilates__more">
          <Link className="btn btn-secondary" href="/terms">
            {t("terms")}
          </Link>
        </p>
      </div>
    </section>
  );
}
