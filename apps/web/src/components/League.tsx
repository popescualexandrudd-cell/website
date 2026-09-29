import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PointsSimulator } from "./PointsSimulator";
import { StandingsPreview } from "./StandingsPreview";

const STEPS = ["bronze", "silver", "gold", "platinum", "diamond", "master", "king"] as const;
const EARN = ["even", "upset", "level", "tournament", "placement"] as const;
const REWARDS = ["ranks", "kings", "diamond"] as const;

/**
 * Section 7 of the full site (§9.2): Liga Jungle. The ranks on a rising scale (§6.5), how LP is
 * earned (§6.6), the seasons and the minimum of matches (§6.10, §6.13, Q27), the rewards (§6.12, Q6,
 * R-024), the points simulator (the league engine through the API) and the live standings (R-012).
 * From the website the league is only watched: scores are entered at the League Kiosk (invariants
 * 1 and 2).
 */
export async function League({ id }: { id: string }) {
  const t = await getTranslations("web.site.league");
  return (
    <section id={id} className="section league" aria-labelledby="league-title">
      <div className="container">
        <p className="kicker">{t("kicker")}</p>
        <h2 id="league-title" className="h2">
          {t("title")}
        </h2>
        <p className="lead">{t("lead")}</p>

        <h3 className="league__h3">{t("ranks.title")}</h3>
        <ol className="ranks" aria-label={t("ranks.label")}>
          {STEPS.map((step, i) => (
            <li key={step} className={`rank rank--${step}`} style={{ "--step": i } as CSSProperties}>
              <RankEmblem step={step} />
              <span className="rank__name">{t(`ranks.${step}`)}</span>
              <span className="rank__note">
                {step === "king" ? t("ranks.kingNote") : step === "master" ? t("ranks.masterNote") : t("ranks.divisions")}
              </span>
            </li>
          ))}
        </ol>
        <p className="league__rules">{t("ranks.rules")}</p>

        <h3 className="league__h3">{t("earn.title")}</h3>
        <ul className="league__cards">
          {EARN.map((key) => (
            <li key={key} className="league__card">
              <h4>{t(`earn.${key}.title`)}</h4>
              <p>{t(`earn.${key}.text`)}</p>
            </li>
          ))}
        </ul>

        <div className="league__split">
          <div>
            <h3 className="league__h3">{t("seasons.title")}</h3>
            <p className="league__text">{t("seasons.text")}</p>
          </div>
          <div>
            <h3 className="league__h3">{t("rewards.title")}</h3>
            <ul className="league__rewards">
              {REWARDS.map((key) => (
                <li key={key}>{t(`rewards.${key}`)}</li>
              ))}
            </ul>
          </div>
        </div>

        <PointsSimulator />
        <StandingsPreview />
        <p className="league__more">
          <Link className="btn btn-secondary" href="/league">
            {t("standings.all")}
          </Link>
        </p>
      </div>
    </section>
  );
}

/** A decorative emblem per step: a shield for the four metals, a gem, a star, a crown. */
function RankEmblem({ step }: { step: (typeof STEPS)[number] }) {
  const shape =
    step === "diamond"
      ? "M24 4 L40 18 L24 44 L8 18 Z M8 18 H40 M18 18 L24 44 L30 18 M16 11 L18 18 M32 11 L30 18"
      : step === "master"
        ? "M24 4 L29.5 17.5 L44 18.5 L33 28 L36.5 42.5 L24 34.5 L11.5 42.5 L15 28 L4 18.5 L18.5 17.5 Z"
        : step === "king"
          ? "M6 38 L4 14 L15 24 L24 8 L33 24 L44 14 L42 38 Z M6 42 H42"
          : "M24 4 L40 10 V24 C40 34 33 40 24 44 C15 40 8 34 8 24 V10 Z";
  return (
    <svg className="rank__emblem" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d={shape} fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
