/** The café (§8.3 flow 5): the menu, quantities, then the basket; after the payment the order
 * appears on the café display and the kiosk prints a slip with the order number. */
import { useKiosk, useT } from "../kiosk";
import type { Product } from "../lib/api";
import { cafeTotal, changeCafe, INDICATIVE, quantityOf } from "../lib/basket";
import { moneyIn } from "../lib/i18n";

export function Cafe() {
  const { idle, lang, basket, setBasket, goto } = useKiosk();
  const t = useT();
  const lei = moneyIn(lang);
  const name = (item: { name_ro: string; name_en: string }) => (lang === "en" ? item.name_en : item.name_ro);
  const change = (product: Product, delta: number) => setBasket(changeCafe(basket, product, delta));

  return (
    <div className="home">
      <button type="button" className="button button--quiet back" onClick={() => goto("home")}>
        ← {t("actions.back")}
      </button>
      <h1>{t("cafe.title")}</h1>
      {(idle?.menu ?? []).map((category) => (
        <section key={category.id} className="panel" aria-labelledby={`cat-${category.id}`}>
          <h2 id={`cat-${category.id}`}>{name(category)}</h2>
          <ul className="plain">
            {category.products.map((product) => {
              const quantity = quantityOf(basket, product.id);
              return (
                <li key={product.id} className="card-row product">
                  <span className="product__name">
                    {name(product)}
                    {INDICATIVE.includes(product.marker) ? <sup aria-label={t("indicative")}>*</sup> : null}
                  </span>
                  <span className="price">{lei(product.price)}</span>
                  <span className="stepper">
                    <button
                      type="button"
                      className="stepper__button"
                      aria-label={t("cafe.less", { name: name(product) })}
                      disabled={quantity === 0}
                      onClick={() => change(product, -1)}
                    >
                      −
                    </button>
                    <span className="stepper__value" aria-live="polite">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      className="stepper__button"
                      aria-label={t("cafe.more", { name: name(product) })}
                      onClick={() => change(product, 1)}
                    >
                      +
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {(idle?.menu ?? []).length === 0 ? <p className="muted">{t("idle.noMenu")}</p> : null}
      <div className="actions sticky-actions">
        <p className="summary">{t("cafe.total", { amount: lei(cafeTotal(basket)) })}</p>
        <button type="button" className="button button--primary" disabled={basket.cafe.length === 0} onClick={() => goto("basket")}>
          {t("cafe.toBasket")}
        </button>
      </div>
      <p className="muted small">* {t("indicativeNote")}</p>
    </div>
  );
}
