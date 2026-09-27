import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { CountUp } from "@/components/CountUp";
import HeroSceneLoader from "@/components/HeroSceneLoader";
import {
  IconCar, IconCoffee, IconCrown, IconLotus, IconMusic, IconParty, IconPin, IconRacket, IconRoute, IconStar, IconTrophy,
} from "@/components/Icons";
import { Reveal } from "@/components/Reveal";
import { Tilt } from "@/components/Tilt";
import { WaitlistForm } from "@/components/WaitlistForm";
import { ADDRESS, FACTS, MAP_URL, SITE_URL } from "@/lib/site";

const CARDS = [
  { key: "padel", icon: IconRacket, accent: "var(--gradient-sunset)", shadow: "rgb(255 61 165 / .8)" },
  { key: "league", icon: IconTrophy, accent: "linear-gradient(135deg,#FFD84D,#FF8A1F)", shadow: "rgb(255 138 31 / .8)" },
  { key: "pilates", icon: IconLotus, accent: "var(--gradient-lagoon)", shadow: "rgb(43 232 210 / .7)" },
  { key: "cafe", icon: IconCoffee, accent: "linear-gradient(135deg,#FFA552,#FF3DA5)", shadow: "rgb(255 61 165 / .7)" },
  { key: "events", icon: IconMusic, accent: "linear-gradient(135deg,#FF6CBC,#6D7DFF)", shadow: "rgb(109 125 255 / .7)" },
  { key: "room", icon: IconParty, accent: "linear-gradient(135deg,#7FF3E4,#FFD84D)", shadow: "rgb(127 243 228 / .7)" },
] as const;

const RANKS = ["bronze", "silver", "gold", "platinum", "diamond", "master", "king"] as const;

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("web");
  const marquee = t.raw("marquee") as string[];

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

      {/* Hero */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-backdrop" />
        <HeroSceneLoader />
        <div className="container hero-content">
          <p className="eyebrow">
            <span className="dot" aria-hidden="true" />
            {t("hero.eyebrow")}
          </p>
          <h1 id="hero-title" className="display hero-title">
            <span className="line">{t("hero.title1")}</span>
            <span className="line glow">{t("hero.title2")}</span>
          </h1>
          <p className="hero-lead">{t("hero.lead")}</p>
          <div className="hero-ctas">
            <a className="btn btn-primary" href="#lista">
              {t("hero.ctaPrimary")}
            </a>
            <a className="btn btn-ghost" href="#club">
              {t("hero.ctaSecondary")}
            </a>
          </div>
        </div>
        <div className="scroll-hint" aria-hidden="true">
          <i />
          {t("hero.scroll")}
        </div>
        <p className="hero-note">{t("hero.note")}</p>
      </section>

      {/* Marquee */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...marquee, ...marquee].map((word, i) => (
            <span key={i}>{word}</span>
          ))}
        </div>
      </div>

      {/* Club */}
      <section id="club" className="section" aria-labelledby="club-title">
        <div className="aurora" />
        <div className="container">
          <Reveal className="section-head">
            <p className="kicker">{t("club.kicker")}</p>
            <h2 id="club-title" className="section-title">{t("club.title")}</h2>
            <p className="lead">{t("club.lead")}</p>
          </Reveal>
          <ul className="cards" role="list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {CARDS.map(({ key, icon: Icon, accent, shadow }, i) => (
              <Reveal as="li" key={key} delay={i * 90}>
                <Tilt>
                  <article className="card">
                    <div className="card-icon" style={{ "--accent": accent, "--accent-shadow": shadow } as CSSProperties}>
                      <Icon />
                    </div>
                    <h3>{t(`club.cards.${key}.title`)}</h3>
                    <p>{t(`club.cards.${key}.text`)}</p>
                  </article>
                </Tilt>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* League */}
      <section id="liga" className="section" aria-labelledby="league-title">
        <div className="container league-grid">
          <Reveal>
            <p className="kicker">{t("league.kicker")}</p>
            <h2 id="league-title" className="section-title">{t("league.title")}</h2>
            <p className="lead">{t("league.lead")}</p>
            <ul className="facts">
              <li>{t("league.facts.ladders")}</li>
              <li>{t("league.facts.season")}</li>
              <li>{t("league.facts.live")}</li>
            </ul>
          </Reveal>
          <Reveal delay={150}>
            <ol className="medals" aria-label={t("league.kicker")} style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {RANKS.map((rank, i) => (
                <li key={rank}>
                  <figure className="medal-wrap" style={{ margin: 0 }}>
                    <div className={`medal rank-${rank}`} style={{ "--delay": `${-i * 1.1}s` } as CSSProperties} aria-hidden="true">
                      <div className="edge" />
                      <div className="face">{rank === "king" ? <IconCrown /> : <IconStar />}</div>
                      <div className="face back">{rank === "king" ? <IconCrown /> : <IconStar />}</div>
                    </div>
                    <figcaption>{t(`league.ranks.${rank}`)}</figcaption>
                  </figure>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* Numbers */}
      <section className="section" aria-labelledby="numbers-title" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal className="section-head">
            <p id="numbers-title" className="kicker">{t("numbers.kicker")}</p>
          </Reveal>
          <div className="numbers">
            {(
              [
                [FACTS.courts, "courts"],
                [FACTS.reformersAtOpening, "reformers"],
                [FACTS.parking, "parking"],
                [FACTS.seasonMonths, "season"],
              ] as const
            ).map(([n, key], i) => (
              <Reveal key={key} delay={i * 90}>
                <div className="number">
                  <CountUp to={n} />
                  <span>{t(`numbers.${key}`)}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Location */}
      <section id="locatie" className="section" aria-labelledby="loc-title">
        <div className="container location">
          <Reveal>
            <p className="kicker">{t("location.kicker")}</p>
            <h2 id="loc-title" className="section-title">{t("location.title")}</h2>
            <ul className="loc-list">
              <li><IconPin /> {t("location.address")}</li>
              <li><IconRoute /> {t("location.access")}</li>
              <li><IconCar /> {t("location.parking")}</li>
            </ul>
            <a className="btn btn-ghost" href={MAP_URL} target="_blank" rel="noopener noreferrer">
              {t("location.map")}
            </a>
          </Reveal>
          <Reveal delay={150}>
            <div className="map-card" aria-hidden="true">
              <div className="road" style={{ left: "-10%", right: "-10%", top: "38%", transform: "rotate(-8deg)" }} />
              <div className="road" style={{ top: "-10%", bottom: "-10%", left: "30%", width: 12, height: "auto", transform: "rotate(12deg)" }} />
              <div className="road" style={{ left: "40%", right: "-10%", top: "70%", transform: "rotate(4deg)", height: 10 }} />
              <div className="map-pin" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Waitlist */}
      <section id="lista" className="section" aria-labelledby="wl-title">
        <div className="container">
          <Reveal className="waitlist">
            <div>
              <p className="kicker">{t("waitlist.kicker")}</p>
              <h2 id="wl-title" className="section-title">
                <span className="gradient-text">{t("waitlist.title")}</span>
              </h2>
              <p className="lead">{t("waitlist.lead")}</p>
            </div>
            <WaitlistForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
