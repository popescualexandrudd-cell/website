import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { ProgramView } from "@/lib/content";
import { getLessonTypes, getSettings } from "@/lib/content";
import { LazyBookingFlow } from "./LazyBookingFlow";
import { toBookableLessons, toBookablePrograms } from "./toBookable";

/** Home page: choose programme, lesson and duration, see the first free times. */
export async function BookingWidget({ programs }: { programs: ProgramView[] }) {
  const locale = (await getLocale()) as Locale;
  const [t, settings, lessons, h] = await Promise.all([
    getTranslations(),
    getSettings(),
    getLessonTypes(locale),
    headers(),
  ]);
  const bookablePrograms = toBookablePrograms(programs, t);
  const bookableLessons = toBookableLessons(lessons);
  if (bookablePrograms.length === 0 || bookableLessons.length === 0) return null;
  return (
    <LazyBookingFlow
      programs={bookablePrograms}
      lessons={bookableLessons}
      bookingMode={settings.bookingMode}
      currency={settings.currency}
      place={null}
      compact
      nonce={h.get("x-nonce") ?? undefined}
    />
  );
}
