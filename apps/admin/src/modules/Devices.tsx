/**
 * Devices (§8.6, ADR-0012, ADR-0013): the club's kiosks, screens and café display at this
 * location, whether they are enrolled and when they were last seen. A new device is added here,
 * then enrolled with the public key and certificate fingerprint its setup prints
 * (`deploy/kiosk-os`); the token is shown once, to be put on the device. Turning a device off (a
 * stolen kiosk, a broken screen) takes a reason and cuts it off at once.
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { formatDate, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { ReasonAction, useData } from "../ui";

type Device = Schemas["DeviceOut"];
const KINDS = ["league_kiosk", "payments_kiosk", "screen", "cafe_display"] as const;

export function Devices() {
  const { api, locationId, lang, notify, fail } = usePanel();
  const t = useT();
  const { data, reload } = useData(() => unwrap(api.client.GET("/api/v1/staff/devices")), [api]);
  const resources = useData(() => unwrap(api.client.GET("/api/v1/staff/panel/resources", { params: { query: { location_id: locationId } } })), [api, locationId]);
  const courts = (resources.data ?? []).filter((r) => r.kind === "padel_court" || r.kind === "tennis_court");
  const here = (data ?? []).filter((d) => d.location_id === locationId);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", kind: "screen" as (typeof KINDS)[number], resource: "" });
  const add = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await unwrap(
        api.client.POST("/api/v1/staff/devices", {
          body: { location_id: locationId, name: draft.name.trim(), kind: draft.kind, resource_id: draft.kind === "screen" && draft.resource ? draft.resource : null },
        }),
      );
      notify(t("saved"));
      setAdding(false);
      await reload();
    } catch (error) {
      fail(error);
    }
  };
  return (
    <section aria-labelledby="devices-title">
      <h1 id="devices-title">{t("devices.title")}</h1>
      <div className="toolbar">
        <button type="button" className="button" onClick={() => setAdding(!adding)}>
          {t("devices.add")}
        </button>
      </div>
      {adding ? (
        <form className="inline-form" onSubmit={(e) => void add(e)} aria-label={t("devices.add")}>
          <label>
            {t("devices.name")}
            <input required maxLength={120} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label>
            {t("devices.kind")}
            <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as (typeof KINDS)[number] })}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`devices.kinds.${k}`)}
                </option>
              ))}
            </select>
          </label>
          {draft.kind === "screen" ? (
            <label>
              {t("devices.court")}
              <select value={draft.resource} onChange={(e) => setDraft({ ...draft, resource: e.target.value })}>
                <option value="">{t("devices.lobby")}</option>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="submit" className="button button--primary">
            {t("devices.create")}
          </button>
        </form>
      ) : null}
      {data && here.length === 0 ? <p>{t("devices.none")}</p> : null}
      <table className="table">
        <tbody>
          {here.map((d) => (
            <tr key={d.id}>
              <th scope="row">{d.name}</th>
              <td>{t(`devices.kinds.${d.kind}`)}</td>
              <td>
                {d.enrolled_at ? t("devices.enrolled") : t("devices.notEnrolled")}
                <div className="muted">
                  {d.last_seen_at ? t("devices.lastSeen", { when: `${formatDate(lang, d.last_seen_at)} ${formatTime(lang, d.last_seen_at)}` }) : t("devices.neverSeen")}
                </div>
              </td>
              <td>{d.is_active ? t("devices.active") : t("devices.inactive")}</td>
              <td>
                <div className="actions">
                  <ReasonAction
                    danger={d.is_active}
                    label={d.is_active ? t("devices.deactivate") : t("devices.activate")}
                    onConfirm={async (reason) => {
                      await unwrap(api.client.POST("/api/v1/staff/devices/{device_id}/active", { params: { path: { device_id: d.id } }, body: { is_active: !d.is_active, reason } }));
                      notify(t("saved"));
                      await reload();
                    }}
                  />
                  <Enroll device={d} onDone={reload} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Enroll({ device, onDone }: { device: Device; onDone: () => Promise<void> }) {
  const { api, fail } = usePanel();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [fingerprint, setFingerprint] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const done = await unwrap(
        api.client.POST("/api/v1/staff/devices/{device_id}/enroll", {
          params: { path: { device_id: device.id } },
          body: { public_key: key.trim(), certificate_fingerprint: fingerprint.trim() },
        }),
      );
      setToken(done.token);
      await onDone();
    } catch (error) {
      fail(error);
    }
  };
  if (token) {
    return (
      <div className="panel-box" role="region" aria-label={t("devices.tokenTitle")}>
        <p>{t("devices.tokenIntro")}</p>
        <p className="secret">{token}</p>
        <button
          type="button"
          className="button"
          onClick={() => {
            setToken(null);
            setOpen(false);
          }}
        >
          {t("devices.tokenSaved")}
        </button>
      </div>
    );
  }
  if (!open) {
    return (
      <button type="button" className="button" onClick={() => setOpen(true)}>
        {device.enrolled_at ? t("devices.reenroll") : t("devices.enroll")}
      </button>
    );
  }
  return (
    <form className="inline-form" onSubmit={(e) => void submit(e)} aria-label={t("devices.enroll")}>
      <label>
        {t("devices.publicKey")}
        <input value={key} onChange={(e) => setKey(e.target.value)} />
      </label>
      <label>
        {t("devices.fingerprint")}
        <input value={fingerprint} onChange={(e) => setFingerprint(e.target.value)} />
      </label>
      <button type="submit" className="button button--primary">
        {t("devices.enroll")}
      </button>
      <button type="button" className="button button--quiet" onClick={() => setOpen(false)}>
        {t("cancel")}
      </button>
    </form>
  );
}
