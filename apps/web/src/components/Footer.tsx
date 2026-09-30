import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { companyDetails } from "@/lib/company";
import { ANPC_SAL_URL } from "@/lib/site";
import { CookieSettingsButton } from "./CookieConsent";
import { LogoMark, LogoWord } from "./Logo";

/** Legal identification of the trader (Law 365/2002 art. 5, OG 21/1992), legal pages and ANPC. */
export async function Footer() {
  const t = await getTranslations("web.footer");
  const tLegal = await getTranslations("web.legal");
  const company = await companyDetails();
  const value = (v: string | null | undefined) => (v && v.trim() ? v : <em>{t("pending")}</em>);
  const rows: [string, React.ReactNode][] = [
    [t("legalName"), value(company?.legal_name)],
    [t("cui"), value(company?.registration_code)],
    [t("orc"), value(company?.trade_register_number)],
    [t("address"), value(company?.address)],
    [t("phone"), company?.phone ? <a href={`tel:${company.phone.replace(/\s+/g, "")}`}>{company.phone}</a> : value("")],
    [t("email"), company?.email ? <a href={`mailto:${company.email}`}>{company.email}</a> : value("")],
  ];
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link href="/" className="logo">
              <LogoMark />
              <LogoWord />
            </Link>
            <p>{t("tagline")}</p>
            <p className="muted">{t("construction")}</p>
          </div>
          <section className="company" aria-labelledby="footer-company">
            <h2 id="footer-company">{t("company")}</h2>
            <dl>
              {rows.map(([label, content]) => (
                <div key={label} style={{ display: "contents" }}>
                  <dt>{label}</dt>
                  <dd>{content}</dd>
                </div>
              ))}
            </dl>
          </section>
          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal">{t("legal")}</h2>
            <ul className="footer-links">
              <li><Link href="/terms">{tLegal("terms")}</Link></li>
              <li><Link href="/privacy">{tLegal("privacy")}</Link></li>
              <li><Link href="/refunds">{tLegal("refunds")}</Link></li>
              <li><Link href="/cookies">{tLegal("cookies")}</Link></li>
              <li><Link href="/privacy-notice">{tLegal("notice")}</Link></li>
              <li><CookieSettingsButton label={t("cookieSettings")} /></li>
              <li>
                <a href={ANPC_SAL_URL} target="_blank" rel="noopener noreferrer">
                  {t("anpc")}
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>{t("rights", { year: new Date().getFullYear() })}</span>
        </div>
      </div>
    </footer>
  );
}
