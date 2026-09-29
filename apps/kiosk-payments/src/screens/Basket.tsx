/** The basket (§8.3): what is paid now, and how: cash (with change, §8.3) or the credit in the
 * account (flow 6). Without a connection to the server no payment starts. */
import { useRef, useState } from "react";
import { useKiosk, useT } from "../kiosk";
import { cafeTotal, hasIndicativePrices, isEmpty, remove, toItems, total } from "../lib/basket";
import { moneyIn } from "../lib/i18n";
import { payWithCredit } from "../lib/payment";

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function BasketScreen() {
  const { session, lang, basket, setBasket, goto, pay, api, card, notify, fail, refresh, offline } = useKiosk();
  const t = useT();
  const lei = moneyIn(lang);
  const [busy, setBusy] = useState(false);
  // One key per basket: tapping twice, or again after a lost answer, never pays twice (R-067).
  const creditKey = useRef(newKey());
  if (!session) return null;

  const amount = total(basket);
  const canUseCredit = session.credit >= amount && amount > 0;
  const name = (item: { name_ro: string; name_en: string }) => (lang === "en" ? item.name_en : item.name_ro);

  const payCredit = async () => {
    setBusy(true);
    try {
      const orders = await payWithCredit(api, card, toItems(basket), (i) => `${creditKey.current}-${i}`);
      notify(orders.length ? t("basket.paidWithOrder", { orders: orders.join(", ") }) : t("basket.paid"));
      setBasket({ entries: [], cafe: [] });
      creditKey.current = newKey();
      await refresh();
      goto("home");
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="home">
      <button type="button" className="button button--quiet back" onClick={() => goto("home")}>
        ← {t("actions.back")}
      </button>
      <h1>{t("basket.title")}</h1>
      {isEmpty(basket) ? <p className="muted">{t("basket.empty")}</p> : null}
      <ul className="plain">
        {basket.entries.map((entry) => (
          <li key={entry.key} className="card-row basket-row">
            <span>
              {entry.description}
              {entry.amount < entry.max ? (
                <span className="muted"> · {t("basket.part", { amount: lei(entry.amount), max: lei(entry.max) })}</span>
              ) : null}
            </span>
            <span className="price">{lei(entry.amount)}</span>
            <button type="button" className="button button--quiet" onClick={() => setBasket(remove(basket, entry.key))}>
              {t("basket.remove")}
            </button>
          </li>
        ))}
        {basket.cafe.length > 0 ? (
          <li className="card-row basket-row">
            <span>
              {t("basket.cafe")}:{" "}
              {basket.cafe.map((l) => `${l.quantity} × ${name(l.product)}`).join(", ")}
            </span>
            <span className="price">{lei(cafeTotal(basket))}</span>
            <button type="button" className="button button--quiet" onClick={() => setBasket(remove(basket, "cafe"))}>
              {t("basket.remove")}
            </button>
          </li>
        ) : null}
      </ul>
      <p className="total">{t("basket.total", { amount: lei(amount) })}</p>
      {hasIndicativePrices(basket) ? <p className="muted small">* {t("indicativeNote")}</p> : null}
      <div className="actions">
        <button
          type="button"
          className="button button--primary"
          disabled={isEmpty(basket) || offline || busy}
          onClick={() => pay(toItems(basket), undefined, "home")}
        >
          {t("basket.payCash")}
        </button>
        <button type="button" className="button" disabled={!canUseCredit || offline || busy} onClick={() => void payCredit()}>
          {t("basket.payCredit", { credit: lei(session.credit) })}
        </button>
        <button type="button" className="button button--quiet" onClick={() => goto("cafe")}>
          {t("basket.addCafe")}
        </button>
      </div>
      {!canUseCredit && session.credit > 0 && amount > 0 ? (
        <p className="muted">{t("basket.creditShort", { credit: lei(session.credit) })}</p>
      ) : null}
    </div>
  );
}
