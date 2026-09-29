/** Café display texts: `cafeDisplay.*` in packages/i18n (RO/EN), club time (`@jungle/kiosk-kit`). */
import { createI18n } from "@jungle/kiosk-kit";

export { formatTime, type Lang } from "@jungle/kiosk-kit";

export const { t, errorText } = createI18n("cafeDisplay");
