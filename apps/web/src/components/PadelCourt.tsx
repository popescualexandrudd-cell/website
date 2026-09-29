import { useTranslations } from "next-intl";
import * as tokens from "@jungle/design-tokens/tokens";

/**
 * A standard padel court seen from above (20 × 10 m, 20 units a metre): glass at both ends and
 * along the first metres of each side, mesh in between, the net across the middle, the service
 * lines 6.95 m from the net and the centre line between them. A generic diagram of the sport, not
 * a drawing of the club's courts.
 */
export function PadelCourt() {
  const t = useTranslations("web.site.padel.court");
  const glass = tokens.ColorBrass400;
  const line = tokens.ColorBone50;
  const muted = tokens.ColorBone200;
  return (
    <svg viewBox="-40 -40 480 290" role="img" aria-label={t("label")}>
      <title>{t("label")}</title>
      <rect x="0" y="0" width="400" height="200" fill={tokens.ColorForest700} />
      <g stroke={glass} strokeWidth="6" strokeLinecap="square">
        <path d="M0 0 V200 M400 0 V200" />
        <path d="M0 0 H80 M0 200 H80 M320 0 H400 M320 200 H400" />
      </g>
      <path d="M80 0 H320 M80 200 H320" stroke={muted} strokeWidth="3" strokeDasharray="4 5" />
      <g stroke={line} strokeWidth="2" fill="none">
        <path d="M61 0 V200 M339 0 V200 M61 100 H339" />
      </g>
      <path d="M200 -8 V208" stroke={line} strokeWidth="4" />
      <g fontFamily="Instrument Sans, system-ui, sans-serif" fontSize="14" fill={muted} textAnchor="middle">
        <text x="200" y="-18">{t("net")}</text>
        <text x="200" y="232">{t("length")}</text>
        <text x="-22" y="104" transform="rotate(-90 -22 100)">{t("width")}</text>
        <text x="40" y="-14" fill={glass}>{t("glass")}</text>
        <text x="130" y="-14">{t("mesh")}</text>
      </g>
    </svg>
  );
}
