import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { HeroVisual } from "@/components/HeroVisual";
import { IconCar, IconCheck, IconCoffee, IconLocker, IconLotus, IconMusic, IconPin, IconRoute } from "@/components/Icons";
import { LeagueCard } from "@/components/LeagueCard";
import { Reveal } from "@/components/Reveal";
import { SitePlan } from "@/components/SitePlan";
import { TimelineProgress } from "@/components/TimelineProgress";
import { WaitlistForm } from "@/components/WaitlistForm";
import { FullHome } from "@/components/FullHome";
import { siteMode } from "@/lib/flags";
import { ADDRESS, FACTS, MAP_URL, SITE_URL } from "@/lib/site";

// The footer shows the company details from the admin configuration: refresh the static page every 5 minutes.
export const revalidate = 300;

const FACILITIES: { key: "lockers" | "pilates" | "events" | "lounge"; icon: () => ReactNode }[] = [
  { key: "lockers", icon: () => <IconLocker size={44} /> },
  { key: "pilates", icon: () => <IconLotus size={44} /> },
  { key: "events", icon: () => <IconMusic size={44} /> },
  { key: "lounge", icon: () => <IconCoffee size={44} /> },
];

/** The pre-launch page (Stage 1B) until the owner turns on the full site (`full_site`, Q57). */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (await siteMode()) === "full" ? <FullHome /> : <PrelaunchHome locale={locale} />;
}

function PrelaunchHome({ locale }: { locale: string }) {
  const t = useTranslations("web");
  const points = t.raw("arena.points") as string[];
  const steps = t.raw("ecosystem.steps") as { title: string; text: string }[];
  const rules = t.raw("league.rules") as string[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: "Jungle Padel",
    url: `${SITE_URL}/${locale}`,
    description: t("meta.description"),
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDRESS.street,
      addressLocality: ADDRESS.locality,
      addressRegion: ADDRESS.region,
      addressCountry: ADDRESS.country,
    },
    sport: ["Padel", "Pilates"],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Hero: the view from the lounge, 3 m above the courts */}
      <section className="hero" aria-labelledby="hero-title">
        <HeroVisual alt={t("hero.renderAlt")} />
        <div className="container">
          <div className="hero-content">
            <p className="eyebrow">{t("hero.eyebrow")}</p>
            <h1 id="hero-title" className="h1">
              {t("hero.title")}
            </h1>
            <p className="lead">{t("hero.lead")}</p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#lista">
                {t("hero.ctaPrimary")}
              </a>
              <a className="btn btn-secondary" href="#arena">
                {t("hero.ctaSecondary")}
              </a>
            </div>
            <p className="render-note">{t("hero.renderNote")}</p>
          </div>
        </div>
      </section>

      {/* Arena */}
      <section id="arena" className="section" aria-labelledby="arena-title">
        <div className="container">
          <div className="split">
            <Reveal>
              <p className="kicker">{t("arena.kicker")}</p>
              <h2 id="arena-title" className="h2">
                {t("arena.title")}
              </h2>
              <p className="lead">{t("arena.lead")}</p>
            </Reveal>
            <Reveal delay={120}>
              <ul className="checklist">
                {points.map((point) => (
                  <li key={point}>
                    <IconCheck size={20} />
                    {point}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <dl className="stats">
            {(
              [
                [FACTS.courts, "courts"],
                [FACTS.loungeHeightM, "lounge"],
                [FACTS.parking, "parking"],
                [FACTS.seasonsOfPlay, "climate"],
              ] as const
            ).map(([value, key], i) => (
              <Reveal key={key} delay={i * 80} className="stat">
                <dt className="sr-only">{t(`arena.stats.${key}`)}</dt>
                <dd>
                  <strong>{value}</strong>
                  <span aria-hidden="true">{t(`arena.stats.${key}`)}</span>
                </dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* Automated ecosystem: booking → digital access → exit */}
      <section id="ecosistem" className="section section-dark" aria-labelledby="eco-title">
        <div className="container split">
          <div className="sticky-head">
            <p className="kicker">{t("ecosystem.kicker")}</p>
            <h2 id="eco-title" className="h2">
              {t("ecosystem.title")}
            </h2>
            <p className="lead">{t("ecosystem.lead")}</p>
          </div>
          <div className="timeline-wrap">
            <TimelineProgress />
            <ol className="timeline">
              {steps.map((step) => (
                <li key={step.title}>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Integrated facilities */}
      <section id="facilitati" className="section section-alt" aria-labelledby="fac-title">
        <div className="container">
          <Reveal className="section-head">
            <p className="kicker">{t("facilities.kicker")}</p>
            <h2 id="fac-title" className="h2">
              {t("facilities.title")}
            </h2>
            <p className="lead">{t("facilities.lead")}</p>
          </Reveal>
          <ul className="grid-4">
            {FACILITIES.map(({ key, icon }, i) => (
              <Reveal as="li" key={key} delay={i * 80}>
                <article className="facility">
                  <div className="facility-visual" aria-hidden="true">
                    {icon()}
                  </div>
                  <div className="facility-body">
                    <h3>{t(`facilities.items.${key}.title`)}</h3>
                    <p>{t(`facilities.items.${key}.text`)}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </ul>
          <p className="muted facilities-note">{t("facilities.rendersSoon")}</p>
        </div>
      </section>

      {/* League and status cards */}
      <section id="liga" className="section" aria-labelledby="league-title">
        <div className="container split">
          <Reveal>
            <p className="kicker">{t("league.kicker")}</p>
            <h2 id="league-title" className="h2">
              {t("league.title")}
            </h2>
            <p className="lead">{t("league.lead")}</p>
            <ul className="rules">
              {rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <a className="btn btn-primary" href="#lista">
              {t("league.cta")}
            </a>
          </Reveal>
          <Reveal delay={120}>
            <LeagueCard />
          </Reveal>
        </div>
      </section>

      {/* Location */}
      <section id="locatie" className="section section-alt" aria-labelledby="loc-title">
        <div className="container split">
          <Reveal>
            <p className="kicker">{t("location.kicker")}</p>
            <h2 id="loc-title" className="h2">
              {t("location.title")}
            </h2>
            <ul className="location-list">
              <li>
                <IconPin /> {t("location.address")}
              </li>
              <li>
                <IconRoute /> {t("location.access")}
              </li>
              <li>
                <IconCar /> {t("location.parking")}
              </li>
            </ul>
            <a className="btn btn-secondary" href={MAP_URL} target="_blank" rel="noopener noreferrer">
              {t("location.map")}
            </a>
          </Reveal>
          <Reveal delay={120}>
            <figure className="plan-figure">
              <SitePlan />
              <figcaption className="muted">{t("location.mapNote")}</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* Waitlist */}
      <section id="lista" className="section" aria-labelledby="wl-title">
        <div className="container split">
          <Reveal>
            <p className="kicker">{t("waitlist.kicker")}</p>
            <h2 id="wl-title" className="h2">
              {t("waitlist.title")}
            </h2>
            <p className="lead">{t("waitlist.lead")}</p>
          </Reveal>
          <Reveal delay={120} className="form-panel">
            <WaitlistForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
