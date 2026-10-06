"use client";

/**
 * The club's assistant (Stage 12D, ADR-0019): a button at the corner of every page of the full site,
 * shown only when the owner turned the AI on (`ai`). It says plainly that it is an AI that can make
 * mistakes (EU AI Act, art. 50). The conversation lives only in this page. A booking it prepares is
 * a proposal: the person books it with the button (the same POST /api/v1/bookings as the booking
 * page) and pays at the Payments Kiosk (R-063); the AI never books, pays or touches the league.
 */
import { useFormatter, useLocale, useMessages, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { askClub, confirmProposal, type Proposal, type Turn } from "@/lib/assistant";
import { errorText } from "@/lib/error-text";

type Entry = Turn & { proposals?: Proposal[] };
type Booked = Record<string, "busy" | "done" | string>;

export function Assistant() {
  const t = useTranslations("web.assistant");
  const format = useFormatter();
  const locale = useLocale();
  const messages = useMessages() as { errors?: Record<string, string> };
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [booked, setBooked] = useState<Booked>({});
  const panelId = useId();
  const titleId = useId();
  const opener = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const failure = (code: string | null, params: Record<string, string | number> = {}) =>
    errorText(messages.errors, locale, code, params) ?? t("offline");

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    opener.current?.focus();
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question || busy) return;
    const conversation: Entry[] = [...entries, { role: "user", content: question }];
    setEntries(conversation);
    setDraft("");
    setBusy(true);
    const answer = await askClub(conversation.map(({ role, content }) => ({ role, content })));
    setBusy(false);
    if (!answer.ok) {
      setEntries([...conversation, { role: "assistant", content: failure(answer.code, answer.params) }]);
      return;
    }
    const { text, outcome, proposals } = answer.data;
    const content = outcome === "answered" && text ? text : t(`outcomes.${outcome === "answered" ? "empty" : outcome}`);
    setEntries([...conversation, { role: "assistant", content, proposals }]);
  };

  const key = (p: Proposal) => `${p.resource_id}@${p.starts_at}`;
  const book = async (p: Proposal) => {
    setBooked((b) => ({ ...b, [key(p)]: "busy" }));
    const made = await confirmProposal(p);
    setBooked((b) => ({ ...b, [key(p)]: made.ok ? "done" : failure(made.code, made.params) }));
  };

  const when = (p: Proposal) =>
    format.dateTime(new Date(p.starts_at), {
      timeZone: "Europe/Bucharest",
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="assistant">
      {open ? (
        <section
          id={panelId}
          className="assistant__panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
        >
          <header className="assistant__head">
            <h2 id={titleId} className="assistant__title">
              {t("title")}
            </h2>
            <button type="button" className="assistant__close" onClick={close} aria-label={t("close")}>
              ×
            </button>
          </header>
          <p className="assistant__notice">{t("notice")}</p>
          <ol className="assistant__log" aria-live="polite" aria-busy={busy}>
            {entries.length === 0 ? <li className="assistant__hint">{t("hint")}</li> : null}
            {entries.map((entry, n) => (
              <li key={n} className={`assistant__turn assistant__turn--${entry.role}`}>
                <span className="sr-only">{entry.role === "user" ? t("you") : t("club")}: </span>
                {entry.content}
                {entry.proposals?.map((p) => {
                  const state = booked[key(p)];
                  return (
                    <div key={key(p)} className="assistant__proposal">
                      <p>
                        {t("proposal", { court: p.resource_name, when: when(p), minutes: p.duration_minutes, total: p.total })}
                        {p.provisional ? <span className="assistant__provisional"> {t("provisional")}</span> : null}
                      </p>
                      {state === "done" ? (
                        <p className="assistant__done" role="status">
                          {t("booked")}
                        </p>
                      ) : (
                        <button type="button" className="btn btn-primary" disabled={state === "busy"} onClick={() => void book(p)}>
                          {t("confirm")}
                        </button>
                      )}
                      {state && state !== "busy" && state !== "done" ? (
                        <p className="assistant__error" role="alert">
                          {state}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </li>
            ))}
            {busy ? <li className="assistant__turn assistant__turn--assistant">{t("thinking")}</li> : null}
          </ol>
          <form className="assistant__form" onSubmit={(e) => void send(e)}>
            <label className="sr-only" htmlFor={`${panelId}-q`}>
              {t("question")}
            </label>
            <textarea
              id={`${panelId}-q`}
              ref={input}
              className="input assistant__input"
              rows={2}
              maxLength={2000}
              value={draft}
              placeholder={t("placeholder")}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) void send(e);
              }}
            />
            <button type="submit" className="btn btn-primary" disabled={busy || !draft.trim()}>
              {t("send")}
            </button>
          </form>
        </section>
      ) : null}
      <button
        ref={opener}
        type="button"
        className="btn btn-secondary assistant__open"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {t("open")}
      </button>
    </div>
  );
}
