"use client";

/**
 * The Pilates Reformer schedule of the next seven days (§9.2.9, R-103), read from the public API
 * every five minutes: the time in club time, the class type (R-101), the instructor's first name
 * and the places left; a full class says that the waiting list is open (R-102). While the data is
 * on its way the region is marked busy; without the API it says so, the rest of the section stays.
 */
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { type ClassDay, KINDS, schedule } from "@/lib/classes";
import { CLUB_TZ } from "@/lib/live";
import { LOCATION_SLUG } from "@/lib/site";

export const REFRESH_MS = 300_000;
/** Enough classes for a week of a small studio; the list is ordered by time on the server. */
const LIMIT = 60;

export function ClassSchedule() {
  const t = useTranslations("web.site.pilates.schedule");
  const kinds = useTranslations("web.site.pilates.kinds");
  const locale = useLocale();
  const [days, setDays] = useState<ClassDay[] | "error" | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const answer = await api
        .GET("/api/v1/classes", { params: { query: { location: LOCATION_SLUG, limit: LIMIT } } })
        .catch(() => null);
      if (!alive) return;
      setDays(answer?.data ? schedule(answer.data, new Date()) : "error");
    };
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const dayName = new Intl.DateTimeFormat(locale, { timeZone: CLUB_TZ, weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="classes" role="region" aria-labelledby="classes-title" aria-busy={days === null}>
      <h3 id="classes-title" className="pilates__h3">
        {t("title")}
      </h3>
      {days === null ? (
        <p className="pilates__text">{t("busy")}</p>
      ) : days === "error" ? (
        <p className="pilates__text">{t("error")}</p>
      ) : days.length === 0 ? (
        <p className="pilates__text">{t("empty")}</p>
      ) : (
        <ol className="classes__days">
          {days.map((day) => (
            <li key={day.day} className="classes__day">
              <h4>{dayName.format(new Date(`${day.day}T12:00:00Z`))}</h4>
              <ul className="classes__list">
                {day.classes.map((slot) => (
                  <li key={slot.id} className="classes__slot">
                    <span className="classes__time">
                      {slot.from}–{slot.to}
                    </span>
                    <span className="classes__kind">
                      {/* A type added later on the server, without texts yet, shows as it comes. */}
                      {(KINDS as readonly string[]).includes(slot.kind) ? kinds(`${slot.kind}.name`) : slot.kind}
                    </span>
                    <span className="classes__who">{t("with", { name: slot.instructor_name })}</span>
                    <span className={slot.places_left > 0 ? "classes__places" : "classes__places is-full"}>
                      {slot.places_left > 0 ? t("places", { count: slot.places_left }) : t("full")}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      <p className="pilates__more">
        <Link className="btn btn-primary" href="/bookings">
          {t("book")}
        </Link>
      </p>
    </div>
  );
}
