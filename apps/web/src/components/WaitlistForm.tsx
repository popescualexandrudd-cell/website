"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { components } from "@jungle/api-client";
import { api, errorKey, errorParams } from "@/lib/api";
import { IconCheck } from "./Icons";

type Level = components["schemas"]["Level"];
const LEVELS: Level[] = ["beginner", "intermediate", "advanced", "competitive"];

type State =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "ready"; noticeVersion: number }
  | { kind: "sent" };

/**
 * Pre-launch waitlist with double opt-in (Stage 1B). Data minimisation (GDPR art. 5(1)(c)):
 * only name and email, plus an optional playing level. The API answers the same for everyone.
 */
export function WaitlistForm() {
  const t = useTranslations("web.waitlist");
  const tErrors = useTranslations("errors");
  const messages = useMessages() as { errors?: Record<string, string> };
  const locale = useLocale() as "ro" | "en";
  const ids = useId();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .GET("/api/v1/legal/documents/{kind}", {
        params: { path: { kind: "waitlist_notice" }, query: { language: locale } },
      })
      .then(({ data }) => {
        if (cancelled) return;
        setState(data ? { kind: "ready", noticeVersion: data.version } : { kind: "unavailable" });
      })
      .catch(() => !cancelled && setState({ kind: "unavailable" }));
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state.kind !== "ready" || submitting) return;
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams(window.location.search);
    setSubmitting(true);
    setError(null);
    try {
      const { response, error: body } = await api.POST("/api/v1/waitlist", {
        body: {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          level: LEVELS.find((l) => l === form.get("level")) ?? null,
          language: locale,
          notice_version: state.noticeVersion,
          accepted_notice: form.get("consent") === "on",
          source: (params.get("src") ?? params.get("utm_source") ?? "").slice(0, 60),
          website: String(form.get("website") ?? ""),
        },
      });
      if (response.status === 202) {
        setState({ kind: "sent" });
        return;
      }
      const key = errorKey(body, (code) => Boolean(messages.errors?.[code]));
      setError(key ? tErrors(key, errorParams(body)) : t("genericError"));
    } catch {
      setError(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (state.kind === "sent") {
    return (
      <div className="success" role="status" aria-live="polite">
        <div className="success-badge">
          <IconCheck />
        </div>
        <h3>{t("successTitle")}</h3>
        <p className="lead">{t("successText")}</p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit} aria-describedby={error ? `${ids}-error` : undefined}>
      <div className="field">
        <label htmlFor={`${ids}-name`}>
          {t("name")} <span className="req">({t("required")})</span>
        </label>
        <input id={`${ids}-name`} name="name" className="input" required maxLength={150} autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor={`${ids}-email`}>
          {t("email")} <span className="req">({t("required")})</span>
        </label>
        <input
          id={`${ids}-email`}
          name="email"
          type="email"
          className="input"
          required
          maxLength={254}
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
        />
      </div>
      <div className="field">
        <label htmlFor={`${ids}-level`}>{t("level")}</label>
        <select id={`${ids}-level`} name="level" className="select" defaultValue="">
          <option value="">{t("levelNone")}</option>
          {LEVELS.map((level) => (
            <option key={level} value={level}>
              {t(`levels.${level}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor={`${ids}-website`}>Website</label>
        <input id={`${ids}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="consent">
        <input type="checkbox" name="consent" required />
        <span>
          {t("consentBefore")}
          <Link href="/privacy-notice" target="_blank" rel="noopener">
            {t("consentLink")}
          </Link>
          {t("consentAfter")}
        </span>
      </label>
      <div aria-live="assertive">
        {error && (
          <p className="form-error" id={`${ids}-error`}>
            {error}
          </p>
        )}
        {state.kind === "unavailable" && <p className="form-error">{t("unavailable")}</p>}
      </div>
      <div>
        <button type="submit" className="btn btn-primary" disabled={submitting || state.kind !== "ready"}>
          {submitting ? t("submitting") : t("submit")}
        </button>
      </div>
    </form>
  );
}
