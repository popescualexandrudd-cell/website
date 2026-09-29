/**
 * Screen texts: `screens.*` in packages/i18n (RO/EN), club time (`@jungle/kiosk-kit`), and the
 * public fields of a player (R-012) as §8.5 shows them: "Diamant II · 67 LP · Nivel 5.2".
 */
import { createI18n, type Lang } from "@jungle/kiosk-kit";
import type { Player, Row } from "./api";

export { formatDate, formatTime, type Lang } from "@jungle/kiosk-kit";

export const { t, errorText } = createI18n("screens");

export function rankText(lang: Lang, tier: string, division: string): string {
  if (!tier) return "";
  return `${t(lang, `tiers.${tier}`)} ${division}`.trim();
}

/** The name, or "Jucător" for someone who is not public (Q55). */
export function playerName(lang: Lang, player: Player): string {
  return player.name || t(lang, "player");
}

export function playerDetails(lang: Lang, player: Player): string {
  const parts: string[] = [];
  const rank = rankText(lang, player.tier, player.division);
  if (rank) parts.push(rank);
  if (rank && player.lp !== null) parts.push(t(lang, "lp", { lp: player.lp }));
  if (player.level !== null) parts.push(t(lang, "level", { level: player.level.toFixed(1) }));
  return parts.join(" · ");
}

export function rowDetails(lang: Lang, row: Row): string {
  return [rankText(lang, row.tier, row.division), t(lang, "lp", { lp: row.lp })].filter(Boolean).join(" · ");
}

export function sessionType(lang: Lang, type: string): string {
  return t(lang, `types.${type}`);
}

export function upper(lang: Lang, text: string): string {
  return text.toLocaleUpperCase(lang === "ro" ? "ro-RO" : "en-GB");
}
