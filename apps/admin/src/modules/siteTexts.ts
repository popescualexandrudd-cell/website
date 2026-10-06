/**
 * The website's texts as the panel edits them (§8.6, Stage 11, jungle.content): every text of the
 * website from the catalogue (packages/i18n), except the legal texts (`web.legal`, approved by the
 * owner, Q41), with the changes from the API on top. The same rules as the website
 * (apps/web/src/lib/content.ts): a change keeps the text's fields (`{name}`), or it is not saved.
 */
import en from "@jungle/i18n/messages/en.json";
import ro from "@jungle/i18n/messages/ro.json";
import type { Schemas } from "../api";

export type Change = Schemas["TextChangeOut"];
export type Language = "ro" | "en";
export type Entry = { key: string; ro: string; en: string };

type Tree = { [key: string]: unknown };

const SEO = ["web.meta.", "web.site.pages.", "web.site.pageIntro."];

function leaves(tree: unknown, path: string, out: Map<string, string>): void {
  if (typeof tree === "string") out.set(path, tree);
  else if (tree && typeof tree === "object") for (const [k, v] of Object.entries(tree as Tree)) leaves(v, `${path}.${k}`, out);
}

function catalogueTexts(catalogue: Tree): Map<string, string> {
  const out = new Map<string, string>();
  leaves(catalogue.web, "web", out);
  return out;
}

const RO = catalogueTexts(ro as Tree);
const EN = catalogueTexts(en as Tree);

/** Every text of the website that can be changed, in the catalogue's order. */
export const ENTRIES: Entry[] = [...RO.keys()]
  .filter((key) => !key.startsWith("web.legal."))
  .map((key) => ({ key, ro: RO.get(key) ?? "", en: EN.get(key) ?? "" }));

/** The names of the fields of an ICU text: "{count, plural, one {# zi}}" → ["count"]. */
export function fieldsOf(text: string): string[] {
  const names = new Set<string>();
  for (const match of text.matchAll(/\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*[,}]/g)) names.add(match[1] as string);
  return [...names].sort();
}

/** True when a new text keeps the fields of the catalogue's text. */
export function sameFields(original: string, text: string): boolean {
  return fieldsOf(original).join() === fieldsOf(text).join();
}

/** The group a text belongs to: "seo" (titles and descriptions of the pages), "site.hero", "waitlist"… */
export function groupOf(key: string): string {
  if (SEO.some((prefix) => key.startsWith(prefix))) return "seo";
  const [, first, second] = key.split(".");
  return first === "site" && second ? `site.${second}` : (first ?? "");
}

export const GROUPS: string[] = ["seo", ...[...new Set(ENTRIES.map((e) => groupOf(e.key)))].filter((g) => g !== "seo").sort()];

export type Changes = Map<string, Change>;

export const changeKey = (key: string, language: Language) => `${key}|${language}`;

export function indexChanges(rows: Change[]): Changes {
  return new Map(rows.map((row) => [changeKey(row.key, row.language as Language), row]));
}

/** What the website shows now: the published change, or the catalogue's text. */
export function current(entry: Entry, language: Language, changes: Changes): string {
  return changes.get(changeKey(entry.key, language))?.published || entry[language];
}

export function matches(entry: Entry, query: string, group: string): boolean {
  if (group && groupOf(entry.key) !== group) return false;
  const q = query.trim().toLowerCase();
  return !q || entry.key.toLowerCase().includes(q) || entry.ro.toLowerCase().includes(q) || entry.en.toLowerCase().includes(q);
}

export type TranslationState = "same" | "drafts" | "roNewer";

/**
 * What the translations need (§8.6 "Traduceri"): English texts identical to the Romanian ones
 * (probably not translated), drafts waiting for approval, and Romanian texts changed after their
 * English text (the English may need the same change).
 */
export function translationState(entry: Entry, changes: Changes): TranslationState[] {
  const states: TranslationState[] = [];
  const roChange = changes.get(changeKey(entry.key, "ro"));
  const enChange = changes.get(changeKey(entry.key, "en"));
  const roText = current(entry, "ro", changes);
  if (current(entry, "en", changes) === roText && /\p{L}{3}/u.test(roText)) states.push("same");
  if (roChange?.draft || enChange?.draft) states.push("drafts");
  if (roChange?.published_at && (!enChange?.published_at || enChange.published_at < roChange.published_at)) states.push("roNewer");
  return states;
}
