/** Vouchers (§8.3 flow 6, R-121): one of the customer's own vouchers, or a code typed on the
 * screen, used for a booking, a class place, a subscription or a tournament fee (not the café). */
import { Keyboard } from "@jungle/kiosk-kit";
import { useState } from "react";
import { useKiosk, useT } from "../kiosk";
import { formatDate, moneyIn } from "../lib/i18n";

export function VoucherScreen() {
  const { session, api, card, lang, goto, notify, fail, refresh } = useKiosk();
  const t = useT();
  const lei = moneyIn(lang);
  const [target, setTarget] = useState(session?.payables[0] ? `${session.payables[0].kind}:${session.payables[0].subject_id}` : "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  if (!session) return null;
  const payable = session.payables.find((p) => `${p.kind}:${p.subject_id}` === target);

  const use = async (voucherCode: string) => {
    if (!payable) return;
    setBusy(true);
    try {
      const paid = await api.voucher(card, voucherCode.trim().toUpperCase(), {
        kind: payable.kind as "booking",
        subject_id: payable.subject_id,
        amount: null,
        cafe_lines: [],
      });
      notify(t("voucher.done", { amount: lei(paid.amount) }));
      setCode("");
      await refresh();
      goto("home");
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const value = (kind: string, amount: number) =>
    kind === "percent" ? `${amount}%` : kind === "hour" ? t("voucher.hour") : lei(amount);

  return (
    <div className="home">
      <button type="button" className="button button--quiet back" onClick={() => goto("home")}>
        ← {t("actions.back")}
      </button>
      <h1>{t("voucher.title")}</h1>
      <section className="panel">
        <h2>{t("voucher.for")}</h2>
        <div className="chips">
          {session.payables.map((p) => {
            const key = `${p.kind}:${p.subject_id}`;
            return (
              <button
                key={key}
                type="button"
                className={`chip${target === key ? " chip--on" : ""}`}
                aria-pressed={target === key}
                onClick={() => setTarget(key)}
              >
                {p.description} · {lei(p.to_pay)}
              </button>
            );
          })}
        </div>
      </section>
      {session.vouchers.length > 0 ? (
        <section className="panel">
          <h2>{t("voucher.mine")}</h2>
          <ul className="plain">
            {session.vouchers.map((v) => (
              <li key={v.code} className="card-row payable">
                <span>
                  {value(v.kind, v.value)} · {t(`voucher.targets.${v.target}`)} ·{" "}
                  {t("voucher.validUntil", { date: formatDate(lang, v.valid_until) })}
                </span>
                <button type="button" className="button button--primary" disabled={!payable || busy} onClick={() => void use(v.code)}>
                  {t("voucher.use")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="panel">
        <h2>{t("voucher.code")}</h2>
        <p className="code-display" aria-live="polite">
          {code || "—"}
        </p>
        <Keyboard
          value={code}
          onChange={(next) => setCode(next.slice(0, 20))}
          labels={{ name: t("voucher.code"), space: t("keyboard.space"), clear: t("keyboard.clear") }}
          digits
          upper
        />
        <button type="button" className="button button--primary" disabled={code.length < 4 || !payable || busy} onClick={() => void use(code)}>
          {t("voucher.apply")}
        </button>
      </section>
    </div>
  );
}
