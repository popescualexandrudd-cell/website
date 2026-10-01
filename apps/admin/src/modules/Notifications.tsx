/**
 * Notifications (§11, Stage 12): the texts of every message the club sends, by event, channel and
 * language, edited here (the default stays in the code and comes back with "reset"); and the latest
 * messages sent, with their state (who, what, when; never the text a client received).
 * Fields are written `{{ first_name }}`, `{{ when }}`…, as in the default text.
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { formatDate, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { useData } from "../ui";

type TemplateRow = Schemas["TemplateOut"];

export function Notifications() {
  const { api, locationId, lang } = usePanel();
  const t = useT();
  const where = { params: { query: { location_id: locationId } } };
  const templates = useData(() => unwrap(api.client.GET("/api/v1/staff/notifications/templates", where)), [api, locationId]);
  const outbox = useData(() => unwrap(api.client.GET("/api/v1/staff/notifications/outbox", where)), [api, locationId]);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [filter, setFilter] = useState("");
  const rows = (templates.data ?? []).filter((row) => !filter || row.event.includes(filter) || row.subject.toLowerCase().includes(filter.toLowerCase()));
  return (
    <section aria-labelledby="notifications-title">
      <h1 id="notifications-title">{t("notifications.title")}</h1>
      <p className="muted">{t("notifications.lead")}</p>
      {editing ? (
        <TemplateForm
          key={`${editing.event}-${editing.channel}-${editing.language}`}
          row={editing}
          onDone={async () => {
            setEditing(null);
            await templates.reload();
          }}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <h2>{t("notifications.textsTitle")}</h2>
      <label className="inline-form">
        {t("notifications.search")}
        <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </label>
      <table className="table">
        <thead>
          <tr>
            <th scope="col">{t("notifications.event")}</th>
            <th scope="col">{t("notifications.channel")}</th>
            <th scope="col">{t("notifications.subject")}</th>
            <th scope="col">{t("notifications.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.event}-${row.channel}-${row.language}`}>
              <th scope="row">
                {row.event}
                <span className="muted"> · {row.language.toUpperCase()}</span>
              </th>
              <td>{t(`notifications.channels.${row.channel}`)}</td>
              <td>
                {row.subject}
                {row.edited ? <span className="muted"> · {t("notifications.edited")}</span> : null}
              </td>
              <td>
                <button type="button" className="button" onClick={() => setEditing(row)}>
                  {t("notifications.edit")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>{t("notifications.outboxTitle")}</h2>
      {outbox.data && outbox.data.length === 0 ? <p>{t("notifications.outboxEmpty")}</p> : null}
      {outbox.data && outbox.data.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">{t("notifications.when")}</th>
              <th scope="col">{t("notifications.to")}</th>
              <th scope="col">{t("notifications.event")}</th>
              <th scope="col">{t("notifications.state")}</th>
            </tr>
          </thead>
          <tbody>
            {outbox.data.map((n) => (
              <tr key={n.id}>
                <td>
                  {formatDate(lang, n.created_at)}, {formatTime(lang, n.created_at)}
                </td>
                <th scope="row">{n.user_name}</th>
                <td>
                  {n.event} · {t(`notifications.channels.${n.channel}`)}
                </td>
                <td>
                  {t(`notifications.states.${n.status}`)}
                  {n.last_error ? <span className="muted"> · {n.last_error}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}

function TemplateForm({ row, onDone, onClose }: { row: TemplateRow; onDone: () => Promise<void>; onClose: () => void }) {
  const { api, locationId, notify, fail } = usePanel();
  const t = useT();
  const [subject, setSubject] = useState(row.subject);
  const [body, setBody] = useState(row.body);
  const [busy, setBusy] = useState(false);
  const label = t("notifications.editTitle", { event: row.event });
  const key = { location_id: locationId, event: row.event, channel: row.channel, language: row.language };
  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await action();
      notify(t(done));
      await onDone();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(() => unwrap(api.client.PUT("/api/v1/staff/notifications/templates", { body: { ...key, subject, body } })), "notifications.saved");
  };
  return (
    <form className="panel-box form" onSubmit={submit} aria-label={label}>
      <h3>{label}</h3>
      <p className="muted">
        {t(`notifications.channels.${row.channel}`)} · {row.language.toUpperCase()}
      </p>
      <label>
        {t(row.channel === "push" ? "notifications.title_" : "notifications.subject")}
        <input required maxLength={160} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <label>
        {t("notifications.body")}
        <textarea required rows={row.channel === "push" ? 3 : 8} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <p className="muted">{t("notifications.fields")}</p>
      <div className="actions">
        <button type="submit" className="button button--primary" disabled={busy}>
          {t("notifications.save")}
        </button>
        {row.edited ? (
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => void run(() => unwrap(api.client.POST("/api/v1/staff/notifications/templates/reset", { body: key })), "notifications.resetDone")}
          >
            {t("notifications.reset")}
          </button>
        ) : null}
        <button type="button" className="button button--quiet" onClick={onClose}>
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
