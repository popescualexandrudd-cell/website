import { getLocale, getTranslations } from "next-intl/server";
import { formatRating, starParts, type GoogleReviews } from "@/lib/reviews";

type Props = {
  reviews: GoogleReviews;
  /** "full" with the invitation to leave a review; "compact" for the footer. */
  variant?: "full" | "compact";
};

/**
 * The club's rating on Google, with a link to the reviews. Plain text and a link, so it loads
 * nothing from Google and needs no cookie consent.
 */
export async function GoogleRating({ reviews, variant = "full" }: Props) {
  const [t, locale] = await Promise.all([getTranslations("reviews"), getLocale()]);
  const rating = formatRating(reviews.rating, locale);
  const summary = t("summary", { rating, count: reviews.count });
  return (
    <div className={`google-rating google-rating-${variant}`}>
      <p className="google-rating-score">
        <span className="google-rating-value numerals" aria-hidden="true">
          {rating}
        </span>
        <span className="google-stars" aria-hidden="true">
          {starParts(reviews.rating).map((part, i) => (
            <span key={i} className={`google-star google-star-${part}`} />
          ))}
        </span>
        <span className="google-rating-text" aria-hidden="true">
          {t("count", { count: reviews.count })}
        </span>
        <span className="sr-only">{summary}</span>
      </p>
      {variant === "full" ? (
        <p className="google-rating-cta">
          <a href={reviews.url} rel="noopener noreferrer" target="_blank" className="link">
            {t("readOrWrite")}
          </a>
        </p>
      ) : null}
    </div>
  );
}
