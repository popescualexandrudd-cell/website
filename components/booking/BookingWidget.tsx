import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import type { ProgramView } from "@/lib/content";
import { getSettings } from "@/lib/content";
import { LazyBookingFlow } from "./LazyBookingFlow";
import { toBookable } from "./toBookable";

/** Scene 10: choose a programme, see the first free times, book without leaving the page. */
export async function BookingWidget({ programs }: { programs: ProgramView[] }) {
  const [t, settings, h] = await Promise.all([getTranslations(), getSettings(), headers()]);
  const bookable = toBookable(programs, t);
  if (bookable.length === 0) return null;
  return (
    <LazyBookingFlow
      programs={bookable}
      bookingMode={settings.bookingMode}
      compact
      turnstileSiteKey={
        process.env.TURNSTILE_SECRET_KEY ? (process.env.TURNSTILE_SITE_KEY ?? null) : null
      }
      nonce={h.get("x-nonce") ?? undefined}
    />
  );
}
