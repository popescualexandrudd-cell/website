"use client";

import { useEffect, useState } from "react";
import { useMessages, useTranslations } from "next-intl";
import { api, errorKey } from "@/lib/api";
import { Link } from "@/i18n/navigation";

type Mode = "confirm" | "unsubscribe";
type Status = "idle" | "working" | "ok" | "error";
type Result = { ok: boolean; code: string | null };

async function callApi(mode: Mode, token: string): Promise<Result> {
  const path = mode === "confirm" ? "/api/v1/waitlist/confirm" : "/api/v1/waitlist/unsubscribe";
  try {
    const { response, error } = await api.POST(path, { body: { token } });
    return { ok: response.ok, code: response.ok ? null : errorKey(error, () => true) };
  } catch {
    return { ok: false, code: null };
  }
}

/**
 * Handles the links from waitlist emails. Confirmation runs automatically; unsubscribing
 * needs a click, so that link scanners in mail servers cannot unsubscribe anyone.
 */
export function TokenAction({ mode, token }: { mode: Mode; token: string | null }) {
  const t = useTranslations(mode === "confirm" ? "web.confirm" : "web.unsubscribe");
  const tErrors = useTranslations("errors");
  const tConfirm = useTranslations("web.confirm");
  const messages = useMessages() as { errors?: Record<string, string> };
  const [status, setStatus] = useState<Status>(!token ? "error" : mode === "confirm" ? "working" : "idle");
  const [message, setMessage] = useState(token ? "" : t("missing"));

  const apply = (result: Result) => {
    if (result.ok) {
      setStatus("ok");
      setMessage(t("success"));
      return;
    }
    const key = result.code && messages.errors?.[result.code] ? result.code : "common.not_found";
    setStatus("error");
    setMessage(tErrors(key));
  };

  useEffect(() => {
    if (mode !== "confirm" || !token) return;
    let cancelled = false;
    void callApi(mode, token).then((result) => {
      if (!cancelled) apply(result);
    });
    return () => {
      cancelled = true;
    };
    // Runs once per link; `apply` only reads stable translation functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, token]);

  return (
    <div className="panel" aria-live="polite">
      <h1 className="h2">{t("title")}</h1>
      {mode === "unsubscribe" && status === "idle" && token && (
        <>
          <p className="lead">{t("lead")}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setStatus("working");
              void callApi(mode, token).then(apply);
            }}
          >
            {t("button")}
          </button>
        </>
      )}
      {status === "working" && <p className="status">{t("working")}</p>}
      {(status === "ok" || status === "error") && (
        <p className="status" data-kind={status}>
          {message}
        </p>
      )}
      <p style={{ marginTop: 28 }}>
        <Link href="/">{tConfirm("back")}</Link>
      </p>
    </div>
  );
}
