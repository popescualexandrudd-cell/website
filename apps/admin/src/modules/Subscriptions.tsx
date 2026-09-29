/**
 * Subscriptions (§8.6, R-080…R-088): the latest subscriptions of the location with their use this
 * month, a new subscription sold at the reception (standard intensities R-082, or "La cerere" with
 * its own monthly price, Q12; for a company, billed to it, Q35), freezing (R-086: up to two weeks
 * a year, the end moves by the same days) and dropping an order not paid yet.
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { clubDay } from "../clock";
import { formatDate, formatMoney } from "../i18n";
import { locationSlug, usePanel, useT } from "../panel";
import { type Picked, toBani, UserPicker, useData } from "../ui";

type Subscription = Schemas["PanelSubscriptionOut"];
const STATUSES = ["", "active", "pending_payment", "cancelled"] as const;
const SPORTS = ["padel", "tennis", "pilates"] as const;
const PERIODS = ["monthly", "quarterly", "annual"] as const;

export function Subscriptions() {
  const { api, locationId } = usePanel();
  const t = useT();
  const [status, setStatus] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const { data, reload } = useData(
    () => unwrap(api.client.GET("/api/v1/staff/panel/subscriptions", { params: { query: { location_id: locationId, status } } })),
    [api, locationId, status],
  );
  return (
    <section aria-labelledby="subscriptions-title">
      <h1 id="subscriptions-title">{t("subscriptions.title")}</h1>
      <div className="toolbar">
        <label>
          {t("subscriptions.status")}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s ? t(`subscriptions.statuses.${s}`) : t("subscriptions.all")}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="button" onClick={() => setAdding(!adding)}>
          {t("subscriptions.new")}
        </button>
      </div>
      {adding ? (
        <NewSubscription
          onDone={async () => {
            setAdding(false);
            await reload();
          }}
        />
      ) : null}
      {data && data.length === 0 ? <p>{t("subscriptions.none")}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th scope="col">{t("subscriptions.customer")}</th>
            <th scope="col">{t("subscriptions.period")}</th>
            <th scope="col">{t("subscriptions.valid")}</th>
            <th scope="col">{t("subscriptions.use")}</th>
            <th scope="col">{t("subscriptions.price")}</th>
            <th scope="col">{t("subscriptions.status")}</th>
            <th scope="col">{t("subscriptions.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((s) => (
            <Row key={s.id} subscription={s} onChanged={reload} />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Row({ subscription: s, onChanged }: { subscription: Subscription; onChanged: () => Promise<void> }) {
  const { api, lang, notify, fail } = usePanel();
  const t = useT();
  const [freezing, setFreezing] = useState(false);
  const [from, setFrom] = useState(() => clubDay(Date.now()));
  const [days, setDays] = useState(7);
  const freeze = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const done = await unwrap(
        api.client.POST("/api/v1/subscriptions/{subscription_id}/freeze", {
          params: { path: { subscription_id: s.id } },
          body: { starts_on: from, days },
        }),
      );
      notify(t("subscriptions.frozen", { from: formatDate(lang, done.starts_on), to: formatDate(lang, done.ends_on) }));
      setFreezing(false);
      await onChanged();
    } catch (error) {
      fail(error);
    }
  };
  const drop = async () => {
    try {
      await unwrap(api.client.POST("/api/v1/subscriptions/{subscription_id}/cancel", { params: { path: { subscription_id: s.id } } }));
      notify(t("subscriptions.dropped"));
      await onChanged();
    } catch (error) {
      fail(error);
    }
  };
  return (
    <tr>
      <th scope="row">
        <a href={`#/users/${s.user_id}`}>{s.user_name}</a>
        {s.corporate ? <span className="muted"> · {s.corporate}</span> : null}
      </th>
      <td>
        {t(`subscriptions.periods.${s.period}`)}
        {s.custom ? ` · ${t("subscriptions.custom")}` : ""}
      </td>
      <td>
        {formatDate(lang, s.starts_on)} – {formatDate(lang, s.ends_on)}
        {s.frozen_days ? <div className="muted">{t("subscriptions.frozenDays", { count: s.frozen_days })}</div> : null}
      </td>
      <td>
        {s.usage.map((u) => (
          <div key={u.sport}>
            {t(`pricing.sports.${u.sport}`)}: {u.used_this_month}/{u.sessions_per_month}
            {u.makeups_available ? ` · ${t("subscriptions.makeups", { count: u.makeups_available })}` : ""}
          </div>
        ))}
      </td>
      <td>
        {formatMoney(lang, s.price_total)}
        {s.price_provisional ? <div className="muted">{t("calendar.provisional")}</div> : null}
      </td>
      <td>{t(`subscriptions.statuses.${s.status}`)}</td>
      <td>
        {s.status === "active" ? (
          freezing ? (
            <form className="inline-form" onSubmit={(e) => void freeze(e)} aria-label={t("subscriptions.freeze")}>
              <label>
                {t("subscriptions.from")}
                <input type="date" required value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label>
                {t("subscriptions.days")}
                <input type="number" min={1} max={14} required value={days} onChange={(e) => setDays(Number(e.target.value))} />
              </label>
              <button type="submit" className="button button--primary">
                {t("subscriptions.freeze")}
              </button>
              <button type="button" className="button button--quiet" onClick={() => setFreezing(false)}>
                {t("cancel")}
              </button>
            </form>
          ) : (
            <button type="button" className="button" onClick={() => setFreezing(true)}>
              {t("subscriptions.freeze")}
            </button>
          )
        ) : null}
        {s.status === "pending_payment" ? (
          <button type="button" className="button button--danger" onClick={() => void drop()}>
            {t("subscriptions.drop")}
          </button>
        ) : null}
      </td>
    </tr>
  );
}

type Line = { sport: (typeof SPORTS)[number]; intensity: string; sessions: string; price: string };

function NewSubscription({ onDone }: { onDone: () => Promise<void> }) {
  const { api, locationId, permissions, lang, notify, fail, can } = usePanel();
  const t = useT();
  const slug = locationSlug(permissions, locationId);
  const options = useData(() => unwrap(api.client.GET("/api/v1/subscriptions/options", { params: { query: { location: slug } } })), [api, slug]);
  const companies = useData(
    () => (can("corporate.manage") ? unwrap(api.client.GET("/api/v1/staff/panel/corporate", { params: { query: { location_id: locationId } } })) : Promise.resolve([])),
    [api, locationId],
  );
  const [customer, setCustomer] = useState<Picked | null>(null);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("monthly");
  const [startsOn, setStartsOn] = useState(() => clubDay(Date.now()));
  const [company, setCompany] = useState("");
  const [lines, setLines] = useState<Line[]>([{ sport: "padel", intensity: "active", sessions: "", price: "" }]);
  const [bad, setBad] = useState(false);
  const levels = Object.entries(options.data?.intensities ?? {});
  const update = (index: number, change: Partial<Line>) => setLines(lines.map((l, i) => (i === index ? { ...l, ...change } : l)));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!customer) return;
    const selections = lines.map((l) =>
      l.intensity
        ? { sport: l.sport, intensity: l.intensity, sessions: 0, monthly_price: null }
        : { sport: l.sport, intensity: "", sessions: Number(l.sessions), monthly_price: toBani(l.price) },
    );
    const invalid = selections.some((s) => s.intensity === "" && (s.monthly_price === null || !(s.sessions >= 1)));
    setBad(invalid);
    if (invalid) return;
    try {
      const created = await unwrap(
        api.client.POST("/api/v1/staff/subscriptions", {
          body: { location_id: locationId, user_id: customer.id, period, starts_on: startsOn, selections, corporate_id: company || null },
        }),
      );
      notify(t("subscriptions.created", { price: formatMoney(lang, created.price_total) }));
      await onDone();
    } catch (error) {
      fail(error);
    }
  };
  return (
    <form className="panel-box form" onSubmit={(e) => void submit(e)} aria-label={t("subscriptions.new")}>
      <h2>{t("subscriptions.new")}</h2>
      <UserPicker label={t("subscriptions.customer")} value={customer} onPick={setCustomer} />
      <label>
        {t("subscriptions.period")}
        <select value={period} onChange={(e) => setPeriod(e.target.value as (typeof PERIODS)[number])}>
          {PERIODS.map((p) => (
            <option key={p} value={p}>
              {t(`subscriptions.periods.${p}`)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("subscriptions.startsOn")}
        <input type="date" required value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
      </label>
      {(companies.data ?? []).length ? (
        <label>
          {t("subscriptions.company")}
          <select value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">{t("subscriptions.noCompany")}</option>
            {(companies.data ?? [])
              .filter((c) => c.is_active)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
      ) : null}
      {lines.map((line, index) => (
        <fieldset key={index} className="inline-form">
          <legend>{t("subscriptions.line", { n: index + 1 })}</legend>
          <label>
            {t("pricing.sport")}
            <select value={line.sport} onChange={(e) => update(index, { sport: e.target.value as Line["sport"] })}>
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`pricing.sports.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("subscriptions.intensity")}
            <select value={line.intensity} onChange={(e) => update(index, { intensity: e.target.value })}>
              {levels.map(([level, sessions]) => (
                <option key={level} value={level}>
                  {t(`subscriptions.intensities.${level}`)} ({t("subscriptions.perMonth", { count: sessions })})
                </option>
              ))}
              <option value="">{t("subscriptions.onRequest")}</option>
            </select>
          </label>
          {line.intensity === "" ? (
            <>
              <label>
                {t("pricing.sessions")}
                <input type="number" min={1} max={31} required value={line.sessions} onChange={(e) => update(index, { sessions: e.target.value })} />
              </label>
              <label>
                {t("subscriptions.monthlyPrice")}
                <input inputMode="decimal" required value={line.price} onChange={(e) => update(index, { price: e.target.value })} />
              </label>
            </>
          ) : null}
          {lines.length > 1 ? (
            <button type="button" className="button button--quiet" onClick={() => setLines(lines.filter((_, i) => i !== index))}>
              {t("subscriptions.removeLine")}
            </button>
          ) : null}
        </fieldset>
      ))}
      {lines.length < 3 ? (
        <button type="button" className="button" onClick={() => setLines([...lines, { sport: "tennis", intensity: "active", sessions: "", price: "" }])}>
          {t("subscriptions.addLine")}
        </button>
      ) : null}
      {bad ? <p role="alert">{t("pricing.badAmount")}</p> : null}
      <div className="actions">
        <button type="submit" className="button button--primary" disabled={!customer}>
          {t("subscriptions.sell")}
        </button>
      </div>
    </form>
  );
}
