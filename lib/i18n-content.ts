import type { Locale } from "@/i18n/routing";

/** A translatable content field as stored in the database. */
export type Translatable = { ro: string; en?: string };
export type TranslatableList = { ro: string[]; en?: string[] };

export const TODO_MARK = "[DE COMPLETAT]";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads a translatable field, falling back to Romanian when the translation is missing. */
export function t(field: unknown, locale: Locale | string): string {
  if (typeof field === "string") return field;
  if (!isRecord(field)) return "";
  const localized = field[locale];
  if (typeof localized === "string" && localized.trim().length > 0) return localized;
  const ro = field.ro;
  return typeof ro === "string" ? ro : "";
}

/** Reads a translatable list field ({ ro: string[], en?: string[] }). */
export function tList(field: unknown, locale: Locale | string): string[] {
  if (!isRecord(field)) return [];
  const pick = (value: unknown): string[] | null =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : null;
  const localized = pick(field[locale]);
  if (localized && localized.length > 0) return localized;
  return pick(field.ro) ?? [];
}

/** Reads a list of translatable items ([{ ro, en }]). */
export function tItems(field: unknown, locale: Locale | string): string[] {
  if (!Array.isArray(field)) return [];
  return field.map((item) => t(item, locale)).filter((item) => item.length > 0);
}

export function asTranslatable(field: unknown): Translatable {
  if (isRecord(field)) {
    const ro = typeof field.ro === "string" ? field.ro : "";
    const en = typeof field.en === "string" ? field.en : undefined;
    return en === undefined ? { ro } : { ro, en };
  }
  return { ro: typeof field === "string" ? field : "" };
}

export function asTranslatableList(field: unknown): TranslatableList {
  if (!isRecord(field)) return { ro: [] };
  const pick = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return { ro: pick(field.ro), en: pick(field.en) };
}

/** True when a value still carries the missing-content marker (or is empty). */
export function isTodo(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0 || value.includes(TODO_MARK);
}

/** True when the value is real, publishable content. */
export function isFilled(value: string | null | undefined): value is string {
  return !isTodo(value);
}
