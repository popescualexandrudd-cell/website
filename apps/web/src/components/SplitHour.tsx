"use client";

/**
 * "Împarte ora" (§9.2.11): the price band, the duration and the number of players, then what each
 * player pays for the court. The price comes from the club's rates and the split is the kiosk's own
 * (`GET /api/v1/pricing/{location}/split`, R-060, R-061: whole bani, the first player pays the
 * leftover); nothing is computed here, a quarter of a second after the last change.
 */
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { lei } from "@/lib/packages";
import { LOCATION_SLUG } from "@/lib/site";

export const DEBOUNCE_MS = 250;
const BANDS = ["peak", "semi_peak", "off_peak"] as const;
const PLAYERS = [4, 3, 2, 1] as const;
/** R-041 (Q2); the server sends the durations it accepts and the pills follow them. */
const DURATIONS = [60, 90, 120, 150, 180];

type Band = (typeof BANDS)[number];
type Choice = { band: Band; duration: number; players: number };
type Split = {
  total: number;
  shares: number[];
  provisional: boolean;
  durations_minutes: number[];
  hours: Record<string, string[][]>;
};
/** The answer for one question (`key`); a null split is an error. */
type Outcome = { key: string; split: Split | null };

export function SplitHour() {
  const t = useTranslations("web.site.split");
  const locale = useLocale();
  const [choice, setChoice] = useState<Choice>({ band: "peak", duration: 90, players: 4 });
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [durations, setDurations] = useState<number[]>(DURATIONS);
  const key = JSON.stringify(choice);
  const shown = outcome?.key === key ? outcome : null;

  useEffect(() => {
    const controller = new AbortController();
    const asked = JSON.parse(key) as Choice;
    const timer = setTimeout(() => {
      api
        .GET("/api/v1/pricing/{slug}/split", {
          params: {
            path: { slug: LOCATION_SLUG },
            query: { band: asked.band, duration_minutes: asked.duration, players: asked.players },
          },
          signal: controller.signal,
        })
        .then(
          ({ data }) => {
            setOutcome({ key, split: data ?? null });
            if (data) setDurations(data.durations_minutes);
          },
          () => {
            if (!controller.signal.aborted) setOutcome({ key, split: null });
          },
        );
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  const split = shown?.split ?? null;
  const spans = (list: string[][]) => list.map(([from, to]) => `${from}–${to}`).join(", ");
  const weekday = spans(split?.hours.weekday ?? []);
  const weekend = spans(split?.hours.weekend ?? []);
  const hours = !split || !weekday ? null : weekday === weekend ? t("everyDay", { hours: weekday }) : t("weekdayWeekend", { weekday, weekend });
  const each = split?.shares.at(-1);
  const uneven = split ? new Set(split.shares).size > 1 : false;

  return (
    <div className="split-hour" role="region" aria-labelledby="split-title">
      <h3 id="split-title" className="sr-only">
        {t("simulator")}
      </h3>
      <div className="configurator__layout">
        <div className="configurator__steps">
          <Choices
            id="split-band"
            label={t("band")}
            options={BANDS.map((band) => [band, t(`bands.${band}`)])}
            value={choice.band}
            onChange={(band) => setChoice({ ...choice, band })}
          />
          <Choices
            id="split-duration"
            label={t("duration")}
            options={durations.map((minutes) => [minutes, t("minutes", { minutes })])}
            value={choice.duration}
            onChange={(duration) => setChoice({ ...choice, duration })}
          />
          <Choices
            id="split-players"
            label={t("players")}
            options={PLAYERS.map((players) => [players, t("playerCount", { count: players })])}
            value={choice.players}
            onChange={(players) => setChoice({ ...choice, players })}
          />
        </div>

        <div className="configurator__result points__result" aria-live="polite" aria-busy={!shown}>
          {!shown ? (
            <p className="points__status">{t("busy")}</p>
          ) : !split || each === undefined ? (
            <p className="points__status">{t("error")}</p>
          ) : (
            <>
              {split.provisional && <p className="configurator__provisional">{t("provisional")}</p>}
              <p className="configurator__total">
                {t("lei", { amount: lei(each, locale) })}
                <span>{choice.players === 1 ? t("allYours") : t("perPerson")}</span>
              </p>
              <ul className="configurator__lines">
                <li>
                  <span>{t("court", { minutes: choice.duration })}</span>
                  <span>{t("lei", { amount: lei(split.total, locale) })}</span>
                </li>
                {uneven &&
                  split.shares.map((share, i) => (
                    <li key={i}>
                      <span>{t("player", { n: i + 1 })}</span>
                      <span>{t("lei", { amount: lei(share, locale) })}</span>
                    </li>
                  ))}
              </ul>
              {uneven && <p className="points__towards">{t("leftover")}</p>}
              {hours && <p className="points__towards">{hours}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** One question on pills, one answer pressed. */
function Choices<T extends string | number>({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: [T, string][];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="configurator__step">
      <h4 id={id} className="configurator__title">
        {label}
      </h4>
      <div className="configurator__pills" role="group" aria-labelledby={id}>
        {options.map(([option, text]) => (
          <button
            key={String(option)}
            type="button"
            className="level__option"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            <span className="level__option-label">{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
