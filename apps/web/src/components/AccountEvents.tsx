"use client";

/**
 * `/cont/evenimente` (R-110, Q34): a request for the event room (day, hours, guests, a message) and
 * the visitor's requests with the manager's answer. A request books nothing: the manager confirms
 * the package, the price and the booking; the server checks the hours, the grid and the capacity.
 */
import { useFormatter, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { clubToUtc, nextDays } from "@/lib/booking";
import { CLUB_TZ } from "@/lib/live";
import * as member from "@/lib/member";
import { MemberOnly } from "./useMember";
import { useErrorText } from "./useErrorText";

const STATUSES = ["pending", "approved", "declined"];
// The club is open 08:00–23:00 (Q3); the server checks the hours again.
const TIMES = Array.from({ length: 29 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
const DURATIONS = [60, 90, 120, 150, 180, 240, 300, 360];

export function AccountEvents() {
  return <MemberOnly>{(me) => <EventsPanel verified={me.email_verified} />}</MemberOnly>;
}

function EventsPanel({ verified }: { verified: boolean }) {
  const t = useTranslations("web.account.events");
  const format = useFormatter();
  const errorText = useErrorText();
  const days = nextDays(new Date(), 90);
  const [list, setList] = useState<member.EventRequest[] | null>(null);
  const [version, setVersion] = useState(0);
  const [day, setDay] = useState(days[7] ?? days[0] ?? "");
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState(180);
  const [guests, setGuests] = useState(15);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    void member.myEvents().then((answer) => {
      if (alive) setList(answer.ok ? answer.data : []);
    });
    return () => {
      alive = false;
    };
  }, [version]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const room = await member.eventRoom(day);
    if (!room.ok || !room.data) {
      setBusy(false);
      return setNotice({ text: room.ok ? t("noRoom") : errorText(room.code, room.params), error: true });
    }
    const answer = await member.requestEvent({
      room_id: room.data.id,
      starts_at: clubToUtc(day, time).toISOString(),
      duration_minutes: duration,
      guests,
      message: message.trim(),
    });
    setBusy(false);
    if (!answer.ok) return setNotice({ text: errorText(answer.code, answer.params), error: true });
    setMessage("");
    setNotice({ text: t("sent"), error: false });
    setVersion((v) => v + 1);
  };

  const when = (starts: string, ends: string) =>
    `${format.dateTime(new Date(starts), { timeZone: CLUB_TZ, weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} – ${format.dateTime(new Date(ends), { timeZone: CLUB_TZ, hour: "2-digit", minute: "2-digit" })}`;
  const dayName = (value: string) => format.dateTime(new Date(`${value}T12:00:00Z`), { timeZone: "UTC", weekday: "short", day: "numeric", month: "long" });

  return (
    <div className="account">
      <section className="account__card" aria-labelledby="events-request">
        <h2 id="events-request" className="h3">
          {t("requestTitle")}
        </h2>
        <p className="league__text">{t("requestLead")}</p>
        {!verified ? (
          <p className="account__alert">{t("verifyFirst")}</p>
        ) : (
          <form className="form" onSubmit={(event) => void submit(event)}>
            <div className="account__row">
              <div className="field">
                <label htmlFor="event-day">{t("day")}</label>
                <select id="event-day" className="select" value={day} onChange={(e) => setDay(e.target.value)}>
                  {days.map((value) => (
                    <option key={value} value={value}>
                      {dayName(value)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="event-time">{t("time")}</label>
                <select id="event-time" className="select" value={time} onChange={(e) => setTime(e.target.value)}>
                  {TIMES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="event-duration">{t("duration")}</label>
                <select id="event-duration" className="select" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  {DURATIONS.map((value) => (
                    <option key={value} value={value}>
                      {t("hours", { hours: value / 60 })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="event-guests">{t("guests")}</label>
                <input
                  id="event-guests"
                  className="input"
                  type="number"
                  inputMode="numeric"
                  required
                  min={1}
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="event-message">{t("message")}</label>
              <textarea
                id="event-message"
                className="input"
                rows={4}
                maxLength={2000}
                aria-describedby="event-message-hint"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <span id="event-message-hint" className="field__hint">
                {t("messageHint")}
              </span>
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? t("sending") : t("submit")}
            </button>
          </form>
        )}
        {notice && (
          <p className="status" data-kind={notice.error ? "error" : undefined} role={notice.error ? "alert" : "status"}>
            {notice.text}
          </p>
        )}
        <p className="events__note">{t("note")}</p>
      </section>

      <section className="account__card" aria-labelledby="events-mine" aria-busy={list === null}>
        <h2 id="events-mine" className="h3">
          {t("mineTitle")}
        </h2>
        {list === null ? (
          <p className="league__text">{t("loading")}</p>
        ) : list.length === 0 ? (
          <p className="league__text">{t("none")}</p>
        ) : (
          <ul className="account__list">
            {member.sortEvents(list, new Date()).map((e) => (
              <li key={e.id}>
                <div>
                  <strong>{when(e.starts_at, e.ends_at)}</strong>
                  <span>
                    {t("guestsCount", { count: e.guests })} · {t(`statuses.${STATUSES.includes(e.status) ? e.status : "pending"}`)}
                  </span>
                  {e.decision_note && <span>{t("answer", { note: e.decision_note })}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
