import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import {
  getFacilities,
  getLocations,
  getPageHeader,
  getSettings,
  localizedSettings,
} from "@/lib/content";
import { localDateKey } from "@/lib/availability";
import { telLink, whatsappLink } from "@/lib/format";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { breadcrumbLd, courtHireLd } from "@/lib/structured-data";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { JsonLd } from "@/components/pages/JsonLd";
import { CourtRequestForm } from "@/components/pages/CourtRequestForm";
import { CourtMark } from "@/components/ui/CourtMark";
import { Markdown } from "@/components/site/Markdown";
import { TodoText } from "@/components/site/TodoText";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/inchiriere-teren">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("inchiriere", locale);
  return pageMetadata({
    locale,
    href: "/inchiriere-teren",
    title: header.seoTitle,
    description: header.seoDescription,
  });
}

/** The club's opening hours ("08:00–23:00") from the settings, for the request form. */
function openingRange(hours: { hours: string }[]): { open: string; close: string } {
  for (const row of hours) {
    const match = row.hours.match(/(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/);
    if (match?.[1] && match[2]) return { open: match[1], close: match[2] };
  }
  return { open: "08:00", close: "22:00" };
}

/**
 * Court hire: the courts (covered and outdoor), the hours and rates, what the club offers
 * around the court, and a request form the club confirms by phone.
 */
export default async function CourtHirePage({ params }: PageProps<"/[locale]/inchiriere-teren">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, row, locations, facilities, t, h] = await Promise.all([
    getPageHeader("inchiriere", locale),
    getSettings(),
    getLocations(locale),
    getFacilities(locale),
    getTranslations(),
    headers(),
  ]);
  const settings = localizedSettings(row, locale);
  const tel = telLink(settings.phone);
  const whatsapp = whatsappLink(settings.whatsapp);
  const location = locations[0] ?? null;
  const courts = location?.courts ?? [];
  const amenities = facilities.filter((f) => f.type === "DOTARE_BAZA");
  const { open, close } = openingRange(settings.workingHours);
  const url = localizedUrl("/inchiriere-teren", locale);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: t("common.home"), url: localizedUrl("/", locale) },
            { name: header.title, url },
          ]),
          courtHireLd(settings, header.title, header.seoDescription, url),
        ]}
      />
      <PageHero
        title={header.title}
        intro={header.intro}
        image={header.image}
        imageAlt={header.imageAlt}
      >
        <div className="page-hero-actions">
          {tel ? (
            <a href={tel} className="btn btn-primary">
              {t("rental.callCta", { phone: settings.phone })}
            </a>
          ) : null}
          {whatsapp ? (
            <a
              href={whatsapp}
              className="btn btn-secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("rental.whatsappCta")}
            </a>
          ) : null}
          <a href="#cerere" className="btn btn-secondary">
            {t("rental.requestCta")}
          </a>
        </div>
      </PageHero>

      {courts.length > 0 ? (
        <PageSection id="terenuri" title={t("rental.courtsTitle")}>
          <ul className="court-cards">
            {courts.map((court) => (
              <li
                key={court.id}
                className="court-card"
                data-covered={court.coveredInWinter ? "true" : "false"}
              >
                <CourtMark className="court-card-mark" />
                <div className="court-card-body">
                  <p className="kicker">
                    {court.coveredInWinter ? t("rental.covered") : t("rental.outdoor")}
                  </p>
                  <h3 className="court-card-title">
                    {court.count !== null ? (
                      t("rental.courtsCount", {
                        count: court.count,
                        surface: t(`facilities.surface.${court.surface}`),
                      })
                    ) : (
                      <TodoText value={court.name} />
                    )}
                  </h3>
                  {court.floodlights ? (
                    <p className="court-card-note">{t("rental.floodlights")}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      <PageSection id="program" className="rental-facts">
        <div className="rental-facts-grid">
          <div>
            <h2 className="section-subtitle">{t("rental.hoursTitle")}</h2>
            <dl className="fact-list">
              {settings.workingHours.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd className="numerals">
                    <TodoText value={row.hours} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="section-subtitle">{t("rental.ratesTitle")}</h2>
            <Markdown
              source={settings.rentalRates || t("rental.callCta", { phone: settings.phone })}
            />
          </div>
        </div>
      </PageSection>

      <PageSection id="cum-rezervi" title={t("rental.howTitle")}>
        <ol className="step-cards">
          {(["one", "two", "three"] as const).map((step, i) => (
            <li key={step} className="step-card">
              <span className="step-card-number numerals" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="step-card-title">{t(`rental.steps.${step}`)}</h3>
              <p>{t(`rental.steps.${step}Text`)}</p>
            </li>
          ))}
        </ol>
      </PageSection>

      <PageSection id="cerere" title={t("rental.formTitle")} className="page-section--narrow">
        <p className="measure mb-6 text-cerneala-2">{t("rental.formIntro")}</p>
        <CourtRequestForm
          today={localDateKey(new Date(), settings.timezone)}
          open={open}
          close={close}
          turnstileSiteKey={
            process.env.TURNSTILE_SECRET_KEY ? (process.env.TURNSTILE_SITE_KEY ?? null) : null
          }
          nonce={h.get("x-nonce") ?? undefined}
        />
      </PageSection>

      {amenities.length > 0 ? (
        <PageSection id="dotari" title={t("rental.amenitiesTitle")}>
          <ul className="amenity-cards">
            {amenities.map((a) => (
              <li key={a.id} className="amenity-card">
                <h3 className="amenity-card-title">
                  <TodoText value={a.name} />
                </h3>
                {a.description ? (
                  <p>
                    <TodoText value={a.description} />
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <aside className="rental-lessons">
            <h3 className="section-subtitle">{t("rental.lessonsTitle")}</h3>
            <p>{t("rental.lessonsText")}</p>
            <Link href="/preturi" className="btn btn-primary btn-arrow">
              {t("rental.lessonsCta")}
            </Link>
          </aside>
        </PageSection>
      ) : null}
    </>
  );
}
