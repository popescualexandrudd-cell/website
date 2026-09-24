import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getLocations, getPageHeader, getSettings, localizedSettings } from "@/lib/content";
import { mailLink, telLink, whatsappLink } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { ContactForm } from "@/components/pages/ContactForm";
import { TodoText } from "@/components/site/TodoText";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("contact", locale);
  return pageMetadata({ locale, href: "/contact", title: header.seoTitle, description: header.seoDescription });
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, settingsRow, locations, t, h] = await Promise.all([
    getPageHeader("contact", locale),
    getSettings(),
    getLocations(locale),
    getTranslations("contact"),
    headers(),
  ]);
  const settings = localizedSettings(settingsRow, locale);
  const location = locations[0];
  const tel = telLink(settings.phone);
  const wa = whatsappLink(settings.whatsapp);
  const mail = mailLink(settings.email);

  return (
    <>
      <PageHero title={header.title} intro={header.intro} art={header.art} imageAlt={header.imageAlt} />
      <PageSection>
        <div className="contact-layout">
          <div>
            <h2 className="section-subtitle">{t("formTitle")}</h2>
            <ContactForm
              turnstileSiteKey={process.env.TURNSTILE_SECRET_KEY ? (process.env.TURNSTILE_SITE_KEY ?? null) : null}
              nonce={h.get("x-nonce") ?? undefined}
            />
          </div>
          <address className="not-italic">
            <dl className="fact-list">
              <div>
                <dt>{t("phoneLabel")}</dt>
                <dd>{tel ? <a href={tel} className="link">{settings.phone}</a> : <TodoText value={settings.phone} />}</dd>
              </div>
              <div>
                <dt>{t("whatsappLabel")}</dt>
                <dd>
                  {wa ? (
                    <a href={wa} className="link" target="_blank" rel="noopener noreferrer">
                      {settings.whatsapp}
                    </a>
                  ) : (
                    <TodoText value={settings.whatsapp} />
                  )}
                </dd>
              </div>
              <div>
                <dt>{t("emailLabel")}</dt>
                <dd>{mail ? <a href={mail} className="link">{settings.email}</a> : <TodoText value={settings.email} />}</dd>
              </div>
              {location ? (
                <div>
                  <dt>{t("addressLabel")}</dt>
                  <dd>
                    <TodoText value={location.name} />
                    <br />
                    <TodoText value={location.address} />
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>{t("hoursLabel")}</dt>
                <dd>
                  {settings.workingHours.map((row) => (
                    <span key={row.label} className="block numerals">
                      {row.label}: {row.hours}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </address>
        </div>
      </PageSection>
    </>
  );
}
