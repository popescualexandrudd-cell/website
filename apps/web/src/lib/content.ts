/**
 * The website's texts changed from the panel (§8.6 "Conținut site", Stage 11, jungle.content).
 * The catalogue (packages/i18n, ADR-0018) stays the source; a published change replaces one text
 * of the website (`web.…`) in one language, and only when the catalogue has that text with the
 * same fields (`{name}`, `{count, plural, …}`), so a change can never break a page or reach the
 * panel, the kiosks, the error texts or the legal texts (`web.legal`, approved by the owner, Q41). Cached under the "content" tag: the backend asks for a
 * refresh when a change is published. Without the API (a build with no backend): the catalogue.
 */
import { API_URL } from "./site";

export const CONTENT_TAG = "content";

type Tree = { [key: string]: unknown };

const isTree = (value: unknown): value is Tree => typeof value === "object" && value !== null && !Array.isArray(value);

/** The names of the fields of an ICU text: "{count, plural, one {# zi}}" → ["count"]. */
export function fieldsOf(text: string): string[] {
  const names = new Set<string>();
  for (const match of text.matchAll(/\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*[,}]/g)) names.add(match[1] as string);
  return [...names].sort();
}

/** A copy of `catalogue` with the changes that fit (unknown keys and other fields are skipped). */
export function mergeTexts(catalogue: Tree, changes: Record<string, unknown>): Tree {
  const out: Tree = structuredClone(catalogue);
  for (const [key, text] of Object.entries(changes)) {
    if (typeof text !== "string" || !text.trim() || !/^web(\.[A-Za-z0-9_]+)+$/.test(key) || key.startsWith("web.legal.")) continue;
    const path = key.split(".");
    let node: unknown = out;
    for (const part of path.slice(0, -1)) node = isTree(node) ? node[part] : undefined;
    const last = path[path.length - 1] as string;
    if (!isTree(node) || typeof node[last] !== "string") continue;
    if (fieldsOf(node[last] as string).join() !== fieldsOf(text).join()) continue;
    node[last] = text;
  }
  return out;
}

export async function publishedTexts(locale: string, fetchImpl: typeof fetch = fetch): Promise<Record<string, unknown>> {
  try {
    const response = await fetchImpl(`${API_URL}/api/v1/content/texts?language=${locale}`, {
      next: { revalidate: 300, tags: [CONTENT_TAG] },
    });
    const body: unknown = response.ok ? await response.json() : {};
    return isTree(body) ? body : {};
  } catch {
    return {};
  }
}
