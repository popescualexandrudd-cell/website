/**
 * The website's texts and SEO from the panel (§8.6 "Conținut site" and "Traduceri", Stage 11,
 * `content.manage`). A text is changed in one language as a draft, published with a reason (the
 * website refreshes at once) or brought back to the catalogue's text with a reason; all of it in
 * the audit log. A change must keep the text's fields (`{name}`), or it is not saved: the website
 * would ignore it anyway. The legal texts are not here (approved by the owner, Q41).
 */
import { useState } from "react";
import { unwrap } from "../api";
import { usePanel, useT } from "../panel";
import { ReasonAction, useData } from "../ui";
import {
  type Changes,
  changeKey,
  current,
  ENTRIES,
  type Entry,
  GROUPS,
  indexChanges,
  type Language,
  matches,
  sameFields,
  type TranslationState,
  translationState,
} from "./siteTexts";

const SHOWN = 40;
const LANGUAGES: Language[] = ["ro", "en"];

function useChanges() {
  const { api, locationId } = usePanel();
  const { data, reload } = useData(
    () => unwrap(api.client.GET("/api/v1/staff/content/texts", { params: { query: { location_id: locationId } } })),
    [api, locationId],
  );
  return { changes: indexChanges(data ?? []), loaded: data !== null, reload };
}

/** One text, both languages: the draft, its publication, the default back. */
function TextEditor({ entry, changes, onDone }: { entry: Entry; changes: Changes; onDone: () => Promise<void> }) {
  return (
    <div className="panel-box" aria-label={entry.key} role="group">
      <p>
        <code>{entry.key}</code>
      </p>
      {LANGUAGES.map((language) => (
        <LanguageEditor key={language} entry={entry} language={language} changes={changes} onDone={onDone} />
      ))}
    </div>
  );
}

function LanguageEditor({ entry, language, changes, onDone }: { entry: Entry; language: Language; changes: Changes; onDone: () => Promise<void> }) {
  const { api, locationId, notify, fail } = usePanel();
  const t = useT();
  const change = changes.get(changeKey(entry.key, language));
  const [text, setText] = useState(change?.draft || current(entry, language, changes));
  const [busy, setBusy] = useState(false);
  const fits = sameFields(entry[language], text);
  const id = `text-${entry.key}-${language}`;
  const target = { location_id: locationId, key: entry.key, language };

  const run = async (call: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await call();
      notify(t(done));
      await onDone();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };
  const save = () => {
    void run(() => unwrap(api.client.POST("/api/v1/staff/content/texts", { body: { ...target, text: text.trim() } })), "content.saved");
  };

  return (
    // A group, not a form: the reason forms of ReasonAction sit inside it (no nested forms).
    <div className="form" role="group" aria-label={t(`content.languages.${language}`)}>
      <label htmlFor={id}>{t(`content.languages.${language}`)}</label>
      <textarea id={id} rows={3} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`} className="muted">
        {t("content.default", { text: entry[language] })}
        {change?.published ? ` · ${t("content.live")}` : ""}
        {change?.draft ? ` · ${t("content.hasDraft")}` : ""}
      </p>
      {fits ? null : (
        <p role="alert">
          {t("content.fields", { fields: entry[language].match(/\{[^}]*\}/g)?.join(", ") ?? "—" })}
        </p>
      )}
      <div className="actions">
        <button type="button" className="button" disabled={busy || !fits || !text.trim()} onClick={save}>
          {t("content.saveDraft")}
        </button>
        {change?.draft ? (
          <>
            <ReasonAction
              label={t("content.publish")}
              onConfirm={(reason) => run(() => unwrap(api.client.POST("/api/v1/staff/content/texts/publish", { body: { ...target, reason } })), "content.published")}
            />
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => void run(() => unwrap(api.client.POST("/api/v1/staff/content/texts/discard", { body: { ...target, reason: "" } })), "content.discarded")}
            >
              {t("content.discard")}
            </button>
          </>
        ) : null}
        {change ? (
          <ReasonAction
            danger
            label={t("content.restore")}
            onConfirm={(reason) => run(() => unwrap(api.client.POST("/api/v1/staff/content/texts/restore", { body: { ...target, reason } })), "content.restored")}
          />
        ) : null}
      </div>
    </div>
  );
}

function TextList({ entries, changes, onDone }: { entries: Entry[]; changes: Changes; onDone: () => Promise<void> }) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);
  if (entries.length === 0) return <p>{t("content.none")}</p>;
  return (
    <>
      <p className="muted">{t("content.found", { count: entries.length, shown: Math.min(entries.length, SHOWN) })}</p>
      <ul className="text-list">
        {entries.slice(0, SHOWN).map((entry) => {
          const ro = changes.get(changeKey(entry.key, "ro"));
          const en = changes.get(changeKey(entry.key, "en"));
          return (
            <li key={entry.key}>
              <button type="button" className="link" aria-expanded={open === entry.key} onClick={() => setOpen(open === entry.key ? null : entry.key)}>
                {current(entry, "ro", changes)}
              </button>
              <span className="muted"> · {current(entry, "en", changes)}</span>
              {ro?.published || en?.published ? <span className="tag tag--ok"> {t("content.changed")}</span> : null}
              {ro?.draft || en?.draft ? <span className="tag tag--todo"> {t("content.draft")}</span> : null}
              {open === entry.key ? <TextEditor key={`${entry.key}:${ro?.updated_at ?? ""}:${en?.updated_at ?? ""}`} entry={entry} changes={changes} onDone={onDone} /> : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function SiteContent() {
  const t = useT();
  const { changes, loaded, reload } = useChanges();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("seo");
  const found = ENTRIES.filter((entry) => matches(entry, query, group));
  return (
    <section aria-labelledby="content-title">
      <h1 id="content-title">{t("content.title")}</h1>
      <p className="muted">{t("content.lead")}</p>
      <div className="form panel-box">
        <label>
          {t("content.group")}
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">{t("content.all")}</option>
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {g === "seo" ? t("content.seo") : g}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("content.search")}
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>
      {loaded ? <TextList entries={found} changes={changes} onDone={reload} /> : null}
    </section>
  );
}

const STATES: TranslationState[] = ["drafts", "roNewer", "same"];

export function Translations() {
  const t = useT();
  const { changes, loaded, reload } = useChanges();
  const [state, setState] = useState<TranslationState>("drafts");
  const states = new Map(ENTRIES.map((entry) => [entry.key, translationState(entry, changes)]));
  const count = (s: TranslationState) => ENTRIES.filter((e) => states.get(e.key)?.includes(s)).length;
  const found = ENTRIES.filter((e) => states.get(e.key)?.includes(state));
  return (
    <section aria-labelledby="translations-title">
      <h1 id="translations-title">{t("translations.title")}</h1>
      <p className="muted">{t("translations.lead", { total: ENTRIES.length })}</p>
      <div className="actions" role="group" aria-label={t("translations.filter")}>
        {STATES.map((s) => (
          <button key={s} type="button" className={s === state ? "button button--primary" : "button"} aria-pressed={s === state} onClick={() => setState(s)}>
            {t(`translations.states.${s}`, { count: loaded ? count(s) : 0 })}
          </button>
        ))}
      </div>
      <p className="muted">{t(`translations.explain.${state}`)}</p>
      {loaded ? <TextList entries={found} changes={changes} onDone={reload} /> : null}
    </section>
  );
}
