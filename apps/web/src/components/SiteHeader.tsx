"use client";

/**
 * The full site's fixed header (§9.2 section 1, Stage 11): logo, the main menu (Padel · Liga ·
 * Tenis · Pilates · Pachete · Evenimente · Cafenea · Contact), the language, the account and the
 * "Rezervă" button, always visible, on a phone too. Below 1280 px the menu opens as a panel under
 * the header: Escape or a chosen link closes it and gives the focus back to the menu button.
 */
import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { IconClose, IconMenu, IconUser } from "./Icons";
import { LogoMark, LogoWord } from "./Logo";

export const MENU = [
  ["/padel", "padel"],
  ["/league", "league"],
  ["/tennis", "tennis"],
  ["/pilates", "pilates"],
  ["/packages", "packages"],
  ["/events", "events"],
  ["/cafe", "cafe"],
  ["/contact", "contact"],
] as const;

type Page = (typeof MENU)[number][0] | "/bookings" | "/account";

export function SiteHeader() {
  const t = useTranslations("web.site.header");
  const locale = useLocale();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.dataset.menuOpen = "true";
    return () => {
      document.removeEventListener("keydown", onKey);
      delete document.body.dataset.menuOpen;
    };
  }, [open]);

  const current = (href: Page) => (pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined);
  // Choosing a page closes the menu.
  const links = (className: string) => (
    <ul className={className}>
      {MENU.map(([href, key]) => (
        <li key={href}>
          <Link href={href} aria-current={current(href)} onClick={() => setOpen(false)}>
            {t(`nav.${key}`)}
          </Link>
        </li>
      ))}
    </ul>
  );
  const languages = (
    <nav className="lang-switch" aria-label={t("language")}>
      {(["ro", "en"] as const).map((l) => (
        <Link key={l} href={pathname as Page} locale={l} aria-current={l === locale ? "true" : undefined} lang={l} hrefLang={l}>
          <span aria-hidden="true">{l.toUpperCase()}</span>
          <span className="sr-only">{t(`languages.${l}`)}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <header className="site-header site-header--full" data-scrolled={scrolled || open} data-open={open}>
      <div className="container">
        <Link href="/" className="logo" aria-label={t("home")}>
          <LogoMark />
          <LogoWord />
        </Link>
        <nav className="full-nav" aria-label={t("main")}>
          {links("full-nav__list")}
        </nav>
        <div className="header-actions">
          <div className="header-wide">
            {languages}
            <Link href="/account" className="account-link" aria-current={current("/account")}>
              <IconUser />
              <span className="sr-only">{t("account")}</span>
            </Link>
          </div>
          <Link href="/bookings" className="btn btn-primary book-cta" aria-current={current("/bookings")} onClick={() => setOpen(false)}>
            {t("book")}
          </Link>
          <button
            ref={button}
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen(!open)}
          >
            {open ? <IconClose /> : <IconMenu />}
            <span>{open ? t("close") : t("menu")}</span>
          </button>
        </div>
      </div>
      <div id={panelId} className="menu-panel" hidden={!open}>
        <div className="container">
          <nav aria-label={t("main")}>{links("menu-panel__list")}</nav>
          <div className="menu-panel__extra">
            {languages}
            <Link href="/account" className="menu-panel__account" aria-current={current("/account")} onClick={() => setOpen(false)}>
              <IconUser />
              {t("account")}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
