"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LogoMark, LogoWord } from "./Logo";

export function Header() {
  const t = useTranslations("web.nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const home = pathname === "/";
  const anchor = (id: string) => (home ? `#${id}` : `/${locale}#${id}`);
  return (
    <header className="site-header" data-scrolled={scrolled}>
      <div className="container">
        <Link href="/" className="logo" title={t("home")}>
          <LogoMark />
          <LogoWord />
        </Link>
        <nav className="site-nav" aria-label="Principal">
          <a href={anchor("club")}>{t("club")}</a>
          <a href={anchor("liga")}>{t("league")}</a>
          <a href={anchor("locatie")}>{t("location")}</a>
        </nav>
        <div className="header-actions">
          <nav className="lang-switch" aria-label={t("language")}>
            {(["ro", "en"] as const).map((l) => (
              <Link key={l} href="/" locale={l} aria-current={l === locale} lang={l}>
                {l.toUpperCase()}
              </Link>
            ))}
          </nav>
          <a href={anchor("lista")} className="btn btn-primary header-cta">
            {t("join")}
          </a>
        </div>
      </div>
    </header>
  );
}
