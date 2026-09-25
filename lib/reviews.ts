/**
 * The club's Google reviews: the average and count come from the admin (copied from the Google
 * Business profile), so the site shows them without calling Google or setting cookies.
 */

export type GoogleReviews = {
  rating: number;
  count: number;
  /** Opens "write a review" when the club set its link, otherwise the club on Google Maps. */
  url: string;
};

export function googleReviews(settings: {
  brandName: string;
  googleRating: number | null;
  googleReviewCount: number | null;
  googleReviewUrl: string | null;
}): GoogleReviews | null {
  const { googleRating: rating, googleReviewCount: count } = settings;
  if (rating === null || count === null || count <= 0 || rating < 1 || rating > 5) return null;
  return { rating, count, url: googleReviewLink(settings) };
}

export function googleReviewLink(settings: {
  brandName: string;
  googleReviewUrl: string | null;
}): string {
  if (settings.googleReviewUrl && /^https:\/\//i.test(settings.googleReviewUrl))
    return settings.googleReviewUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.brandName)}`;
}

/** Five stars as "full", "half" or "empty", rounded to the nearest half. */
export function starParts(rating: number): ("full" | "half" | "empty")[] {
  const halves = Math.round(Math.min(5, Math.max(0, rating)) * 2);
  return Array.from({ length: 5 }, (_, i) =>
    halves >= (i + 1) * 2 ? "full" : halves === i * 2 + 1 ? "half" : "empty",
  );
}

/** "4,5" in Romanian, "4.5" in English. */
export function formatRating(rating: number, locale: string): string {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "ro-RO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);
}
