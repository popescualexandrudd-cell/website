import { getTranslations } from "next-intl/server";
import { companyDetails, telHref } from "@/lib/company";

/**
 * The contact page's details (§9.3): the club's phone and email from the company details kept in
 * the panel (Settings → company), the hours (Q3). No contact form: a call or an email asks for no
 * personal data on the site (§12, data minimisation). Missing details say so, never invented.
 */
export async function ContactDetails() {
  const t = await getTranslations("web.site.contact");
  const company = await companyDetails();
  const phone = company?.phone?.trim() || null;
  const email = company?.email?.trim() || null;
  const tel = telHref(phone);
  return (
    <section className="section" aria-labelledby="contact-title">
      <div className="container">
        <h2 id="contact-title" className="h2" data-reveal="lines">
          {t("title")}
        </h2>
        <ul className="tennis__facts contact__facts">
          <li data-reveal="rise">
            <span className="tennis__fact-label">{t("phone")}</span>
            {phone && tel ? (
              <a className="contact__value" href={tel}>
                {phone}
              </a>
            ) : (
              <span className="contact__value">{t("pending")}</span>
            )}
          </li>
          <li data-reveal="rise" style={{ "--i": 1 } as React.CSSProperties}>
            <span className="tennis__fact-label">{t("email")}</span>
            {email ? (
              <a className="contact__value" href={`mailto:${email}`}>
                {email}
              </a>
            ) : (
              <span className="contact__value">{t("pending")}</span>
            )}
          </li>
          <li data-reveal="rise" style={{ "--i": 2 } as React.CSSProperties}>
            <span className="tennis__fact-label">{t("hoursTitle")}</span>
            <span className="contact__value">{t("hours")}</span>
          </li>
        </ul>
        <p className="events__note">{t("note")}</p>
      </div>
    </section>
  );
}
