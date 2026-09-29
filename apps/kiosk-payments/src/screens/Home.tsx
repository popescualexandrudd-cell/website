/** The customer's session (§8.3): what is to pay (debts first, flow 3), the partners' bookings
 * of today (a share of the hour, R-060), the credit in the account, and the actions. */
import { useState } from "react";
import { useKiosk, useT } from "../kiosk";
import type { Payable } from "../lib/api";
import { addPayable, isEmpty, total } from "../lib/basket";
import { formatDate, formatTime, moneyIn } from "../lib/i18n";

export function Home() {
  const kiosk = useKiosk();
  const { session, lang, basket, setBasket, goto, api, card, notify, fail, offline } = kiosk;
  const t = useT();
  const lei = moneyIn(lang);
  const [busy, setBusy] = useState(false);
  if (!session) return null;

  const when = (p: Payable) =>
    p.starts_at ? `${formatDate(lang, p.starts_at)}, ${formatTime(lang, p.starts_at)}` : "";

  const payAll = (payable: Payable) => {
    setBasket(addPayable(basket, payable));
    goto("basket");
  };

  const checkIn = async () => {
    setBusy(true);
    try {
      const done = await api.checkIn(card);
      notify(t("home.checkedIn", { name: done.first_name, time: done.scanned_at }));
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const bookings = session.payables;
  return (
    <div className="home">
      <h1>{t("home.hello", { name: session.first_name })}</h1>
      <p className="summary">
        {t("home.credit", { amount: lei(session.credit) })}
        {isEmpty(basket) ? null : (
          <>
            {" · "}
            <button type="button" className="link-button" onClick={() => goto("basket")}>
              {t("home.basket", { amount: lei(total(basket)) })}
            </button>
          </>
        )}
      </p>

      <section className="panel" aria-labelledby="due-title">
        <h2 id="due-title">{t("home.toPay")}</h2>
        {bookings.length === 0 ? <p className="muted">{t("home.nothingToPay")}</p> : null}
        <ul className="plain">
          {bookings.map((p) => (
            <li key={`${p.kind}:${p.subject_id}`} className="card-row payable">
              <div>
                <p className="payable__title">
                  {p.debt ? <span className="badge badge--debt">{t("home.debt")}</span> : null} {p.description}
                </p>
                <p className="muted">
                  {when(p)} · {t("home.left", { amount: lei(p.to_pay), price: lei(p.price) })}
                </p>
              </div>
              <div className="actions">
                <button type="button" className="button button--primary" disabled={offline} onClick={() => payAll(p)}>
                  {t("home.pay", { amount: lei(p.to_pay) })}
                </button>
                {p.kind === "booking" && !p.debt ? (
                  <button type="button" className="button" disabled={offline} onClick={() => kiosk.split(p.subject_id)}>
                    {t("home.split")}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {session.shared.length > 0 ? (
        <section className="panel" aria-labelledby="shared-title">
          <h2 id="shared-title">{t("home.shared")}</h2>
          <ul className="plain">
            {session.shared.map((p) => (
              <li key={p.subject_id} className="card-row payable">
                <div>
                  <p className="payable__title">{p.description}</p>
                  <p className="muted">
                    {t("home.organizer", { name: p.organizer })} · {when(p)} · {t("home.left", { amount: lei(p.to_pay), price: lei(p.price) })}
                  </p>
                </div>
                <button type="button" className="button button--primary" disabled={offline} onClick={() => kiosk.split(p.subject_id)}>
                  {t("home.payShare")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="tiles">
        <button type="button" className="tile" onClick={() => goto("cafe")} disabled={offline}>
          {t("actions.cafe")}
        </button>
        <button type="button" className="tile" onClick={() => goto("subscription")} disabled={offline}>
          {t("actions.subscription")}
        </button>
        {session.subscriptions.length > 0 ? (
          <button type="button" className="tile" onClick={() => goto("freeze")} disabled={offline}>
            {t("actions.freeze")}
          </button>
        ) : null}
        {bookings.length > 0 ? (
          <button type="button" className="tile" onClick={() => goto("voucher")} disabled={offline}>
            {t("actions.voucher")}
            {session.vouchers.length > 0 ? (
              <span className="tile__count">{t("actions.vouchers", { count: session.vouchers.length })}</span>
            ) : null}
          </button>
        ) : null}
        <button type="button" className="tile" onClick={() => void checkIn()} disabled={busy || offline}>
          {t("actions.checkIn")}
        </button>
      </div>
    </div>
  );
}
