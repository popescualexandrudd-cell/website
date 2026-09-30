import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { type CalendarItem, eventsCalendar, FORMATS, kindOf, when, wording } from "@/lib/events";
import { CLUB_TZ, clubClock, clubDay } from "@/lib/live";
import { lei } from "@/lib/packages";

const CARDS = ["dj", "tournaments", "social"] as const;

/**
 * Section 12 of the full site (§9.2): events (R-110). DJ nights, the league's tournaments (§6.14)
 * and social padel, then the club's calendar as the panel publishes it (with the tournaments that
 * are open or under way), then the event room: 15–20 people, heated and cooled (§1), in the building
 * across the lane (Q46), requested from the account and confirmed by the manager (Q34). Rendered on
 * the server: no script is sent for it.
 */
export async function Events({ id }: { id: string }) {
  const t = await getTranslations("web.site.events");
  const locale = await getLocale();
  const calendar = await eventsCalendar();
  const room = calendar?.room ?? null;
  return (
    <section id={id} className="section section-alt events" aria-labelledby="events-section-title">
      <div className="container">
        <p className="kicker">{t("kicker")}</p>
        <h2 id="events-section-title" className="h2">
          {t("title")}
        </h2>
        <p className="lead">{t("lead")}</p>
        <ul className="padel__cards">
          {CARDS.map((key) => (
            <li key={key} className="padel__card">
              <h3 className="padel__h3">{t(`cards.${key}.title`)}</h3>
              <p>{t(`cards.${key}.text`)}</p>
            </li>
          ))}
        </ul>

        <div className="events__calendar" role="region" aria-labelledby="events-calendar-title">
          <h3 id="events-calendar-title" className="pilates__h3">
            {t("calendar.title")}
          </h3>
          {calendar === null ? (
            <p className="pilates__text">{t("calendar.error")}</p>
          ) : calendar.items.length === 0 ? (
            <p className="pilates__text">{t("calendar.empty")}</p>
          ) : (
            <ol className="events__list">
              {calendar.items.map((item) => (
                <Entry key={item.id} item={item} locale={locale} />
              ))}
            </ol>
          )}
          <p className="events__note">{t("calendar.clubTime")}</p>
        </div>

        <div className="events__room" role="region" aria-labelledby="events-room-title">
          <div>
            <h3 id="events-room-title" className="pilates__h3">
              {t("room.title")}
            </h3>
            <p className="pilates__text">{t("room.text")}</p>
            <p className="events__how">{t("room.how")}</p>
          </div>
          <ul className="tennis__facts events__facts" aria-label={t("room.factsLabel")}>
            {room?.capacity ? (
              <li>
                <span className="tennis__fact">{room.capacity}</span>
                <span className="tennis__fact-label">{t("room.people")}</span>
              </li>
            ) : null}
            {room?.price_per_hour ? (
              <li>
                <span className="tennis__fact">{t("room.price", { amount: lei(room.price_per_hour, locale) })}</span>
                <span className="tennis__fact-label">{room.provisional ? t("room.perHourProvisional") : t("room.perHour")}</span>
              </li>
            ) : null}
            <li>
              <span className="tennis__fact">{t("room.climate")}</span>
              <span className="tennis__fact-label">{t("room.climateLabel")}</span>
            </li>
          </ul>
        </div>
        <p className="pilates__more">
          <Link className="btn btn-primary" href="/events">
            {t("request")}
          </Link>
        </p>
      </div>
    </section>
  );
}

async function Entry({ item, locale }: { item: CalendarItem; locale: string }) {
  const t = await getTranslations("web.site.events.calendar");
  const { title, text } = wording(item, locale);
  const { day, from, to, endDay } = when(item);
  const date = (d: string, style: "long" | "short" = "long") =>
    new Intl.DateTimeFormat(locale, { timeZone: CLUB_TZ, weekday: style, day: "numeric", month: "long" }).format(new Date(`${d}T12:00:00Z`));
  const kind = kindOf(item);
  const tournament = item.tournament;
  const format = tournament && (FORMATS as readonly string[]).includes(tournament.format) ? t(`formats.${tournament.format}`) : null;
  const hours = !to ? t("from", { time: from }) : endDay ? t("untilDay", { from, to, day: date(endDay, "short") }) : `${from}–${to}`;
  return (
    <li className={item.cancelled ? "events__item is-cancelled" : "events__item"}>
      <p className="events__date">
        <time dateTime={item.starts_at}>{date(day)}</time>
        <span className="events__time">{hours}</span>
      </p>
      <div className="events__body">
        <p className="events__tags">
          <span className="events__kind">{t(`kinds.${kind}`)}</span>
          {format && <span>{format}</span>}
          {item.cancelled && <span className="events__flag">{t("cancelled")}</span>}
          {item.demo && <span className="events__flag">{t("demo")}</span>}
        </p>
        <h4 className="events__title">{title}</h4>
        {text && <p className="events__text">{text}</p>}
        {tournament &&
          (tournament.status === "in_progress" ? (
            <p className="events__text">{t("underWay")}</p>
          ) : (
            <p className="events__text">
              {tournament.places_left > 0
                ? t("entries", {
                    date: date(clubDay(new Date(tournament.registration_closes_at)), "short"),
                    time: clubClock(new Date(tournament.registration_closes_at)),
                    places: tournament.places_left,
                  })
                : t("full")}
            </p>
          ))}
      </div>
    </li>
  );
}
