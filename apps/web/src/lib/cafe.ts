/**
 * The café section (§9.2.13, R-111, R-112): the menu as the club keeps it in the panel, read on the
 * server from the public API (`GET /api/v1/cafe/menu`, only what is available now). Cached under
 * the "cafe" tag: the backend asks for a refresh when the menu changes.
 */
import { SERVER_API_URL, LOCATION_SLUG } from "./site";

export const CAFE_TAG = "cafe";

export type CafeProduct = { id: string; name_ro: string; name_en: string; price: number; marker: string };
export type CafeCategory = { id: string; name_ro: string; name_en: string; products: CafeProduct[] };

/** The menu, or null when the API does not answer (the section says so). */
export async function cafeMenu(fetchImpl: typeof fetch = fetch): Promise<CafeCategory[] | null> {
  try {
    const response = await fetchImpl(`${SERVER_API_URL}/api/v1/cafe/menu?location=${LOCATION_SLUG}`, {
      next: { revalidate: 300, tags: [CAFE_TAG] },
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    return Array.isArray(data) ? (data as CafeCategory[]) : null;
  } catch {
    return null;
  }
}

/** A name in the page's language; English falls back to Romanian if ever empty. */
export function nameOf(item: { name_ro: string; name_en: string }, locale: string): string {
  return locale === "en" ? item.name_en || item.name_ro : item.name_ro;
}

/** True while any price on the menu is still indicative (DE_STABILIT, Q21). */
export function hasIndicativePrices(menu: CafeCategory[]): boolean {
  return menu.some((category) => category.products.some((product) => product.marker !== "confirmed"));
}
