/**
 * Events (§8.6, R-120…): the requests for the event room sent from the website, answered by the
 * manager (approve: the room is booked; decline), always with a note the requester receives; then
 * the club's public calendar (R-110, `ClubCalendar`).
 */
import { useState } from "react";
import { type Schemas, unwrap } from "../api";
import { formatDate, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { useData } from "../ui";
import { ClubCalendar } from "./ClubCalendar";

type EventRequest = Schemas["StaffEventOut"];

export function Events() {
  const { api, locationId, lang } = usePanel();
  const t = useT();
  const { data, reload } = useData(() => unwrap(api.client.GET("/api/v1/staff/events", { params: { query: { location_id: locationId } } })), [api, locationId]);
  const waiting = (data ?? []).filter((e) => e.status === "pending");
  const decided = (data ?? []).filter((e) => e.status !== "pending");
  return (
    <section aria-labelledby="events-title">
      <h1 id="events-title">{t("events.title")}</h1>
      <h2>{t("events.waiting")}</h2>
      {data && waiting.length === 0 ? <p>{t("events.none")}</p> : null}
      {waiting.map((e) => (
        <Request key={e.id} event={e} onDone={reload} />
      ))}
      {decided.length ? (
        <>
          <h2>{t("events.decided")}</h2>
          <table className="table">
            <tbody>
              {decided.map((e) => (
                <tr key={e.id}>
                  <th scope="row">{e.requester_name}</th>
                  <td>
                    {formatDate(lang, e.starts_at)}, {formatTime(lang, e.starts_at)}–{formatTime(lang, e.ends_at)}
                  </td>
                  <td>{t(`events.statuses.${e.status}`)}</td>
                  <td className="muted">{e.decision_note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      <ClubCalendar />
    </section>
  );
}

function Request({ event, onDone }: { event: EventRequest; onDone: () => Promise<void> }) {
  const { api, lang, notify, fail } = usePanel();
  const t = useT();
  const [note, setNote] = useState("");
  const decide = async (approve: boolean) => {
    try {
      await unwrap(api.client.POST("/api/v1/staff/events/{event_id}/decision", { params: { path: { event_id: event.id } }, body: { approve, note: note.trim() } }));
      notify(t(approve ? "events.approved" : "events.declined"));
      await onDone();
    } catch (error) {
      fail(error);
    }
  };
  return (
    <article className="panel-box" aria-label={event.requester_name}>
      <h3>{event.requester_name}</h3>
      <dl className="details">
        <dt>{t("events.when")}</dt>
        <dd>
          {formatDate(lang, event.starts_at)}, {formatTime(lang, event.starts_at)}–{formatTime(lang, event.ends_at)}
        </dd>
        <dt>{t("events.guests")}</dt>
        <dd>{event.guests}</dd>
        <dt>{t("events.contact")}</dt>
        <dd>{event.requester_email || "—"}</dd>
        <dt>{t("events.message")}</dt>
        <dd>{event.message || "—"}</dd>
      </dl>
      <label>
        {t("events.note")}
        <textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="actions">
        <button type="button" className="button button--primary" onClick={() => void decide(true)}>
          {t("events.approve")}
        </button>
        <button type="button" className="button button--danger" onClick={() => void decide(false)}>
          {t("events.decline")}
        </button>
      </div>
    </article>
  );
}
