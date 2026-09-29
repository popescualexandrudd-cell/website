/**
 * League Kiosk texts: `kiosk.*` in packages/i18n (RO/EN, ICU MessageFormat), the API's error
 * codes under `errors.*`; times in club time (`@jungle/kiosk-kit`).
 */
import { createI18n, type Lang } from "@jungle/kiosk-kit";

export { formatTime, type Lang, type Params, TIME_ZONE } from "@jungle/kiosk-kit";

export const { t, errorText } = createI18n("kiosk");

/** "Aur II", "Maestru"; empty while the player is in placement (§6.5). */
export function rankName(lang: Lang, tier: string, division: string): string {
  if (!tier) return "";
  const name = t(lang, `tiers.${tier}`);
  return tier === "master" || !division ? name : `${name} ${division}`;
}
