"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { track } from "@/lib/analytics/client";
import { ASSISTANT_OPEN_EVENT } from "@/lib/assistant/events";
import { parseAnswer, type Inline } from "@/lib/assistant/render";
import { MAX_QUESTION_CHARS, type AssistantEvent, type ChatMessage } from "@/lib/assistant/shared";

type Props = {
  locale: Locale;
  evaluationHref: string;
  bookingHref: string;
  privacyHref: string;
};

type ErrorCode = "refused" | "busy" | "failed" | "tooLong";

class AssistantError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
  }
}

const SUGGESTIONS = ["age", "groups", "prices", "start"] as const;

/** The teaser's two questions, chosen for the page the visitor is on. */
const TEASER: { prefix: string; keys: [string, string] }[] = [
  { prefix: "/programe", keys: ["groups", "age"] },
  { prefix: "/preturi", keys: ["prices", "start"] },
  { prefix: "/inchiriere-teren", keys: ["court", "courtPrice"] },
  { prefix: "/turnee", keys: ["tournaments", "groups"] },
  { prefix: "/scoli-gradinite", keys: ["schools", "age"] },
];

/** Shown once per visit: after it is closed, moving to another page does not bring it back. */
let teaserDone = false;

function finePointer(): boolean {
  return window.matchMedia("(pointer: fine)").matches;
}

/**
 * The club's assistant: a chat window that answers questions about ages, groups, prices and the
 * schedule from the club's own content, and leads to an assessment or a booking. The
 * conversation stays in this window (memory only) and is gone when the page is closed.
 */
