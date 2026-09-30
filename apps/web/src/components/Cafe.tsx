import { getLocale, getTranslations } from "next-intl/server";
import { cafeMenu, hasIndicativePrices, nameOf } from "@/lib/cafe";
import { lei } from "@/lib/packages";

const STEPS = ["order", "receipt", "ready"] as const;

/**
 * Section 13 of the full site (§9.2): the specialty café, on the ground floor with the stairs up to
 * the lounge walkway (Q46). Ordered and paid only at the Payments Kiosk, in cash (R-111, Q9); the
 * order goes to the bar's display and its number shows on the lobby screen when it is ready. The
 * menu is the one kept in the panel, only what is available now (R-112), its prices marked
 * indicative while they are to be set (Q21). Rendered on the server: no script is sent for it.
 */
export async function Cafe({ id }: { id: string }) {
  const t = await getTranslations("web.site.cafe");
  const locale = await getLocale();
  const menu = await cafeMenu();
  return (
    <section id={id} className="section cafe" aria-labelledby="cafe-title">
      <div className="container">
        <p className="kicker">{t("kicker")}</p>
        <h2 id="cafe-title" className="h2">
          {t("title")}
        </h2>
        <p className="lead">{t("lead")}</p>
        <ol className="cafe__steps" aria-label={t("stepsLabel")}>
          {STEPS.map((key, i) => (
            <li key={key}>
              <span className="cafe__step" aria-hidden="true">
                {i + 1}
              </span>
              <strong>{t(`steps.${key}.title`)}</strong>
              <span>{t(`steps.${key}.text`)}</span>
            </li>
          ))}
        </ol>

        <div className="cafe__menu" role="region" aria-labelledby="cafe-menu-title">
          <h3 id="cafe-menu-title" className="pilates__h3">
            {t("menu.title")}
          </h3>
          {menu === null ? (
            <p className="pilates__text">{t("menu.error")}</p>
          ) : menu.length === 0 ? (
            <p className="pilates__text">{t("menu.empty")}</p>
          ) : (
            <>
              {hasIndicativePrices(menu) && <p className="configurator__provisional">{t("menu.provisional")}</p>}
              <ul className="cafe__categories">
                {menu.map((category) => (
                  <li key={category.id} className="cafe__category">
                    <h4>{nameOf(category, locale)}</h4>
                    <ul className="cafe__products">
                      {category.products.map((product) => (
                        <li key={product.id}>
                          <span>{nameOf(product, locale)}</span>
                          <span className="cafe__price">{t("menu.price", { amount: lei(product.price, locale) })}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="events__note">{t("menu.note")}</p>
        </div>
      </div>
    </section>
  );
}
