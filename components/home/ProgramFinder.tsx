"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  recommend,
  type FinderAnswers,
  type FinderExperience,
  type FinderGoal,
  type FinderGroup,
  type FinderProgram,
  type FinderWho,
} from "@/lib/finder";
import { openAssistant } from "@/lib/assistant/events";

const EXPERIENCE: FinderExperience[] = ["niciodata", "putin", "regulat", "turnee"];
const GOALS: FinderGoal[] = ["placere", "progres", "competitie"];
const AGES = Array.from({ length: 15 }, (_, i) => i + 4);

type Props = {
  programs: FinderProgram[];
  groups: FinderGroup[];
  assistant: boolean;
};

/**
 * Three questions (who, experience, goal; a child's age too) and the answer appears at once:
 * the group or programme that fits and the next step. Nothing is sent anywhere.
 */
export function ProgramFinder({ programs, groups, assistant }: Props) {
  const t = useTranslations("finder");
  const id = useId();
  const [who, setWho] = useState<FinderWho | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [experience, setExperience] = useState<FinderExperience | null>(null);
  const [goal, setGoal] = useState<FinderGoal | null>(null);

  const complete =
    who !== null && experience !== null && goal !== null && (who === "adult" || age !== null);
  const answers: FinderAnswers | null = complete ? { who, age, experience, goal } : null;
  const result = answers ? recommend(answers, { programs, groups }) : null;

  const restart = () => {
    setWho(null);
    setAge(null);
    setExperience(null);
    setGoal(null);
  };

  const chip = <T extends string>(
    name: string,
    value: T,
    current: T | null,
    set: (v: T) => void,
    label: string,
  ) => (
    <label key={value} className="finder-chip">
      <input
        type="radio"
        name={`${id}-${name}`}
        value={value}
        checked={current === value}
        onChange={() => set(value)}
      />
      <span>{label}</span>
    </label>
  );

  const summary = answers
    ? [
        t(`whoOptions.${answers.who}`),
        answers.who === "copil" && answers.age !== null
          ? t("ageOption", { age: answers.age })
          : null,
        answers.who === "adult"
          ? t(`experienceOptionsAdult.${answers.experience}`)
          : t(`experienceOptions.${answers.experience}`),
        answers.who === "adult"
          ? t(`goalOptionsAdult.${answers.goal}`)
          : t(`goalOptions.${answers.goal}`),
      ]
        .filter(Boolean)
        .join(", ")
        .toLowerCase()
    : "";

  return (
    <div className="finder">
      <form className="finder-form" onSubmit={(e) => e.preventDefault()}>
        <fieldset className="finder-question">
          <legend>{t("who")}</legend>
          <div className="finder-options">
            {(["copil", "adult"] as const).map((v) =>
              chip("who", v, who, setWho, t(`whoOptions.${v}`)),
            )}
          </div>
        </fieldset>
        {who === "copil" ? (
          <fieldset className="finder-question">
            <legend>{t("age")}</legend>
            <div className="finder-options finder-options--ages">
              {AGES.map((a) =>
                chip(
                  "age",
                  String(a),
                  age === null ? null : String(age),
                  (v) => setAge(Number(v)),
                  t("ageOption", { age: a }),
                ),
              )}
            </div>
          </fieldset>
        ) : null}
        {/* An adult is spoken to directly; a parent is asked about the child. */}
        <fieldset className="finder-question">
          <legend>{who === "adult" ? t("experienceAdult") : t("experience")}</legend>
          <div className="finder-options">
            {EXPERIENCE.map((v) =>
              chip(
                "experience",
                v,
                experience,
                setExperience,
                who === "adult" ? t(`experienceOptionsAdult.${v}`) : t(`experienceOptions.${v}`),
              ),
            )}
          </div>
        </fieldset>
        <fieldset className="finder-question">
          <legend>{who === "adult" ? t("goalAdult") : t("goal")}</legend>
          <div className="finder-options">
            {GOALS.map((v) =>
              chip(
                "goal",
                v,
                goal,
                setGoal,
                who === "adult" ? t(`goalOptionsAdult.${v}`) : t(`goalOptions.${v}`),
              ),
            )}
          </div>
        </fieldset>
      </form>

      <div className="finder-result" aria-live="polite" data-ready={result ? "true" : "false"}>
        {result ? (
          <>
            <p className="kicker">{t("resultTitle")}</p>
            {result.kind === "none" ? (
              <p className="finder-result-title">{t("resultNone")}</p>
            ) : (
              <>
                <p className="finder-result-label">
                  {result.kind === "group" ? t("resultGroup") : t("resultProgram")}
                </p>
                <p className="finder-result-title">
                  {result.kind === "group" ? result.group.name : result.program.name}
                </p>
                <p className="finder-result-text">
                  {result.kind === "group" ? result.group.summary : result.program.summary}
                </p>
              </>
            )}
            <div className="finder-actions">
              {result.next === "evaluation" ? (
                <Link
                  href={{ pathname: "/programe", hash: "inscriere" }}
                  className="btn btn-primary btn-arrow"
                >
                  {t("nextEvaluation")}
                </Link>
              ) : result.next === "booking" && result.kind === "program" ? (
                <Link
                  href={{ pathname: "/rezervare", query: { program: result.program.slug } }}
                  className="btn btn-primary btn-arrow"
                >
                  {t("nextBooking")}
                </Link>
              ) : (
                <Link href="/contact" className="btn btn-primary btn-arrow">
                  {t("nextContact")}
                </Link>
              )}
              {result.kind === "program" ? (
                <Link
                  href={{ pathname: "/programe/[slug]", params: { slug: result.program.slug } }}
                  className="btn btn-secondary"
                >
                  {t("details")}
                </Link>
              ) : null}
              {assistant ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => openAssistant(t("askQuestion", { answers: summary }))}
                >
                  {t("ask")}
                </button>
              ) : null}
              <button type="button" className="finder-restart" onClick={restart}>
                {t("restart")}
              </button>
            </div>
            <p className="finder-note">{t("note")}</p>
          </>
        ) : (
          <div className="finder-placeholder" aria-hidden="true">
            <span className="finder-ball" />
          </div>
        )}
      </div>
    </div>
  );
}
