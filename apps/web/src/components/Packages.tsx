import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PackageConfigurator } from "./PackageConfigurator";

const NOTES = ["sessions", "rollover", "freeze", "custom", "buy"] as const;

/**
 * Section 10 of the full site (§9.2): the package configurator (R-081), then what a subscription
 * means in practice: sessions are trainings, courts are paid by the hour (R-083); no carry-over
 * (R-085); two weeks of freeze a year (R-086); other intensities on request (R-082, Q12); bought at
 * the Payments Kiosk, in cash (R-089, Q9); one company package (R-088, Q35).
 */
export async function Packages({ id }: { id: string }) {
  const t = await getTranslations("web.site.packages");
  return (
    <section id={id} className="section section-dark packages" aria-labelledby="packages-title">
      <div className="container">
        <p className="kicker">{t("kicker")}</p>
        <h2 id="packages-title" className="h2">
          {t("title")}
        </h2>
        <p className="lead">{t("lead")}</p>
        <PackageConfigurator />
        <ul className="packages__notes">
          {NOTES.map((key) => (
            <li key={key}>
              <strong>{t(`notes.${key}.title`)}</strong>
              <span>{t(`notes.${key}.text`)}</span>
            </li>
          ))}
        </ul>
        <div className="packages__company">
          <h3 className="pilates__h3">{t("company.title")}</h3>
          <p className="pilates__text">{t("company.text")}</p>
          <p className="pilates__more">
            <Link className="btn btn-secondary" href="/contact">
              {t("company.cta")}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
