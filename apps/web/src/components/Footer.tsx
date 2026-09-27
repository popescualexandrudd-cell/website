import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LogoMark, LogoWord } from "./Logo";

export function Footer() {
  const t = useTranslations("web.footer");
  return (
    <footer className="site-footer">
      <div className="container">
        <div>
          <Link href="/" className="logo">
            <LogoMark size={34} />
            <LogoWord />
          </Link>
          <p>{t("tagline")}</p>
          <p>{t("construction")}</p>
        </div>
        <nav aria-label="Legal">
          <Link href="/privacy-notice">{t("notice")}</Link>
          <span>{t("rights", { year: new Date().getFullYear() })}</span>
        </nav>
      </div>
    </footer>
  );
}
