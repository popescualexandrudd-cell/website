"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, errorKey, errorParams } from "@/lib/api";
import { IconCheck } from "./Icons";

const INTERESTS = ["padel", "league", "tennis", "pilates", "events", "cafe", "corporate"] as const;
type Interest = (typeof INTERESTS)[number];

type State =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "ready"; noticeVersion: number }
  | { kind: "sent" };

/** Pre-launch waitlist with double opt-in (Stage 1B). The API answers the same for everyone. */
export function WaitlistForm() {
  const t = useTranslations("web.waitlist");
  const tErrors = useTranslations("errors");
  const messages = useMessages() as { errors?: Record<string, string> };
  const locale = useLocale() as "ro" | "en";
  const ids = useId();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interests, setInterests] = useState<Interest[]>(["padel"]);

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

  const toggle = (value: Interest) =>
    setInterests((current) => (current.includes(value) ? current.filter((i) => i !== value) : [...current, value]));

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
          phone: String(form.get("phone") ?? ""),
          interests,
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
    <form className="form" onSubmit={onSubmit} noValidate={false} aria-describedby={error ? `${ids}-error` : undefined}>
      <div className="field">
        <label htmlFor={`${ids}-name`}>{t("name")}</label>
        <input id={`${ids}-name`} name="name" className="input" required maxLength={150} autoComplete="name" />
      </div>
      <div className="row-2">
        <div className="field">
          <label htmlFor={`${ids}-email`}>{t("email")}</label>
          <input id={`${ids}-email`} name="email" type="email" className="input" required maxLength={254} autoComplete="email" inputMode="email" />
        </div>
        <div className="field">
          <label htmlFor={`${ids}-phone`}>{t("phone")}</label>
          <input id={`${ids}-phone`} name="phone" type="tel" className="input" maxLength={30} autoComplete="tel" inputMode="tel" />
        </div>
      </div>
      <fieldset className="field">
        <legend>{t("interests")}</legend>
        <div className="chips">
          {INTERESTS.map((value) => (
            <label className="chip" key={value}>
              <input type="checkbox" checked={interests.includes(value)} onChange={() => toggle(value)} />
              <span>{t(`interest.${value}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
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