export function Assistant({ locale, evaluationHref, bookingHref, privacyHref }: Props) {
  const t = useTranslations("assistant");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);
  const pathname = usePathname();
  const id = useId();
  const [teaser, setTeaser] = useState(false);
  // On a phone the launcher waits below the first screen, so it never covers the opening's
  // text and buttons; on a page too short to scroll that far it shows straight away.
  const [firstScreen, setFirstScreen] = useState(false);
  useEffect(() => {
    const phone = window.matchMedia("(max-width: 767px)");
    const check = () => {
      const room = document.documentElement.scrollHeight - window.innerHeight;
      setFirstScreen(
        phone.matches &&
          room > window.innerHeight * 0.5 &&
          window.scrollY < window.innerHeight * 0.5,
      );
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [pathname]);
  const askRef = useRef<(question: string) => void>(() => undefined);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  // The window closes when a link in it leads to another page.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // "Ask us something": a small bubble after four seconds or once the visitor has scrolled a
  // fifth of the page, never over an open window, and only once per visit. On a phone it waits
  // until the visitor has scrolled past the first screen, so it never covers the page's buttons.
  useEffect(() => {
    if (teaserDone) return;
    const reveal = () => {
      if (teaserDone || dialogRef.current?.open) return;
      setTeaser(true);
      cleanup();
    };
    const phone = window.matchMedia("(max-width: 767px)").matches;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (phone ? window.scrollY > window.innerHeight : max > 0 && window.scrollY / max > 0.2)
        reveal();
    };
    const timer = phone ? undefined : window.setTimeout(reveal, 4000);
    window.addEventListener("scroll", onScroll, { passive: true });
    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    }
    return cleanup;
  }, []);

  // Other parts of the page (the programme finder, the teaser) open the window with a question.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const question = (event as CustomEvent<{ question?: string }>).detail?.question;
      show();
      if (question) askRef.current(question);
    };
    window.addEventListener(ASSISTANT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(ASSISTANT_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, error]);

  const show = () => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setOpen(true);
    teaserDone = true;
    setTeaser(false);
    track("assistant_open");
    // With a mouse, straight to the question field; on a phone the keyboard stays closed
    // until the visitor taps it, so the suggestions stay in view.
    if (finePointer()) inputRef.current?.focus();
  };

  const followLink = (href: string) => {
    track("assistant_cta", { href });
    dialogRef.current?.close();
  };

  const restart = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setDraft("");
  };

  async function ask(question: string) {
    const text = question.trim();
    if (!text || streaming) return;
    if (text.length > MAX_QUESTION_CHARS) {
      setError("tooLong");
      return;
    }
    setError(null);
    const history: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setDraft("");
    setStreaming(true);
    track("assistant_question");

    const controller = new AbortController();
    abortRef.current = controller;
    let answer = "";
    const write = (content: string) =>
      setMessages((current) => [...current.slice(0, -1), { role: "assistant", content }]);
    try {
      const response = await fetch("/api/asistent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, messages: history }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new AssistantError(data?.error === "busy" ? "busy" : "failed");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as AssistantEvent;
          if (event.type === "text") {
            answer += event.text;
            write(answer);
          } else if (event.type === "error") {
            throw new AssistantError(event.code);
          }
        }
      }
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof AssistantError ? caught.code : "failed");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setStreaming(false);
      // An answer that never started leaves no empty bubble behind.
      setMessages((current) => {
        const last = current.at(-1);
        return last?.role === "assistant" && !last.content ? current.slice(0, -1) : current;
      });
    }
  }

  askRef.current = (question: string) => void ask(question);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void ask(draft);
    }
  };

  const renderInline = (inlines: Inline[]) =>
    inlines.map((part, i) => {
      if (part.kind === "bold") return <strong key={i}>{part.text}</strong>;
      if (part.kind === "text") return <span key={i}>{part.text}</span>;
      return part.internal ? (
        <NextLink key={i} href={part.href} onClick={() => followLink(part.href)}>
          {part.text}
        </NextLink>
      ) : (
        <a key={i} href={part.href} target="_blank" rel="noopener noreferrer">
          {part.text}
        </a>
      );
    });

  const waiting = streaming && messages.at(-1)?.content === "";
  const teaserKeys =
    TEASER.find((entry) => pathname.startsWith(entry.prefix))?.keys ?? (["age", "start"] as const);
  const closeTeaser = () => {
    teaserDone = true;
    setTeaser(false);
  };

  return (
    <>
      {teaser && !open ? (
        <aside className="assistant-teaser" aria-label={t("teaserTitle")}>
          <button
            type="button"
            className="assistant-teaser-close"
            onClick={closeTeaser}
            aria-label={t("teaserClose")}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button type="button" className="assistant-teaser-open" onClick={show}>
            <span className="assistant-teaser-avatar" aria-hidden="true">
              <span className="assistant-teaser-ball" />
            </span>
            <span>
              <strong className="assistant-teaser-title">{t("teaserTitle")}</strong>
              <span className="assistant-teaser-text">{t("teaserText")}</span>
            </span>
          </button>
          <ul className="assistant-teaser-chips">
            {teaserKeys.map((key) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => {
                    show();
                    void ask(t(`teaserQuestions.${key}`));
                  }}
                >
                  {t(`teaserQuestions.${key}`)}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
      <button
        type="button"
        className="assistant-launcher"
        data-first-screen={firstScreen && !open ? "" : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={show}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M8 8.5h8M8 11.5h5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <span>{t("launcher")}</span>
      </button>

      <dialog
        ref={dialogRef}
        id={id}
        className="assistant-dialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-subtitle`}
      >
        <div className="assistant-panel">
          <header className="assistant-head">
            <div>
              <h2 id={`${id}-title`} className="assistant-title">
                {t("title")}
              </h2>
              <p id={`${id}-subtitle`} className="assistant-subtitle">
                {t("subtitle")}
              </p>
            </div>
            <div className="assistant-head-actions">
              {messages.length > 0 ? (
                <button
                  type="button"
                  className="assistant-close"
                  onClick={restart}
                  aria-label={t("restart")}
                  title={t("restart")}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path
                      d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : null}
              <button
                type="button"
                className="assistant-close"
                onClick={() => dialogRef.current?.close()}
                aria-label={t("close")}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </header>

          <div
            ref={logRef}
            className="assistant-log"
            role="log"
            aria-busy={streaming}
            aria-label={t("title")}
            tabIndex={-1}
          >
            <div className="assistant-message" data-role="assistant">
              <p>{t("greeting")}</p>
            </div>
            {messages.length === 0 ? (
              <ul className="assistant-suggestions" aria-label={t("suggestionsLabel")}>
                {SUGGESTIONS.map((key) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => {
                        // The suggestions disappear once one is asked: focus moves on with it.
                        (finePointer() ? inputRef.current : logRef.current)?.focus();
                        void ask(t(`suggestions.${key}`));
                      }}
                    >
                      {t(`suggestions.${key}`)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {messages.map((message, i) =>
              message.content ? (
                <div key={i} className="assistant-message" data-role={message.role}>
                  <span className="sr-only">{message.role === "user" ? t("you") : t("bot")}: </span>
                  {message.role === "user" ? (
                    <p>{message.content}</p>
                  ) : (
                    parseAnswer(message.content).map((block, j) =>
                      block.kind === "ul" ? (
                        <ul key={j}>
                          {block.items.map((item, k) => (
                            <li key={k}>{renderInline(item)}</li>
                          ))}
                        </ul>
                      ) : (
                        <p key={j}>
                          {block.lines.map((lineParts, k) => (
                            <span key={k}>
                              {k > 0 ? <br /> : null}
                              {renderInline(lineParts)}
                            </span>
                          ))}
                        </p>
                      ),
                    )
                  )}
                </div>
              ) : null,
            )}
            {waiting ? (
              <p className="assistant-waiting">
                <span className="assistant-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                {t("thinking")}
              </p>
            ) : null}
            {error ? (
              <p className="assistant-error" role="alert">
                {t(`errors.${error}`, { max: MAX_QUESTION_CHARS })}
              </p>
            ) : null}
          </div>

          <div className="assistant-actions">
            <NextLink href={evaluationHref} onClick={() => followLink(evaluationHref)}>
              {t("evaluation")}
            </NextLink>
            <NextLink href={bookingHref} onClick={() => followLink(bookingHref)}>
              {t("booking")}
            </NextLink>
          </div>

          <form className="assistant-form" onSubmit={onSubmit}>
            <label htmlFor={`${id}-input`} className="sr-only">
              {t("inputLabel")}
            </label>
            <textarea
              id={`${id}-input`}
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t("placeholder")}
              rows={1}
              maxLength={MAX_QUESTION_CHARS}
              enterKeyHint="send"
            />
            {streaming ? (
              <button
                type="button"
                className="assistant-send"
                onClick={() => abortRef.current?.abort()}
              >
                {t("stop")}
              </button>
            ) : (
              <button type="submit" className="assistant-send" disabled={!draft.trim()}>
                {t("send")}
              </button>
            )}
          </form>
          <p className="assistant-note">
            {t("note")}{" "}
            <NextLink href={privacyHref} onClick={() => dialogRef.current?.close()}>
              {t("privacy")}
            </NextLink>
          </p>
        </div>
      </dialog>
    </>
  );
}
