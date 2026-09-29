/** Paying in cash (§8.3): before any money goes in, the customer learns whether the machine
 * can give change; otherwise "exact amount only", or the change as credit with their explicit
 * consent. Then the notes, the change, the fiscal receipt (R-066). Cancelling gives the money
 * back; what the machine cannot give back becomes credit, never lost. */
import { useState } from "react";
import { useKiosk, useT } from "../kiosk";
import { errorText, moneyIn } from "../lib/i18n";
import { moneyInMachine } from "../lib/payment";

const ACCEPTED_NOTES = "1, 5, 10, 50, 100, 200";

export function CheckoutScreen() {
  const { payment, paymentView: view, lang, endPayment } = useKiosk();
  const t = useT();
  const lei = moneyIn(lang);
  const [consent, setConsent] = useState(false);
  if (!payment || !view) return null;

  const left = Math.max(0, view.due - view.inserted);
  const cancel = () => void payment.cancel();

  return (
    <div className="home checkout" aria-live="polite">
      <h1>{t("pay.title")}</h1>
      <p className="total">{t("pay.due", { amount: lei(view.due) })}</p>
      {view.reconnecting ? <p className="notice">{t("pay.reconnecting")}</p> : null}

      {view.step === "preparing" ? <p className="muted">{t("pay.preparing")}</p> : null}

      {view.step === "quote" && view.quote ? (
        <section className="panel">
          {view.quote.guaranteed ? (
            <>
              <p>{t("pay.changeOk")}</p>
              <div className="actions">
                <button type="button" className="button button--primary" onClick={() => void payment.start("normal")}>
                  {t("pay.insert")}
                </button>
                <button type="button" className="button" onClick={cancel}>
                  {t("pay.cancel")}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="notice" role="alert">
                {t("pay.noChange")}
              </p>
              <div className="actions">
                {view.quote.exactPossible ? (
                  <button type="button" className="button button--primary" onClick={() => void payment.start("exact")}>
                    {t("pay.exact", { amount: lei(view.due) })}
                  </button>
                ) : null}
              </div>
              <label className="check">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                {t("pay.creditConsent")}
              </label>
              <div className="actions">
                <button type="button" className="button" disabled={!consent} onClick={() => void payment.start("credit")}>
                  {t("pay.withCredit")}
                </button>
                <button type="button" className="button" onClick={cancel}>
                  {t("pay.cancel")}
                </button>
              </div>
            </>
          )}
          <p className="muted small">{t("pay.notes", { notes: ACCEPTED_NOTES })}</p>
        </section>
      ) : null}

      {view.step === "collecting" ? (
        <section className="panel">
          <p className="big">{t("pay.insertNow")}</p>
          <p className="progress" role="status">
            {t("pay.inserted", { inserted: lei(view.inserted), due: lei(view.due) })}
          </p>
          <p>{t("pay.left", { amount: lei(left) })}</p>
          {view.mode === "exact" ? <p className="muted">{t("pay.exactHint")}</p> : null}
          {view.returned ? <p className="notice">{t("pay.returned", { amount: lei(view.returned) })}</p> : null}
          {view.fault ? (
            <p className="notice" role="alert">
              {t(`faults.${view.fault}`)}
            </p>
          ) : null}
          <button type="button" className="button button--danger" onClick={cancel}>
            {view.inserted > 0 ? t("pay.cancelRefund") : t("pay.cancel")}
          </button>
        </section>
      ) : null}

      {view.step === "finishing" ? <p className="muted">{t("pay.finishing")}</p> : null}
      {view.step === "printing" ? <p className="muted">{t("pay.printing")}</p> : null}
      {view.step === "cancelling" ? <p className="muted">{t("pay.cancelling")}</p> : null}

      {view.step === "done" ? (
        <section className="panel done">
          <p className="big">{t("pay.done")}</p>
          {view.dispensed > 0 ? <p>{t("pay.takeChange", { amount: lei(view.dispensed) })}</p> : null}
          {view.credited > 0 ? <p>{t("pay.credited", { amount: lei(view.credited) })}</p> : null}
          {view.orders.length > 0 ? <p>{t("pay.order", { orders: view.orders.join(", ") })}</p> : null}
          {view.receiptFailed ? <p className="notice">{t("pay.receiptFailed")}</p> : <p className="muted">{t("pay.receipt")}</p>}
          <button type="button" className="button button--primary" onClick={endPayment}>
            {t("pay.ok")}
          </button>
        </section>
      ) : null}

      {view.step === "cancelled" ? (
        <section className="panel">
          <p className="big">{t("pay.cancelled")}</p>
          {view.credited > 0 ? <p>{t("pay.refundCredited", { amount: lei(view.credited) })}</p> : null}
          <button type="button" className="button button--primary" onClick={endPayment}>
            {t("pay.ok")}
          </button>
        </section>
      ) : null}

      {view.step === "failed" && view.error ? (
        <section className="panel">
          <p className="notice" role="alert">
            {view.error.code === "offline"
              ? t("offline")
              : view.error.code.startsWith("bridge.")
                ? t("pay.bridgeProblem")
                : errorText(lang, view.error.code, view.error.params)}
          </p>
          {moneyInMachine(view) ? (
            <>
              {/* Money in the machine: the only way out is getting it back (or credit). */}
              <p>{t("pay.moneySafe", { amount: lei(view.inserted) })}</p>
              <button type="button" className="button button--danger" onClick={cancel}>
                {t("pay.cancelRefund")}
              </button>
            </>
          ) : (
            <button type="button" className="button" onClick={endPayment}>
              {t("pay.ok")}
            </button>
          )}
        </section>
      ) : null}
    </div>
  );
}
