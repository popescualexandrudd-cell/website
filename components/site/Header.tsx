import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "./BrandMark";
import { MenuDialog } from "./MenuDialog";
import { LanguageSwitch } from "./LanguageSwitch";
import type { LocalizedSettings } from "@/lib/content";
import { TodoText } from "./TodoText";
import { telLink, whatsappLink } from "@/lib/format";

type Props = { settings: LocalizedSettings };

export async function Header({ settings }: Props) {
  const t = await getTranslations();
  const primary = [
    { href: "/academie", label: t("nav.juniors") },
    { href: "/programe", label: t("nav.programs") },
    { href: "/inchiriere-teren", label: t("nav.rental") },
    { href: "/turnee", label: t("nav.tournaments") },
    { href: "/echipa", label: t("nav.team") },
    { href: "/despre", label: t("nav.club") },
    { href: "/contact", label: t("nav.contact") },
  ] as const;
  const links = [
    { href: "/academie", label: t("nav.juniors") },
    { href: "/programe", label: t("nav.programs") },
    { href: "/inchiriere-teren", label: t("nav.rental") },
    { href: "/turnee", label: t("nav.tournaments") },
    { href: "/echipa", label: t("nav.team") },
    { href: "/despre", label: t("nav.about") },
    { href: "/facilitati", label: t("nav.facilities") },
    { href: "/preturi", label: t("nav.pricing") },
    { href: "/scoli-gradinite", label: t("nav.schools") },
    { href: "/galerie", label: t("nav.gallery") },
    { href: "/contact", label: t("nav.contact") },
  ] as const;
  const whatsapp = whatsappLink(settings.whatsapp);
  const tel = telLink(settings.phone);
  return (
    <header className="site-header" data-site-header>
      <div className="site-header-bar">
        <Link href="/" className="site-monogram">
          <BrandMark logo={settings.logo} monogram={settings.monogram} />
          <span className="site-brand">
            <span className="site-brand-name">
              <TodoText value={settings.brandName} />
            </span>
            {settings.tagline ? (
              <span className="site-brand-tagline">{settings.tagline}</span>
            ) : null}
            <span className="sr-only">, {t("common.home")}</span>
          </span>
        </Link>
        <nav className="site-nav" aria-label={t("nav.mainLabel")}>
          {primary.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="site-header-actions">
          <Link href="/rezervare" className="btn btn-primary header-book">
            {t("common.book")}
          </Link>
          <MenuDialog openLabel={t("common.menu")} closeLabel={t("common.closeMenu")}>
            <nav aria-label={t("nav.menuLabel")} className="menu-nav">
              <ul>
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="menu-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <ul className="menu-secondary">
                <li>
                  <Link href="/intrebari">{t("nav.faq")}</Link>
                </li>
                <li>
                  <Link href="/sfaturi">{t("nav.tips")}</Link>
                </li>
                <li>
                  <Link href="/rezervare">{t("common.bookLesson")}</Link>
                </li>
                {settings.enEnabled ? (
                  <li>
                    <LanguageSwitch
                      label={t("common.languageSwitch")}
                      srLabel={t("common.languageSwitchLabel")}
                    />
                  </li>
                ) : null}
              </ul>
            </nav>
            <div className="menu-contact">
              {tel ? (
                <a href={tel}>{settings.phone}</a>
              ) : (
                <span>
                  <TodoText value={settings.phone} />
                </span>
              )}
              {whatsapp ? (
                <a href={whatsapp} rel="noopener noreferrer" target="_blank">
                  {t("common.whatsapp")}
                </a>
              ) : null}
            </div>
          </MenuDialog>
        </div>
      </div>
    </header>
  );
}
