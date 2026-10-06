import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { companyDetails } from "@/lib/company";
import { ANPC_SAL_URL } from "@/lib/site";
import { CookieSettingsButton } from "./CookieConsent";
import { LogoMark, LogoWord } from "./Logo";

// Section 19 of the full site (§9.2): the club's pages and the languages (full site only).
const CLUB_PAGES = [
  ["/padel", "padel"],
  ["/league", "league"],
  ["/tennis", "tennis"],
  ["/pilates", "pilates"],
  ["/packages", "packages"],
  ["/events", "events"],
  ["/cafe", "cafe"],
  ["/contact", "contact"],
  ["/corporate", "corporate"],
  ["/about", "about"],
  ["/blog", "blog"],
] as const;

/**
 * Legal identification of the trader (Law 365/2002 art. 5, OG 21/1992), legal pages and ANPC. On
 * the full site (`full`), section 19 adds the opening hours (Q3), the club's pages and the languages.
 */
export async function Footer({ full = false }: { full?: boolean }) {
  const t = await getTranslations("web.footer");
  const tLegal = await getTranslations("web.legal");
  const company = await companyDetails();
  const tSite = await getTranslations("web.site.footer");
  const tMenu = await getTranslations("web.site.header.nav");
  const tLang = await getTranslations("web.site.header.languages");
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
              <li><Link href="/rules">{tLegal("rules")}</Link></li>
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
        {full && (
          <nav className="footer-club" aria-labelledby="footer-club" data-reveal="fade">
            <div>
              <h2 id="footer-club">{tSite("menuTitle")}</h2>
              <ul className="footer-links footer-links--inline">
                {CLUB_PAGES.map(([href, key]) => (
                  <li key={href}>
                    <Link href={href}>{tMenu(key)}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2>{tSite("hoursTitle")}</h2>
              <p>{tSite("hours")}</p>
            </div>
            <div>
              <h2>{tSite("languagesTitle")}</h2>
              <ul className="footer-links footer-links--inline">
                <li>
                  <Link href="/" locale="ro" lang="ro" hrefLang="ro">
                    {tLang("ro")}
                  </Link>
                </li>
                <li>
                  <Link href="/" locale="en" lang="en" hrefLang="en">
                    {tLang("en")}
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        )}
        <div className="footer-bottom">
          <span>{t("rights", { year: new Date().getFullYear() })}</span>
        </div>
      </div>
    </footer>
  );
}
