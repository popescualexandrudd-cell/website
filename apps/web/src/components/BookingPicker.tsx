"use client";

/**
 * Online booking (§9.3 `/rezervari`): a day, a duration, then a free start on a padel court, from
 * the public availability; the price is the club's (R-052, "orientativ" while DE_STABILIT, Q21).
 * Booking needs an account with a confirmed email; the server checks the slot again and refuses
 * overlaps (R-043). Paid at the club, at the Payments Kiosk (R-063, Q9). No credits (invariant 14).
 */
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import * as account from "@/lib/account";
import { api } from "@/lib/api";
import { nextDays, onlineCourts, type Slot, slotsFor } from "@/lib/booking";
import type { DayAvailability } from "@/lib/live";
import { lei } from "@/lib/packages";
import { LOCATION_SLUG } from "@/lib/site";
import { useErrorText } from "./useErrorText";

type Choice = { courtId: string; courtName: string; slot: Slot };
type Quote = { total: number; provisional: boolean };
type Who = "loading" | "anonymous" | account.Me;

const DAYS = 14;

export function BookingPicker({ locale }: { locale: string }) {
  const t = useTranslations("web.bookings");
  const format = useFormatter();
  const errorText = useErrorText();
  const days = useMemo(() => nextDays(new Date(), DAYS), []);
  const [day, setDay] = useState(days[0] as string);
  const [duration, setDuration] = useState(90);
  // Kept with the day it is for: while another day loads, the old day's times are not shown, so a
  // quick click can never book the day before (found by the mobile end-to-end test, 06.10.2026).
  const [loaded, setLoaded] = useState<{ day: string; data: DayAvailability | "error" } | null>(null);
  const [durations, setDurations] = useState<number[]>([60, 90, 120]);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [quote, setQuote] = useState<Quote | null | "error">(null);
  const [who, setWho] = useState<Who>("loading");
  const [state, setState] = useState<{ kind: "idle" | "busy" } | { kind: "done"; at: string } | { kind: "error"; text: string }>({ kind: "idle" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    void account.session().then((answer) => {
      if (alive) setWho(answer.ok && answer.data.authenticated && answer.data.user ? answer.data.user : "anonymous");
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void api
      .GET("/api/v1/bookings/availability", { params: { query: { location: LOCATION_SLUG, day } } })
      .then(({ data }) => {
        if (!alive) return;
        if (!data) return setLoaded({ day, data: "error" });
        setLoaded({ day, data: data as DayAvailability });
        if (Array.isArray(data.durations_minutes) && data.durations_minutes.length) setDurations(data.durations_minutes);
      })
      .catch(() => alive && setLoaded({ day, data: "error" }));
    return () => {
      alive = false;
    };
  }, [day, version]);

  useEffect(() => {
    if (!choice) return;
    let alive = true;
    void api
      .GET("/api/v1/bookings/quote", {
        params: { query: { resource_id: choice.courtId, starts_at: choice.slot.startsAt, duration_minutes: duration, session_type: "free_rental" } },
      })
      .then(({ data }) => alive && setQuote(data ? { total: data.total, provisional: data.provisional } : "error"))
      .catch(() => alive && setQuote("error"));
    return () => {
      alive = false;
    };
  }, [choice, duration]);

  const pick = (next: Choice | null) => {
    setChoice(next);
    setQuote(null);
    setState({ kind: "idle" });
  };

  const book = async () => {
    if (!choice) return;
    setState({ kind: "busy" });
    await account.ensureCsrf();
    const answer = await account.outcome(() =>
      api.POST("/api/v1/bookings", {
        body: { resource_id: choice.courtId, starts_at: choice.slot.startsAt, duration_minutes: duration, session_type: "free_rental" },
      }),
    );
    if (answer.ok) {
      setState({ kind: "done", at: answer.data.starts_at });
      setChoice(null);
      setVersion((v) => v + 1);
    } else {
      setState({ kind: "error", text: errorText(answer.code, answer.params) });
      if (answer.code === "booking.slot_taken") setVersion((v) => v + 1);
    }
  };

  const dayLabel = (d: string) => format.dateTime(new Date(`${d}T12:00:00Z`), { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const availability = loaded && loaded.day === day ? loaded.data : null;
  const courts = availability && availability !== "error" ? onlineCourts(availability) : [];
  const now = new Date();

  return (
    <div className="booking">
      <div className="booking__controls">
        <fieldset className="booking__days">
          <legend>{t("day")}</legend>
          <div className="booking__pills">
            {days.map((d) => (
              <button key={d} type="button" className="level__option" aria-pressed={d === day} onClick={() => (setDay(d), pick(null))}>
                {dayLabel(d)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t("duration")}</legend>
          <div className="booking__pills">
            {durations.map((m) => (
              <button key={m} type="button" className="level__option" aria-pressed={m === duration} onClick={() => (setDuration(m), pick(null))}>
                {t("minutes", { minutes: m })}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="booking__grid" aria-busy={availability === null} aria-live="polite">
        {availability === null ? (
          <p className="league__text">{t("loading")}</p>
        ) : availability === "error" ? (
          <p className="league__text">{t("error")}</p>
        ) : courts.length === 0 ? (
          <p className="league__text">{t("noCourts")}</p>
        ) : (
          courts.map((court) => {
            const slots = slotsFor(availability, court, duration, now);
            return (
              <section key={court.id} className="booking__court" aria-labelledby={`court-${court.id}`}>
                <h3 id={`court-${court.id}`} className="padel__h3">
                  {court.name}
                </h3>
                {slots.some((s) => s.free) ? (
                  <div className="booking__times" role="group" aria-label={t("timesFor", { court: court.name })}>
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        className="booking__time"
                        disabled={!slot.free}
                        aria-pressed={choice?.courtId === court.id && choice.slot.time === slot.time}
                        aria-label={slot.free ? t("pick", { time: slot.time, court: court.name }) : t("taken", { time: slot.time })}
                        onClick={() => pick({ courtId: court.id, courtName: court.name, slot })}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="league__text">{t("full")}</p>
                )}
              </section>
            );
          })
        )}
      </div>

      <div className="booking__summary configurator__result points__result" aria-live="polite">
        {state.kind === "done" ? (
          <>
            <p className="configurator__total">{t("doneTitle")}</p>
            <p className="points__towards">{t("done", { when: format.dateTime(new Date(state.at), { timeZone: "Europe/Bucharest", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) })}</p>
            <Link className="btn btn-secondary" href="/account">
              {t("toAccount")}
            </Link>
          </>
        ) : !choice ? (
          <p className="points__status">{t("choose")}</p>
        ) : (
          <>
            <p className="points__towards">
              {t("chosen", { court: choice.courtName, day: dayLabel(day), time: choice.slot.time, minutes: duration })}
            </p>
            {quote === null ? (
              <p className="points__status">{t("pricing")}</p>
            ) : quote === "error" ? (
              <p className="points__status">{t("priceError")}</p>
            ) : (
              <p key={`${quote.total}`} className="configurator__total fx-pop">
                {t("price", { amount: lei(quote.total, locale) })}
                <span>{quote.provisional ? t("provisional") : t("perCourt")}</span>
              </p>
            )}
            {who === "loading" ? null : who === "anonymous" ? (
              <p className="points__towards">
                {t("signIn")}{" "}
                <Link href="/account">{t("signInLink")}</Link>
              </p>
            ) : (
              <button type="button" className="btn btn-primary" disabled={state.kind === "busy"} onClick={() => void book()}>
                {state.kind === "busy" ? t("booking") : t("book")}
              </button>
            )}
            {state.kind === "error" && (
              <p className="status" data-kind="error" role="alert">
                {state.text}
              </p>
            )}
          </>
        )}
      </div>
      <ul className="packages__notes">
        <li>
          <strong>{t("notes.pay.title")}</strong>
          <span>{t("notes.pay.text")}</span>
        </li>
        <li>
          <strong>{t("notes.cancel.title")}</strong>
          <span>{t("notes.cancel.text")}</span>
        </li>
        <li>
          <strong>{t("notes.share.title")}</strong>
          <span>{t("notes.share.text")}</span>
        </li>
      </ul>
    </div>
  );
}
