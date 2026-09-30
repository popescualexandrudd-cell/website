"use client";

/**
 * `/cont/plati` (R-065, R-080 …): the visitor's credit and debts, the history of their money, the
 * subscriptions (with the two-week pause and cancelling one not yet paid), the vouchers and the
 * referral code. Paying happens at the Payments Kiosk, in cash (Q9): nothing is paid from here.
 */
import { useFormatter, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { CLUB_TZ } from "@/lib/live";
import * as member from "@/lib/member";
import { lei } from "@/lib/packages";
import { MemberOnly } from "./useMember";
import { useErrorText } from "./useErrorText";

type Data = {
  balance: member.Balance | null;
  entries: member.Entry[] | null;
  subscriptions: member.Subscription[] | null;
  vouchers: member.Voucher[] | null;
  referral: string | null;
  failed: boolean;
};

const SPORTS = ["padel", "tennis", "pilates"];
const PERIODS = ["monthly", "quarterly", "annual"];
const STATUSES = ["active", "pending_payment", "cancelled"];
const VOUCHER_KINDS = ["hour", "amount", "percent"];

export function AccountMoney({ locale }: { locale: string }) {
  return <MemberOnly>{() => <MoneyPanel locale={locale} />}</MemberOnly>;
}

function MoneyPanel({ locale }: { locale: string }) {
  const t = useTranslations("web.account.money");
  const format = useFormatter();
  const errorText = useErrorText();
  const [data, setData] = useState<Data | null>(null);
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    void Promise.all([member.balance(), member.entries(), member.subscriptions(), member.vouchers(), member.referralCode()]).then(
      ([b, e, s, v, r]) => {
        if (!alive) return;
        setData({
          balance: b.ok ? b.data : null,
          entries: e.ok ? e.data : null,
          subscriptions: s.ok ? s.data : null,
          vouchers: v.ok ? v.data : null,
          referral: r.ok ? r.data.code : null,
          failed: !(b.ok && e.ok && s.ok && v.ok && r.ok),
        });
      },
    );
    return () => {
      alive = false;
    };
  }, [version]);

  if (!data)
    return (
      <p className="status" aria-live="polite">
        {t("loading")}
      </p>
    );

  const money = (bani: number) => t("lei", { amount: lei(bani, locale) });
  const signed = (bani: number) => (bani > 0 ? "+" : bani < 0 ? "−" : "") + money(Math.abs(bani));
  const day = (iso: string) => format.dateTime(new Date(`${iso}T12:00:00Z`), { timeZone: CLUB_TZ, day: "numeric", month: "long", year: "numeric" });
  const today = member.clubToday(new Date());

  return (
    <div className="account">
      {data.failed && (
        <p className="status" data-kind="error" role="alert">
          {t("partial")}
        </p>
      )}

      <section className="account__card" aria-labelledby="money-balance">
        <h2 id="money-balance" className="h3">
          {t("balanceTitle")}
        </h2>
        {data.balance ? (
          <dl className="account__profile money__balance">
            <div>
              <dt>{t("credit")}</dt>
              <dd>{money(data.balance.credit)}</dd>
            </div>
            <div>
              <dt>{t("debt")}</dt>
              <dd data-kind={data.balance.debt > 0 ? "debt" : undefined}>{money(data.balance.debt)}</dd>
            </div>
          </dl>
        ) : (
          <p className="league__text">{t("unavailable")}</p>
        )}
        <p className="events__note">{t("howToPay")}</p>
      </section>

      <section className="account__card" aria-labelledby="money-subscriptions">
        <h2 id="money-subscriptions" className="h3">
          {t("subscriptionsTitle")}
        </h2>
        {data.subscriptions === null ? (
          <p className="league__text">{t("unavailable")}</p>
        ) : data.subscriptions.length === 0 ? (
          <p className="league__text">{t("noSubscriptions")}</p>
        ) : (
          <ul className="account__list">
            {member.sortSubscriptions(data.subscriptions, today).map((s) => (
              <SubscriptionItem
                key={s.id}
                subscription={s}
                today={today}
                money={money}
                day={day}
                onChanged={(text) => {
                  setNotice(text);
                  setVersion((v) => v + 1);
                }}
                onError={(code, params) => setNotice(errorText(code, params))}
              />
            ))}
          </ul>
        )}
        <p className="events__note">{t("subscriptionsNote")}</p>
      </section>

      {notice && (
        <p className="status" role="status">
          {notice}
        </p>
      )}

      <section className="account__card" aria-labelledby="money-vouchers">
        <h2 id="money-vouchers" className="h3">
          {t("vouchersTitle")}
        </h2>
        {data.vouchers === null ? (
          <p className="league__text">{t("unavailable")}</p>
        ) : data.vouchers.length === 0 ? (
          <p className="league__text">{t("noVouchers")}</p>
        ) : (
          <ul className="account__list">
            {(() => {
              const { usable, other } = member.sortVouchers(data.vouchers, today);
              return [...usable, ...other].map((v) => (
                <li key={v.id}>
                  <div>
                    <strong>
                      {t(`voucherKinds.${VOUCHER_KINDS.includes(v.kind) ? v.kind : "amount"}`, {
                        amount: lei(v.value, locale),
                        percent: v.value,
                        minutes: v.value,
                      })}
                    </strong>
                    <span>
                      {t("voucherCode", { code: v.code })} ·{" "}
                      {usable.includes(v) ? t("validUntil", { date: day(v.valid_until) }) : t(v.status === "redeemed" ? "voucherUsed" : "voucherExpired")}
                    </span>
                  </div>
                </li>
              ));
            })()}
          </ul>
        )}
        <p className="events__note">{t("vouchersNote")}</p>
      </section>

      <section className="account__card" aria-labelledby="money-referral">
        <h2 id="money-referral" className="h3">
          {t("referralTitle")}
        </h2>
        {data.referral ? (
          <p className="money__code">
            <span className="sr-only">{t("referralCode")} </span>
            <strong>{data.referral}</strong>
          </p>
        ) : (
          <p className="league__text">{t("unavailable")}</p>
        )}
        <p className="league__text">{t("referralText")}</p>
        <FriendCode />
      </section>

      <section className="account__card" aria-labelledby="money-history">
        <h2 id="money-history" className="h3">
          {t("historyTitle")}
        </h2>
        {data.entries === null ? (
          <p className="league__text">{t("unavailable")}</p>
        ) : data.entries.length === 0 ? (
          <p className="league__text">{t("noHistory")}</p>
        ) : (
          <ul className="account__list">
            {data.entries.map((entry, index) => {
              const change = member.entryChange(entry);
              return (
                <li key={`${entry.transaction_id}-${index}`}>
                  <div>
                    <strong>{entry.description || t("entry")}</strong>
                    <span>
                      {format.dateTime(new Date(entry.created_at), { timeZone: CLUB_TZ, day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>
                  <span className="money__delta">{t(change.side === "credit" ? "creditChange" : "debtChange", { amount: signed(change.delta) })}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function SubscriptionItem({
  subscription: s,
  today,
  money,
  day,
  onChanged,
  onError,
}: {
  subscription: member.Subscription;
  today: string;
  money: (bani: number) => string;
  day: (iso: string) => string;
  onChanged: (text: string) => void;
  onError: (code: string | null, params: Record<string, string | number>) => void;
}) {
  const t = useTranslations("web.account.money");
  const [mode, setMode] = useState<"idle" | "cancel" | "freeze">("idle");
  const [start, setStart] = useState(today);
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const status = STATUSES.includes(s.status) ? s.status : "active";
  const ended = s.status === "active" && s.ends_on < today;

  const cancel = async () => {
    setBusy(true);
    const answer = await member.cancelSubscription(s.id);
    setBusy(false);
    setMode("idle");
    if (answer.ok) onChanged(t("cancelled"));
    else onError(answer.code, answer.params);
  };

  const freeze = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const answer = await member.freezeSubscription(s.id, start, days);
    setBusy(false);
    if (!answer.ok) return onError(answer.code, answer.params);
    setMode("idle");
    onChanged(t("frozen", { from: day(answer.data.starts_on), to: day(answer.data.ends_on) }));
  };

  const sports = s.usage.map((u) => t(`sports.${SPORTS.includes(u.sport) ? u.sport : "padel"}`)).join(" + ");
  return (
    <li>
      <div>
        <strong>
          {sports || t("subscription")} · {t(`periods.${PERIODS.includes(s.period) ? s.period : "monthly"}`)}
        </strong>
        <span>
          {t("period", { from: day(s.starts_on), to: day(s.ends_on) })} · {ended ? t("statuses.ended") : t(`statuses.${status}`)} ·{" "}
          {s.price_provisional ? t("priceProvisional", { amount: money(s.price_total) }) : money(s.price_total)}
        </span>
        {s.status === "active" && !ended && s.usage.length > 0 && (
          <span>
            {s.usage
              .map((u) =>
                t("usage", {
                  sport: t(`sports.${SPORTS.includes(u.sport) ? u.sport : "padel"}`),
                  used: u.used_this_month,
                  total: u.sessions_per_month,
                }),
              )
              .join(" · ")}
          </span>
        )}
      </div>
      {s.status === "pending_payment" &&
        (mode === "cancel" ? (
          <span className="account__confirm">
            <span>{t("cancelAsk")}</span>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void cancel()}>
              {t("cancelYes")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setMode("idle")}>
              {t("cancelNo")}
            </button>
          </span>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => setMode("cancel")}>
            {t("cancel")}
          </button>
        ))}
      {s.status === "active" &&
        !ended &&
        (mode === "freeze" ? (
          <form className="money__freeze" onSubmit={(event) => void freeze(event)}>
            <div className="field">
              <label htmlFor={`freeze-start-${s.id}`}>{t("freezeStart")}</label>
              <input
                id={`freeze-start-${s.id}`}
                className="input"
                type="date"
                required
                min={today}
                max={s.ends_on}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={`freeze-days-${s.id}`}>{t("freezeDays")}</label>
              <input
                id={`freeze-days-${s.id}`}
                className="input"
                type="number"
                inputMode="numeric"
                required
                min={1}
                max={60}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </div>
            <span className="account__confirm">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {t("freezeSubmit")}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setMode("idle")}>
                {t("cancelNo")}
              </button>
            </span>
          </form>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => setMode("freeze")}>
            {t("freeze")}
          </button>
        ))}
    </li>
  );
}

/** The code of the friend who brought the visitor (R-120), entered once, before a first subscription. */
function FriendCode() {
  const t = useTranslations("web.account.money");
  const errorText = useErrorText();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const answer = await member.claimReferral(code.trim());
    setBusy(false);
    if (!answer.ok) return setError(errorText(answer.code, answer.params));
    setDone(true);
  };

  if (done)
    return (
      <p className="status" role="status">
        {t("friendDone")}
      </p>
    );
  return (
    <form className="form money__friend" onSubmit={(event) => void submit(event)}>
      <div className="field">
        <label htmlFor="friend-code">{t("friendCode")}</label>
        <input
          id="friend-code"
          className="input"
          autoComplete="off"
          autoCapitalize="characters"
          required
          maxLength={12}
          aria-describedby="friend-code-hint"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <span id="friend-code-hint" className="field__hint">
          {t("friendHint")}
        </span>
      </div>
      <button type="submit" className="btn btn-secondary" disabled={busy}>
        {t("friendSubmit")}
      </button>
      {error && (
        <p className="status" data-kind="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
