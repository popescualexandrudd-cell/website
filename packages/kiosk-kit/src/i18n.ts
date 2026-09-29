/**
 * Kiosk texts (RO/EN, ICU MessageFormat) from packages/i18n: each screen has its namespace
 * (`kiosk.*` for the League Kiosk, `payKiosk.*` for the Payments Kiosk, `cafeDisplay.*`), and
 * `errors.<code>` holds the API's stable error codes. Times and dates are shown in club time
 * (ADR-0010); money comes in bani (integers, ADR-0009) and is shown in lei.
 */
import en from "@jungle/i18n/messages/en.json";
import ro from "@jungle/i18n/messages/ro.json";
import { IntlMessageFormat } from "intl-messageformat";

export type Lang = "ro" | "en";
export type Params = Record<string, unknown>;
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

const locale = (lang: Lang) => (lang === "ro" ? "ro-RO" : "en-GB");

export function formatTime(lang: Lang, iso: string): string {
  return new Intl.DateTimeFormat(locale(lang), {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** A calendar day ("2027-04-05") or a moment, as the club reads it: "5 apr. 2027". */
export function formatDate(lang: Lang, value: string): string {
  const moment = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return new Intl.DateTimeFormat(locale(lang), {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(moment);
}

/** Bani (RON × 100) as lei: "240 lei", "12,50 lei" (RO) or "12.50 lei" (EN). */
export function formatMoney(lang: Lang, bani: number): string {
  const whole = bani % 100 === 0;
  const text = new Intl.NumberFormat(locale(lang), {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(bani / 100);
  return `${text} lei`;
}

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

export type Translator = {
  /** A screen text: `t("ro", "session.hello", { name })` reads `<namespace>.session.hello`. */
  t: (lang: Lang, key: string, params?: Params) => string;
  /** The API's error code, translated (codes contain dots, so they are looked up whole). */
  errorText: (lang: Lang, code: string, params?: Params) => string;
};

export function createI18n(namespace: string): Translator {
  const t = (lang: Lang, key: string, params: Params = {}): string => {
    const text = lookup(catalogues[lang], `${namespace}.${key}`);
    return text === undefined ? key : format(lang, text, params);
  };
  const errorText = (lang: Lang, code: string, params: Params = {}): string => {
    const errors = catalogues[lang].errors;
    const text = typeof errors === "object" ? errors[code] : undefined;
    return typeof text === "string" ? format(lang, text, params) : t(lang, "errors.generic");
  };
  return { t, errorText };
}
