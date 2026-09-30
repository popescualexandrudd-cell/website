"use client";

/**
 * The package configurator (§9.2.10, R-081): (1) the sports, (2) the intensity of each, (3) the
 * period; the price follows at once. The offer (intensities, discounts, monthly rates) and every
 * price come from the server (`/api/v1/subscriptions/options` and `/quote`, R-084), a quarter of a
 * second after the last change; "Preț orientativ" while a rate is still to be set (Q21).
 */
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  type Choice,
  chosen,
  INTENSITIES,
  type Intensity,
  lei,
  PERIODS,
  quoteBody,
  SPORTS,
  type Sport,
  START,
  toggleSport,
} from "@/lib/packages";
import { LOCATION_SLUG } from "@/lib/site";

export const DEBOUNCE_MS = 250;

type Rate = { sport: string; sessions_per_month: number; monthly_price: number };
type Options = {
  intensities: Record<string, number>;
  bundle_discounts: Record<string, number>;
  period_discounts: Record<string, number>;
  rates: Rate[];
};
type Quote = {
  components: { sport: string; sessions_per_month: number; monthly_price: number; peak_allowed: boolean }[];
  monthly_sum: number;
  months: number;
  gross: number;
  discounts: number[];
  total: number;
  provisional: boolean;
};
/** The answer for one question (`key`); a null quote is an error. */
type Outcome = { key: string; quote: Quote | null };

export function PackageConfigurator() {
  const t = useTranslations("web.site.packages");
  const locale = useLocale();
  const [choice, setChoice] = useState<Choice>(START);
  const [options, setOptions] = useState<Options | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const key = JSON.stringify(quoteBody(choice, LOCATION_SLUG));
  const shown = outcome?.key === key ? outcome : null;

  useEffect(() => {
    let alive = true;
    api
      .GET("/api/v1/subscriptions/options", { params: { query: { location: LOCATION_SLUG } } })
      .then(({ data }) => alive && data && setOptions(data))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const body = JSON.parse(key) as ReturnType<typeof quoteBody>;
    const timer = setTimeout(() => {
      api.POST("/api/v1/subscriptions/quote", { body, signal: controller.signal }).then(
        ({ data }) => setOutcome({ key, quote: data ?? null }),
        () => {
          if (!controller.signal.aborted) setOutcome({ key, quote: null });
        },
      );
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  const sessions = (intensity: Intensity) => options?.intensities[intensity];
  const rate = (sport: Sport, intensity: Intensity) =>
    options?.rates.find((r) => r.sport === sport && r.sessions_per_month === sessions(intensity))?.monthly_price;
  const quote = shown?.quote ?? null;
  const setIntensity = (sport: Sport, intensity: Intensity) =>
    setChoice({ ...choice, sports: { ...choice.sports, [sport]: intensity } });

  return (
    <div className="configurator" role="region" aria-labelledby="configurator-title">
      <h3 id="configurator-title" className="sr-only">
        {t("configurator")}
      </h3>
      <div className="configurator__layout">
        <ol className="configurator__steps">
          <li className="configurator__step">
            <h4 id="step-sports" className="configurator__title">
              <span className="configurator__number" aria-hidden="true">
                1
              </span>
              {t("steps.sports")}
            </h4>
            <div className="configurator__pills" role="group" aria-labelledby="step-sports">
              {SPORTS.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  className="level__option"
                  aria-pressed={choice.sports[sport] !== undefined}
                  onClick={() => setChoice(toggleSport(choice, sport))}
                >
                  <span className="level__option-label">{t(`sports.${sport}`)}</span>
                </button>
              ))}
            </div>
            {options && (
              <p className="configurator__hint">
                {t("bundleHint", { two: options.bundle_discounts["2"] ?? 0, three: options.bundle_discounts["3"] ?? 0 })}
              </p>
            )}
          </li>
          <li className="configurator__step">
            <h4 className="configurator__title">
              <span className="configurator__number" aria-hidden="true">
                2
              </span>
              {t("steps.intensity")}
            </h4>
            {chosen(choice).map((sport) => (
              <div key={sport} className="configurator__sport">
                <p id={`intensity-${sport}`} className="configurator__label">
                  {t(`sports.${sport}`)}
                </p>
                <div className="configurator__pills" role="group" aria-labelledby={`intensity-${sport}`}>
                  {INTENSITIES.map((intensity) => {
                    const price = rate(sport, intensity);
                    return (
                      <button
                        key={intensity}
                        type="button"
                        className="level__option"
                        aria-pressed={choice.sports[sport] === intensity}
                        onClick={() => setIntensity(sport, intensity)}
                      >
                        <span className="level__option-label">{t(`intensities.${intensity}`)}</span>
                        <span className="level__option-hint">
                          {t("perMonth", { sessions: sessions(intensity) ?? "—" })}
                          {price !== undefined && ` · ${t("lei", { amount: lei(price, locale) })}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="configurator__hint">{t("startRule")}</p>
          </li>
          <li className="configurator__step">
            <h4 id="step-period" className="configurator__title">
              <span className="configurator__number" aria-hidden="true">
                3
              </span>
              {t("steps.period")}
            </h4>
            <div className="configurator__pills" role="group" aria-labelledby="step-period">
              {PERIODS.map((period) => {
                const off = options?.period_discounts[period];
                return (
                  <button
                    key={period}
                    type="button"
                    className="level__option"
                    aria-pressed={choice.period === period}
                    onClick={() => setChoice({ ...choice, period })}
                  >
                    <span className="level__option-label">{t(`periods.${period}`)}</span>
                    {off ? <span className="level__option-hint">{t("off", { percent: off })}</span> : null}
                  </button>
                );
              })}
            </div>
          </li>
        </ol>

        <div className="configurator__result points__result" aria-live="polite" aria-busy={!shown}>
          {!shown ? (
            <p className="points__status">{t("busy")}</p>
          ) : !quote ? (
            <p className="points__status">{t("error")}</p>
          ) : (
            <>
              {quote.provisional && <p className="configurator__provisional">{t("provisional")}</p>}
              <p key={quote.total} className="configurator__total fx-pop">
                {t("lei", { amount: lei(quote.total, locale) })}
                <span>{t("forMonths", { months: quote.months })}</span>
              </p>
              <ul className="configurator__lines">
                {quote.components.map((c) => (
                  <li key={c.sport}>
                    <span>
                      {t(`sports.${c.sport}`)} · {t("perMonth", { sessions: c.sessions_per_month })}
                    </span>
                    <span>{t("leiPerMonth", { amount: lei(c.monthly_price, locale) })}</span>
                  </li>
                ))}
                <li>
                  <span>{t("gross", { months: quote.months })}</span>
                  <span>{t("lei", { amount: lei(quote.gross, locale) })}</span>
                </li>
                {quote.discounts[0] ? (
                  <li className="is-discount">
                    <span>{t("bundle", { count: quote.components.length })}</span>
                    <span>−{quote.discounts[0]}%</span>
                  </li>
                ) : null}
                {quote.discounts[1] ? (
                  <li className="is-discount">
                    <span>{t(`periods.${choice.period}`)}</span>
                    <span>−{quote.discounts[1]}%</span>
                  </li>
                ) : null}
              </ul>
              {quote.components.some((c) => !c.peak_allowed) && <p className="points__towards">{t("startNote")}</p>}
            </>
          )}
          <p className="muted">{t("rounding")}</p>
        </div>
      </div>
    </div>
  );
}
