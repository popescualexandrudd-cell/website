/**
 * Staff and roles (§8.1) and the system status (§8.6). The staff page lists who holds a role at
 * this location (or everywhere), whether their two-factor authentication is set up, and what each
 * role may do; roles are given and taken back from the person's page (Users). The status page
 * shows the release, the server's clock in club time, the database and the cache (Redis), the
 * owner's pending decisions and the location's devices (online: seen in the last 5 minutes).
 */
import { unwrap } from "../api";
import { formatDate, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { useData } from "../ui";

export function Staff() {
  const { api, locationId } = usePanel();
  const t = useT();
  const { data } = useData(() => unwrap(api.client.GET("/api/v1/staff/panel/staff", { params: { query: { location_id: locationId } } })), [api, locationId]);
  const actions = [...new Set(Object.values(data?.matrix ?? {}).flat())].sort();
  const roles = Object.keys(data?.matrix ?? {});
  return (
    <section aria-labelledby="staff-title">
      <h1 id="staff-title">{t("staff.title")}</h1>
      <p className="muted">{t("staff.intro")}</p>
      <table className="table">
        <tbody>
          {(data?.people ?? []).map((p) => (
            <tr key={p.id}>
              <th scope="row">
                <a href={`#/users/${p.id}`}>{p.name}</a>
                <div className="muted">{p.email}</div>
              </th>
              <td>{p.roles.map((r) => `${t(`roles.${r.role}`)} · ${r.location || t("users.everywhere")}`).join("; ")}</td>
              <td>{p.mfa_enabled ? t("staff.mfaOn") : <span className="tag tag--todo">{t("staff.mfaOff")}</span>}</td>
              <td>{p.is_active ? t("users.active") : t("users.inactive")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>{t("staff.matrix")}</h2>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">{t("staff.action")}</th>
              {roles.map((r) => (
                <th key={r} scope="col">
                  {t(`roles.${r}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a}>
                <th scope="row">
                  <code>{a}</code>
                </th>
                {roles.map((r) => (
                  <td key={r}>{data?.matrix[r]?.includes(a) ? t("yes") : "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SystemStatus() {
  const { api, locationId, lang } = usePanel();
  const t = useT();
  const { data, reload } = useData(() => unwrap(api.client.GET("/api/v1/staff/panel/system", { params: { query: { location_id: locationId } } })), [api, locationId]);
  const ok = (value: boolean) => (value ? <span className="tag tag--ok">{t("system.ok")}</span> : <span className="tag tag--todo">{t("system.down")}</span>);
  return (
    <section aria-labelledby="system-title">
      <h1 id="system-title">{t("system.title")}</h1>
      <div className="toolbar">
        <button type="button" className="button" onClick={() => void reload()}>
          {t("system.refresh")}
        </button>
      </div>
      {data ? (
        <>
          <dl className="details">
            <dt>{t("system.version")}</dt>
            <dd>
              <code>{data.version}</code>
            </dd>
            <dt>{t("system.time")}</dt>
            <dd>
              {formatDate(lang, data.server_time)}, {formatTime(lang, data.server_time)} ({data.time_zone})
            </dd>
            <dt>{t("system.database")}</dt>
            <dd>{ok(data.database)}</dd>
            <dt>{t("system.cache")}</dt>
            <dd>{ok(data.cache)}</dd>
            <dt>{t("system.decisions")}</dt>
            <dd>
              <a href="#/settings">{data.pending_decisions}</a>
            </dd>
          </dl>
          <h2>{t("system.devices")}</h2>
          {data.devices.length === 0 ? <p>{t("devices.none")}</p> : null}
          <table className="table">
            <tbody>
              {data.devices.map((d) => (
                <tr key={d.id}>
                  <th scope="row">{d.name}</th>
                  <td>{t(`devices.kinds.${d.kind}`)}</td>
                  <td>
                    {!d.is_active ? t("devices.inactive") : !d.enrolled ? t("devices.notEnrolled") : d.online ? ok(true) : <span className="tag tag--todo">{t("system.offline")}</span>}
                  </td>
                  <td className="muted">{d.last_seen_at ? `${formatDate(lang, d.last_seen_at)} ${formatTime(lang, d.last_seen_at)}` : t("devices.neverSeen")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}

/** A module that comes with a later stage: shown in the menu, marked, with what it will do. */
export function upcoming(key: string, stage: number) {
  return function Upcoming() {
    const t = useT();
    return (
      <section aria-labelledby="upcoming-title">
        <h1 id="upcoming-title">{t(`nav.${key}`)}</h1>
        <p className="banner">{t("upcoming.stage", { stage })}</p>
        <p>{t(`upcoming.${key}`)}</p>
      </section>
    );
  };
}
