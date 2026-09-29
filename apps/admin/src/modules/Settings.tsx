/**
 * Settings (§8.6, ADR-0022): what is still waiting for the owner's decision (DE_CONFIRMAT /
 * DE_STABILIT, the page "Ce mai trebuie confirmat"), the feature flags (e.g. parkour hidden at the
 * launch) and every versioned setting. A new value is a new version (the old ones stay), checked
 * by the server, with a reason and an optional date from which it applies; marking it "confirmed
 * by the owner" is how a DE_CONFIRMAT decision is closed.
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { clubMoment, toMinutes } from "../clock";
import { formatDate, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { ReasonAction, useData } from "../ui";

type Config = Schemas["ConfigOut"];
const MARKERS = ["confirmed", "to_confirm", "to_set", "default"] as const;

export function Settings() {
  const { api, can } = usePanel();
  const t = useT();
  const pending = useData(() => unwrap(api.client.GET("/api/v1/staff/pending-decisions")), [api]);
  const config = useData(() => unwrap(api.client.GET("/api/v1/staff/config")), [api]);
  const flags = useData(() => unwrap(api.client.GET("/api/v1/config/flags")), [api]);
  const [filter, setFilter] = useState("");
  const shown = (config.data ?? []).filter((c) => !filter || c.key.includes(filter.trim()) || c.description.toLowerCase().includes(filter.trim().toLowerCase()));
  return (
    <section aria-labelledby="settings-title">
      <h1 id="settings-title">{t("settings.title")}</h1>
      <h2>{t("settings.pending")}</h2>
      <p className="muted">{t("settings.pendingIntro")}</p>
      {pending.data && pending.data.length === 0 ? <p>{t("settings.nothingPending")}</p> : null}
      <ul className="alerts">
        {(pending.data ?? []).map((p) => (
          <li key={p.key} className="alert alert--on">
            <strong>{p.question || p.description}</strong>
            <div className="muted">
              <code>{p.key}</code> · {t(`pricing.markers.${p.marker}`)} · {t("settings.now", { value: JSON.stringify(p.value) })}
            </div>
          </li>
        ))}
      </ul>
      <h2>{t("settings.flags")}</h2>
      <table className="table">
        <tbody>
          {(flags.data ?? []).map((f) => (
            <tr key={f.key}>
              <th scope="row">
                <code>{f.key}</code>
              </th>
              <td>{f.description}</td>
              <td>{f.enabled ? t("settings.on") : t("settings.off")}</td>
              <td>
                {can("flags.manage") ? (
                  <ReasonAction
                    label={f.enabled ? t("settings.turnOff", { key: f.key }) : t("settings.turnOn", { key: f.key })}
                    onConfirm={async (reason) => {
                      await unwrap(api.client.PUT("/api/v1/staff/flags/{key}", { params: { path: { key: f.key } }, body: { enabled: !f.enabled, reason } }));
                      await flags.reload();
                    }}
                  />
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>{t("settings.values")}</h2>
      <div className="toolbar">
        <label>
          {t("settings.filter")}
          <input value={filter} onChange={(e) => setFilter(e.target.value)} />
        </label>
      </div>
      <table className="table">
        <tbody>
          {shown.map((c) => (
            <ConfigRow
              key={c.key}
              item={c}
              onSaved={async () => {
                await config.reload();
                await pending.reload();
              }}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ConfigRow({ item, onSaved }: { item: Config; onSaved: () => Promise<void> }) {
  const { api, lang, can, notify, fail } = usePanel();
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(() => JSON.stringify(item.value, null, 2));
  const [marker, setMarker] = useState<(typeof MARKERS)[number]>("confirmed");
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState("");
  const [bad, setBad] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      setBad(true);
      return;
    }
    setBad(false);
    try {
      await unwrap(
        api.client.POST("/api/v1/staff/config/{key}", {
          params: { path: { key: item.key } },
          body: { value, marker, reason: reason.trim(), effective_from: from ? clubMoment(from.slice(0, 10), toMinutes(from.slice(11, 16))) : null },
        }),
      );
      notify(t("settings.published", { key: item.key }));
      setEditing(false);
      await onSaved();
    } catch (error) {
      fail(error);
    }
  };
  return (
    <tr>
      <th scope="row">
        <code>{item.key}</code>
        <div className="muted">{item.description}</div>
      </th>
      <td>
        <pre className="value">{JSON.stringify(item.value)}</pre>
        <span className={item.marker === "confirmed" ? "tag tag--ok" : "tag tag--todo"}>{t(`pricing.markers.${item.marker}`)}</span>{" "}
        <span className="muted">
          {t("settings.version", { version: item.version })}
          {item.effective_from ? ` · ${formatDate(lang, item.effective_from)} ${formatTime(lang, item.effective_from)}` : ""}
        </span>
      </td>
      <td>
        {can("config.manage") ? (
          editing ? (
            <form className="form" onSubmit={(e) => void submit(e)} aria-label={t("settings.edit", { key: item.key })}>
              <label>
                {t("settings.value")}
                <textarea rows={4} value={text} aria-invalid={bad} onChange={(e) => setText(e.target.value)} />
              </label>
              {bad ? <p role="alert">{t("settings.badJson")}</p> : null}
              <label>
                {t("settings.marker")}
                <select value={marker} onChange={(e) => setMarker(e.target.value as (typeof MARKERS)[number])}>
                  {MARKERS.map((m) => (
                    <option key={m} value={m}>
                      {t(`pricing.markers.${m}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("settings.from")}
                <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label>
                {t("reason")}
                <input required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <div className="actions">
                <button type="submit" className="button button--primary">
                  {t("settings.publish")}
                </button>
                <button type="button" className="button button--quiet" onClick={() => setEditing(false)}>
                  {t("cancel")}
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="button" onClick={() => setEditing(true)}>
              {t("settings.change")}
            </button>
          )
        ) : null}
      </td>
    </tr>
  );
}
