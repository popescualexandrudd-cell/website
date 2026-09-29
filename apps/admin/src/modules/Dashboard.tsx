/** The live dashboard (§8.6): today's occupancy, takings and alerts, the courts now. Reloaded
 * every 30 seconds while open. */
import { useCallback, useEffect, useState } from "react";
import type { Dashboard as Board } from "../api";
import { formatMoney, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";

export const REFRESH_MS = 30_000;

export function Dashboard() {
  const { api, lang, locationId, fail, go } = usePanel();
  const t = useT();
  const [board, setBoard] = useState<Board | null>(null);

  const load = useCallback(async () => {
    try {
      setBoard(await api.dashboard(locationId));
    } catch (error) {
      fail(error);
    }
  }, [api, fail, locationId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (!board) return <p className="muted">{t("loading")}</p>;
  return (
    <section aria-labelledby="dashboard-title">
      <h1 id="dashboard-title">{t("dashboard.title")}</h1>
      <div className="stats">
        <Stat label={t("dashboard.occupancy")} value={`${board.occupancy_percent}%`} />
        <Stat label={t("dashboard.bookings")} value={String(board.bookings_today)} />
        <Stat label={t("dashboard.cash")} value={formatMoney(lang, board.cash_taken_today)} />
        <Stat label={t("dashboard.revenue")} value={formatMoney(lang, board.revenue_today)} />
      </div>
      <h2>{t("dashboard.alerts")}</h2>
      <ul className="alerts">
        <li className={board.unread_notices ? "alert alert--on" : "alert"}>
          {t("dashboard.notices", { count: board.unread_notices })}
        </li>
        <li className={board.pending_decisions ? "alert alert--on" : "alert"}>
          <button type="button" className="link" onClick={() => go("settings")}>
            {t("dashboard.decisions", { count: board.pending_decisions })}
          </button>
        </li>
        <li className={board.inactive_devices ? "alert alert--on" : "alert"}>
          {t("dashboard.devices", { count: board.inactive_devices })}
        </li>
      </ul>
      <h2>{t("dashboard.courts")}</h2>
      <table className="table">
        <thead>
          <tr>
            <th scope="col">{t("dashboard.court")}</th>
            <th scope="col">{t("dashboard.now")}</th>
            <th scope="col">{t("dashboard.booked")}</th>
          </tr>
        </thead>
        <tbody>
          {board.courts.map((court) => (
            <tr key={court.id}>
              <th scope="row">{court.name}</th>
              <td>
                {court.busy && court.until
                  ? t("dashboard.busyUntil", { type: t(`sessionTypes.${court.session_type}`), time: formatTime(lang, court.until) })
                  : t("dashboard.free")}
              </td>
              <td>
                {t("dashboard.bookedOf", {
                  booked: Math.round(court.booked_minutes_today / 6) / 10,
                  open: court.open_minutes_today / 60,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
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
