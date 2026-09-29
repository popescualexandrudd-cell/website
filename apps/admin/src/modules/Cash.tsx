/**
 * Cash and fiscal (§8.3, §8.6, R-064): what the ledger holds in each Payments Kiosk's box and in
 * the safe, today's movements, and the staff operations done at the kiosk in staff mode (refill,
 * emptying, count with the difference against the ledger, the day close with its Z report). The
 * operations themselves happen at the kiosk, with a card and a PIN (Q54); here a staff member who
 * handles cash sets that PIN.
 */
import { type FormEvent, useState } from "react";
import { unwrap } from "../api";
import { formatDate, formatMoney, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { useData } from "../ui";

export function Cash() {
  const { api, locationId, lang, can } = usePanel();
  const t = useT();
  const { data } = useData(() => unwrap(api.client.GET("/api/v1/staff/panel/cash", { params: { query: { location_id: locationId } } })), [api, locationId]);
  const money = (bani: number | null | undefined) => (bani === null || bani === undefined ? "—" : formatMoney(lang, bani));
  return (
    <section aria-labelledby="cash-title">
      <h1 id="cash-title">{t("cash.title")}</h1>
      {data ? (
        <>
          <div className="stats">
            <div className="stat">
              <p className="stat__label">{t("cash.safe")}</p>
              <p className="stat__value">{money(data.safe)}</p>
            </div>
            {data.kiosks.map((k) => (
              <div key={k.device_id} className="stat">
                <p className="stat__label">
                  {k.name}
                  {k.is_active ? "" : ` · ${t("cash.inactive")}`}
                </p>
                <p className="stat__value">{money(k.in_box)}</p>
                <p className="muted">
                  {t("cash.today", { received: money(k.received_today), change: money(k.change_given_today), moved: money(k.moved_today) })}
                </p>
              </div>
            ))}
          </div>
          {data.kiosks.length === 0 ? <p>{t("cash.noKiosks")}</p> : null}
          <h2>{t("cash.operations")}</h2>
          {data.operations.length === 0 ? <p>{t("cash.noOperations")}</p> : null}
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t("cash.when")}</th>
                <th scope="col">{t("cash.kind")}</th>
                <th scope="col">{t("cash.kiosk")}</th>
                <th scope="col">{t("cash.staff")}</th>
                <th scope="col">{t("cash.amount")}</th>
                <th scope="col">{t("cash.details")}</th>
              </tr>
            </thead>
            <tbody>
              {data.operations.map((o) => {
                const day = (o.result.day ?? null) as Record<string, number> | null;
                return (
                  <tr key={o.id}>
                    <th scope="row">
                      {formatDate(lang, o.created_at)}, {formatTime(lang, o.created_at)}
                    </th>
                    <td>{t(`cash.kinds.${o.kind}`)}</td>
                    <td>{o.device}</td>
                    <td>{o.staff}</td>
                    <td>{money(o.amount)}</td>
                    <td>
                      {o.completed_at ? null : <span className="tag tag--todo">{t("cash.open")}</span>}
                      {o.difference ? (
                        <div className="alert alert--on">{t("cash.difference", { difference: money(o.difference), ledger: money(o.ledger_amount) })}</div>
                      ) : null}
                      {o.kind === "day_close" && o.completed_at ? (
                        <div>
                          {t("cash.z", { number: String(o.result.number ?? "—") })}
                          {day ? <div className="muted">{t("cash.today", { received: money(day.received), change: money(day.change_given), moved: money(day.moved_to_or_from_safe) })}</div> : null}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : null}
      {can("cash.manage") ? <KioskPin /> : null}
    </section>
  );
}

function KioskPin() {
  const { api, notify, fail } = usePanel();
  const t = useT();
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMismatch(pin !== again);
    if (pin !== again) return;
    try {
      await unwrap(api.client.POST("/api/v1/staff/kiosk-pin", { body: { pin } }));
      notify(t("cash.pinSaved"));
      setPin("");
      setAgain("");
    } catch (error) {
      fail(error);
    }
  };
  return (
    <form className="panel-box form" onSubmit={(e) => void submit(e)} aria-label={t("cash.pinTitle")}>
      <h2>{t("cash.pinTitle")}</h2>
      <p className="muted">{t("cash.pinIntro")}</p>
      <label>
        {t("cash.pin")}
        <input type="password" inputMode="numeric" autoComplete="new-password" pattern="\d{6}" required value={pin} onChange={(e) => setPin(e.target.value)} />
      </label>
      <label>
        {t("cash.pinAgain")}
        <input type="password" inputMode="numeric" autoComplete="new-password" pattern="\d{6}" required value={again} onChange={(e) => setAgain(e.target.value)} />
      </label>
      {mismatch ? <p role="alert">{t("cash.pinMismatch")}</p> : null}
      <div className="actions">
        <button type="submit" className="button button--primary">
          {t("cash.savePin")}
        </button>
      </div>
    </form>
  );
}
