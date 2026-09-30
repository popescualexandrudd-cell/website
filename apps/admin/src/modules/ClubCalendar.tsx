/**
 * The club's public calendar (R-110, §9.2.12), inside Events: DJ nights, social padel evenings and
 * club events, in Romanian and English (R-140). Added as a draft or published at once; changed,
 * published, withdrawn or cancelled with a reason. The website shows the published ones next to
 * the league's tournaments, and a cancelled one stays there, marked, until its end. An event here
 * books nothing: the courts or the room are booked apart, from the calendar of bookings.
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { addDays, clubDay, clubMinutes, clubMoment, hhmm, toMinutes } from "../clock";
import { formatDate, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { ReasonAction, useData } from "../ui";

type ClubEvent = Schemas["ClubEventOut"];
const KINDS = ["dj_night", "social", "club"] as const;

type Form = { kind: string; title_ro: string; title_en: string; text_ro: string; text_en: string; day: string; start: string; end: string };

const empty = (): Form => ({ kind: "dj_night", title_ro: "", title_en: "", text_ro: "", text_en: "", day: addDays(clubDay(Date.now()), 7), start: "20:00", end: "23:00" });

function formOf(event: ClubEvent): Form {
  return {
    kind: event.kind,
    title_ro: event.title_ro,
    title_en: event.title_en,
    text_ro: event.text_ro,
    text_en: event.text_en,
    day: clubDay(event.starts_at),
    start: hhmm(clubMinutes(event.starts_at)),
    end: hhmm(clubMinutes(event.ends_at, clubDay(event.ends_at))),
  };
}

/** The start and end moments of the form; an end not after the start is on the next day. */
export function moments(form: Pick<Form, "day" | "start" | "end">): { starts_at: string; ends_at: string } {
  const start = toMinutes(form.start);
  const end = toMinutes(form.end);
  return { starts_at: clubMoment(form.day, start), ends_at: clubMoment(end > start ? form.day : addDays(form.day, 1), end) };
}

export function ClubCalendar() {
  const { api, locationId, lang, notify } = usePanel();
  const t = useT();
  const { data, reload } = useData(() => unwrap(api.client.GET("/api/v1/staff/club-events", { params: { query: { location_id: locationId } } })), [api, locationId]);
  const [editing, setEditing] = useState<ClubEvent | null>(null);
  const state = (e: ClubEvent) => (e.cancelled_at ? "cancelled" : e.published ? "published" : "draft");
  const publish = async (e: ClubEvent, published: boolean, reason: string) => {
    await unwrap(api.client.POST("/api/v1/staff/club-events/{event_id}/publication", { params: { path: { event_id: e.id } }, body: { published, reason } }));
    notify(t(published ? "events.calendar.published" : "events.calendar.withdrawn"));
    await reload();
  };
  const cancel = async (e: ClubEvent, reason: string) => {
    await unwrap(api.client.POST("/api/v1/staff/club-events/{event_id}/cancel", { params: { path: { event_id: e.id } }, body: { reason } }));
    notify(t("events.calendar.cancelled"));
    await reload();
  };
  return (
    <section aria-labelledby="club-calendar-title">
      <h2 id="club-calendar-title">{t("events.calendar.title")}</h2>
      <p className="muted">{t("events.calendar.lead")}</p>
      <EventForm
        key={editing?.id ?? "new"}
        event={editing}
        onDone={async () => {
          setEditing(null);
          await reload();
        }}
        onClose={() => setEditing(null)}
      />
      {data && data.length === 0 ? <p>{t("events.calendar.none")}</p> : null}
      {data && data.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">{t("events.calendar.event")}</th>
              <th scope="col">{t("events.when")}</th>
              <th scope="col">{t("events.calendar.state")}</th>
              <th scope="col">{t("events.calendar.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((e) => (
              <tr key={e.id}>
                <th scope="row">
                  {e.title_ro}
                  <span className="muted">
                    {" · "}
                    {t(`events.calendar.kinds.${e.kind}`)}
                    {e.is_demo ? ` · ${t("events.calendar.demo")}` : ""}
                  </span>
                </th>
                <td>
                  {formatDate(lang, e.starts_at)}, {formatTime(lang, e.starts_at)}–{formatTime(lang, e.ends_at)}
                </td>
                <td>
                  {t(`events.calendar.states.${state(e)}`)}
                  {e.cancel_reason ? <span className="muted"> · {e.cancel_reason}</span> : null}
                </td>
                <td>
                  {e.cancelled_at ? null : (
                    <div className="actions">
                      <button type="button" className="button" onClick={() => setEditing(e)}>
                        {t("events.calendar.edit")}
                      </button>
                      <ReasonAction label={t(e.published ? "events.calendar.withdraw" : "events.calendar.publish")} onConfirm={(reason) => publish(e, !e.published, reason)} />
                      <ReasonAction label={t("events.calendar.cancel")} danger onConfirm={(reason) => cancel(e, reason)} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}

function EventForm({ event, onDone, onClose }: { event: ClubEvent | null; onDone: () => Promise<void>; onClose: () => void }) {
  const { api, locationId, notify, fail } = usePanel();
  const t = useT();
  const [form, setForm] = useState<Form>(event ? formOf(event) : empty());
  const [publishNow, setPublishNow] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const label = t(event ? "events.calendar.editTitle" : "events.calendar.add");
  const field = (key: keyof Form) => ({ value: form[key], onChange: (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value }) });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const body = { kind: form.kind as (typeof KINDS)[number], title_ro: form.title_ro, title_en: form.title_en, text_ro: form.text_ro, text_en: form.text_en, ...moments(form) };
    try {
      if (event) {
        await unwrap(api.client.PUT("/api/v1/staff/club-events/{event_id}", { params: { path: { event_id: event.id } }, body: { ...body, reason: reason.trim() } }));
        notify(t("events.calendar.saved"));
      } else {
        await unwrap(api.client.POST("/api/v1/staff/club-events", { body: { ...body, location_id: locationId, published: publishNow } }));
        notify(t("events.calendar.created"));
        setForm(empty());
        setPublishNow(false);
      }
      await onDone();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="panel-box form" onSubmit={(e) => void submit(e)} aria-label={label}>
      <h3>{label}</h3>
      <label>
        {t("events.calendar.kind")}
        <select {...field("kind")}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`events.calendar.kinds.${k}`)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("events.calendar.titleRo")}
        <input required maxLength={120} {...field("title_ro")} />
      </label>
      <label>
        {t("events.calendar.titleEn")}
        <input required maxLength={120} {...field("title_en")} />
      </label>
      <label>
        {t("events.calendar.textRo")}
        <textarea maxLength={500} {...field("text_ro")} />
      </label>
      <label>
        {t("events.calendar.textEn")}
        <textarea maxLength={500} {...field("text_en")} />
      </label>
      <label>
        {t("events.calendar.day")}
        <input type="date" required {...field("day")} />
      </label>
      <label>
        {t("events.calendar.start")}
        <input type="time" required step={900} {...field("start")} />
      </label>
      <label>
        {t("events.calendar.end")}
        <input type="time" required step={900} {...field("end")} />
      </label>
      <p className="muted">{t("events.calendar.endHint")}</p>
      {event ? (
        <label>
          {t("reason")}
          <input required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      ) : (
        <label className="check">
          <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
          {t("events.calendar.publishNow")}
        </label>
      )}
      <div className="actions">
        <button type="submit" className="button button--primary" disabled={busy}>
          {t(event ? "events.calendar.save" : "events.calendar.create")}
        </button>
        {event ? (
          <button type="button" className="button button--quiet" onClick={onClose}>
            {t("cancel")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
