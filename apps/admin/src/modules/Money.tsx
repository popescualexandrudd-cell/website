/**
 * Payments and the ledger (§8.6, ADR-0009): the transactions of a club day with their entries.
 * The ledger is never edited: a mistake is corrected by a reverse entry, with a reason and its
 * author (ledger.correct). Vouchers (R-091…): the latest ones, a new one for a customer (an hour,
 * a sum or a percentage), cancelling one with a reason.
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { addDays, clubDay } from "../clock";
import { formatDate, formatMoney, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { type Picked, ReasonAction, toBani, UserPicker, useData } from "../ui";

type Transaction = Schemas["PanelTransactionOut"];

export function Money() {
  const { can } = usePanel();
  const t = useT();
  return (
    <section aria-labelledby="money-title">
      <h1 id="money-title">{t("money.title")}</h1>
      {can("payments.view") ? <Ledger /> : null}
      {can("vouchers.manage") ? <Vouchers /> : null}
    </section>
  );
}

function Ledger() {
  const { api, locationId, lang, can, notify } = usePanel();
  const t = useT();
  const [day, setDay] = useState(() => clubDay(Date.now()));
  const { data, reload } = useData(
    () => unwrap(api.client.GET("/api/v1/staff/panel/transactions", { params: { query: { location_id: locationId, day } } })),
    [api, locationId, day],
  );
  const reverse = async (tx: Transaction, reason: string) => {
    await unwrap(api.client.POST("/api/v1/staff/ledger/transactions/{transaction_id}/reverse", { params: { path: { transaction_id: tx.id } }, body: { reason } }));
    notify(t("money.reversed"));
    await reload();
  };
  return (
    <>
      <h2>{t("money.ledger")}</h2>
      <p className="muted">{t("money.ledgerIntro")}</p>
      <div className="toolbar">
        <button type="button" className="button" onClick={() => setDay(addDays(day, -1))}>
          {t("calendar.prevDay")}
        </button>
        <label>
          {t("calendar.day")}
          <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
        </label>
        <button type="button" className="button" onClick={() => setDay(addDays(day, 1))}>
          {t("calendar.nextDay")}
        </button>
      </div>
      {data && data.length === 0 ? <p>{t("money.none")}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th scope="col">{t("money.time")}</th>
            <th scope="col">{t("money.what")}</th>
            <th scope="col">{t("money.entries")}</th>
            <th scope="col">{t("money.who")}</th>
            <th scope="col">{t("money.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((tx) => (
            <tr key={tx.id}>
              <th scope="row">{formatTime(lang, tx.created_at)}</th>
              <td>
                {t(`money.kinds.${tx.kind}`)} · {tx.description}
                {tx.reason ? <div className="muted">{t("money.reason", { reason: tx.reason })}</div> : null}
                {tx.reversed ? <div className="tag tag--todo">{t("money.isReversed")}</div> : null}
              </td>
              <td>
                {tx.entries.map((e, i) => (
                  <div key={i}>
                    {t(`money.accounts.${e.kind}`)}: {formatMoney(lang, e.amount)}
                  </div>
                ))}
              </td>
              <td>{tx.actor || "—"}</td>
              <td>
                {can("ledger.correct") && !tx.reversed && tx.kind !== "reversal" ? (
                  <ReasonAction danger label={t("money.reverse")} onConfirm={(reason) => reverse(tx, reason)} />
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

const KINDS = ["amount", "hour", "percent"] as const;
const TARGETS = ["any", "booking", "subscription"] as const;

function Vouchers() {
  const { api, locationId, lang, notify, fail } = usePanel();
  const t = useT();
  const [status, setStatus] = useState("active");
  const { data, reload } = useData(
    () => unwrap(api.client.GET("/api/v1/staff/panel/vouchers", { params: { query: { location_id: locationId, status } } })),
    [api, locationId, status],
  );
  const [adding, setAdding] = useState(false);
  const [holder, setHolder] = useState<Picked | null>(null);
  const [draft, setDraft] = useState({ kind: "amount" as (typeof KINDS)[number], value: "", target: "any" as (typeof TARGETS)[number], days: 90, reason: "" });
  const [bad, setBad] = useState(false);
  const value = (v: Schemas["PanelVoucherOut"]) =>
    v.kind === "amount" ? formatMoney(lang, v.value) : v.kind === "percent" ? `${v.value}%` : t("money.minutes", { count: v.value });
  const issue = async (event: FormEvent) => {
    event.preventDefault();
    if (!holder) return;
    const amount = draft.kind === "amount" ? toBani(draft.value) : /^\d{1,4}$/.test(draft.value.trim()) ? Number(draft.value) : null;
    setBad(amount === null || amount === 0);
    if (amount === null || amount === 0) return;
    try {
      const made = await unwrap(
        api.client.POST("/api/v1/staff/vouchers", {
          body: { location_id: locationId, holder_id: holder.id, kind: draft.kind, value: amount, target: draft.target, valid_days: draft.days, reason: draft.reason.trim() },
        }),
      );
      notify(t("money.issued", { code: made.code }));
      setAdding(false);
      setHolder(null);
      await reload();
    } catch (error) {
      fail(error);
    }
  };
  return (
    <>
      <h2>{t("money.vouchers")}</h2>
      <div className="toolbar">
        <label>
          {t("subscriptions.status")}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t("subscriptions.all")}</option>
            {["active", "redeemed", "cancelled"].map((s) => (
              <option key={s} value={s}>
                {t(`money.voucherStatuses.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="button" onClick={() => setAdding(!adding)}>
          {t("money.newVoucher")}
        </button>
      </div>
      {adding ? (
        <form className="panel-box form" onSubmit={(e) => void issue(e)} aria-label={t("money.newVoucher")}>
          <UserPicker label={t("money.holder")} value={holder} onPick={setHolder} />
          <label>
            {t("money.voucherKind")}
            <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as (typeof KINDS)[number] })}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`money.voucherKinds.${k}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t(`money.valueOf.${draft.kind}`)}
            <input inputMode="decimal" required value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
          </label>
          <label>
            {t("money.target")}
            <select value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value as (typeof TARGETS)[number] })}>
              {TARGETS.map((k) => (
                <option key={k} value={k}>
                  {t(`money.targets.${k}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("money.validDays")}
            <input type="number" min={1} max={730} required value={draft.days} onChange={(e) => setDraft({ ...draft, days: Number(e.target.value) })} />
          </label>
          <label>
            {t("reason")}
            <input required minLength={3} maxLength={250} value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} />
          </label>
          {bad ? <p role="alert">{t("money.badValue")}</p> : null}
          <div className="actions">
            <button type="submit" className="button button--primary" disabled={!holder}>
              {t("money.issue")}
            </button>
          </div>
        </form>
      ) : null}
      {data && data.length === 0 ? <p>{t("money.noVouchers")}</p> : null}
      <table className="table">
        <tbody>
          {(data ?? []).map((v) => (
            <tr key={v.id}>
              <th scope="row">
                <code>{v.code}</code>
              </th>
              <td>
                <a href={`#/users/${v.holder_id}`}>{v.holder}</a>
              </td>
              <td>
                {value(v)} · {t(`money.targets.${v.target}`)}
              </td>
              <td>
                {formatDate(lang, v.valid_from)} – {formatDate(lang, v.valid_until)}
              </td>
              <td>
                {t(`money.voucherStatuses.${v.status}`)}
                <div className="muted">{v.reason}</div>
              </td>
              <td>
                {v.status === "active" ? (
                  <ReasonAction
                    danger
                    label={t("money.cancelVoucher")}
                    onConfirm={async (reason) => {
                      await unwrap(api.client.POST("/api/v1/staff/vouchers/{voucher_id}/cancel", { params: { path: { voucher_id: v.id } }, body: { location_id: locationId, reason } }));
                      notify(t("money.voucherCancelled"));
                      await reload();
                    }}
                  />
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
