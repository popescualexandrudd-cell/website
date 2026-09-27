"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LogoMark, LogoWord } from "./Logo";

const SECTIONS = [
  ["arena", "arena"],
  ["ecosistem", "ecosystem"],
  ["facilitati", "facilities"],
  ["liga", "league"],
  ["locatie", "location"],
] as const;

export function Header() {
  const t = useTranslations("web.nav");
  const locale = useLocale();
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const home = pathname === "/";
  const anchor = (id: string) => (home ? `#${id}` : `/${locale}#${id}`);
  const links = SECTIONS.map(([id, key]) => (
    <li key={id}>
      <a href={anchor(id)} onClick={() => menu.current?.removeAttribute("open")}>
        {t(key)}
      </a>
    </li>
  ));
  return (
    <header className="site-header" data-scrolled={scrolled}>
      <div className="container">
        <Link href="/" className="logo" aria-label={t("home")}>
          <LogoMark />
          <LogoWord />
        </Link>
        <nav className="site-nav" aria-label={t("main")}>
          <ul>{links}</ul>
        </nav>
        <div className="header-actions">
          <nav className="lang-switch" aria-label={t("language")}>
            {(["ro", "en"] as const).map((l) => (
              <Link key={l} href="/" locale={l} aria-current={l === locale ? "true" : undefined} lang={l}>
                {l.toUpperCase()}
              </Link>
            ))}
          </nav>
          <a href={anchor("lista")} className="btn btn-primary header-cta">
            {t("join")}
          </a>
          <details className="mobile-nav" ref={menu}>
            <summary>{t("menu")}</summary>
            <nav aria-label={t("main")}>
              <ul>
                {links}
                <li>
                  <a href={anchor("lista")} onClick={() => menu.current?.removeAttribute("open")}>
                    {t("join")}
                  </a>
                </li>
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
