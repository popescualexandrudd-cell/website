/**
 * Coaches and Pilates (§8.6, R-090…R-101): the week's group classes with the places taken and the
 * waiting list, a new class (studio, instructor, level, capacity at most the Reformers in use,
 * Q46), and each class's list of participants, where staff mark who came (the same record as a
 * card scanned at the door, R-070).
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { addDays, clubDay, clubMoment, monday, toMinutes } from "../clock";
import { formatDate, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { useData } from "../ui";

const KINDS = ["beginner", "intermediate", "advanced"] as const;

export function Classes() {
  const { path } = usePanel();
  return path[0] ? <Roster id={path[0]} /> : <Week />;
}

function Week() {
  const { api, locationId, lang, can } = usePanel();
  const t = useT();
  const [week, setWeek] = useState(() => monday(clubDay(Date.now())));
  const [adding, setAdding] = useState(false);
  const { data, reload } = useData(
    () => unwrap(api.client.GET("/api/v1/staff/panel/classes", { params: { query: { location_id: locationId, week_of: week } } })),
    [api, locationId, week],
  );
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  return (
    <section aria-labelledby="classes-title">
      <h1 id="classes-title">{t("classes.title")}</h1>
      <div className="toolbar">
        <button type="button" className="button" onClick={() => setWeek(addDays(week, -7))}>
          {t("classes.prevWeek")}
        </button>
        <span>{t("classes.week", { from: formatDate(lang, week), to: formatDate(lang, addDays(week, 6)) })}</span>
        <button type="button" className="button" onClick={() => setWeek(addDays(week, 7))}>
          {t("classes.nextWeek")}
        </button>
        {can("classes.manage") ? (
          <button type="button" className="button" onClick={() => setAdding(!adding)}>
            {t("classes.add")}
          </button>
        ) : null}
      </div>
      {adding ? (
        <NewClass
          onDone={async () => {
            setAdding(false);
            await reload();
          }}
        />
      ) : null}
      {data && data.length === 0 ? <p>{t("classes.none")}</p> : null}
      {days.map((day) => {
        const today = (data ?? []).filter((c) => clubDay(c.starts_at) === day);
        if (!today.length) return null;
        return (
          <div key={day}>
            <h2>{formatDate(lang, day)}</h2>
            <table className="table">
              <tbody>
                {today.map((c) => (
                  <tr key={c.id}>
                    <th scope="row">
                      <a href={`#/classes/${c.id}`}>
                        {formatTime(lang, c.starts_at)}–{formatTime(lang, c.ends_at)} · {t(`classes.kinds.${c.kind}`)}
                      </a>
                    </th>
                    <td>{c.studio}</td>
                    <td>{c.instructor}</td>
                    <td>
                      {c.status === "cancelled"
                        ? t("classes.cancelled")
                        : t("classes.places", { taken: c.enrolled, capacity: c.capacity, waiting: c.waiting })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </section>
  );
}

function NewClass({ onDone }: { onDone: () => Promise<void> }) {
  const { api, locationId, notify, fail } = usePanel();
  const t = useT();
  const query = { location_id: locationId };
  const resources = useData(() => unwrap(api.client.GET("/api/v1/staff/panel/resources", { params: { query } })), [api, locationId]);
  const coaches = useData(() => unwrap(api.client.GET("/api/v1/staff/panel/coaches", { params: { query } })), [api, locationId]);
  const studios = (resources.data ?? []).filter((r) => r.kind === "pilates_studio" && r.is_active);
  const [form, setForm] = useState({ studio: "", instructor: "", kind: "beginner", day: clubDay(Date.now()), time: "18:00", minutes: 50, capacity: 4 });
  const reformers = (resources.data ?? []).filter((r) => r.kind === "reformer" && r.is_active && r.parent_id === (form.studio || studios[0]?.id)).length;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await unwrap(
        api.client.POST("/api/v1/staff/classes", {
          body: {
            studio_id: form.studio || (studios[0]?.id ?? ""),
            instructor_id: form.instructor,
            kind: form.kind,
            starts_at: clubMoment(form.day, toMinutes(form.time)),
            duration_minutes: form.minutes,
            capacity: form.capacity,
          },
        }),
      );
      notify(t("classes.created"));
      await onDone();
    } catch (error) {
      fail(error);
    }
  };
  return (
    <form className="panel-box form" onSubmit={(e) => void submit(e)} aria-label={t("classes.add")}>
      <h2>{t("classes.add")}</h2>
      <label>
        {t("classes.studio")}
        <select value={form.studio || (studios[0]?.id ?? "")} onChange={(e) => setForm({ ...form, studio: e.target.value })}>
          {studios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("classes.instructor")}
        <select required value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })}>
          <option value="">—</option>
          {(coaches.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("classes.kind")}
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`classes.kinds.${k}`)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("classes.day")}
        <input type="date" required value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} />
      </label>
      <label>
        {t("classes.time")}
        <input type="time" required step={1800} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
      </label>
      <label>
        {t("classes.duration")}
        <input type="number" min={30} max={240} step={5} required value={form.minutes} onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })} />
      </label>
      <label>
        {t("classes.capacity")}
        <input type="number" min={1} max={50} required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
      </label>
      <p className="muted">{t("classes.reformers", { count: reformers })}</p>
      <div className="actions">
        <button type="submit" className="button button--primary">
          {t("classes.create")}
        </button>
      </div>
    </form>
  );
}

function Roster({ id }: { id: string }) {
  const { api, locationId, lang, can, notify, fail } = usePanel();
  const t = useT();
  const { data, reload } = useData(() => unwrap(api.client.GET("/api/v1/staff/classes/{session_id}/roster", { params: { path: { session_id: id } } })), [api, id]);
  const present = async (person: Schemas["RosterEntryOut"]) => {
    try {
      await unwrap(api.client.POST("/api/v1/staff/scans", { body: { kind: "class_entry", location_id: locationId, card_token: "", class_session_id: id, user_id: person.user_id } }));
      notify(t("classes.marked", { name: person.name }));
      await reload();
    } catch (error) {
      fail(error);
    }
  };
  if (!data) return <p>{t("loading")}</p>;
  const s = data.session;
  return (
    <section aria-labelledby="roster-title">
      <p>
        <a href="#/classes">{t("classes.back")}</a>
      </p>
      <h1 id="roster-title">
        {t(`classes.kinds.${s.kind}`)} · {formatDate(lang, s.starts_at)}, {formatTime(lang, s.starts_at)}
      </h1>
      <p className="muted">
        {s.instructor_name} · {t("classes.placesLeft", { count: s.places_left })}
      </p>
      {data.people.length === 0 ? <p>{t("classes.empty")}</p> : null}
      <table className="table">
        <tbody>
          {data.people.map((p) => (
            <tr key={p.enrollment_id}>
              <th scope="row">
                <a href={`#/users/${p.user_id}`}>{p.name}</a>
              </th>
              <td>{t(`classes.statuses.${p.status}`)}</td>
              <td>
                {p.status === "enrolled" && can("attendance.record") ? (
                  <button type="button" className="button" onClick={() => void present(p)}>
                    {t("classes.present")}
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
