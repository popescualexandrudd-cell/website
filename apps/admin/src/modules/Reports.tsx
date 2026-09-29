/**
 * Reports and exports (§8.6, ADR-0009 §3): for a period of club days, the revenue per category,
 * discounts, cash taken, bookings by type, cancellations and no-shows, each court's occupancy
 * within the opening hours, classes and attendance, new accounts. The CSV exports (the ledger
 * entries for the accountant, the bookings) are downloaded from the same origin and recorded in
 * the audit log. The pre-launch waiting list (Stage 1B) has its figures and export here too.
 */
import { useState } from "react";
import { unwrap } from "../api";
import { addDays, clubDay } from "../clock";
import { formatMoney } from "../i18n";
import { usePanel, useT } from "../panel";
import { useData } from "../ui";

export function Reports() {
  const { can } = usePanel();
  const t = useT();
  return (
    <section aria-labelledby="reports-title">
      <h1 id="reports-title">{t("reports.title")}</h1>
      {can("reports.view") ? <Period /> : null}
      {can("waitlist.view") ? <Waitlist /> : null}
    </section>
  );
}

function Period() {
  const { api, locationId, lang } = usePanel();
  const t = useT();
  const today = clubDay(Date.now());
  const [first, setFirst] = useState(() => `${today.slice(0, 7)}-01`);
  const [last, setLast] = useState(today);
  const { data } = useData(
    () => unwrap(api.client.GET("/api/v1/staff/panel/reports", { params: { query: { location_id: locationId, first, last } } })),
    [api, locationId, first, last],
  );
  const exportUrl = (kind: string) => `/api/v1/staff/panel/reports/export.csv?${new URLSearchParams({ location_id: locationId, kind, first, last }).toString()}`;
  return (
    <>
      <div className="toolbar">
        <label>
          {t("reports.from")}
          <input type="date" value={first} onChange={(e) => e.target.value && setFirst(e.target.value)} />
        </label>
        <label>
          {t("reports.to")}
          <input type="date" value={last} onChange={(e) => e.target.value && setLast(e.target.value)} />
        </label>
        <button
          type="button"
          className="button button--quiet"
          onClick={() => {
            setFirst(addDays(today, -6));
            setLast(today);
          }}
        >
          {t("reports.lastWeek")}
        </button>
        <a className="button" href={exportUrl("transactions")} download>
          {t("reports.exportLedger")}
        </a>
        <a className="button" href={exportUrl("bookings")} download>
          {t("reports.exportBookings")}
        </a>
      </div>
      {data ? (
        <>
          <div className="stats">
            <Stat label={t("reports.revenue")} value={formatMoney(lang, data.revenue_total)} />
            <Stat label={t("reports.cash")} value={formatMoney(lang, data.cash_taken)} />
            <Stat label={t("reports.discounts")} value={formatMoney(lang, data.discounts)} />
            <Stat label={t("reports.newAccounts")} value={String(data.new_accounts)} />
          </div>
          <h2>{t("reports.byCategory")}</h2>
          <table className="table">
            <tbody>
              {Object.entries(data.revenue).map(([category, amount]) => (
                <tr key={category}>
                  <th scope="row">{t(`reports.categories.${category}`)}</th>
                  <td>{formatMoney(lang, amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2>{t("reports.bookings")}</h2>
          <table className="table">
            <tbody>
              {Object.entries(data.bookings).map(([type, count]) => (
                <tr key={type}>
                  <th scope="row">{t(`sessionTypes.${type}`)}</th>
                  <td>{count}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">{t("reports.cancelled")}</th>
                <td>{data.cancelled}</td>
              </tr>
              <tr>
                <th scope="row">{t("reports.noShows")}</th>
                <td>{data.no_shows}</td>
              </tr>
            </tbody>
          </table>
          <h2>{t("reports.occupancy")}</h2>
          <table className="table">
            <tbody>
              {data.courts.map((c) => (
                <tr key={c.name}>
                  <th scope="row">{c.name}</th>
                  <td>{c.percent}%</td>
                  <td className="muted">{t("dashboard.bookedOf", { booked: Math.round(c.booked_minutes / 6) / 10, open: Math.round(c.open_minutes / 6) / 10 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>{t("reports.classes", { places: data.class_places, attended: data.class_attended })}</p>
        </>
      ) : null}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <p className="stat__label">{label}</p>
      <p className="stat__value">{value}</p>
    </div>
  );
}

function Waitlist() {
  const { api, can } = usePanel();
  const t = useT();
  const { data } = useData(() => unwrap(api.client.GET("/api/v1/staff/waitlist/stats")), [api]);
  return (
    <>
      <h2>{t("reports.waitlist")}</h2>
      {data ? (
        <ul>
          {Object.entries(data.by_status as Record<string, number>).map(([status, count]) => (
            <li key={status}>{t("reports.waitlistStatus", { status: t(`reports.waitlistStatuses.${status}`), count })}</li>
          ))}
        </ul>
      ) : null}
      {can("waitlist.export") ? (
        <a className="button" href="/api/v1/staff/waitlist/export.csv" download>
          {t("reports.exportWaitlist")}
        </a>
      ) : null}
    </>
  );
}
