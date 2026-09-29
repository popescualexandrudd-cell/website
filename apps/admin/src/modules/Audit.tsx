/**
 * The audit log (§8.6, ADR-0011): every important change, who made it (person or device), when,
 * why, and the values before and after. Read-only: nobody edits or deletes an entry.
 */
import { type FormEvent, useState } from "react";
import { unwrap } from "../api";
import { formatDate, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { useData } from "../ui";

const PAGE = 50;

export function Audit() {
  const { api, lang } = usePanel();
  const t = useT();
  const [draft, setDraft] = useState({ action: "", target_type: "", target_id: "" });
  const [filter, setFilter] = useState(draft);
  const [offset, setOffset] = useState(0);
  const { data } = useData(
    () =>
      unwrap(
        api.client.GET("/api/v1/staff/audit", {
          params: {
            query: {
              ...(filter.action ? { action: filter.action } : {}),
              ...(filter.target_type ? { target_type: filter.target_type } : {}),
              ...(filter.target_id ? { target_id: filter.target_id } : {}),
              limit: PAGE,
              offset,
            },
          },
        }),
      ),
    [api, filter, offset],
  );
  const find = (event: FormEvent) => {
    event.preventDefault();
    setOffset(0);
    setFilter({ action: draft.action.trim(), target_type: draft.target_type.trim(), target_id: draft.target_id.trim() });
  };
  return (
    <section aria-labelledby="audit-title">
      <h1 id="audit-title">{t("audit.title")}</h1>
      <p className="muted">{t("audit.intro")}</p>
      <form className="toolbar" role="search" onSubmit={find}>
        {(["action", "target_type", "target_id"] as const).map((key) => (
          <label key={key}>
            {t(`audit.${key}`)}
            <input value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
          </label>
        ))}
        <button type="submit" className="button button--primary">
          {t("users.find")}
        </button>
      </form>
      {data && data.total === 0 ? <p>{t("audit.none")}</p> : null}
      <table className="table">
        <tbody>
          {(data?.items ?? []).map((e) => (
            <tr key={e.id}>
              <th scope="row">
                {formatDate(lang, e.occurred_at)}, {formatTime(lang, e.occurred_at)}
              </th>
              <td>
                <code>{e.action}</code>
                <div className="muted">
                  {e.target_type} {e.target_id}
                </div>
              </td>
              <td>
                {e.actor_label || t(`audit.actors.${e.actor_kind}`)}
                {e.reason ? <div className="muted">{t("money.reason", { reason: e.reason })}</div> : null}
              </td>
              <td>
                {e.before !== null || e.after !== null ? (
                  <details>
                    <summary>{t("audit.changes")}</summary>
                    <p>{t("audit.before")}</p>
                    <pre className="value">{JSON.stringify(e.before, null, 2)}</pre>
                    <p>{t("audit.after")}</p>
                    <pre className="value">{JSON.stringify(e.after, null, 2)}</pre>
                  </details>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data ? (
        <div className="pager">
          <button type="button" className="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
            {t("previous")}
          </button>
          <span className="muted">{t("users.count", { from: data.total ? offset + 1 : 0, to: Math.min(offset + PAGE, data.total), total: data.total })}</span>
          <button type="button" className="button" disabled={offset + PAGE >= data.total} onClick={() => setOffset(offset + PAGE)}>
            {t("next")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
