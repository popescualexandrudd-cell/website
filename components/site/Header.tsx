import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Monogram } from "./Monogram";
import { MenuDialog } from "./MenuDialog";
import { LanguageSwitch } from "./LanguageSwitch";
import type { LocalizedSettings } from "@/lib/content";
import { TodoText } from "./TodoText";
import { telLink, whatsappLink } from "@/lib/format";

type Props = { settings: LocalizedSettings };

export async function Header({ settings }: Props) {
  const t = await getTranslations();
  const links = [
    { href: "/programe", label: t("nav.programs") },
    { href: "/facilitati", label: t("nav.facilities") },
    { href: "/despre", label: t("nav.about") },
    { href: "/preturi", label: t("nav.pricing") },
    { href: "/intrebari", label: t("nav.faq") },
    { href: "/sfaturi", label: t("nav.tips") },
    { href: "/contact", label: t("nav.contact") },
  ] as const;
  const whatsapp = whatsappLink(settings.whatsapp);
  const tel = telLink(settings.phone);
  return (
    <header className="site-header">
      <div className="site-header-bar">
        <Link
          href="/"
          className="site-monogram"
          aria-label={`${settings.brandName} · ${t("common.home")}`}
        >
          <Monogram letters={settings.monogram} className="size-10 md:size-11" />
        </Link>
        <div className="site-header-actions">
          <Link href="/rezervare" className="header-book">
            {t("common.book")}
          </Link>
          <MenuDialog openLabel={t("common.menu")} closeLabel={t("common.closeMenu")}>
            <nav aria-label={t("nav.mainLabel")} className="menu-nav">
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
                  <Link href="/galerie">{t("nav.gallery")}</Link>
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
