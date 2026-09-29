/**
 * The café (§8.4, §8.6, R-110…R-113): the queue of orders (new → preparing → ready → picked up;
 * the café display and the lobby show the ready ones), an order taken at the counter as an
 * exception to the kiosk (Q10: cash, with a reason) and the menu: categories, products with their
 * price (DE_STABILIT until the owner decides it, Q21), taken off the menu without being deleted.
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { formatMoney, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { ReasonAction, toBani, toLei, useData } from "../ui";

type Product = Schemas["PanelProductOut"];
type Category = Schemas["PanelCategoryOut"];
const NEXT: Record<string, "preparing" | "ready" | "picked_up"> = { new: "preparing", preparing: "ready", ready: "picked_up" };

export function Cafe() {
  const { can } = usePanel();
  const t = useT();
  return (
    <section aria-labelledby="cafe-title">
      <h1 id="cafe-title">{t("cafe.title")}</h1>
      {can("cafe.orders") ? <Queue /> : null}
      {can("cafe.manage") ? <Menu /> : null}
    </section>
  );
}

function Queue() {
  const { api, locationId, lang, can, notify, fail } = usePanel();
  const t = useT();
  const queue = useData(() => unwrap(api.client.GET("/api/v1/staff/cafe/queue", { params: { query: { location_id: locationId } } })), [api, locationId]);
  const menu = useData(
    () => (can("cafe.manage") ? unwrap(api.client.GET("/api/v1/staff/panel/cafe/menu", { params: { query: { location_id: locationId } } })) : Promise.resolve([] as Category[])),
    [api, locationId],
  );
  const [lines, setLines] = useState<Record<string, number>>({});
  // R-067: one key per order; a retry after a lost answer is not paid twice.
  const [orderKey, setOrderKey] = useState(() => crypto.randomUUID());
  const products = (menu.data ?? []).flatMap((c) => c.products.filter((p) => p.is_available));
  const total = products.reduce((sum, p) => sum + p.price * (lines[p.id] ?? 0), 0);
  const advance = async (order: Schemas["OrderOut"]) => {
    const to = NEXT[order.status];
    if (!to) return;
    try {
      await unwrap(api.client.POST("/api/v1/staff/cafe/orders/{order_id}/status", { params: { path: { order_id: order.id } }, body: { status: to } }));
      await queue.reload();
    } catch (error) {
      fail(error);
    }
  };
  return (
    <>
      <h2>{t("cafe.queue")}</h2>
      {queue.data && queue.data.length === 0 ? <p>{t("cafe.noOrders")}</p> : null}
      <table className="table">
        <tbody>
          {(queue.data ?? []).map((o) => (
            <tr key={o.id}>
              <th scope="row">#{o.number}</th>
              <td>{formatTime(lang, o.created_at)}</td>
              <td>{o.lines.map((l) => `${l.quantity} × ${l.name}`).join(", ")}</td>
              <td>{formatMoney(lang, o.total)}</td>
              <td>{t(`cafe.statuses.${o.status}`)}</td>
              <td>
                <div className="actions">
                  {NEXT[o.status] ? (
                    <button type="button" className="button button--primary" onClick={() => void advance(o)}>
                      {t(`cafe.to.${NEXT[o.status]}`)}
                    </button>
                  ) : null}
                  {o.status === "new" || o.status === "preparing" ? (
                    <ReasonAction
                      danger
                      label={t("cafe.cancelOrder")}
                      onConfirm={async (reason) => {
                        await unwrap(api.client.POST("/api/v1/staff/cafe/orders/{order_id}/cancel", { params: { path: { order_id: o.id } }, body: { reason } }));
                        notify(t("cafe.cancelled"));
                        await queue.reload();
                      }}
                    />
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {can("payments.record") && products.length ? (
        <div className="panel-box" role="region" aria-label={t("cafe.counter")}>
          <h2>{t("cafe.counter")}</h2>
          <p className="muted">{t("cafe.counterIntro")}</p>
          <ul className="picker__list">
            {products.map((p) => (
              <li key={p.id}>
                <label className="amount-form">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    size={3}
                    value={lines[p.id] ?? 0}
                    onChange={(e) => {
                      setLines({ ...lines, [p.id]: Math.max(0, Number(e.target.value)) });
                      setOrderKey(crypto.randomUUID()); // another order, another key
                    }}
                  />
                  {p.name_ro} · {formatMoney(lang, p.price)}
                </label>
              </li>
            ))}
          </ul>
          <p>{t("cafe.total", { total: formatMoney(lang, total) })}</p>
          <ReasonAction
            label={t("cafe.order")}
            onConfirm={async (reason) => {
              const chosen = Object.entries(lines)
                .filter(([, quantity]) => quantity > 0)
                .map(([product_id, quantity]) => ({ product_id, quantity }));
              if (!chosen.length) throw new Error("empty");
              const order = await unwrap(
                api.client.POST("/api/v1/staff/cafe/orders", {
                  params: { header: { "Idempotency-Key": orderKey } },
                  body: { location_id: locationId, lines: chosen, method: "cash", tendered: total, reason },
                }),
              );
              notify(t("cafe.ordered", { number: order.number }));
              setOrderKey(crypto.randomUUID());
              setLines({});
              await queue.reload();
            }}
          />
        </div>
      ) : null}
    </>
  );
}

function Menu() {
  const { api, locationId, notify, fail } = usePanel();
  const t = useT();
  const { data, reload } = useData(() => unwrap(api.client.GET("/api/v1/staff/panel/cafe/menu", { params: { query: { location_id: locationId } } })), [api, locationId]);
  const [category, setCategory] = useState({ name_ro: "", name_en: "" });
  const addCategory = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await unwrap(
        api.client.POST("/api/v1/staff/cafe/categories", {
          body: { location_id: locationId, name_ro: category.name_ro.trim(), name_en: category.name_en.trim(), sort_order: (data?.length ?? 0) + 1 },
        }),
      );
      notify(t("saved"));
      setCategory({ name_ro: "", name_en: "" });
      await reload();
    } catch (error) {
      fail(error);
    }
  };
  return (
    <>
      <h2>{t("cafe.menu")}</h2>
      <p className="muted">{t("cafe.menuIntro")}</p>
      {(data ?? []).map((c) => (
        <div key={c.id} className="panel-box">
          <h3>
            {c.name_ro} <span className="muted">/ {c.name_en}</span>
          </h3>
          <table className="table">
            <tbody>
              {c.products.map((p) => (
                <ProductRow key={p.id} product={p} category={c} onSaved={reload} />
              ))}
              <ProductRow category={c} onSaved={reload} />
            </tbody>
          </table>
        </div>
      ))}
      <form className="inline-form" onSubmit={(e) => void addCategory(e)} aria-label={t("cafe.newCategory")}>
        <label>
          {t("cafe.nameRo")}
          <input required maxLength={80} value={category.name_ro} onChange={(e) => setCategory({ ...category, name_ro: e.target.value })} />
        </label>
        <label>
          {t("cafe.nameEn")}
          <input required maxLength={80} value={category.name_en} onChange={(e) => setCategory({ ...category, name_en: e.target.value })} />
        </label>
        <button type="submit" className="button">
          {t("cafe.newCategory")}
        </button>
      </form>
    </>
  );
}

/** One product of the menu, or (without `product`) the row that adds a new one. */
function ProductRow({ product, category, onSaved }: { product?: Product; category: Category; onSaved: () => Promise<void> }) {
  const { api, locationId, notify, fail } = usePanel();
  const t = useT();
  const [draft, setDraft] = useState({
    name_ro: product?.name_ro ?? "",
    name_en: product?.name_en ?? "",
    price: product ? toLei(product.price) : "",
    available: product?.is_available ?? true,
    confirmed: product?.marker === "confirmed",
  });
  const [bad, setBad] = useState(false);
  const label = product ? product.name_ro : t("cafe.newProduct", { category: category.name_ro });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const price = toBani(draft.price);
    setBad(price === null);
    if (price === null) return;
    const body = {
      location_id: locationId,
      category_id: category.id,
      name_ro: draft.name_ro.trim(),
      name_en: draft.name_en.trim(),
      price,
      is_available: draft.available,
      confirmed: draft.confirmed,
      sort_order: product?.sort_order ?? category.products.length + 1,
    };
    try {
      if (product) await unwrap(api.client.PUT("/api/v1/staff/cafe/products/{product_id}", { params: { path: { product_id: product.id } }, body }));
      else await unwrap(api.client.POST("/api/v1/staff/cafe/products", { body }));
      notify(t("saved"));
      if (!product) setDraft({ name_ro: "", name_en: "", price: "", available: true, confirmed: false });
      await onSaved();
    } catch (error) {
      fail(error);
    }
  };
  return (
    <tr>
      <td>
        <form className="amount-form" onSubmit={(e) => void submit(e)} aria-label={label}>
          <label>
            {t("cafe.nameRo")}
            <input required maxLength={120} value={draft.name_ro} onChange={(e) => setDraft({ ...draft, name_ro: e.target.value })} />
          </label>
          <label>
            {t("cafe.nameEn")}
            <input required maxLength={120} value={draft.name_en} onChange={(e) => setDraft({ ...draft, name_en: e.target.value })} />
          </label>
          <label>
            {t("cafe.price")}
            <input inputMode="decimal" required size={6} value={draft.price} aria-invalid={bad} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          </label>
          <label className="check">
            <input type="checkbox" checked={draft.available} onChange={(e) => setDraft({ ...draft, available: e.target.checked })} />
            {t("cafe.available")}
          </label>
          <label className="check">
            <input type="checkbox" checked={draft.confirmed} onChange={(e) => setDraft({ ...draft, confirmed: e.target.checked })} />
            {t("pricing.decided")}
          </label>
          <button type="submit" className="button">
            {product ? t("pricing.save") : t("cafe.add")}
          </button>
          {product && product.marker !== "confirmed" ? <span className="tag tag--todo">{t(`pricing.markers.${product.marker}`)}</span> : null}
          {bad ? <span role="alert">{t("pricing.badAmount")}</span> : null}
        </form>
      </td>
    </tr>
  );
}
