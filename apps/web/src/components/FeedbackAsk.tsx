"use client";
/**
 * The question after the first game (Q71), on the account's home: shown only when the club asked
 * this person and they have not answered yet. Eleven buttons, 0 … 10; one answer, then thanks.
 * The server decides who is asked and keeps the score (`/api/v1/feedback`).
 */
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { answerFeedback, FEEDBACK_SCORES, feedbackState } from "@/lib/member";
import { useErrorText } from "./useErrorText";

type Stage = "hidden" | "asking" | "sending" | "thanks";

export function FeedbackAsk() {
  const t = useTranslations("web.account.feedback");
  const errorText = useErrorText();
  const [stage, setStage] = useState<Stage>("hidden");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    void feedbackState().then((answer) => {
      if (alive && answer.ok && answer.data.asked && !answer.data.answered) setStage("asking");
    });
    return () => {
      alive = false;
    };
  }, []);

  if (stage === "hidden") return null;

  const send = async (score: number) => {
    setStage("sending");
    setError("");
    const answer = await answerFeedback(score);
    if (answer.ok) return setStage("thanks");
    setError(errorText(answer.code, answer.params));
    setStage(answer.code === "feedback.answered" ? "thanks" : "asking");
  };

  return (
    <section className="account__card" aria-labelledby="account-feedback">
      <h2 id="account-feedback" className="h3">
        {t("title")}
      </h2>
      {stage === "thanks" ? (
        <p role="status">{error || t("thanks")}</p>
      ) : (
        <>
          <p className="league__text">{t("lead")}</p>
          <div className="feedback__scale" role="group" aria-label={t("scale")} aria-busy={stage === "sending"}>
            {FEEDBACK_SCORES.map((score) => (
              <button
                key={score}
                type="button"
                className="btn btn-secondary feedback__score"
                aria-label={t("score", { score })}
                disabled={stage === "sending"}
                onClick={() => void send(score)}
              >
                {score}
              </button>
            ))}
          </div>
          <p className="feedback__ends" aria-hidden="true">
            <span>{t("low")}</span>
            <span>{t("high")}</span>
          </p>
          {stage === "sending" && <p role="status">{t("sending")}</p>}
          {error && <p role="alert">{error}</p>}
        </>
      )}
    </section>
  );
}
