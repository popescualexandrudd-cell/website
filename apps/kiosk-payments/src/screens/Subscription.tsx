/** Buying a subscription (§8.3 flow 4): the 3-step configurator (R-081): the sports, the
 * intensity of each, the period; the price is computed by the server (R-082, R-084), marked
 * when a rate is still indicative (Q21). Ordered, it is paid like any other item. */
import { useEffect, useMemo, useState } from "react";
import { useKiosk, useT } from "../kiosk";
import type { Options, Period, Quote, Selection } from "../lib/api";
import { addPayable } from "../lib/basket";
import { formatDate, moneyIn } from "../lib/i18n";

const SPORTS = ["padel", "tennis", "pilates"] as const;
const PERIODS: Period[] = ["monthly", "quarterly", "annual"];
const INTENSITIES = ["start", "active", "pro"] as const;

/** Today, or the first day of next month, in club time (Europe/Bucharest). */
export function startDays(now: Date): string[] {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(now);
  const [year, month] = today.split("-").map(Number) as [number, number];
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return [today, next];
}

export function SubscriptionScreen() {
  const { api, idle, lang, card, goto, basket, setBasket, fail } = useKiosk();
  const t = useT();
  const lei = moneyIn(lang);
  const [options, setOptions] = useState<Options | null>(null);
  const [step, setStep] = useState(1);
  const [sports, setSports] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<Record<string, string>>({});
  const [period, setPeriod] = useState<Period>("monthly");
  const [days] = useState(() => startDays(new Date()));
  const [startsOn, setStartsOn] = useState(days[0] ?? "");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const slug = idle?.location_slug ?? "";

  useEffect(() => {
    if (slug) api.options(slug).then(setOptions, fail);
  }, [api, fail, slug]);

  const selections: Selection[] = useMemo(
    () => sports.map((sport) => ({ sport: sport as Selection["sport"], intensity: intensity[sport] ?? "start" })),
    [sports, intensity],
  );

  useEffect(() => {
    if (step !== 3 || !slug || selections.length === 0) return;
    setQuote(null);
    api.quote(slug, selections, period).then(setQuote, fail);
  }, [api, fail, period, selections, slug, step]);

  const toggle = (sport: string) =>
    setSports(sports.includes(sport) ? sports.filter((s) => s !== sport) : [...sports, sport]);

  const rate = (sport: string, level: string) => {
    const sessions = options?.intensities[level] ?? 0;
    return options?.rates.find((r) => r.sport === sport && r.sessions_per_month === sessions);
  };

  const order = async () => {
    setBusy(true);
    try {
      const ordered = await api.order(card, selections, period, startsOn);
      setBasket(
        addPayable(basket, {
          kind: "subscription",
          subject_id: ordered.id,
          description: ordered.description,
          price: ordered.price_total,
          to_pay: ordered.price_total,
          debt: false,
          starts_at: null,
          organizer: "",
        }),
      );
      goto("basket");
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="home">
      <button type="button" className="button button--quiet back" onClick={() => (step > 1 ? setStep(step - 1) : goto("home"))}>
        ← {t("actions.back")}
      </button>
      <h1>{t("subscription.title")}</h1>
      <p className="muted">{t("subscription.step", { step, of: 3 })}</p>

      {step === 1 ? (
        <section className="panel">
          <h2>{t("subscription.sports")}</h2>
          <div className="chips">
            {SPORTS.map((sport) => (
              <button
                key={sport}
                type="button"
                className={`chip${sports.includes(sport) ? " chip--on" : ""}`}
                aria-pressed={sports.includes(sport)}
                onClick={() => toggle(sport)}
              >
                {t(`sports.${sport}`)}
              </button>
            ))}
          </div>
          <button type="button" className="button button--primary" disabled={sports.length === 0} onClick={() => setStep(2)}>
            {t("subscription.next")}
          </button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="panel">
          <h2>{t("subscription.intensity")}</h2>
          {sports.map((sport) => (
            <fieldset key={sport} className="set">
              <legend>{t(`sports.${sport}`)}</legend>
              <div className="chips">
                {INTENSITIES.map((level) => {
                  const found = rate(sport, level);
                  const chosen = (intensity[sport] ?? "start") === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      className={`chip${chosen ? " chip--on" : ""}`}
                      aria-pressed={chosen}
                      disabled={!found}
                      onClick={() => setIntensity({ ...intensity, [sport]: level })}
                    >
                      {t(`subscription.levels.${level}`, { sessions: options?.intensities[level] ?? 0 })}
                      {found ? ` · ${t("subscription.perMonth", { price: lei(found.monthly_price) })}` : ""}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <button type="button" className="button button--primary" onClick={() => setStep(3)}>
            {t("subscription.next")}
          </button>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="panel">
          <h2>{t("subscription.period")}</h2>
          <div className="chips">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                className={`chip${period === p ? " chip--on" : ""}`}
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
              >
                {t(`subscription.periods.${p}`)}
                {options?.period_discounts[p] ? ` (−${options.period_discounts[p]}%)` : ""}
              </button>
            ))}
          </div>
          <h2>{t("subscription.startsOn")}</h2>
          <div className="chips">
            {days.map((day) => (
              <button
                key={day}
                type="button"
                className={`chip${startsOn === day ? " chip--on" : ""}`}
                aria-pressed={startsOn === day}
                onClick={() => setStartsOn(day)}
              >
                {formatDate(lang, day)}
              </button>
            ))}
          </div>
          {quote ? (
            <div className="quote" aria-live="polite">
              <p className="total">{t("subscription.total", { amount: lei(quote.total) })}</p>
              <p className="muted">
                {t("subscription.detail", { monthly: lei(quote.monthly_sum), months: quote.months })}
                {quote.discounts.some((d) => d > 0) ? ` · ${t("subscription.discounts", { discounts: quote.discounts.filter((d) => d > 0).map((d) => `${d}%`).join(", ") })}` : ""}
              </p>
              {quote.provisional ? <p className="muted small">* {t("indicativeNote")}</p> : null}
            </div>
          ) : (
            <p className="muted">{t("subscription.computing")}</p>
          )}
          <button type="button" className="button button--primary" disabled={!quote || busy} onClick={() => void order()}>
            {t("subscription.order")}
          </button>
        </section>
      ) : null}
    </div>
  );
}
