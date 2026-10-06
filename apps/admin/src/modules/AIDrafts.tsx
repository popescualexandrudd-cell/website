/**
 * Drafts written by the AI for the staff (ADR-0019, Q19, Stage 12E): a community message, a blog
 * article, a translation. Each one stays "to review" until a person approves it (corrected here,
 * if needed) or discards it; nothing is published or sent by itself. The community message is
 * posted in the group by hand; an article is copied into the Blog module.
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { formatDate, formatTime } from "../i18n";
import { usePanel, useT } from "../panel";
import { useData } from "../ui";

type Draft = Schemas["AIDraftOut"];
type Kind = Draft["kind"];
const KINDS: Kind[] = ["community", "article", "translation"];

export function AIDrafts() {
  const { api, locationId, lang, notify, fail } = usePanel();
  const t = useT();
  const { data, reload } = useData(
    () =>
      unwrap(
        api.client.GET("/api/v1/staff/ai/drafts", {
          params: { query: { location_id: locationId } },
        }),
      ),
    [api, locationId],
  );
  const [kind, setKind] = useState<Kind>("community");
  const [language, setLanguage] = useState<"ro" | "en">("ro");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const write = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await unwrap(
        api.client.POST("/api/v1/staff/ai/drafts", {
          body: { location_id: locationId, kind, language, text: text.trim() },
        }),
      );
      notify(t("ai.drafts.written"));
      setText("");
      await reload();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="ai-drafts-title">
      <h2 id="ai-drafts-title">{t("ai.drafts.title")}</h2>
      <p className="muted">{t("ai.drafts.lead")}</p>
      <form
        className="panel-box form"
        onSubmit={(e) => void write(e)}
        aria-label={t("ai.drafts.write")}
      >
        <label>
          {t("ai.drafts.kind")}
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`ai.drafts.kinds.${k}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("ai.drafts.language")}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "ro" | "en")}
          >
            <option value="ro">{t("ai.drafts.languages.ro")}</option>
            <option value="en">{t("ai.drafts.languages.en")}</option>
          </select>
        </label>
        <label>
          {t(kind === "translation" ? "ai.drafts.source" : "ai.drafts.about")}
          <textarea
            required
            rows={kind === "translation" ? 10 : 4}
            maxLength={8000}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className="actions">
          <button
            type="submit"
            className="button button--primary"
            disabled={busy || !text.trim()}
          >
            {t(busy ? "ai.drafts.writing" : "ai.drafts.write")}
          </button>
        </div>
      </form>
      {data && data.length === 0 ? <p>{t("ai.drafts.none")}</p> : null}
      {data?.map((draft) => (
        <DraftBox
          key={`${draft.id}:${draft.status}`}
          draft={draft}
          onDone={reload}
          when={`${formatDate(lang, draft.created_at)}, ${formatTime(lang, draft.created_at)}`}
        />
      ))}
    </section>
  );
}

function DraftBox({
  draft,
  when,
  onDone,
}: {
  draft: Draft;
  when: string;
  onDone: () => Promise<void>;
}) {
  const { api, notify, fail } = usePanel();
  const t = useT();
  const [body, setBody] = useState(draft.body);
  const [busy, setBusy] = useState(false);
  const open = draft.status === "to_review";
  const textId = `draft-${draft.id}`;

  const review = async (status: "approved" | "discarded") => {
    setBusy(true);
    try {
      await unwrap(
        api.client.POST("/api/v1/staff/ai/drafts/{draft_id}/review", {
          params: { path: { draft_id: draft.id } },
          body: status === "approved" ? { status, body } : { status },
        }),
      );
      notify(t(`ai.drafts.${status}`));
      await onDone();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft.body);
      notify(t("ai.drafts.copied"));
    } catch (error) {
      fail(error);
    }
  };

  return (
    <article className="panel-box" aria-labelledby={`${textId}-title`}>
      <h3 id={`${textId}-title`}>
        {t(`ai.drafts.kinds.${draft.kind}`)} ·{" "}
        {t(`ai.drafts.languages.${draft.language}`)}{" "}
        <span
          className={`tag ${draft.status === "approved" ? "tag--ok" : draft.status === "to_review" ? "tag--todo" : ""}`}
        >
          {t(`ai.drafts.states.${draft.status}`)}
        </span>
      </h3>
      <p className="muted">
        {t("ai.drafts.asked", {
          who: draft.requested_by,
          when,
          request:
            draft.request.length > 160
              ? `${draft.request.slice(0, 160)}…`
              : draft.request,
        })}
      </p>
      {open ? (
        <>
          <label htmlFor={textId}>{t("ai.drafts.text")}</label>
          <textarea
            id={textId}
            rows={10}
            maxLength={20000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="actions">
            <button
              type="button"
              className="button button--primary"
              disabled={busy || !body.trim()}
              onClick={() => void review("approved")}
            >
              {t("ai.drafts.approve")}
            </button>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => void review("discarded")}
            >
              {t("ai.drafts.discard")}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="draft-text">{draft.body}</p>
          {draft.status === "approved" ? (
            <button
              type="button"
              className="button"
              onClick={() => void copy()}
            >
              {t("ai.drafts.copy")}
            </button>
          ) : null}
        </>
      )}
    </article>
  );
}
