/** Tournament matches (Q28): a player of the match (or the director) marks it finished, then
 * enters the score within 30 minutes. Tournament matches are played to the end (LG-084). */
import { useState } from "react";
import { describe, toScore } from "../lib/score";
import { initialScore, ScoreEditor, type ScoreState } from "../components/ScoreEditor";
import { useKiosk, useT } from "../kiosk";
import { Back } from "./Home";
import { names } from "./Idle";

export function Fixtures() {
  const kiosk = useKiosk();
  const t = useT();
  const [scoring, setScoring] = useState<string | null>(null);
  const [score, setScore] = useState<ScoreState>(initialScore);
  const [busy, setBusy] = useState(false);
  const fixtures = kiosk.session?.fixtures ?? [];

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await action();
      kiosk.notify(done);
      setScoring(null);
      await kiosk.refresh();
    } catch (error) {
      kiosk.fail(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <Back />
      <h1>{t("fixtures.title")}</h1>
      {fixtures.length === 0 ? <p className="notice">{t("fixtures.none")}</p> : null}
      {fixtures.map((f) => (
        <article key={f.fixture_id} className="card-row">
          <p className="muted">{t("fixtures.phase", { tournament: f.tournament, phase: f.phase })}</p>
          <p className="summary">
            <strong>{names(f.team_a)}</strong> <span className="muted">{t("idle.vs")}</span> <strong>{names(f.team_b)}</strong>
          </p>
          {f.match_id ? (
            <>
              <p className="score-line">{t("fixtures.waiting", { score: describe(f.score ?? {}) })}</p>
              {kiosk.session?.director ? (
                <button
                  type="button"
                  className="button button--primary"
                  disabled={busy}
                  onClick={() => void run(() => kiosk.api.director(f.match_id ?? "", kiosk.card), t("fixtures.validated"))}
                >
                  {t("fixtures.validate")}
                </button>
              ) : null}
            </>
          ) : f.status === "ready" ? (
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => void run(() => kiosk.api.fixtureFinished(f.fixture_id, kiosk.card), t("fixtures.markedFinished"))}
            >
              {t("fixtures.finished")}
            </button>
          ) : scoring === f.fixture_id ? (
            <>
              <ScoreEditor value={score} onChange={setScore} allowUnfinished={false} />
              <button
                type="button"
                className="button button--primary"
                disabled={busy}
                onClick={() =>
                  void run(() => kiosk.api.fixtureScore(f.fixture_id, kiosk.card, toScore(score.sets, false)), t("score.sent"))
                }
              >
                {t("score.submit")}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="button"
              onClick={() => {
                setScore(initialScore());
                setScoring(f.fixture_id);
              }}
            >
              {t("fixtures.enterScore")}
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
