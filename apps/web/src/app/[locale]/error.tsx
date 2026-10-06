"use client";

/**
 * A useful error page (§15.1): when a page fails on the server, the visitor sees what happened and
 * can try again or go home, in the page's language (texts from the shell, `web.problem`). The error
 * itself is not shown (it may hold details only the server should see).
 */
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("web.problem");
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
