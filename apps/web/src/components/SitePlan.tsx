import { useTranslations } from "next-intl";
import * as tokens from "@jungle/design-tokens/tokens";

/**
 * The club seen from above, redrawn from the owner's sketch (27.09.2026): the padel building
 * (courts 2 × 2, gallery lounge between the rows, café, reception, changing rooms), the driveway
 * with access from both ends, the Pilates and event building and the car parks. Not to scale;
 * the parkour area stays out until its feature flag is on (§ launch rules).
 */
export function SitePlan() {
  const t = useTranslations("web.location.plan");
  const line = tokens.ColorBone400;
  const brass = tokens.ColorBrass400;
  const text = tokens.ColorBone50;
  const court = { fill: tokens.ColorForest700, stroke: brass };
  return (
    <svg viewBox="0 0 900 640" role="img" aria-label={t("title")}>
      <title>{t("title")}</title>
      <g fontFamily="Instrument Sans, system-ui, sans-serif" fontSize="15" fill={text}>
        <rect x="420" y="0" width="64" height="640" fill={tokens.ColorNight700} />
        <text x="452" y="320" textAnchor="middle" transform="rotate(-90 452 320)" fill={line} letterSpacing="4">
          {t("alley").toUpperCase()}
        </text>
        <text x="452" y="26" textAnchor="middle" fill={brass}>{t("access")}</text>
        <text x="452" y="626" textAnchor="middle" fill={brass}>{t("access")}</text>

        <rect x="30" y="30" width="360" height="420" fill="none" stroke={text} strokeWidth="2" />
        <rect x="48" y="48" width="154" height="130" {...court} />
        <rect x="218" y="48" width="154" height="130" {...court} />
        <rect x="48" y="222" width="154" height="130" {...court} />
        <rect x="218" y="222" width="154" height="130" {...court} />
        <text x="210" y="120" textAnchor="middle">{t("courts")}</text>
        <rect x="40" y="184" width="340" height="32" fill={brass} fillOpacity="0.28" stroke={brass} />
        <text x="210" y="205" textAnchor="middle" fontSize="14">{t("gallery")}</text>
        <rect x="40" y="360" width="340" height="28" fill={tokens.ColorNight700} />
        <text x="56" y="379" fontSize="14">{t("cafe")}</text>
        <rect x="40" y="394" width="170" height="48" fill={tokens.ColorNight700} stroke={line} />
        <rect x="210" y="394" width="170" height="48" fill={tokens.ColorNight700} stroke={line} />
        <text x="125" y="423" textAnchor="middle">{t("reception")}</text>
        <text x="295" y="423" textAnchor="middle">{t("lockers")}</text>
        <path d="M210 452 L210 478" stroke={brass} strokeWidth="2" />
        <text x="210" y="498" textAnchor="middle" fill={brass}>{t("entrance")}</text>
        <rect x="30" y="514" width="360" height="110" fill="none" stroke={line} strokeDasharray="6 5" />
        <text x="210" y="575" textAnchor="middle" fill={line}>{t("parking")}</text>

        <rect x="514" y="30" width="356" height="80" fill="none" stroke={line} strokeDasharray="6 5" />
        <text x="692" y="76" textAnchor="middle" fill={line}>{t("parking")}</text>
        <rect x="514" y="130" width="356" height="220" fill="none" stroke={text} strokeWidth="2" />
        <g fill={brass} fillOpacity="0.3" stroke={brass}>
          <rect x="560" y="170" width="70" height="36" />
          <rect x="754" y="170" width="70" height="36" />
          <rect x="560" y="230" width="70" height="36" />
          <rect x="754" y="230" width="70" height="36" />
        </g>
        <text x="692" y="320" textAnchor="middle">{t("pilates")}</text>
        <rect x="514" y="370" width="356" height="190" fill={tokens.ColorNight700} stroke={text} strokeWidth="2" />
        <text x="692" y="470" textAnchor="middle">{t("events")}</text>
      </g>
    </svg>
  );
}
