/**
 * Prices (§8.6, R-050…R-056, Q21): the rates per half hour by resource, product, time band
 * (peak 17–22, Q2), customer type and season, and the monthly subscription rates. A price not yet
 * decided by the owner is marked DE_STABILIT and shown as provisional to customers; ticking
 * "decided by the owner" marks it confirmed. Every change is recorded in the audit log.
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { formatMoney } from "../i18n";
import { locationSlug, usePanel, useT } from "../panel";
import { toBani, toLei, useData } from "../ui";

type Rate = Schemas["RateOut"];
type SubscriptionRate = Schemas["SubscriptionRateOut"];

export function Pricing() {
  const { api, permissions, locationId } = usePanel();
  const t = useT();
  const slug = locationSlug(permissions, locationId);
  const rates = useData(() => unwrap(api.client.GET("/api/v1/pricing/{slug}/rates", { params: { path: { slug } } })), [api, slug]);
  const options = useData(() => unwrap(api.client.GET("/api/v1/subscriptions/options", { params: { query: { location: slug } } })), [api, slug]);
  const sorted = [...(rates.data ?? [])].sort((a, b) =>
    `${a.resource_kind}${a.product}${a.customer_type}${a.season}${a.band}`.localeCompare(`${b.resource_kind}${b.product}${b.customer_type}${b.season}${b.band}`),
  );
  return (
    <section aria-labelledby="pricing-title">
      <h1 id="pricing-title">{t("pricing.title")}</h1>
      <p className="muted">{t("pricing.intro")}</p>
      <h2>{t("pricing.hourly")}</h2>
      <table className="table">
        <thead>
          <tr>
            <th scope="col">{t("pricing.resource")}</th>
            <th scope="col">{t("pricing.product")}</th>
            <th scope="col">{t("pricing.band")}</th>
            <th scope="col">{t("pricing.customer")}</th>
            <th scope="col">{t("pricing.season")}</th>
            <th scope="col">{t("pricing.perHour")}</th>
            <th scope="col">{t("pricing.marker")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <RateRow key={r.id} rate={r} onSaved={rates.reload} />
          ))}
        </tbody>
      </table>
      <h2>{t("pricing.subscriptions")}</h2>
      <table className="table">
        <thead>
          <tr>
            <th scope="col">{t("pricing.sport")}</th>
            <th scope="col">{t("pricing.sessions")}</th>
            <th scope="col">{t("pricing.perMonth")}</th>
            <th scope="col">{t("pricing.marker")}</th>
          </tr>
        </thead>
        <tbody>
          {(options.data?.rates ?? []).map((r) => (
            <SubscriptionRateRow key={`${r.sport}-${r.sessions_per_month}`} rate={r} onSaved={options.reload} />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Marker({ marker }: { marker: string }) {
  const t = useT();
  return <span className={marker === "confirmed" ? "tag tag--ok" : "tag tag--todo"}>{t(`pricing.markers.${marker}`)}</span>;
}

/** Edits an amount in lei with the owner's confirmation, then saves it. */
function AmountForm({
  label,
  bani,
  confirmed,
  even = false,
  onSave,
}: {
  label: string;
  bani: number;
  confirmed: boolean;
  /** An hourly price is stored per half hour: it must split into two equal halves. */
  even?: boolean;
  onSave: (bani: number, confirmed: boolean) => Promise<void>;
}) {
  const t = useT();
  const { fail } = usePanel();
  const [lei, setLei] = useState(toLei(bani));
  const [sure, setSure] = useState(confirmed);
  const [error, setError] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = toBani(lei);
    const bad = value === null || (even && value % 2 !== 0);
    setError(bad);
    if (bad) return;
    try {
      await onSave(value, sure);
    } catch (e) {
      fail(e);
    }
  };
  return (
    <form className="amount-form" onSubmit={(e) => void submit(e)} aria-label={label}>
      <label>
        <span className="visually-hidden">{label}</span>
        <input inputMode="decimal" size={7} value={lei} aria-invalid={error} onChange={(e) => setLei(e.target.value)} />
      </label>
      <span>lei</span>
      <label className="check">
        <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} />
        {t("pricing.decided")}
      </label>
      <button type="submit" className="button">
        {t("pricing.save")}
      </button>
      {error ? <span role="alert">{t("pricing.badAmount")}</span> : null}
    </form>
  );
}

function RateRow({ rate, onSaved }: { rate: Rate; onSaved: () => Promise<void> }) {
  const { api, locationId, lang, can, notify } = usePanel();
  const t = useT();
  const label = `${t(`resources.kinds.${rate.resource_kind}`)} · ${t(`pricing.products.${rate.product}`)} · ${t(`pricing.bands.${rate.band}`)}`;
  return (
    <tr>
      <th scope="row">{t(`resources.kinds.${rate.resource_kind}`)}</th>
      <td>{t(`pricing.products.${rate.product}`)}</td>
      <td>{t(`pricing.bands.${rate.band}`)}</td>
      <td>{t(`pricing.customers.${rate.customer_type}`)}</td>
      <td>{t(`pricing.seasons.${rate.season}`)}</td>
      <td>
        {can("pricing.manage") ? (
          <AmountForm
            label={label}
            bani={rate.amount_per_half_hour * 2}
            confirmed={rate.marker === "confirmed"}
            even
            onSave={async (perHour, confirmed) => {
              await unwrap(
                api.client.PUT("/api/v1/staff/pricing/rates", {
                  body: {
                    location_id: locationId,
                    resource_kind: rate.resource_kind as Schemas["ResourceKind"],
                    product: rate.product as Schemas["Product"],
                    band: rate.band as Schemas["Band"],
                    customer_type: rate.customer_type as Schemas["CustomerType"],
                    season: rate.season as Schemas["Season"],
                    amount_per_half_hour: perHour / 2,
                    confirmed,
                    note: rate.note,
                  },
                }),
              );
              notify(t("saved"));
              await onSaved();
            }}
          />
        ) : (
          formatMoney(lang, rate.amount_per_half_hour * 2)
        )}
      </td>
      <td>
        <Marker marker={rate.marker} />
      </td>
    </tr>
  );
}

function SubscriptionRateRow({ rate, onSaved }: { rate: SubscriptionRate; onSaved: () => Promise<void> }) {
  const { api, locationId, lang, can, notify } = usePanel();
  const t = useT();
  return (
    <tr>
      <th scope="row">{t(`pricing.sports.${rate.sport}`)}</th>
      <td>{rate.sessions_per_month}</td>
      <td>
        {can("pricing.manage") ? (
          <AmountForm
            label={`${t(`pricing.sports.${rate.sport}`)} · ${rate.sessions_per_month}`}
            bani={rate.monthly_price}
            confirmed={rate.marker === "confirmed"}
            onSave={async (monthly, confirmed) => {
              await unwrap(
                api.client.PUT("/api/v1/staff/subscriptions/rates", {
                  body: {
                    location_id: locationId,
                    sport: rate.sport as Schemas["Sport"],
                    sessions_per_month: rate.sessions_per_month,
                    monthly_price: monthly,
                    confirmed,
                  },
                }),
              );
              notify(t("saved"));
              await onSaved();
            }}
          />
        ) : (
          formatMoney(lang, rate.monthly_price)
        )}
      </td>
      <td>
        <Marker marker={rate.marker} />
      </td>
    </tr>
  );
}
