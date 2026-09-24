import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** 404: the ball landed out. A court seen from above, with the ball's mark past the baseline. */
export default async function NotFound() {
  const t = await getTranslations();
  return (
    <div className="grid-page error-page">
      <div className="error-copy">
        <p className="error-code numerals" aria-hidden="true">
          404
        </p>
        <h1 className="page-title">{t("errors.notFoundTitle")}</h1>
        <p className="mt-5 max-w-xl text-lg text-cerneala-2">{t("errors.notFoundText")}</p>
        <p className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary btn-arrow">
            {t("common.backHome")}
          </Link>
          <Link href="/rezervare" className="btn btn-secondary">
            {t("common.bookLesson")}
          </Link>
        </p>
      </div>
      <figure className="error-figure" aria-hidden="true">
        <svg viewBox="0 0 300 260" className="w-full max-w-md">
          <rect x="20" y="10" width="260" height="240" rx="10" fill="currentColor" />
          <g fill="none" stroke="#FFF7EE" strokeWidth="3">
            <rect x="60" y="40" width="180" height="180" />
            <line x1="82" y1="40" x2="82" y2="220" />
            <line x1="218" y1="40" x2="218" y2="220" />
            <line x1="82" y1="100" x2="218" y2="100" />
            <line x1="150" y1="100" x2="150" y2="220" />
          </g>
          <line x1="40" y1="40" x2="260" y2="40" stroke="#2A130B" strokeWidth="6" opacity="0.55" />
          <ellipse cx="196" cy="236" rx="7" ry="12" fill="#7A2C14" opacity="0.55" />
          <circle cx="232" cy="190" r="11" fill="#D9E453" />
          <text
            x="150"
            y="252"
            textAnchor="middle"
            fill="#FFF7EE"
            fontSize="13"
            fontWeight="700"
            letterSpacing="3"
          >
            OUT
          </text>
        </svg>
      </figure>
    </div>
  );
}
