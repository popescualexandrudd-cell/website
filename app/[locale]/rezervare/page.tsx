import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import {
  getLessonTypes,
  getLocations,
  getPageHeader,
  getPrograms,
  getSettings,
} from "@/lib/content";
import { isSlotAvailable } from "@/lib/availability";
import { loadEngineInput } from "@/lib/availability-data";
import { formatDate, formatTime } from "@/lib/format";
import { isTodo } from "@/lib/i18n-content";
import { pageMetadata } from "@/lib/seo";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { BookingFlow, type BookingSelection } from "@/components/booking/BookingFlow";
import { toBookableLessons, toBookablePrograms } from "@/components/booking/toBookable";
import { normalizeGiftCode } from "@/lib/gift-cards";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/rezervare">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("rezervare", locale);
  return pageMetadata({
    locale,
    href: "/rezervare",
    title: header.seoTitle,
    description: header.seoDescription,
  });
}

function param(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.length <= 80 ? value : null;
}

export default async function BookingPage({
  params,
  searchParams,
}: PageProps<"/[locale]/rezervare">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const query = await searchParams;
  const [header, programs, lessons, locations, settings, t, h] = await Promise.all([
    getPageHeader("rezervare", locale),
    getPrograms(locale),
    getLessonTypes(locale),
    getLocations(locale),
    getSettings(),
    getTranslations(),
    headers(),
  ]);
  const bookablePrograms = toBookablePrograms(programs, t);
  const bookableLessons = toBookableLessons(lessons);

  // Choices made elsewhere arrive in the address: ?program=initiere&tip=lectie-individuala&durata=90
  // (from a programme page, the price list or the home widget, which also sends &ora=<start>).
  const program = bookablePrograms.find((p) => p.slug === param(query.program)) ?? null;
  const lesson = bookableLessons.find((l) => l.slug === param(query.tip)) ?? null;
  const durationParam = Number(param(query.durata));
  const durationMin = lesson?.durations.includes(durationParam) ? durationParam : null;
  const participantsParam = Number(param(query.participanti));
  const initial: BookingSelection = {
    programId: program?.id ?? null,
    lessonTypeId: lesson?.id ?? null,
    durationMin,
    participants: Number.isInteger(participantsParam) ? participantsParam : null,
    slot: null,
    giftCode: normalizeGiftCode(param(query.cod) ?? ""),
  };
  const start = param(query.ora);
  if (program && lesson && durationMin && start && !Number.isNaN(Date.parse(start))) {
    const startsAt = new Date(start);
    const engine = await loadEngineInput();
    // A time picked on the home page may have been taken meanwhile: only keep it if still free.
    if (isSlotAvailable(engine, startsAt, durationMin)) {
      const tz = engine.settings.timezone;
      const end = new Date(startsAt.getTime() + durationMin * 60_000);
      const day = formatDate(
        startsAt,
        tz,
        locale,
        locale === "en" ? "EEEE d MMMM" : "EEEE, d MMMM",
      );
      initial.slot = {
        start: startsAt.toISOString(),
        label: `${day}, ${formatTime(startsAt, tz)}–${formatTime(end, tz)}`,
      };
    }
  }

  const location = locations[0];
  const place =
    location && !isTodo(location.address)
      ? `${location.name}, ${location.address}`
      : (location?.name ?? null);

  return (
    <>
      <PageHero
        title={header.title}
        intro={header.intro}
        image={header.image}
        imageAlt={header.imageAlt}
      />
      <PageSection className="page-section--narrow">
        <BookingFlow
          programs={bookablePrograms}
          lessons={bookableLessons}
          initial={initial}
          bookingMode={settings.bookingMode}
          currency={settings.currency}
          place={place}
          turnstileSiteKey={
            process.env.TURNSTILE_SECRET_KEY ? (process.env.TURNSTILE_SITE_KEY ?? null) : null
          }
          nonce={h.get("x-nonce") ?? undefined}
        />
      </PageSection>
    </>
  );
}
