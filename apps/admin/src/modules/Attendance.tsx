/**
 * Attendance (§8.6, R-070…R-074): the players blocked after repeated no-shows (R-073: the
 * responsible coach or the manager lifts the block, with a reason), the staff notices (the
 * no-show blocks, the money the Payments Kiosk could not settle by itself) and a scan recorded by
 * hand when a card cannot be read (arrival at the club, entry on a court).
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { formatDate, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { type Picked, ReasonAction, UserPicker, useData } from "../ui";

type Notice = Schemas["NoticeOut"];

export function Attendance() {
  const { can } = usePanel();
  const t = useT();
  return (
    <section aria-labelledby="attendance-title">
      <h1 id="attendance-title">{t("attendance.title")}</h1>
      {can("attendance.view") ? <Notices /> : null}
      {can("restrictions.manage") ? <Restrictions /> : null}
      {can("attendance.record") ? <ManualScan /> : null}
    </section>
  );
}

export function noticeText(t: (key: string, params?: Record<string, unknown>) => string, notice: Notice): string {
  const p = notice.payload as Record<string, unknown>;
  if (notice.kind === "no_show_block") return t("attendance.notices.no_show_block", { name: String(p.name ?? ""), count: Number(p.no_shows ?? 0) });
  if (notice.kind === "checkout.cash_attention") return t("attendance.notices.cash", { problem: t(`attendance.problems.${String(p.problem)}`) });
  return notice.kind;
}

function Notices() {
  const { api, locationId, lang, fail } = usePanel();
  const t = useT();
  const { data, reload } = useData(() => unwrap(api.client.GET("/api/v1/staff/notices", { params: { query: { location_id: locationId } } })), [api, locationId]);
  const read = async (notice: Notice) => {
    try {
      await unwrap(api.client.POST("/api/v1/staff/notices/{notice_id}/read", { params: { path: { notice_id: notice.id }, query: { location_id: locationId } } }));
      await reload();
    } catch (error) {
      fail(error);
    }
  };
  return (
    <>
      <h2>{t("attendance.noticesTitle")}</h2>
      {data && data.length === 0 ? <p>{t("attendance.noNotices")}</p> : null}
      <ul className="alerts">
        {(data ?? []).map((n) => (
          <li key={n.id} className={n.read_at ? "alert" : "alert alert--on"}>
            <span className="muted">
              {formatDate(lang, n.created_at)}, {formatTime(lang, n.created_at)} ·{" "}
            </span>
            {noticeText(t, n)}{" "}
            {n.read_at ? null : (
              <button type="button" className="link" onClick={() => void read(n)}>
                {t("attendance.markRead")}
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function Restrictions() {
  const { api, locationId, lang, notify } = usePanel();
  const t = useT();
  const { data, reload } = useData(() => unwrap(api.client.GET("/api/v1/staff/restrictions", { params: { query: { location_id: locationId } } })), [api, locationId]);
  return (
    <>
      <h2>{t("attendance.blockedTitle")}</h2>
      <p className="muted">{t("attendance.blockedIntro")}</p>
      {data && data.length === 0 ? <p>{t("attendance.noBlocked")}</p> : null}
      <table className="table">
        <tbody>
          {(data ?? []).map((r) => (
            <tr key={r.id}>
              <th scope="row">
                <a href={`#/users/${r.user_id}`}>{r.name}</a>
              </th>
              <td>{t("attendance.noShows", { count: r.no_show_count })}</td>
              <td>{formatDate(lang, r.created_at)}</td>
              <td>
                <ReasonAction
                  label={t("attendance.lift")}
                  onConfirm={async (reason) => {
                    await unwrap(
                      api.client.POST("/api/v1/staff/restrictions/{restriction_id}/lift", {
                        params: { path: { restriction_id: r.id } },
                        body: { location_id: locationId, reason },
                      }),
                    );
                    notify(t("attendance.lifted"));
                    await reload();
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ManualScan() {
  const { api, locationId, lang, notify, fail } = usePanel();
  const t = useT();
  const resources = useData(() => unwrap(api.client.GET("/api/v1/staff/panel/resources", { params: { query: { location_id: locationId } } })), [api, locationId]);
  const courts = (resources.data ?? []).filter((r) => r.is_active && (r.kind === "padel_court" || r.kind === "tennis_court"));
  const [person, setPerson] = useState<Picked | null>(null);
  const [kind, setKind] = useState<"arrival" | "court_entry">("arrival");
  const [court, setCourt] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!person) return;
    try {
      const scan = await unwrap(
        api.client.POST("/api/v1/staff/scans", {
          body: { kind, location_id: locationId, card_token: "", user_id: person.id, resource_id: kind === "court_entry" ? court || null : null },
        }),
      );
      notify(t("attendance.recorded", { name: person.name, time: formatTime(lang, scan.scanned_at) }));
      setPerson(null);
    } catch (error) {
      fail(error);
    }
  };
  return (
    <form className="panel-box form" onSubmit={(e) => void submit(e)} aria-label={t("attendance.scanTitle")}>
      <h2>{t("attendance.scanTitle")}</h2>
      <p className="muted">{t("attendance.scanIntro")}</p>
      <UserPicker label={t("attendance.person")} value={person} onPick={setPerson} />
      <label>
        {t("attendance.kind")}
        <select value={kind} onChange={(e) => setKind(e.target.value as "arrival" | "court_entry")}>
          <option value="arrival">{t("attendance.kinds.arrival")}</option>
          <option value="court_entry">{t("attendance.kinds.court_entry")}</option>
        </select>
      </label>
      {kind === "court_entry" ? (
        <label>
          {t("attendance.court")}
          <select required value={court} onChange={(e) => setCourt(e.target.value)}>
            <option value="">—</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="actions">
        <button type="submit" className="button button--primary" disabled={!person}>
          {t("attendance.record")}
        </button>
      </div>
    </form>
  );
}
