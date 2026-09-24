import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { LocalizedSettings, LocationView } from "@/lib/content";
import { mailLink, telLink, whatsappLink } from "@/lib/format";
import { TodoText } from "./TodoText";
import { LanguageSwitch } from "./LanguageSwitch";
import { NewsletterForm } from "./NewsletterForm";

type Props = { settings: LocalizedSettings; location: LocationView | null; policyVersion: string };

export async function Footer({ settings, location, policyVersion }: Props) {
  const t = await getTranslations();
  const tel = telLink(settings.phone);
  const mail = mailLink(settings.email);
  const whatsapp = whatsappLink(settings.whatsapp);
  const socials = [
    { href: settings.instagramUrl, label: "Instagram" },
    { href: settings.facebookUrl, label: "Facebook" },
    { href: settings.tiktokUrl, label: "TikTok" },
  ].filter((s): s is { href: string; label: string } => Boolean(s.href && /^https?:\/\//.test(s.href)));
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" data-tone-zone="dark">
      <div className="grid-page gap-y-12 py-16 md:py-24">
        <div className="col-span-4 md:col-span-4 lg:col-span-4">
          <p className="font-display text-h3 leading-tight">
            <TodoText value={settings.brandName} />
          </p>
          <p className="mt-2 text-cerneala-2">{settings.tagline}</p>
          {settings.newsletterEnabled ? (
            <div className="mt-10">
              <NewsletterForm policyVersion={policyVersion} />
            </div>
          ) : null}
        </div>

        <div className="col-span-4 md:col-span-2 lg:col-span-3 lg:col-start-6">
          <h2 className="footer-heading">{t("footer.contact")}</h2>
          <ul className="footer-list">
            <li>{tel ? <a href={tel}>{settings.phone}</a> : <TodoText value={settings.phone} />}</li>
            {whatsapp ? (
              <li>
                <a href={whatsapp} rel="noopener noreferrer" target="_blank">
                  {t("common.whatsapp")}
                </a>
              </li>
            ) : null}
            <li>{mail ? <a href={mail}>{settings.email}</a> : <TodoText value={settings.email} />}</li>
            {location ? (
              <li className="text-cerneala-2">
                <TodoText value={location.name} />
                <br />
                <TodoText value={location.address} />
              </li>
            ) : null}
          </ul>
        </div>

        <div className="col-span-4 md:col-span-2 lg:col-span-2">
          <h2 className="footer-heading">{t("footer.hours")}</h2>
          <dl className="footer-list">
            {settings.workingHours.map((row) => (
              <div key={row.label} className="flex justify-between gap-4 lg:block">
                <dt className="text-cerneala-2">{row.label}</dt>
                <dd className="numerals">{row.hours}</dd>
              </div>
            ))}
          </dl>
        </div>

        <nav className="col-span-4 md:col-span-4 lg:col-span-2" aria-label={t("nav.footerLabel")}>
          <h2 className="footer-heading">{t("footer.legal")}</h2>
          <ul className="footer-list">
            <li><Link href="/confidentialitate">{t("footer.privacy")}</Link></li>
            <li><Link href="/termeni">{t("footer.terms")}</Link></li>
            <li><Link href="/cookies">{t("footer.cookies")}</Link></li>
            <li><Link href="/contact">{t("nav.contact")}</Link></li>
            {settings.enEnabled ? (
              <li>
                <LanguageSwitch label={t("common.languageSwitch")} srLabel={t("common.languageSwitchLabel")} />
              </li>
            ) : null}
          </ul>
          {socials.length > 0 ? (
            <>
              <h2 className="footer-heading mt-8">{t("footer.social")}</h2>
              <ul className="footer-list">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} rel="noopener noreferrer" target="_blank">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </nav>

        <div className="col-span-4 border-t border-linie pt-6 text-note text-cerneala-2 md:col-span-8 lg:col-span-12">
          <p>
            <TodoText value={t("footer.entity", { name: settings.legalName, form: settings.legalForm, cui: settings.legalCui })} />
            {settings.legalRegNo ? `, ${settings.legalRegNo}` : ""}
            {" · "}
            <TodoText value={t("footer.address", { address: settings.legalAddress })} />
          </p>
          <p className="mt-1">{t("footer.rights", { year, name: settings.brandName })}</p>
        </div>
      </div>
    </footer>
  );
}
