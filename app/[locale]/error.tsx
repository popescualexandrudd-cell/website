"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid-page error-page">
      <div className="error-copy">
        <p className="error-code numerals" aria-hidden="true">
          500
        </p>
        <h1 className="page-title">{t("errors.serverTitle")}</h1>
        <p className="page-intro">{t("errors.serverText")}</p>
        <p className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" onClick={reset}>
            {t("errors.retry")}
          </button>
          <Link href="/" className="btn btn-secondary">
            {t("common.backHome")}
          </Link>
        </p>
      </div>
    </div>
  );
}
