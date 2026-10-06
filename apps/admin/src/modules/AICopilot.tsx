/**
 * The staff's copilot (ADR-0019, §10, Stage 12F), with `ai.copilot`: questions over the club's
 * figures, signals and demand. It only reads, through the panel's own services and the person's
 * permissions, and every answer lists what it read (the tool and its input), so the person can
 * check it. The conversation lives only in this page.
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { usePanel, useT } from "../panel";

type Turn = {
  role: "user" | "assistant";
  content: string;
  reads?: Schemas["ReadOut"][];
};

export function AICopilot() {
  const { api, locationId, fail } = usePanel();
  const t = useT();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const ask = async (e: FormEvent) => {
    e.preventDefault();
    const question = draft.trim();
    if (!question || busy) return;
    const conversation: Turn[] = [
      ...turns,
      { role: "user", content: question },
    ];
    setTurns(conversation);
    setDraft("");
    setBusy(true);
    try {
      const messages = conversation
        .slice(-20)
        .map(({ role, content }) => ({ role, content }));
      const answer = await unwrap(
        api.client.POST("/api/v1/staff/ai/ask", {
          body: { location_id: locationId, messages },
        }),
      );
      const text =
        answer.outcome === "answered" && answer.text
          ? answer.text
          : t(
              `ai.copilot.outcomes.${answer.outcome === "answered" ? "empty" : answer.outcome}`,
            );
      setTurns([
        ...conversation,
        { role: "assistant", content: text, reads: answer.reads },
      ]);
    } catch (error) {
      setTurns(turns);
      setDraft(question);
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="ai-copilot-title">
      <h2 id="ai-copilot-title">{t("ai.copilot.title")}</h2>
      <p className="muted">{t("ai.copilot.lead")}</p>
      <ol className="copilot-log" aria-live="polite" aria-busy={busy}>
        {turns.map((turn, n) => (
          <li key={n} className={`copilot-turn copilot-turn--${turn.role}`}>
            <p className="draft-text">{turn.content}</p>
            {turn.reads && turn.reads.length > 0 ? (
              <details>
                <summary>{t("ai.copilot.read")}</summary>
                <ul>
                  {turn.reads.map((read, i) => (
                    <li key={i}>
                      <code>{read.name}</code>{" "}
                      <code>{JSON.stringify(read.input)}</code>
                      {read.ok ? null : (
                        <span className="muted">
                          {" "}
                          · {t("ai.copilot.readFailed")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </li>
        ))}
        {busy ? <li className="muted">{t("ai.copilot.thinking")}</li> : null}
      </ol>
      <form
        className="panel-box form"
        onSubmit={(e) => void ask(e)}
        aria-label={t("ai.copilot.title")}
      >
        <label>
          {t("ai.copilot.question")}
          <textarea
            rows={2}
            maxLength={2000}
            value={draft}
            placeholder={t("ai.copilot.placeholder")}
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
        <div className="actions">
          <button
            type="submit"
            className="button button--primary"
            disabled={busy || !draft.trim()}
          >
            {t("ai.copilot.ask")}
          </button>
        </div>
      </form>
    </section>
  );
}
