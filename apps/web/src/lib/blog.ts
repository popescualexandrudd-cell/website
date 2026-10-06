/**
 * The club's blog (§9.3 `/blog`, §15.2), read on the server from the public API: the list of the
 * published articles and one article by its address. Cached under the "blog" tag: the backend asks
 * for a refresh when an article is published, corrected or withdrawn (`jungle.blog.services`).
 */
import { SERVER_API_URL, LOCATION_SLUG } from "./site";

export const BLOG_TAG = "blog";

export type ArticleSummary = {
  slug: string;
  title_ro: string;
  title_en: string;
  summary_ro: string;
  summary_en: string;
  published_at: string;
  updated_at: string;
  demo: boolean;
};
export type Article = ArticleSummary & { body_ro: string; body_en: string };

/** An article's address: lowercase letters, digits and dashes (the backend's rule). */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function read<T>(path: string, fetchImpl: typeof fetch): Promise<T | null> {
  try {
    const response = await fetchImpl(`${SERVER_API_URL}/api/v1/blog${path}`, { next: { revalidate: 300, tags: [BLOG_TAG] } });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

/** The published articles, newest first; null when the API does not answer (the page says so). */
export async function articles(fetchImpl: typeof fetch = fetch): Promise<ArticleSummary[] | null> {
  const list = await read<ArticleSummary[]>(`?location=${LOCATION_SLUG}`, fetchImpl);
  return Array.isArray(list) ? list : null;
}

/** One published article, or null (unknown, withdrawn, or not an address at all). */
export async function article(slug: string, fetchImpl: typeof fetch = fetch): Promise<Article | null> {
  if (!SLUG.test(slug) || slug.length > 80) return null;
  return read<Article>(`/${slug}?location=${LOCATION_SLUG}`, fetchImpl);
}

/** The texts in the page's language. */
export function inLanguage<T extends ArticleSummary>(item: T, locale: string) {
  const en = locale === "en";
  return {
    title: en ? item.title_en : item.title_ro,
    summary: en ? item.summary_en : item.summary_ro,
    body: "body_ro" in item ? (en ? (item as unknown as Article).body_en : (item as unknown as Article).body_ro) : "",
  };
}

/** The approximate reading time in minutes (about 200 words a minute), at least one. */
export function readingMinutes(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
