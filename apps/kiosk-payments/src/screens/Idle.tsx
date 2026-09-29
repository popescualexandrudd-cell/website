/** Idle (§8.3): "Scan your card", the café menu and the subscription offers, with indicative
 * prices marked as such (Q21); a discreet entry for the staff (card + PIN). */
import { useEffect, useState } from "react";
import { useKiosk, useT } from "../kiosk";
import type { Options } from "../lib/api";
import { INDICATIVE } from "../lib/basket";
import { moneyIn } from "../lib/i18n";

export function IdleScreen({ onStaff }: { onStaff: () => void }) {
  const { api, idle, lang, offline } = useKiosk();
  const t = useT();
  const lei = moneyIn(lang);
  const [options, setOptions] = useState<Options | null>(null);
  const slug = idle?.location_slug;

  useEffect(() => {
    if (!slug) return;
    api.options(slug).then(setOptions, () => undefined);
  }, [api, slug]);

  const name = (item: { name_ro: string; name_en: string }) => (lang === "en" ? item.name_en : item.name_ro);
  const rates = options?.rates ?? [];

  return (
    <div className="idle">
      <section className="scan-call" aria-labelledby="scan-title">
        <p id="scan-title" className="scan-call__title">
          {t("idle.scan")}
        </p>
        <p className="muted">{offline ? t("idle.unavailable") : t("idle.scanHint")}</p>
      </section>
      <section className="panel" aria-labelledby="menu-title">
        <h2 id="menu-title">{t("idle.menu")}</h2>
        {idle && idle.menu.length > 0 ? (
          idle.menu.map((category) => (
            <div key={category.id} className="menu-category">
              <h3>{name(category)}</h3>
              <ul className="price-list">
                {category.products.map((product) => (
                  <li key={product.id}>
                    <span>{name(product)}</span>
                    <span className="price">
                      {lei(product.price)}
                      {INDICATIVE.includes(product.marker) ? <sup aria-label={t("indicative")}>*</sup> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="muted">{t("idle.noMenu")}</p>
        )}
      </section>
      <section className="panel" aria-labelledby="offers-title">
        <h2 id="offers-title">{t("idle.offers")}</h2>
        {rates.length > 0 ? (
          <ul className="price-list">
            {rates.map((rate) => (
              <li key={`${rate.sport}:${rate.sessions_per_month}`}>
                <span>
                  {t(`sports.${rate.sport}`)} · {t("idle.perMonth", { sessions: rate.sessions_per_month })}
                </span>
                <span className="price">
                  {t("idle.monthly", { price: lei(rate.monthly_price) })}
                  {INDICATIVE.includes(rate.marker) ? <sup aria-label={t("indicative")}>*</sup> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t("idle.noOffers")}</p>
        )}
        <p className="muted small">{t("idle.offersHint")}</p>
      </section>
      <p className="muted small idle__note">* {t("indicativeNote")}</p>
      <button type="button" className="button button--quiet staff-entry" onClick={onStaff}>
        {t("staff.entry")}
      </button>
    </div>
  );
}
