/**
 * Kiosk texts (RO/EN, ICU MessageFormat) from packages/i18n: `kiosk.*` for the screens and
 * `errors.<code>` for the API's stable error codes. Times are shown in club time.
 */
import { IntlMessageFormat } from "intl-messageformat";
import en from "@jungle/i18n/messages/en.json";
import ro from "@jungle/i18n/messages/ro.json";

export type Lang = "ro" | "en";
export const TIME_ZONE = "Europe/Bucharest";

type Tree = { [key: string]: string | Tree };
const catalogues = { ro, en } as unknown as Record<Lang, Tree>;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function lookup(tree: Tree, path: string): string | undefined {
  let node: string | Tree | undefined = tree;
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function formatTime(lang: Lang, iso: string): string {
  return new Intl.DateTimeFormat(lang === "ro" ? "ro-RO" : "en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export type Params = Record<string, unknown>;

function prepare(lang: Lang, params: Params): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "number") out[key] = value;
    else if (typeof value === "string" && ISO_TIME.test(value)) out[key] = formatTime(lang, value);
    else if (Array.isArray(value)) out[key] = value.join(", ");
    else out[key] = String(value ?? "");
  }
  return out;
}

function format(lang: Lang, text: string, params: Params): string {
  try {
    return String(new IntlMessageFormat(text, lang).format(prepare(lang, params)));
  } catch {
    return text;
  }
}

/** A kiosk text: `t("ro", "session.hello", { name })` reads `kiosk.session.hello`. */
export function t(lang: Lang, key: string, params: Params = {}): string {
  const text = lookup(catalogues[lang], `kiosk.${key}`);
  return text === undefined ? key : format(lang, text, params);
}

/** The API's error code, translated (codes contain dots, so they are looked up whole). */
export function errorText(lang: Lang, code: string, params: Params = {}): string {
  const errors = catalogues[lang].errors;
  const text = typeof errors === "object" ? errors[code] : undefined;
  return typeof text === "string" ? format(lang, text, params) : t(lang, "errors.generic");
}

/** "Aur II", "Maestru"; empty while the player is in placement (§6.5). */
export function rankName(lang: Lang, tier: string, division: string): string {
  if (!tier) return "";
  const name = t(lang, `tiers.${tier}`);
  return tier === "master" || !division ? name : `${name} ${division}`;
}
