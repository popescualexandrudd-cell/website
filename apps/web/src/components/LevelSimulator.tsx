"use client";

/**
 * "Care e nivelul tău?" (§9.2.6): one question at a time on pills, a padel ball that bounces off the
 * glass walls at every answer, then the estimated level (1.0–7.0) where the ball lands on the scale,
 * with a recommendation and the answers ready for the official questionnaire (R-003). The level
 * comes from the server, with the questionnaire's own formula (Q47); nothing is stored. Focus
 * follows the question for keyboard and screen reader users; reduced motion stops the ball.
 */
import * as tokens from "@jungle/design-tokens/tokens";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { type Answers, bandKey, complete, OPTIONS, onScale, type Question, query, questions } from "@/lib/level";

type Recommendation = "intro_lesson" | "coaching" | "open_matches" | "league";
type Guess = {
  level: string;
  questionnaire: { band: string; years_playing: number; racket_background: string; tournaments: string };
  recommendations: Recommendation[];
};
/** The answer of the server for one request (`key`); a null guess is an error. */
type Outcome = { key: string; guess: Guess | null };

const TARGET = { intro_lesson: "/bookings", coaching: "/bookings", open_matches: "/bookings", league: "/league" } as const;

export function LevelSimulator() {
  const t = useTranslations("web.site.level");
  const locale = useLocale();
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [bounce, setBounce] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const layout = useRef<HTMLDivElement>(null);

  const asked = questions(answers);
  const current: Question | undefined = asked[step];
  // What is sent once every question is answered, as text: the request follows its value.
  const sent = current === undefined ? JSON.stringify(query(answers)) : null;
  const key = sent === null ? null : `${attempt}:${sent}`;
  const shown = outcome && outcome.key === key ? outcome : null;

  useEffect(() => {
    if (key === null || sent === null) return;
    const answered = JSON.parse(sent) as Answers;
    if (!complete(answered)) return;
    const controller = new AbortController();
    api.GET("/api/v1/league/level-guess", { params: { query: answered }, signal: controller.signal }).then(
      ({ data }) => setOutcome({ key, guess: data ?? null }),
      () => {
        if (!controller.signal.aborted) setOutcome({ key, guess: null });
      },
    );
    return () => controller.abort();
  }, [key, sent]);

  // Focus follows the question (or the result) after an answer or a step back, never on load. The
  // result also brings the court into view (above the text on phones), to see where the ball lands.
  const atResult = current === undefined;
  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus({ preventScroll: atResult });
    if (atResult) layout.current?.scrollIntoView({ block: "start" });
  }, [step, atResult]);

  const go = (next: number) => {
    moved.current = true;
    setStep(next);
  };
  const answer = (q: Question, value: string) => {
    setAnswers({ ...answers, [q]: value });
    setBounce(bounce + 1);
    go(step + 1);
  };
  const restart = () => {
    setAnswers({});
    setBounce(bounce + 1);
    go(0);
  };

  const guess = shown?.guess ?? null;
  const level = guess ? Number(guess.level) : null;
  const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 2 });

  return (
    <div ref={layout} className="level__layout">
      <LevelStage bounce={bounce} level={level} />
      <div className="level__card" aria-busy={current === undefined && !shown}>
        {current !== undefined ? (
          <>
            <p className="level__progress">{t("progress", { current: step + 1, total: asked.length })}</p>
            <div className="level__bar" aria-hidden="true">
              <span style={{ transform: `scaleX(${step / asked.length})` }} />
            </div>
            <h3 id="level-question" ref={heading} tabIndex={-1} className="level__question">
              {t(`questions.${current}.title`)}
            </h3>
            <div role="group" aria-labelledby="level-question" className={`level__options level__options--${current}`}>
              {OPTIONS[current].map((value) => (
                <button
                  key={value}
                  type="button"
                  className="level__option"
                  aria-pressed={answers[current] === value}
                  onClick={() => answer(current, value)}
                >
                  {current === "skill" ? (
                    <>
                      <span className="level__option-label">{t(`questions.skill.${value}.label`)}</span>
                      <span className="level__option-hint">{t(`questions.skill.${value}.hint`)}</span>
                    </>
                  ) : (
                    <span className="level__option-label">{t(`questions.${current}.${value}`)}</span>
                  )}
                </button>
              ))}
            </div>
            {step > 0 && (
              <div className="level__actions">
                <button type="button" className="link-button" onClick={() => go(step - 1)}>
                  {t("back")}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <h3 ref={heading} tabIndex={-1} className="level__question">
              {t("result.title")}
            </h3>
            <div aria-live="polite">
              {!shown ? (
                <p className="level__status">{t("result.busy")}</p>
              ) : !guess ? (
                <>
                  <p className="level__status">{t("result.error")}</p>
                  <button type="button" className="btn btn-secondary" onClick={() => setAttempt(attempt + 1)}>
                    {t("result.retry")}
                  </button>
                </>
              ) : (
                <div className="level__result">
                  <p key={guess.level} className="level__value fx-pop">
                    <span className="level__number">{number.format(Number(guess.level))}</span>
                    <span className="level__band">{t(`bands.${bandKey(guess.questionnaire.band)}.name`)}</span>
                  </p>
                  <p className="level__band-text">{t(`bands.${bandKey(guess.questionnaire.band)}.text`)}</p>
                  <h4 className="level__recs-title">{t("result.recsTitle")}</h4>
                  <ul className="level__recs">
                    {guess.recommendations.map((rec) => (
                      <li key={rec} className="level__rec">
                        <h5>{t(`recs.${rec}.title`)}</h5>
                        <p>{t(`recs.${rec}.text`)}</p>
                        <Link href={TARGET[rec]}>{t(`recs.${rec}.cta`)}</Link>
                      </li>
                    ))}
                  </ul>
                  <p className="level__official">
                    <Link
                      href={{
                        pathname: "/account",
                        query: { ...guess.questionnaire, years_playing: String(guess.questionnaire.years_playing) },
                      }}
                    >
                      {t("result.official")}
                    </Link>{" "}
                    {t("result.officialHelp")}
                  </p>
                  <p className="muted">{t("result.note")}</p>
                </div>
              )}
            </div>
            <div className="level__actions">
              <button type="button" className="link-button" onClick={() => go(asked.length - 1)}>
                {t("back")}
              </button>
              <button type="button" className="link-button" onClick={restart}>
                {t("restart")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** The scale under the court: 1.0 at x = 30, 7.0 at x = 370 (SVG units). */
const SCALE = { from: 30, length: 340, y: 214 };
const COURT = { x: 10, y: 10, width: 380, height: 160 };
const CENTRE = { x: COURT.x + COURT.width / 2, y: COURT.y + COURT.height / 2 };

/**
 * A court seen from above, glass at the ends and along the first metres of each side, mesh in
 * between. At every answer the ball plays a short rally off the glass (one of three, CSS only);
 * with the result it lands on the 1–7 scale at the estimated level. Decorative: the level is also
 * written in the text next to it.
 */
function LevelStage({ bounce, level }: { bounce: number; level: number | null }) {
  const glass = tokens.ColorBrass400;
  const ball = tokens.ColorBrass300;
  const muted = tokens.ColorBone200;
  const at = level === null ? null : onScale(level);
  const landed =
    at === null
      ? undefined
      : { transform: `translate(${SCALE.from + SCALE.length * at - CENTRE.x}px, ${SCALE.y - 10 - CENTRE.y}px)` };
  return (
    <div className="level__stage" aria-hidden="true">
      <svg viewBox="0 0 400 250" focusable="false">
        <rect {...COURT} fill={tokens.ColorForest700} />
        <g stroke={glass} strokeWidth="5" strokeLinecap="square">
          <path d="M10 10 V170 M390 10 V170 M10 10 H80 M10 170 H80 M320 10 H390 M320 170 H390" />
        </g>
        <path d="M80 10 H320 M80 170 H320" stroke={muted} strokeWidth="2" strokeDasharray="4 5" />
        <path d="M200 4 V176" stroke={tokens.ColorBone50} strokeWidth="3" />
        <path d={`M${SCALE.from} ${SCALE.y} H${SCALE.from + SCALE.length}`} stroke={tokens.ColorNight500} strokeWidth="4" />
        <rect
          className="level__fill"
          x={SCALE.from}
          y={SCALE.y - 2}
          width={SCALE.length}
          height="4"
          fill={glass}
          style={{ transform: `scaleX(${at ?? 0})` }}
        />
        <g fontFamily="Instrument Sans, system-ui, sans-serif" fontSize="13" fill={muted} textAnchor="middle">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => {
            const x = SCALE.from + (SCALE.length * (n - 1)) / 6;
            return (
              <g key={n}>
                <path d={`M${x} ${SCALE.y - 6} V${SCALE.y + 6}`} stroke={muted} strokeWidth="2" />
                <text x={x} y={SCALE.y + 26}>
                  {n}
                </text>
              </g>
            );
          })}
        </g>
        <g transform={`translate(${CENTRE.x} ${CENTRE.y})`}>
          <g
            key={bounce}
            className={at === null ? "level__ball" : "level__ball is-landed"}
            data-rally={bounce > 0 && at === null ? bounce % 3 : undefined}
            style={landed}
          >
            <circle r="9" fill={ball} />
            <path d="M-6 -6 Q0 0 -6 6 M6 -6 Q0 0 6 6" stroke={tokens.ColorNight900} strokeWidth="1.2" fill="none" opacity="0.5" />
          </g>
        </g>
      </svg>
    </div>
  );
}
