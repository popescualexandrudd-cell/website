"use client";

/**
 * A useful error page (§15.1): when a page fails on the server, the visitor sees what happened and
 * can try again or go home, in the page's language (texts from the shell, `web.problem`). The error
 * itself is not shown (it may hold details only the server should see); it is reported to the
 * club's backend (`lib/report-error`, ADR-0017).
 */
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { reportError } from "@/lib/report-error";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("web.problem");
  // The club learns about it (ADR-0017); the visitor sees only the friendly page.
  useEffect(() => reportError(window.location.pathname, error), [error]);
  return (
    <section className="page" aria-labelledby="problem-title">
      <div className="container">
        <div className="panel" role="alert">
          <h1 id="problem-title" className="h2">
            {t("errorTitle")}
          </h1>
          <p>{t("errorText")}</p>
          <p className="problem__actions">
            <button type="button" className="btn btn-primary" onClick={() => reset()}>
              {t("retry")}
            </button>{" "}
            <Link className="btn btn-secondary" href="/">
              {t("home")}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
