import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { LessonTypeView } from "@/lib/content";
import { formatPrice } from "@/lib/format";
import { durationLabel, formatAmount, lessonPrice } from "@/lib/pricing";

type T = Awaited<ReturnType<typeof getTranslations>>;

/** "60, 90, 120 sau 180 de minute" */
export function durationsText(durations: number[], t: T): string {
  const list =
    durations.length > 1
      ? `${durations.slice(0, -1).join(", ")} ${t("programs.or")} ${durations.at(-1)}`
      : String(durations[0] ?? "");
  return t("programs.durations", { list });
}

export function peopleText(lesson: LessonTypeView, t: T): string {
  return lesson.minParticipants === lesson.maxParticipants
    ? t("booking.persons", { count: lesson.minParticipants })
    : t("booking.personsRange", { min: lesson.minParticipants, max: lesson.maxParticipants });
}

/**
 * The kinds of session (private, for 2, for 3, group) with who they are for, the durations on
 * offer and the hourly rate (or where to ask for it); each links to the booking flow with
 * the lesson (and, on a programme page, the programme) already chosen.
 */
export async function LessonTypeList({
  lessons,
  locale,
  currency,
  programSlug,
  withPrices = false,
}: {
  lessons: LessonTypeView[];
  locale: string;
  currency: string;
  programSlug?: string;
  /** Adds the price of every duration under the hourly rate (price list). */
  withPrices?: boolean;
}) {
  const t = await getTranslations();
  return (
    <ul>
      {lessons.map((lesson) => {
        const perPerson = lesson.priceUnit === "PERSOANA";
        const query = programSlug
          ? { program: programSlug, tip: lesson.slug }
          : { tip: lesson.slug };
        return (
          <li key={lesson.id} className="ed-row ed-row--no-image">
            <div>
              <h3 className="ed-row-title">{lesson.name}</h3>
              <p className="ed-row-meta">
                {peopleText(lesson, t)} · {durationsText(lesson.durations, t)}
              </p>
              <p className="ed-row-text">{lesson.summary}</p>
              {withPrices && lesson.hourlyRate !== null ? (
                <p className="lesson-prices numerals">
                  {lesson.durations
                    .map((minutes) => {
                      const amount = lessonPrice(lesson.hourlyRate, minutes);
                      return amount === null
                        ? null
                        : `${durationLabel(minutes)}: ${formatAmount(amount, currency, locale)}`;
                    })
                    .filter(Boolean)
                    .join(" · ")}
                  {perPerson ? ` (${t("booking.perPersonShort")})` : ""}
                </p>
              ) : null}
              {lesson.bookableOnline ? (
                <p className="mt-3">
                  <Link href={{ pathname: "/rezervare", query }} className="link">
                    {t("programs.bookLesson", { lesson: lesson.name.toLocaleLowerCase(locale) })}
                  </Link>
                </p>
              ) : null}
            </div>
            {lesson.hourlyRate !== null ? (
              <p className="ed-row-aside numerals">
                {formatPrice(lesson.hourlyRate, currency, locale)}{" "}
                <span className="text-note text-cerneala-2">
                  {perPerson ? t("programs.perHourPerson") : t("programs.perHour")}
                </span>
              </p>
            ) : (
              <p className="ed-row-aside text-note">{t("programs.rateOnRequest")}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
