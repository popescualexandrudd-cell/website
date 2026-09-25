import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getPageHeader, getSettings, localizedSettings } from "@/lib/content";
import { getPartnerBoard } from "@/lib/league-content";
import { slotLabel } from "@/lib/league";
import { localizedUrl, pageMetadata } from "@/lib/seo";
import { breadcrumbLd } from "@/lib/structured-data";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { JsonLd } from "@/components/pages/JsonLd";
import { PlayerForm } from "@/components/pages/PlayerForm";
import { PartnerRequestForm } from "@/components/pages/PartnerRequestForm";

const LEVELS = ["INCEPATOR", "INTERMEDIAR", "AVANSAT", "COMPETITIE"] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/partener-de-joc">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("partener", locale);
  return pageMetadata({
    locale,
    href: "/partener-de-joc",
    title: header.seoTitle,
    description: header.seoDescription,
  });
}

/**
 * "Find a hitting partner": the players the club approved, by level and when they play, and a
 * request that goes through the club. Only first names and initials are shown.
 */
export default async function PartnerPage({
  params,
  searchParams,
}: PageProps<"/[locale]/partener-de-joc">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const query = await searchParams;
  const [header, row, players, t, h] = await Promise.all([
    getPageHeader("partener", locale),
    getSettings(),
    getPartnerBoard(),
    getTranslations(),
    headers(),
  ]);
  const settings = localizedSettings(row, locale);
  if (!settings.leagueEnabled) notFound();
  const url = localizedUrl("/partener-de-joc", locale);
  const levelFilter = LEVELS.find((level) => level === query.nivel) ?? null;
  const shown = levelFilter ? players.filter((p) => p.level === levelFilter) : players;
  const selected =
    typeof query.jucator === "string" && players.some((p) => p.id === query.jucator)
      ? query.jucator
      : null;
  const turnstileSiteKey = process.env.TURNSTILE_SECRET_KEY
    ? (process.env.TURNSTILE_SITE_KEY ?? null)
    : null;
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: t("common.home"), url: localizedUrl("/", locale) },
          { name: header.title, url },
        ])}
      />
      <PageHero
        title={header.title}
        intro={header.intro}
        image={header.image}
        imageAlt={header.imageAlt}
      >
        <div className="page-hero-actions">
          <a href="#inscriere" className="btn btn-primary">
            {t("partner.signupCta")}
          </a>
          <Link href="/liga-amatori" className="btn btn-secondary">
            {t("partner.leagueCta")}
          </Link>
        </div>
      </PageHero>

      <PageSection id="cum-functioneaza" title={t("partner.howTitle")}>
        <ol className="step-cards">
          {(["one", "two", "three"] as const).map((step, i) => (
            <li key={step} className="step-card">
              <span className="step-card-number numerals" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="step-card-title">{t(`partner.steps.${step}`)}</h3>
              <p>{t(`partner.steps.${step}Text`)}</p>
            </li>
          ))}
        </ol>
      </PageSection>

      <PageSection id="jucatori" title={t("partner.boardTitle")}>
        {players.length > 0 ? (
          <>
            <nav className="partner-filter" aria-label={t("partner.filterLabel")}>
              <Link
                href={{ pathname: "/partener-de-joc", hash: "jucatori" }}
                className="finder-chip"
                aria-current={levelFilter === null ? "page" : undefined}
              >
                <span>{t("partner.allLevels")}</span>
              </Link>
              {LEVELS.map((level) => (
                <Link
                  key={level}
                  href={{ pathname: "/partener-de-joc", query: { nivel: level }, hash: "jucatori" }}
                  className="finder-chip"
                  aria-current={levelFilter === level ? "page" : undefined}
                >
                  <span>{t(`league.form.levels.${level}`)}</span>
                </Link>
              ))}
            </nav>
            {shown.length > 0 ? (
              <ul className="partner-cards">
                {shown.map((p) => (
                  <li key={p.id} className="partner-card">
                    <p className="kicker">{t(`league.form.levels.${p.level}`)}</p>
                    <h3 className="partner-card-name">{p.name}</h3>
                    <p className="partner-card-meta">
                      {[
                        p.singles ? t("league.form.singles") : null,
                        p.doubles ? t("league.form.doubles") : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {p.slots.length > 0
                        ? ` · ${p.slots.map((slot) => slotLabel(slot, locale)).join(", ")}`
                        : ""}
                    </p>
                    {p.about ? <p className="partner-card-about">{p.about}</p> : null}
                    <Link
                      href={{
                        pathname: "/partener-de-joc",
                        query: { jucator: p.id, ...(levelFilter ? { nivel: levelFilter } : {}) },
                        hash: "cerere",
                      }}
                      className="link"
                    >
                      {t("partner.playWith", { name: p.name })}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="measure text-cerneala-2">{t("partner.noneAtLevel")}</p>
            )}
          </>
        ) : (
          <p className="measure text-cerneala-2">{t("partner.empty")}</p>
        )}
      </PageSection>

      {players.length > 0 ? (
        <PageSection id="cerere" title={t("partner.requestTitle")} className="page-section--narrow">
          <p className="measure mb-6 text-cerneala-2">{t("partner.requestIntro")}</p>
          <PartnerRequestForm
            players={players.map((p) => ({
              id: p.id,
              label: `${p.name} · ${t(`league.form.levels.${p.level}`)}`,
            }))}
            selected={selected}
            turnstileSiteKey={turnstileSiteKey}
            nonce={nonce}
          />
        </PageSection>
      ) : null}

      <PageSection id="inscriere" title={t("partner.signupTitle")} className="page-section--narrow">
        <p className="measure mb-6 text-cerneala-2">{t("partner.signupIntro")}</p>
        <PlayerForm mode="partner" turnstileSiteKey={turnstileSiteKey} nonce={nonce} />
      </PageSection>
    </>
  );
}
