/**
 * Payments Kiosk texts: `payKiosk.*` in packages/i18n (RO/EN, ICU MessageFormat), the API's
 * error codes under `errors.*`; club time and lei (`@jungle/kiosk-kit`).
 */
import { createI18n, formatMoney, type Lang } from "@jungle/kiosk-kit";

export { formatDate, formatMoney, formatTime, type Lang, type Params } from "@jungle/kiosk-kit";

export const { t, errorText } = createI18n("payKiosk");

/** Money with the language already chosen: `lei(24000)` → "240 lei". */
export function moneyIn(lang: Lang): (bani: number) => string {
  return (bani) => formatMoney(lang, bani);
}
