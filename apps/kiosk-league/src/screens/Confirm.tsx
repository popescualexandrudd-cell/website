/** §8.2 action 3: the other players confirm or dispute the score (LG-095). */
import { useState } from "react";
import { formatTime } from "../lib/i18n";
import { describe } from "../lib/score";
import { useKiosk, useT } from "../kiosk";
import { Back } from "./Home";
import { names } from "./Idle";

export function Confirm() {
  const kiosk = useKiosk();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const waiting = kiosk.session?.to_confirm ?? [];

  const answer = async (matchId: string, accept: boolean) => {
    setBusy(true);
    try {
      await kiosk.api.respond(matchId, kiosk.card, accept);
      kiosk.notify(t(accept ? "confirm.accepted" : "confirm.disputed"));
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
      <h1>{t("confirm.title")}</h1>
      {waiting.length === 0 ? <p className="notice">{t("confirm.none")}</p> : null}
      {waiting.map((m) => (
        <article key={m.match_id} className="card-row">
          <p className="summary">
            <strong>{names(m.team_a)}</strong> <span className="muted">{t("idle.vs")}</span> <strong>{names(m.team_b)}</strong>
          </p>
          <p className="score-line">{describe(m.score)}</p>
          <p className="muted">{t("confirm.until", { time: formatTime(kiosk.lang, m.window_closes_at) })}</p>
          <div className="actions">
            <button type="button" className="button button--primary" disabled={busy} onClick={() => void answer(m.match_id, true)}>
              {t("confirm.accept")}
            </button>
            <button type="button" className="button button--danger" disabled={busy} onClick={() => void answer(m.match_id, false)}>
              {t("confirm.dispute")}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
