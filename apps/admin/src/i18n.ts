/** Admin texts: `admin.*` in packages/i18n (RO/EN), API error codes under `errors.*`; club time
 * and lei from `@jungle/kiosk-kit` (money comes in bani, ADR-0009). */
import { createI18n } from "@jungle/kiosk-kit";

export { formatDate, formatMoney, formatTime, type Lang } from "@jungle/kiosk-kit";

export const { t, errorText } = createI18n("admin");
