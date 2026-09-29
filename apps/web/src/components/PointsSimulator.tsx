"use client";

/**
 * The points simulator (§9.2.7): the visitor chooses the four levels, their rank, the result and
 * the kind of match, and sees the LP won or lost, the chance of their team and the rank after. The
 * league engine computes everything on the server (`GET /api/v1/league/lp-preview`), with the
 * running season's values; this component only asks, a quarter of a second after the last change.
 */
import { useLocale, useTranslations } from "next-intl";
import { type FocusEvent, useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/api";
import { type Choice, LEVELS, maxLp, previewQuery, RANKS, type Rank, rankFromKey, rankKey } from "@/lib/league";
import { LOCATION_SLUG } from "@/lib/site";

export const DEBOUNCE_MS = 250;

type Shown = { tier: string; division: string | null; lp: number };
type Preview = { win_probability: number; lp: number; before: Shown; after: Shown; change: string; towards: Shown };
/** The answer for one question (`key`); a null preview is an error. */
type Outcome = { key: string; preview: Preview | null };

const START: Choice = {
  you: 3.5,
  partner: 3.5,
  rivalA: 3.5,
  rivalB: 3.5,
  rank: { tier: "silver", division: "I" },
  lp: 50,
  result: "win",
  kind: "official",
};
const PLAYERS = ["you", "partner", "rivalA", "rivalB"] as const;

export function PointsSimulator() {
  const t = useTranslations("web.site.league");
  const locale = useLocale();
  const id = useId();
  const pinned = useRef<HTMLDivElement>(null);
  const [choice, setChoice] = useState<Choice>(START);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const query = previewQuery(choice, LOCATION_SLUG);
  const key = JSON.stringify(query);
  const shown = outcome?.key === key ? outcome : null;

  useEffect(() => {
    const controller = new AbortController();
    const asked = JSON.parse(key) as ReturnType<typeof previewQuery>;
    const timer = setTimeout(() => {
      api.GET("/api/v1/league/lp-preview", { params: { query: asked }, signal: controller.signal }).then(
        ({ data }) => setOutcome({ key, preview: data ?? null }),
        () => {
          if (!controller.signal.aborted) setOutcome({ key, preview: null });
        },
      );
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  const level = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const signed = new Intl.NumberFormat(locale, { signDisplay: "exceptZero" });
  const percent = new Intl.NumberFormat(locale, { style: "percent" });
  const rankName = (rank: { tier: string; division: string | null }) =>
    rank.division ? `${t(`ranks.${rank.tier}`)} ${rank.division}` : t(`ranks.${rank.tier}`);
  const set = (change: Partial<Choice>) => setChoice({ ...choice, ...change });
  // On a phone the result is pinned under the header: a control reached with the keyboard that
  // would sit under it is scrolled into sight (WCAG 2.4.11, focus not obscured).
  const keepInSight = (event: FocusEvent<HTMLFormElement>) => {
    const box = pinned.current;
    if (!box || getComputedStyle(box).position !== "sticky") return;
    const over = box.getBoundingClientRect();
    const control = event.target.getBoundingClientRect();
    const hidden =
      control.top < over.bottom && control.bottom > over.top && control.left < over.right && control.right > over.left;
    if (hidden) window.scrollBy({ top: control.top - over.bottom - 12 });
  };
  const preview = shown?.preview ?? null;

  return (
    <div className="points" role="region" aria-labelledby="points-title">
      <h3 id="points-title" className="league__h3">
        {t("sim.title")}
      </h3>
      <p className="league__text">{t("sim.lead")}</p>
      <div className="points__layout">
        <form className="points__form" onSubmit={(event) => event.preventDefault()} onFocus={keepInSight}>
          <div className="points__levels">
            {PLAYERS.map((field) => (
              <div key={field} className="points__field">
                {/* The label names the slider explicitly: an <output> inside it would take the name. */}
                <span className="points__label">
                  <label htmlFor={`${id}-${field}`}>{t(`sim.${field}`)}</label>
                  <output className="points__value" htmlFor={`${id}-${field}`}>
                    {level.format(choice[field])}
                  </output>
                </span>
                <input
                  id={`${id}-${field}`}
                  type="range"
                  min={LEVELS[0]}
                  max={LEVELS[LEVELS.length - 1]}
                  step={0.5}
                  value={choice[field]}
                  aria-valuetext={level.format(choice[field])}
                  onChange={(event) => set({ [field]: Number(event.target.value) })}
                />
              </div>
            ))}
          </div>
          <div className="points__rank">
            <label className="points__field">
              <span className="points__label">{t("sim.rank")}</span>
              <select
                className="select"
                value={rankKey(choice.rank)}
                onChange={(event) => {
                  const rank: Rank = rankFromKey(event.target.value);
                  set({ rank, lp: Math.min(choice.lp, maxLp(rank)) });
                }}
              >
                {RANKS.map((rank) => (
                  <option key={rankKey(rank)} value={rankKey(rank)}>
                    {rankName(rank)}
                  </option>
                ))}
              </select>
            </label>
            <div className="points__field">
              <span className="points__label">
                <label htmlFor={`${id}-lp`}>{t("sim.lp")}</label>
                <output className="points__value" htmlFor={`${id}-lp`}>
                  {choice.lp}
                </output>
              </span>
              <input
                id={`${id}-lp`}
                type="range"
                min={0}
                max={maxLp(choice.rank)}
                step={1}
                value={choice.lp}
                onChange={(event) => set({ lp: Number(event.target.value) })}
              />
            </div>
          </div>
          <Choices
            label={t("sim.result")}
            options={[
              ["win", t("sim.win")],
              ["loss", t("sim.loss")],
            ]}
            value={choice.result}
            onChange={(result) => set({ result })}
          />
          <Choices
            label={t("sim.kind")}
            options={[
              ["official", t("sim.official")],
              ["tournament", t("sim.tournament")],
            ]}
            value={choice.kind}
            onChange={(kind) => set({ kind })}
          />
        </form>

        <div ref={pinned} className="points__result" aria-live="polite" aria-busy={!shown}>
          {!shown ? (
            <p className="points__status">{t("sim.busy")}</p>
          ) : !preview ? (
            <p className="points__status">{t("sim.error")}</p>
          ) : (
            <>
              <p className={`points__lp ${preview.lp < 0 ? "is-loss" : "is-win"}`}>
                {signed.format(preview.lp)} <span>LP</span>
              </p>
              <p className="points__chance">{t("sim.chance", { chance: percent.format(preview.win_probability) })}</p>
              <dl className="points__ranks">
                <div>
                  <dt>{t("sim.before")}</dt>
                  <dd>
                    {rankName(preview.before)} · {preview.before.lp} LP
                  </dd>
                </div>
                <div>
                  <dt>{t("sim.after")}</dt>
                  <dd>
                    {rankName(preview.after)} · {preview.after.lp} LP
                  </dd>
                </div>
              </dl>
              {preview.change !== "none" && (
                <p className="points__change">
                  {t(`sim.${preview.change === "promoted" ? "promoted" : "demoted"}`, { rank: rankName(preview.after) })}
                </p>
              )}
              <p className="points__towards">
                {t("sim.towards", { level: level.format(choice.you), rank: rankName(preview.towards) })}
              </p>
            </>
          )}
        </div>
      </div>
      <p className="muted points__note">{t("sim.note")}</p>
    </div>
  );
}

/** Two or more choices on pills, one pressed. */
function Choices<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: [T, string][];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="points__choices">
      <legend className="points__label">{label}</legend>
      <div className="points__pills">
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            className="level__option"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            <span className="level__option-label">{text}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
